# Data Model: App Foundation

**Feature**: 002-app-foundation
**Authoritative Source**: `database/schema.sql` (DDL), `docs/data-dictionary.md` (seed data content)
**Database**: Supabase PostgreSQL 17.6

## Entity Relationship Overview

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│ symptom_categories  │     │ metric_categories    │     │ practice_categories  │
│ (hierarchical, 3    │     │ (hierarchical, 3     │     │ (single-level)       │
│  levels, self-ref)  │     │  levels, self-ref)   │     │                      │
└────────┬────────────┘     └────────┬─────────────┘     └────────┬─────────────┘
         │ 1:N                       │ 1:N                        │ 1:N
         ▼                           ▼                            ▼
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│ symptom_types       │     │ metric_types         │     │ practices            │
│                     │     │                      │     │ (user data)          │
└──┬───────────────┬──┘     └────────┬─────────────┘     └──┬────────┬─────────┘
   │ 1:N           │ N:M             │ 1:N                  │ 1:N    │ N:M
   │               │                 │                      │        │
   ▼               ▼                 ▼                      ▼        ▼
┌──────────────┐ ┌───────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐
│ symptom_logs │ │practice_      │ │ metrics      │ │practice_   │ │practice_      │
│ (user data)  │ │symptoms       │ │ (user data)  │ │completions │ │symptoms       │
│              │ │(junction)     │ │              │ │(user data) │ │(junction)     │
└──────────────┘ └───────────────┘ └──────────────┘ └────────────┘ └───────────────┘
   ▲ uses                                ▲ optional FK
   │                                     │
┌──────────────┐              ┌──────────────────────┐
│body_locations│              │ medications          │
│ (reference)  │              │ (user data)          │
└──────────────┘              └──┬────────┬──────────┘
                                 │ 1:N    │ N:M
                                 ▼        ▼
                          ┌────────────┐ ┌───────────────┐
                          │medication_ │ │medication_    │
                          │logs        │ │symptoms       │
                          │(user data) │ │(junction)     │
                          └────────────┘ └───────────────┘
```

## Table Catalog

### Category Tables

#### symptom_categories

Hierarchical grouping for symptom types (3 levels: Physical → Pain → Head & Face).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | Category name |
| parent_id | UUID | FK → symptom_categories(id) ON DELETE CASCADE, NULLABLE | Self-referencing hierarchy |
| level | INTEGER | NOT NULL, CHECK (1-3) | 1=top, 2=sub, 3=sub-sub |
| display_order | INTEGER | DEFAULT 0 | Sort order within parent |
| is_predefined | BOOLEAN | DEFAULT true | System vs user-created |
| user_id | UUID | NULLABLE | NULL for predefined, set for user-created |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint**: `(name, parent_id, user_id)` NULLS NOT DISTINCT
**Indexes**: `parent_id`, `user_id WHERE user_id IS NOT NULL`
**RLS**: Pattern A (reference data — predefined readable by all, user-created restricted to owner)

#### metric_categories

Same structure as symptom_categories. Hierarchical grouping for metric types (Daily Wellness → Sleep).

*Identical columns, constraints, and indexes to symptom_categories.*
**RLS**: Pattern A

#### practice_categories

Single-level categories for health practices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | Category name |
| display_order | INTEGER | DEFAULT 0 | Sort order |
| is_predefined | BOOLEAN | DEFAULT true | System vs user-created |
| user_id | UUID | NULLABLE | NULL for predefined, set for user-created |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint**: `(name, user_id)` NULLS NOT DISTINCT
**Indexes**: `user_id WHERE user_id IS NOT NULL`
**RLS**: Pattern A

---

### Type/Reference Tables

#### symptom_types

Individual symptom definitions (e.g., "Migraine", "Brain fog").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | Symptom name |
| category_id | UUID | NOT NULL, FK → symptom_categories(id) ON DELETE CASCADE | Parent category |
| severity_scale | TEXT | DEFAULT '0-10' | Scale definition |
| is_predefined | BOOLEAN | DEFAULT true | System vs user-created |
| user_id | UUID | NULLABLE | NULL for predefined, set for user-created |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint**: `(name, category_id, user_id)` NULLS NOT DISTINCT
**Indexes**: `category_id`, `user_id WHERE user_id IS NOT NULL`
**RLS**: Pattern A

#### metric_types

Measurable health value definitions (e.g., "Sleep duration" in hours).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | Metric name |
| category_id | UUID | NOT NULL, FK → metric_categories(id) ON DELETE CASCADE | Parent category |
| unit | TEXT | NULLABLE | Unit of measurement |
| default_target | NUMERIC | NULLABLE | Default target value |
| is_predefined | BOOLEAN | DEFAULT true | System vs user-created |
| user_id | UUID | NULLABLE | NULL for predefined, set for user-created |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint**: `(name, category_id, user_id)` NULLS NOT DISTINCT
**Indexes**: `category_id`, `user_id WHERE user_id IS NOT NULL`
**RLS**: Pattern A

#### body_locations

Reference table for anatomical locations. System-managed, read-only.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL, UNIQUE | Location name |
| region | TEXT | NOT NULL | Body region grouping |
| display_order | INTEGER | DEFAULT 0 | Sort order within region |

**Indexes**: `region`
**RLS**: Pattern D (read-only for all authenticated users)

---

### User Data Tables

#### symptom_logs

User symptom entries with severity, timing, and optional body location.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL | Owning user |
| symptom_type_id | UUID | NOT NULL, FK → symptom_types(id) ON DELETE RESTRICT | Symptom reference |
| severity | INTEGER | NOT NULL, CHECK (0-10) | 0-10 severity scale |
| started_at | TIMESTAMPTZ | NOT NULL | When symptom began |
| duration_minutes | INTEGER | NULLABLE | Duration (NULL = ongoing/unknown) |
| location_id | UUID | FK → body_locations(id), NULLABLE | Body location |
| raw_input | TEXT | NULLABLE | Original NLP text |
| source | TEXT | DEFAULT 'manual', CHECK ('manual','nlp') | Entry method |
| notes | TEXT | NULLABLE | Free text notes |
| metadata | JSONB | DEFAULT '{}' | Flexible additional data |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

**Indexes**: `user_id`, `(user_id, started_at DESC)`, `symptom_type_id`, `started_at DESC`
**Trigger**: `update_updated_at_column` on UPDATE
**RLS**: Pattern B (user owns their data)

#### practices

User health practices/commitments with tracking configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL | Owning user |
| name | TEXT | NOT NULL | Practice name |
| category_id | UUID | FK → practice_categories(id), NULLABLE | Optional category |
| tracking_type | TEXT | NOT NULL, CHECK ('metric','completion') | How to track |
| target_frequency | INTEGER | NULLABLE | Times per day (completion) |
| metric_type_id | UUID | FK → metric_types(id), NULLABLE | Required if tracking_type='metric' |
| target_value | NUMERIC | NULLABLE | Target for metrics |
| frequency | TEXT | CHECK ('daily','weekly','specific_days'), NULLABLE | Schedule |
| frequency_details | JSONB | NULLABLE | e.g., {"days": ["mon","wed","fri"]} |
| reminder_enabled | BOOLEAN | DEFAULT false | |
| reminder_times | JSONB | NULLABLE | e.g., ["08:00","20:00"] |
| active | BOOLEAN | DEFAULT true | Soft delete / inactive |
| started_at | TIMESTAMPTZ | NULLABLE | When practice began |
| ended_at | TIMESTAMPTZ | NULLABLE | When practice ended |
| raw_input | TEXT | NULLABLE | Original NLP text |
| source | TEXT | DEFAULT 'manual', CHECK ('manual','nlp') | Entry method |
| notes | TEXT | NULLABLE | Free text notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

**CHECK constraint**: `metric_tracking_requires_metric_type` — `tracking_type != 'metric' OR metric_type_id IS NOT NULL`
**Indexes**: `user_id`, `(user_id, active) WHERE active = true`, `category_id`
**Trigger**: `update_updated_at_column` on UPDATE
**RLS**: Pattern B

#### metrics

Single source of truth for all numeric health measurements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL | Owning user |
| metric_type_id | UUID | NOT NULL, FK → metric_types(id) ON DELETE RESTRICT | Metric definition |
| value | NUMERIC | NOT NULL | Recorded value |
| recorded_at | TIMESTAMPTZ | NOT NULL | When measured |
| practice_id | UUID | FK → practices(id) ON DELETE SET NULL, NULLABLE | Optional practice link |
| raw_input | TEXT | NULLABLE | Original NLP text |
| source | TEXT | DEFAULT 'manual', CHECK ('manual','journal','integration','nlp') | Entry origin |
| notes | TEXT | NULLABLE | Free text notes |
| metadata | JSONB | DEFAULT '{}' | Flexible additional data |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes**: `user_id`, `(user_id, recorded_at DESC)`, `metric_type_id`, `practice_id WHERE NOT NULL`, `recorded_at DESC`
**RLS**: Pattern B

#### practice_completions

Completion records for practices with completion-based tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL | Owning user |
| practice_id | UUID | NOT NULL, FK → practices(id) ON DELETE CASCADE | Parent practice |
| completed_at | TIMESTAMPTZ | NOT NULL | When completed |
| completed | BOOLEAN | DEFAULT true | false = explicitly skipped |
| raw_input | TEXT | NULLABLE | Original NLP text |
| source | TEXT | DEFAULT 'manual', CHECK ('manual','nlp') | Entry method |
| notes | TEXT | NULLABLE | Free text notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes**: `user_id`, `practice_id`, `(user_id, completed_at DESC)`
**RLS**: Pattern B

#### medications

User medications and supplements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL | Owning user |
| name | TEXT | NOT NULL | Medication name |
| dosage | TEXT | NULLABLE | Dosage info |
| frequency | TEXT | NULLABLE | Frequency description |
| reminder_times | JSONB | NULLABLE | Reminder schedule |
| active | BOOLEAN | DEFAULT true | Soft delete / inactive |
| started_at | TIMESTAMPTZ | NULLABLE | When started |
| ended_at | TIMESTAMPTZ | NULLABLE | When stopped |
| raw_input | TEXT | NULLABLE | Original NLP text |
| source | TEXT | DEFAULT 'manual', CHECK ('manual','nlp') | Entry method |
| notes | TEXT | NULLABLE | Free text notes |
| is_supplement | BOOLEAN | DEFAULT false | Supplement flag |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

**Indexes**: `user_id`, `(user_id, active) WHERE active = true`
**Trigger**: `update_updated_at_column` on UPDATE
**RLS**: Pattern B

#### medication_logs

Medication adherence records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL | Owning user |
| medication_id | UUID | NOT NULL, FK → medications(id) ON DELETE CASCADE | Parent medication |
| taken_at | TIMESTAMPTZ | NOT NULL | When taken/skipped |
| taken | BOOLEAN | DEFAULT true | false = skipped |
| raw_input | TEXT | NULLABLE | Original NLP text |
| source | TEXT | DEFAULT 'manual', CHECK ('manual','nlp') | Entry method |
| notes | TEXT | NULLABLE | Free text notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes**: `user_id`, `medication_id`, `(user_id, taken_at DESC)`
**RLS**: Pattern B

---

### Junction Tables

#### practice_symptoms

Links practices to symptom types they're expected to improve. Many-to-many.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| practice_id | UUID | NOT NULL, FK → practices(id) ON DELETE CASCADE | |
| symptom_type_id | UUID | NOT NULL, FK → symptom_types(id) ON DELETE CASCADE | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Primary key**: `(practice_id, symptom_type_id)`
**Indexes**: `symptom_type_id`
**RLS**: Pattern C (access via parent practice's user_id)

#### medication_symptoms

Links medications to symptom types they're expected to improve. Many-to-many.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| medication_id | UUID | NOT NULL, FK → medications(id) ON DELETE CASCADE | |
| symptom_type_id | UUID | NOT NULL, FK → symptom_types(id) ON DELETE CASCADE | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Primary key**: `(medication_id, symptom_type_id)`
**Indexes**: `symptom_type_id`
**RLS**: Pattern C (access via parent medication's user_id)

---

## RLS Policy Summary

| Pattern | Tables | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|--------|
| A (Reference) | 5 category/type tables | predefined OR owner | owner only (not predefined) | owner only (not predefined) | owner only (not predefined) |
| B (User Data) | 6 user data tables | owner | owner | owner | owner |
| C (Junction) | 2 junction tables | parent owner | parent owner | — (delete+reinsert) | parent owner |
| D (Read-only) | body_locations | all authenticated | — | — | — |
| E (System) | login_attempts | — (SECURITY DEFINER only) | — | — | — |

## Trigger Summary

| Trigger | Tables | Event | Function |
|---------|--------|-------|----------|
| update_*_updated_at | symptom_logs, practices, medications | BEFORE UPDATE | update_updated_at_column() |

## Seed Data Summary

| Table | Count | Source |
|-------|-------|--------|
| symptom_categories | ~30 (3-level hierarchy) | Data Dictionary |
| symptom_types | 170+ | Data Dictionary |
| metric_categories | ~8 (2-level hierarchy) | Data Dictionary |
| metric_types | ~16 | Data Dictionary |
| practice_categories | 6 | Data Dictionary |
| body_locations | ~62 (12 regions) | Data Dictionary |
