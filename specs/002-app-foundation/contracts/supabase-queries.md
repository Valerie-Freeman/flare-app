# Supabase Client Query Contracts: App Foundation

**Feature**: 002-app-foundation
**Purpose**: Define the client-side query patterns that future features will use to interact with the data layer established by this feature.

## Overview

This feature creates no new API endpoints. All data access goes through the Supabase JS client with RLS enforcement. This document defines the expected query patterns for each table category, establishing contracts that future features must follow.

## Authentication Context

All queries require an authenticated Supabase session. The Supabase JS client automatically includes the JWT in all requests. RLS policies enforce data isolation transparently.

```javascript
import { supabase } from '../services/supabase';
// JWT is included automatically — no manual token handling needed
```

## Reference Data Queries (Read-Only)

Reference data (categories, types, body locations) is globally readable by all authenticated users. These queries are cacheable for long periods (5+ minutes).

### Symptom Categories (hierarchical)

```javascript
// All top-level categories
const { data } = await supabase
  .from('symptom_categories')
  .select('*')
  .is('parent_id', null)
  .eq('level', 1)
  .order('display_order');

// Subcategories for a given parent
const { data } = await supabase
  .from('symptom_categories')
  .select('*')
  .eq('parent_id', parentId)
  .order('display_order');

// Full hierarchy (3 levels, single query)
const { data } = await supabase
  .from('symptom_categories')
  .select('*, children:symptom_categories!parent_id(*)')
  .is('parent_id', null)
  .order('display_order');
```

### Symptom Types

```javascript
// All types for a category
const { data } = await supabase
  .from('symptom_types')
  .select('*, category:symptom_categories(name, parent_id)')
  .eq('category_id', categoryId)
  .order('name');

// Search by name (for NLP matching context in future features)
const { data } = await supabase
  .from('symptom_types')
  .select('id, name, category_id')
  .ilike('name', `%${searchTerm}%`);
```

### Metric Types

```javascript
// All metric types with categories
const { data } = await supabase
  .from('metric_types')
  .select('*, category:metric_categories(name)')
  .order('name');

// Metric types for a category
const { data } = await supabase
  .from('metric_types')
  .select('*')
  .eq('category_id', categoryId)
  .order('name');
```

### Practice Categories

```javascript
// All practice categories
const { data } = await supabase
  .from('practice_categories')
  .select('*')
  .order('display_order');
```

### Body Locations

```javascript
// All locations grouped by region
const { data } = await supabase
  .from('body_locations')
  .select('*')
  .order('region')
  .order('display_order');

// Locations for a specific region
const { data } = await supabase
  .from('body_locations')
  .select('*')
  .eq('region', regionName)
  .order('display_order');
```

## User Data Queries (Filtered by User)

User data is automatically filtered by RLS. Always include explicit `.eq('user_id', userId)` filters for query plan optimization (per Supabase performance recommendations).

### Symptom Logs

```javascript
// Recent symptom logs
const { data } = await supabase
  .from('symptom_logs')
  .select('*, symptom_type:symptom_types(name, category_id), location:body_locations(name, region)')
  .eq('user_id', userId)
  .order('started_at', { ascending: false })
  .limit(50);

// Insert new symptom log
const { data, error } = await supabase
  .from('symptom_logs')
  .insert({
    user_id: userId,
    symptom_type_id: typeId,
    severity: 7,
    started_at: new Date().toISOString(),
    source: 'manual', // or 'nlp'
    raw_input: originalText, // null for manual entry
    notes: userNotes,
  })
  .select()
  .single();
```

### Practices

```javascript
// Active practices for today's task list
const { data } = await supabase
  .from('practices')
  .select('*, category:practice_categories(name)')
  .eq('user_id', userId)
  .eq('active', true)
  .order('created_at');

// Insert new practice
const { data, error } = await supabase
  .from('practices')
  .insert({
    user_id: userId,
    name: 'Magnesium glycinate 400mg',
    category_id: supplementsCategoryId,
    tracking_type: 'completion',
    frequency: 'daily',
    target_frequency: 1,
    source: 'nlp',
    raw_input: 'start taking 400mg magnesium every night',
  })
  .select()
  .single();
```

### Metrics

```javascript
// Metrics for a date range
const { data } = await supabase
  .from('metrics')
  .select('*, metric_type:metric_types(name, unit)')
  .eq('user_id', userId)
  .gte('recorded_at', startDate)
  .lte('recorded_at', endDate)
  .order('recorded_at', { ascending: false });
```

### Practice Completions

```javascript
// Today's completions for a practice
const { data } = await supabase
  .from('practice_completions')
  .select('*')
  .eq('user_id', userId)
  .eq('practice_id', practiceId)
  .gte('completed_at', todayStart)
  .lte('completed_at', todayEnd);

// Log a completion
const { data, error } = await supabase
  .from('practice_completions')
  .insert({
    user_id: userId,
    practice_id: practiceId,
    completed_at: new Date().toISOString(),
    completed: true,
    source: 'manual',
  })
  .select()
  .single();
```

### Medications and Logs

```javascript
// Active medications
const { data } = await supabase
  .from('medications')
  .select('*')
  .eq('user_id', userId)
  .eq('active', true)
  .order('created_at');

// Log medication adherence
const { data, error } = await supabase
  .from('medication_logs')
  .insert({
    user_id: userId,
    medication_id: medicationId,
    taken_at: new Date().toISOString(),
    taken: true,
    source: 'manual',
  })
  .select()
  .single();
```

### Junction Tables (Symptom Links)

```javascript
// Get symptom links for a practice
const { data } = await supabase
  .from('practice_symptoms')
  .select('symptom_type_id, symptom_type:symptom_types(name)')
  .eq('practice_id', practiceId);

// Set symptom links for a practice (delete + re-insert pattern)
await supabase
  .from('practice_symptoms')
  .delete()
  .eq('practice_id', practiceId);

await supabase
  .from('practice_symptoms')
  .insert(
    symptomTypeIds.map(id => ({
      practice_id: practiceId,
      symptom_type_id: id,
    }))
  );
```

## Error Handling Contract

All Supabase queries may return errors. The standard error handling pattern:

```javascript
const { data, error } = await supabase.from('table').select('*');

if (error) {
  // error.message — human-readable message
  // error.code — PostgreSQL error code (e.g., '23503' for FK violation)
  // error.details — additional context
  throw error; // Let TanStack Query handle retry/display
}
```

## Query Key Mapping

Each query pattern maps to a TanStack Query key defined in `src/lib/queryKeys.js`:

| Query Pattern | Query Key |
|--------------|-----------|
| Top-level symptom categories | `queryKeys.symptomCategories.all` |
| Subcategories by parent | `queryKeys.symptomCategories.byParent(parentId)` |
| Symptom types by category | `queryKeys.symptomTypes.byCategory(categoryId)` |
| All metric types | `queryKeys.metricTypes.all` |
| Practice categories | `queryKeys.practiceCategories.all` |
| Body locations | `queryKeys.bodyLocations.all` |
| Body locations by region | `queryKeys.bodyLocations.byRegion(region)` |
| User's symptom logs | `queryKeys.symptomLogs.list(userId)` |
| User's active practices | `queryKeys.practices.active(userId)` |
| User's active medications | `queryKeys.medications.active(userId)` |
| Practice completions today | `queryKeys.practiceCompletions.today(userId, practiceId)` |
| Medication logs today | `queryKeys.medicationLogs.today(userId, medicationId)` |
| Metrics by date range | `queryKeys.metrics.range(userId, start, end)` |
