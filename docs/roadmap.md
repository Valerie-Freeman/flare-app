# Flare MVP — Feature Implementation Roadmap

Last updated: 2026-02-19

## Overview

Features are implemented sequentially using speckit (specify → plan → tasks → implement). Auth (001) is complete. Each feature below builds on the ones before it.

## Implementation Order

| # | Feature | Branch | Depends On | Status |
|---|---------|--------|------------|--------|
| 001 | User Auth | `001-user-auth` | — | Done |
| 002 | App Foundation | `002-app-foundation` | 001 | — |
| 003 | AI Service (NLP Input) | `003-ai-service` | 002 | — |
| 004 | Symptom Tracking | `004-symptom-tracking` | 002, 003 | — |
| 005 | Health Practices | `005-health-practices` | 004 | — |
| 006 | Medication Tracking | `006-medication-tracking` | 005 | — |
| 007 | Journal Entries | `007-journal-entries` | 005 | — |
| 008 | Dashboard | `008-dashboard` | 004–007 | — |
| 009 | Reminders & Notifications | `009-reminders-notifications` | 005–007 | — |
| 010 | Reports & Analytics | `010-reports-analytics` | 004–007 | — |
| 011 | Data Export | `011-data-export` | 004–007 | — |

## Dependency Graph

```
001 Auth [done]
 └─> 002 Foundation (schema, seed data, tabs, TanStack Query)
      ├─> 003 AI Service (FastAPI, LangChain, NLP parse endpoint)
      │    ├─> 004 Symptom Tracking (NLP-primary + form fallback)
      │    │    └─> 005 Health Practices (NLP creation, form completions)
      │    │         ├─> 006 Medication Tracking (NLP creation, form adherence)
      │    │         └─> 007 Journal Entries (NLP-primary, reuses metrics service)
      │    │
      ├─> 008 Dashboard (needs 004-007, NLP "how are you feeling?" input)
      ├─> 009 Reminders (needs 005-007)
      ├─> 010 Reports & Analytics (extends 003 with analytics endpoints)
      └─> 011 Data Export (needs all data features)
```

## Feature Summaries

### 002 — App Foundation
Apply the full database schema as Supabase migrations (excluding `login_attempts` which exists). Add RLS policies for all tables. Seed predefined data (170+ symptom types, metric types, body locations, practice categories). Convert the app layout from Stack to tab navigator. Wire up TanStack Query.

### 003 — AI Service (NLP Input)
Python FastAPI microservice with LangChain structured output. Single endpoint (`POST /api/v1/parse-input`) accepts natural language text and returns structured health data. Supports four intents: `symptom_report`, `journal_entry`, `create_practice`, `create_medication`. 7-stage pipeline: sanitization → intent classification → entity extraction → schema mapping → confidence scoring → ambiguity detection → response construction. Follow-up questions for ambiguous critical fields. JWT auth, text anonymization before LLM, graceful fallback to manual form on parse failure. Deployed on DigitalOcean via Docker.

### 004 — Symptom Tracking
Core data entry feature. **NLP-primary**: users describe symptoms in natural language ("my knees are killing me, maybe a 7") and the AI service parses it into structured data shown in an editable confirmation card. Manual form with category drill-down, severity 0-10, timing, body location, and notes serves as fallback/edit mode. History/timeline view. Custom symptom creation. Establishes CRUD service layer patterns, category picker, and severity slider components.

### 005 — Health Practices
Daily task list — the primary engagement loop. **Practice creation is NLP-primary** ("start taking 400mg magnesium every night") with a form-based wizard as fallback. Daily **completion and metric logging remain form-based** — checkboxes and steppers on the task list are faster than typing. Two tracking modes: completion (mark done/skipped) and metric (log numeric value). Symptom linking for AI correlation. Metric-type practices write to the shared `metrics` table.

### 006 — Medication Tracking
Similar UX to practices but separate data model. **Medication creation is NLP-primary** ("I take 10mg Lexapro every morning") with parsed results shown in an editable confirmation card; manual form as fallback. **Adherence logging remains form-based** — taken/skipped toggles on the task list. Dosage tracking, symptom linking. Reuses task list, symptom linker, and frequency config components from 005.

### 007 — Journal Entries
Morning and evening structured journals. **NLP-primary**: users describe their state as a narrative ("slept 6 hours, restless, pain around a 5") and the parser extracts structured metrics. Manual sliders/inputs as fallback/edit mode. Writes to the `metrics` table with `source = 'journal'` — not a separate table. Morning: sleep hours/quality, pain, energy. Evening: mood, energy, pain. Journal history and completion status tracking.

### 008 — Dashboard
Aggregation hub built after all data features. Today's practice + medication task list, progress rings, journal status, symptoms logged today. **NLP text input** — "How are you feeling?" prompt for symptom logging and journaling. Quick actions: morning/evening journal shortcuts, frequent symptom tiles for one-tap logging. Trend indicators (this week vs last week).

### 009 — Reminders & Notifications
Push notifications for practices, medications, and journals. Permission flow, local notification scheduling from `reminder_times`, deep link handling on tap, and notification preferences in settings.

### 010 — Reports & Analytics
Extends the AI service (deployed in 003) with analytics and reporting endpoints. Three sub-phases: (a) Charts — line charts, calendar heatmaps, milestone markers, multi-symptom overlay. (b) AI Insights — correlation detection, pattern recognition, and anomaly alerts via the existing FastAPI + LangChain service. (c) Doctor Reports — comprehensive health summary with PDF export.

### 011 — Data Export
CSV and JSON export of all user data. Export UI in settings with date range and data type selection.

## Post-MVP (Deferred)

- Experiments & A/B Comparisons
- Home screen widget for quick logging
- Social authentication (Google, Apple Sign-In)
- Medication interaction warnings
- Voice-to-text input (Expo Speech API → same NLP endpoint, no backend changes)
- On-device NLP for offline/low-latency parsing
- NLP response caching for repeated similar inputs
- LangGraph migration for complex multi-turn flows
- Community/social features

## Key Architectural Notes

- **Database schema applied upfront** in 002, not incrementally per feature.
- **NLP is the primary interaction model** for high-friction data entry (symptom logging, journals, practice/medication creation). The LLM is a parser, not a decision-maker — it extracts structured data, never diagnoses or recommends.
- **AI service deploys early** (003) with dual responsibility: NLP parsing now, analytics later (010).
- **Confirmation UX** — all NLP-parsed entries shown in an editable card before save. Users can adjust fields or switch to the full manual form.
- **`raw_input` and `source` columns** on all user data tables track NLP provenance. `notes` captures any unmapped extracted text — no user input is ever lost.
- **`metrics` table is shared** — practices (metric-type), journals, and future integrations all write to it with different `source` values.
- **Journals have no dedicated table** — they write structured metric records with `source = 'journal'`.
- **Dashboard built last among data features** to avoid incremental rework. Tab navigator from 002 provides navigation in the interim.
