# Flare Database Overview

A health tracking database designed to help users log symptoms, track metrics, manage practices, and run personal experiments.

## Current Implementation Status

| Table | Status |
|-------|--------|
| `login_attempts` | ✅ Implemented |
| All others | 📋 Planned |

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        REFERENCE DATA                           │
│  symptom_categories ─► symptom_types ◄── body_locations         │
│  metric_categories ─► metric_types                              │
│  practice_categories                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         USER DATA                               │
│                                                                 │
│  practices ────┬──► practice_completions (for habit tracking)  │
│       │        └──► metrics (for metric-based tracking)        │
│       │                                                         │
│  medications ──────► medication_logs                            │
│                                                                 │
│  symptom_logs (standalone entries)                              │
│                                                                 │
│  experiments (ties practices to symptom monitoring)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LINK TABLES                                │
│  practice_symptoms ── "this practice targets these symptoms"   │
│  medication_symptoms ── "this med treats these symptoms"       │
└─────────────────────────────────────────────────────────────────┘
```

## MVP Features & Queries

### 1. Symptom Logging
Users record symptoms with severity (0-10), timing, and optional body location.

```sql
-- Get user's symptoms for a date range (dashboard view)
SELECT st.name, sl.severity, sl.started_at, bl.name as location
FROM symptom_logs sl
JOIN symptom_types st ON sl.symptom_type_id = st.id
LEFT JOIN body_locations bl ON sl.location_id = bl.id
WHERE sl.user_id = ? AND sl.started_at BETWEEN ? AND ?
ORDER BY sl.started_at DESC;
```

### 2. Practice Tracking
Practices support two tracking modes:
- **Completion-based**: "Did I meditate today?" → `practice_completions`
- **Metric-based**: "How many glasses of water?" → `metrics`

```sql
-- Get today's practice progress
SELECT p.name, p.tracking_type, p.target_frequency, p.target_value,
       COUNT(pc.id) as completions_today
FROM practices p
LEFT JOIN practice_completions pc ON p.id = pc.practice_id
  AND DATE(pc.completed_at) = CURRENT_DATE
WHERE p.user_id = ? AND p.active = true
GROUP BY p.id;
```

### 3. Medication Adherence
Track whether medications were taken on schedule.

```sql
-- Adherence rate for a medication
SELECT COUNT(*) FILTER (WHERE taken = true)::float / COUNT(*) as adherence_rate
FROM medication_logs
WHERE medication_id = ? AND taken_at > NOW() - INTERVAL '30 days';
```

### 4. Experiments
Users create experiments to test if a practice helps specific symptoms.

```sql
-- Compare symptom severity before/during an experiment
SELECT
  AVG(sl.severity) FILTER (WHERE sl.started_at < e.start_date) as baseline,
  AVG(sl.severity) FILTER (WHERE sl.started_at >= e.start_date) as during_experiment
FROM experiments e
CROSS JOIN LATERAL unnest(e.target_symptoms::uuid[]) as target_symptom_id
JOIN symptom_logs sl ON sl.symptom_type_id = target_symptom_id
WHERE e.id = ? AND sl.user_id = e.user_id;
```

### 5. Correlation Discovery
Find relationships between practices and symptom changes.

```sql
-- Days with practice completion vs symptom severity
SELECT
  DATE(sl.started_at) as day,
  AVG(sl.severity) as avg_severity,
  EXISTS(
    SELECT 1 FROM practice_completions pc
    WHERE pc.practice_id = ? AND DATE(pc.completed_at) = DATE(sl.started_at)
  ) as practice_done
FROM symptom_logs sl
WHERE sl.symptom_type_id = ? AND sl.user_id = ?
GROUP BY DATE(sl.started_at);
```

## Key Design Decisions

1. **Hierarchical categories** (level 1/2/3) allow drilling down: Physical → Pain → Headache
2. **Dual tracking modes** for practices accommodate both yes/no habits and measurable goals
3. **Link tables** (`practice_symptoms`, `medication_symptoms`) enable correlation analysis
4. **JSONB fields** (`metadata`, `frequency_details`) provide flexibility without schema changes
5. **Soft deletes** via `active` flag and `ended_at` preserve historical data for analysis