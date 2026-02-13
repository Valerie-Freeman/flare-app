# Flare MVP — Feature Implementation Roadmap

Last updated: 2026-02-13

## Overview

Features are implemented sequentially using speckit (specify → plan → tasks → implement). Auth (001) is complete. Each feature below builds on the ones before it.

## Implementation Order

| # | Feature | Branch | Depends On | Status |
|---|---------|--------|------------|--------|
| 001 | User Auth | `001-user-auth` | — | Done |
| 002 | App Foundation | `002-app-foundation` | 001 | — |
| 003 | Symptom Tracking | `003-symptom-tracking` | 002 | — |
| 004 | Health Practices | `004-health-practices` | 003 | — |
| 005 | Medication Tracking | `005-medication-tracking` | 004 | — |
| 006 | Journal Entries | `006-journal-entries` | 004 | — |
| 007 | Dashboard | `007-dashboard` | 003–006 | — |
| 008 | Reminders & Notifications | `008-reminders-notifications` | 004–006 | — |
| 009 | Reports & Analytics | `009-reports-analytics` | 003–006 | — |
| 010 | Data Export | `010-data-export` | 003–006 | — |

## Dependency Graph

```
001 Auth [done]
 └─> 002 Foundation (schema, seed data, tabs, TanStack Query)
      ├─> 003 Symptom Tracking
      │    └─> 004 Health Practices
      │         ├─> 005 Medication Tracking
      │         └─> 006 Journal Entries (reuses metrics service)
      │
      ├─> 007 Dashboard (needs 003-006)
      ├─> 008 Reminders (needs 004-006)
      ├─> 009 Reports & Analytics (needs all data features)
      └─> 010 Data Export (needs all data features)
```

## Feature Summaries

### 002 — App Foundation
Apply the full database schema as Supabase migrations (excluding `login_attempts` which exists). Add RLS policies for all tables. Seed predefined data (170+ symptom types, metric types, body locations, practice categories). Convert the app layout from Stack to tab navigator. Wire up TanStack Query.

### 003 — Symptom Tracking
Core data entry feature. Symptom logging form with category drill-down, severity 0-10, timing, body location, and notes. History/timeline view. Custom symptom creation. Establishes CRUD service layer patterns, category picker, and severity slider components.

### 004 — Health Practices
Daily task list — the primary engagement loop. Practice creation wizard with two tracking modes: completion (mark done/skipped) and metric (log numeric value). Symptom linking for AI correlation. Metric-type practices write to the shared `metrics` table.

### 005 — Medication Tracking
Similar UX to practices but separate data model. Medication CRUD with dosage, adherence logging (taken/skipped), and symptom linking. Reuses task list, symptom linker, and frequency config components from 004.

### 006 — Journal Entries
Morning and evening structured journals. Writes to the `metrics` table with `source = 'journal'` — not a separate table. Morning: sleep hours/quality, pain, energy. Evening: mood, energy, pain. Journal history and completion status tracking.

### 007 — Dashboard
Aggregation hub built after all data features. Today's practice + medication task list, progress rings, journal status, symptoms logged today, quick actions, frequent symptom tiles, and trend indicators (this week vs last week).

### 008 — Reminders & Notifications
Push notifications for practices, medications, and journals. Permission flow, local notification scheduling from `reminder_times`, deep link handling on tap, and notification preferences in settings.

### 009 — Reports & Analytics
Three sub-phases: (a) Charts — line charts, calendar heatmaps, milestone markers, multi-symptom overlay. (b) AI Insights — Python FastAPI + LangChain service for correlation detection and pattern recognition. (c) Doctor Reports — comprehensive health summary with PDF export.

### 010 — Data Export
CSV and JSON export of all user data. Export UI in settings with date range and data type selection.

## Post-MVP (Deferred)

- Experiments & A/B Comparisons
- Home screen widget for quick logging
- Social authentication (Google, Apple Sign-In)
- Medication interaction warnings
- On-device AI option
- Community/social features

## Key Architectural Notes

- **Database schema applied upfront** in 002, not incrementally per feature.
- **`metrics` table is shared** — practices (metric-type), journals, and future integrations all write to it with different `source` values.
- **Journals have no dedicated table** — they write structured metric records with `source = 'journal'`.
- **Dashboard built last among data features** to avoid incremental rework. Tab navigator from 002 provides navigation in the interim.
