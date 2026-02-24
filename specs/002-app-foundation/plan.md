# Implementation Plan: App Foundation

**Branch**: `002-app-foundation` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-app-foundation/spec.md`

## Summary

App Foundation establishes the infrastructure layer for all subsequent Flare features. The implementation covers five areas: (1) database schema via Supabase migrations for 14 tables with indexes, constraints, and triggers; (2) row-level security policies enforcing user data isolation; (3) predefined seed data for 170+ symptom types, body locations, practice categories, and metric types; (4) converting the app from stack-only navigation to a 5-tab bottom navigator using Expo Router Tabs; (5) wiring up TanStack Query with a configured QueryClient, query key factory, and provider integration.

## Technical Context

**Language/Version**: JavaScript (ES2022+) for mobile app; SQL (PostgreSQL 17.6) for database
**Primary Dependencies**: Expo Router ~6.0 (tabs), React Native Paper ^5.12 (UI), TanStack Query ^5.59 (data fetching), Supabase JS ^2.45 (client) — all already installed, no new dependencies
**Storage**: Supabase PostgreSQL 17.6 (managed cloud, AES-256 at rest)
**Testing**: jest-expo ^54, @testing-library/react-native ^13 — existing setup
**Target Platform**: iOS and Android via Expo (Managed Workflow)
**Project Type**: Mobile app with managed backend (Supabase)
**Performance Goals**: Tab transitions <1s, cached data display <200ms
**Constraints**: Online required (no offline-first), no new npm dependencies
**Scale/Scope**: 0-100 users (MVP), 14 new database tables, 5 navigation tabs, ~8 migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Minimal Dependencies | PASS | Zero new npm packages. All dependencies (Expo Router, TanStack Query, RN Paper) already installed. Tab navigation is built into Expo Router. |
| II | YAGNI | PASS | Creating all 14 tables upfront is a deliberate architectural decision documented in the roadmap: "Database schema applied upfront in 002, not incrementally per feature." This avoids migration coordination headaches across features 004-011. |
| III | Privacy & Data Security | PASS | RLS policies on every user data table. Reference data globally readable. Junction tables secured via parent table join checks. `login_attempts` RLS to be enabled (currently disabled). |
| IV | Human-in-the-Loop | PASS | Infrastructure feature — no AI decision-making involved. |
| V | Clean & Simple UX | PASS | Tab navigation follows standard mobile conventions. Placeholder screens are minimal ("Coming soon" with section name). |
| VI | Architectural Quality | PASS | Schema follows established patterns (UUID PKs, timestamptz, proper indexes). RLS uses Supabase performance best practices (`(select auth.uid())` wrapping, `TO authenticated` role targeting). |
| VII | Single Source of Truth | PASS | `database/schema.sql` is the authoritative DDL source. Migrations adapt it for the Supabase environment. Query keys defined once in `queryKeys.js`. |
| VIII | Single Responsibility | PASS | Each migration handles one concern. Query infrastructure separated from UI components. Tab layout separated from auth guard. |
| IX | Testing Philosophy | PASS | RLS testable via SQL queries. Navigation testable via component tests. Query hooks testable via mock Supabase client at system boundary. |
| X | AI-Assisted Data Entry | PASS | NLP-readiness columns (`raw_input`, `source`, `notes`) included on all user data tables per spec. NLP service itself is Feature 003. |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-app-foundation/
├── plan.md              # This file
├── research.md          # Phase 0: Key decisions and rationale
├── data-model.md        # Phase 1: Entity model with RLS policies
├── quickstart.md        # Phase 1: Setup and verification guide
├── contracts/
│   └── supabase-queries.md  # Phase 1: Client query patterns
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── _layout.js                              # MODIFIED — add QueryClientProvider
├── (auth)/                                 # UNCHANGED — auth screens stay as-is
│   ├── _layout.js
│   ├── welcome.js
│   ├── sign-in.js
│   ├── sign-up.js
│   ├── forgot-password.js
│   └── reset-password.js
└── (app)/
    ├── _layout.js                          # MODIFIED — auth guard wraps Slot (for tabs)
    └── (tabs)/                             # NEW — tab navigator group
        ├── _layout.js                      # NEW — Tabs component with 5 tabs
        ├── index.js                        # MOVED — Home tab (from app/(app)/index.js)
        ├── track.js                        # NEW — Track tab placeholder
        ├── practices.js                    # NEW — Practices tab placeholder
        ├── insights.js                     # NEW — Insights tab placeholder
        └── profile/                        # NEW — Profile tab with nested stack
            ├── _layout.js                  # NEW — Stack navigator for profile section
            ├── index.js                    # NEW — Profile main (account info, sign out)
            └── security.js                 # MOVED — from app/(app)/settings/security.js

src/
├── contexts/
│   └── AuthContext.js                      # UNCHANGED
├── services/
│   ├── auth.js                             # UNCHANGED
│   ├── encryption.js                       # UNCHANGED
│   └── supabase.js                         # UNCHANGED
└── lib/                                    # NEW directory
    ├── queryClient.js                      # NEW — QueryClient instance + default config
    └── queryKeys.js                        # NEW — Query key factory (single source of truth)

__tests__/
├── lib/                                    # NEW directory
│   ├── queryClient.test.js                 # NEW — QueryClient config tests
│   └── queryKeys.test.js                   # NEW — Query key factory tests
└── ...existing test files...

DELETED:
├── app/(app)/index.js                      # Moved to (tabs)/index.js
└── app/(app)/settings/                     # Moved to (tabs)/profile/
    └── security.js
```

**Structure Decision**: Mobile app with file-based routing (Expo Router). The `(tabs)` group creates the bottom tab navigator within the authenticated `(app)` group. The profile tab uses a nested Stack for deeper navigation (security settings) while keeping the tab bar visible. No new directories outside of `app/` and `src/lib/` — the existing `src/services/` and `src/contexts/` patterns are preserved.

### Database (via Supabase migrations — not local files)

Migrations applied via the Supabase MCP `apply_migration` tool in this order:

| # | Migration Name | Purpose |
|---|---------------|---------|
| 1 | `create_category_tables` | `symptom_categories`, `metric_categories`, `practice_categories` + indexes |
| 2 | `create_type_and_reference_tables` | `symptom_types`, `metric_types`, `body_locations` + indexes |
| 3 | `create_user_data_tables` | `symptom_logs`, `practices`, `metrics`, `practice_completions`, `practice_symptoms` + indexes |
| 4 | `create_medication_tables` | `medications`, `medication_logs`, `medication_symptoms` + indexes |
| 5 | `create_updated_at_triggers` | `update_updated_at_column()` function + triggers on symptom_logs, practices, medications |
| 6 | `enable_rls_and_add_policies` | Enable RLS on all tables + all SELECT/INSERT/UPDATE/DELETE policies |
| 7 | `seed_categories` | All predefined symptom categories (hierarchy), metric categories, practice categories |
| 8 | `seed_types_and_locations` | All predefined symptom types, metric types, body locations |

### Tab Configuration

| # | Route | Label | Icon | Content |
|---|-------|-------|------|---------|
| 1 | `(tabs)/index` | Home | `home-outline` | Placeholder (dashboard in Feature 008) |
| 2 | `(tabs)/track` | Track | `notebook-edit-outline` | Placeholder (symptoms in 004, journals in 007) |
| 3 | `(tabs)/practices` | Practices | `checkbox-marked-circle-outline` | Placeholder (practices in 005, medications in 006) |
| 4 | `(tabs)/insights` | Insights | `chart-line` | Placeholder (reports in 010) |
| 5 | `(tabs)/profile` | Profile | `account-outline` | Account info, sign out, security settings |

## Implementation Phases

### Phase A: Database Schema (Migrations 1-5)

Apply the 14 tables from `database/schema.sql` as Supabase migrations, adapted for the Supabase environment:
- Use `gen_random_uuid()` instead of `uuid_generate_v4()` (built-in PostgreSQL, no extension dependency)
- Skip `login_attempts` table and its functions (already exist from Feature 001)
- Skip commented-out `experiments` table (post-MVP)
- Preserve all constraints, indexes, CHECK constraints, and UNIQUE NULLS NOT DISTINCT constraints
- Add `update_updated_at_column()` trigger function and triggers

### Phase B: Row-Level Security (Migration 6)

Enable RLS and create policies using Supabase best practices:
- **Performance**: Use `(select auth.uid())` with `select` wrapper for initPlan caching
- **Role targeting**: All policies use `TO authenticated` to skip evaluation for anon users
- **Reference data tables**: Dual policy — predefined data readable by all authenticated users; user-created data restricted to owner
- **User data tables**: `(select auth.uid()) = user_id` for all CRUD operations
- **Junction tables**: Subquery checking parent table's `user_id` (avoid cross-table joins in policy)
- **body_locations**: Read-only for all authenticated users
- **login_attempts**: Enable RLS (SECURITY DEFINER functions bypass it)

### Phase C: Seed Data (Migrations 7-8)

Insert predefined reference data using `INSERT ... ON CONFLICT DO NOTHING` for idempotency:
- All symptom categories from Data Dictionary (3-level hierarchy)
- All 170+ symptom types organized by category
- All body locations organized by region
- 6 practice categories
- All metric categories and types (daily wellness, practice-related, health vitals)

### Phase D: Tab Navigation

Convert the authenticated app area from Stack to Tabs:
1. Create `app/(app)/(tabs)/_layout.js` with Expo Router `Tabs` component
2. Move home screen from `app/(app)/index.js` to `app/(app)/(tabs)/index.js`
3. Create 3 placeholder tab screens (track, practices, insights)
4. Create profile tab with nested Stack (profile main + security settings)
5. Move security screen from `app/(app)/settings/security.js` to `app/(app)/(tabs)/profile/security.js`
6. Update `app/(app)/_layout.js` to use `Slot` instead of `Stack` (tabs group handles navigation)
7. Remove old `app/(app)/settings/` directory

### Phase E: TanStack Query Infrastructure

Wire up the data fetching layer:
1. Create `src/lib/queryClient.js` — QueryClient with default config (staleTime, gcTime, retry)
2. Create `src/lib/queryKeys.js` — centralized query key factory
3. Wrap app in `QueryClientProvider` in `app/_layout.js`
4. Configure auth token handling (Supabase client already manages JWT refresh)

### Phase F: Testing

1. **SQL tests**: Verify RLS policies block cross-user access and allow own-data access
2. **Seed data verification**: Count queries confirming expected reference data quantities
3. **Unit tests**: queryClient.js config, queryKeys.js factory functions
4. **Component tests**: Tab navigation renders, active tab indication, auth guard redirects
