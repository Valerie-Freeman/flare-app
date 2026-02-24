# Tasks: App Foundation

**Input**: Design documents from `/specs/002-app-foundation/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/supabase-queries.md, quickstart.md

**Tests**: Unit tests for TanStack Query infrastructure are included (explicitly defined in plan.md project structure). Database verification is done via SQL queries, not formal test files.

**Organization**: Tasks grouped by user story. Database stories (US1-US3) are sequential (migration dependencies). App stories (US4-US5) are independent and can run in parallel with database work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **App code**: `app/` (Expo Router file-based routing), `src/` (services, contexts, lib)
- **Tests**: `__tests__/` at repository root
- **Database**: Applied via Supabase MCP `apply_migration` tool (not local files)
- **Reference**: `database/schema.sql` (authoritative DDL), `docs/data-dictionary.md` (seed data content)

---

## Phase 1: Setup

**Purpose**: Verify prerequisites from Feature 001 are in place

- [X] T001 Verify prerequisites — confirm `login_attempts` table exists in Supabase, all npm dependencies installed (`npx expo install --check`), and Supabase project is accessible via MCP tools

---

## Phase 2: User Story 1 — Health Data Can Be Stored and Retrieved (Priority: P1) :dart: MVP

**Goal**: Create the full database schema (14 tables) so all health tracking data types can be persisted with proper relationships, constraints, and indexes.

**Independent Test**: Insert and retrieve sample health data (a symptom log, a practice, a medication, a metric) and confirm all constraints, relationships, and data integrity rules are enforced.

**Note**: All migrations use `gen_random_uuid()` instead of `uuid_generate_v4()` (Decision 1 in research.md). Adapt DDL from `database/schema.sql` for Supabase environment.

### Implementation for User Story 1

- [X] T002 [US1] Apply migration `create_category_tables` via Supabase MCP — create `symptom_categories` (UUID PK, name, parent_id self-ref FK ON DELETE CASCADE, level CHECK 1-3, display_order, is_predefined, user_id, created_at, UNIQUE NULLS NOT DISTINCT on (name, parent_id, user_id), indexes on parent_id and user_id WHERE NOT NULL), `metric_categories` (identical structure), and `practice_categories` (UUID PK, name, display_order, is_predefined, user_id, created_at, UNIQUE NULLS NOT DISTINCT on (name, user_id), index on user_id WHERE NOT NULL) per `database/schema.sql`
- [X] T003 [US1] Apply migration `create_type_and_reference_tables` via Supabase MCP — create `symptom_types` (UUID PK, name, category_id FK to symptom_categories ON DELETE CASCADE, severity_scale DEFAULT '0-10', is_predefined, user_id, UNIQUE NULLS NOT DISTINCT on (name, category_id, user_id), indexes on category_id and user_id), `metric_types` (UUID PK, name, category_id FK to metric_categories, unit, default_target, is_predefined, user_id, same constraint/index pattern), and `body_locations` (UUID PK, name UNIQUE, region, display_order, index on region) per `database/schema.sql`
- [X] T004 [US1] Apply migration `create_user_data_tables` via Supabase MCP — create `symptom_logs` (with severity CHECK 0-10, source CHECK manual/nlp, metadata JSONB, 4 indexes including composite user_id+started_at DESC), `practices` (with tracking_type CHECK metric/completion, frequency CHECK daily/weekly/specific_days, metric_tracking_requires_metric_type constraint, 3 indexes), `metrics` (with source CHECK manual/journal/integration/nlp, 5 indexes), `practice_completions` (3 indexes), and `practice_symptoms` (composite PK, index on symptom_type_id) per `database/schema.sql`
- [X] T005 [US1] Apply migration `create_medication_tables` via Supabase MCP — create `medications` (with active flag, is_supplement flag, source CHECK, 2 indexes), `medication_logs` (with taken flag, 3 indexes), and `medication_symptoms` (composite PK, index on symptom_type_id) per `database/schema.sql`
- [X] T006 [US1] Apply migration `create_updated_at_triggers` via Supabase MCP — create `update_updated_at_column()` trigger function and apply BEFORE UPDATE triggers on `symptom_logs`, `practices`, and `medications`
- [X] T007 [US1] Verify schema creation — run validation queries: count tables (expect 15 including login_attempts), verify all columns/types match `database/schema.sql`, confirm indexes exist, test constraint enforcement (e.g., severity outside 0-10 rejected, metric tracking without metric_type_id rejected) per `specs/002-app-foundation/quickstart.md`

**Checkpoint**: All 14 tables exist with correct structure. Data can be inserted and retrieved. Constraints and triggers are enforced.

---

## Phase 3: User Story 2 — User Health Data Is Isolated and Protected (Priority: P1)

**Goal**: Enforce row-level security on every table so users can only access their own health data, while predefined reference data remains globally readable.

**Independent Test**: Attempt cross-user data access and confirm it is denied at the database level, independent of application code.

**Dependencies**: Requires Phase 2 (US1) — all tables must exist before RLS policies can be applied.

### Implementation for User Story 2

- [X] T008 [US2] Apply migration `enable_rls_and_add_policies` via Supabase MCP — enable RLS on all 14 new tables plus `login_attempts`, then create policies using `(select auth.uid())` wrapping and `TO authenticated` targeting per research.md Decision 3: **Pattern A** (symptom_categories, metric_categories, practice_categories, symptom_types, metric_types) — SELECT allows predefined OR owner, INSERT/UPDATE/DELETE restricted to owner of non-predefined rows; **Pattern B** (symptom_logs, practices, metrics, practice_completions, medications, medication_logs) — all CRUD restricted to owner via user_id match; **Pattern C** (practice_symptoms, medication_symptoms) — access via parent table ownership subquery, no UPDATE policy; **Pattern D** (body_locations) — SELECT only for all authenticated; **Pattern E** (login_attempts) — enable RLS with no policies (SECURITY DEFINER functions bypass)
- [X] T009 [US2] Verify RLS data isolation — test that authenticated user can read predefined reference data, can CRUD their own data, cannot read/modify another user's data, junction table access follows parent ownership, and unauthenticated requests return zero results per `specs/002-app-foundation/quickstart.md`

**Checkpoint**: All data access is enforced at the database level. Cross-user access is impossible regardless of application code.

---

## Phase 4: User Story 3 — Predefined Health Reference Data Is Available (Priority: P2)

**Goal**: Populate the database with a comprehensive library of predefined symptom types, categories, body locations, practice categories, and metric types so users have immediate options when tracking health data.

**Independent Test**: Query reference data tables and confirm the expected catalog is present with correct categorization, hierarchy, and counts.

**Dependencies**: Requires Phase 2 (US1) — tables must exist. Phase 3 (US2/RLS) should also be applied so seed data respects security policies.

### Implementation for User Story 3

- [X] T010 [US3] Apply migration `seed_categories` via Supabase MCP — insert all predefined categories using `INSERT ... ON CONFLICT DO NOTHING` (Decision 6 in research.md): **symptom_categories** (~30 rows, 3-level hierarchy — 3 top-level: Physical, Mental/Emotional, Sleep; level 2 subcategories: Pain, Neurological, Fatigue & Energy, Digestive, Respiratory, Cardiovascular, Skin, Immune/Inflammatory, ENT, Eyes, Other Physical, Mood, Stress & Overwhelm, Motivation & Interest, Social, Other Mental, Falling Asleep, Staying Asleep, Sleep Quality, Sleep Disorders, Daytime Effects; level 3 sub-subcategories under Pain: Head & Face, Neck & Spine, Joints, Muscle, Nerve Pain, Chest, Abdominal; under Neurological: Cognitive, Sensory, Motor, Vestibular, Vision; under Digestive: Upper GI, Lower GI, General), **metric_categories** (~8 rows, 2-level: Daily Wellness, Practice-Related, Health Vitals with subcategories), **practice_categories** (6 rows: Supplements, Exercise, Mindfulness, Sleep Hygiene, Nutrition, Other) — all with `is_predefined = true` and `user_id = NULL`, sourced from `docs/data-dictionary.md`
- [X] T011 [US3] Apply migration `seed_types_and_locations` via Supabase MCP — insert using `INSERT ... ON CONFLICT DO NOTHING`: **symptom_types** (170+ rows organized by category_id FK referencing seeded categories — Physical/Pain/Head & Face: Migraine, Tension headache, Cluster headache, etc.; through all subcategories per `docs/data-dictionary.md`), **metric_types** (~16 rows: sleep duration/hours, sleep quality/0-10, morning energy/0-10, morning pain/0-10, evening energy/0-10, evening mood/0-10, overall daily pain/0-10, water intake/glasses, exercise duration/minutes, steps/count, meditation minutes/minutes, screen time/hours, weight/lbs, blood pressure systolic/mmHg, blood pressure diastolic/mmHg, heart rate resting/BPM, body temperature/°F), **body_locations** (~62 rows across 12 regions: Head/Face 11, Neck 4, Shoulders 3, Arms 8, Hands 4, Chest 4, Back 3, Abdomen 4, Hips 3, Legs 10, Feet 4, General 2) — all sourced from `docs/data-dictionary.md`
- [X] T012 [US3] Verify seed data completeness and idempotency — run count queries (symptom_types >= 170, symptom_categories ~30, body_locations ~62, practice_categories = 6, metric_types ~16, metric_categories ~8), then re-run both seed migrations and confirm no duplicates or errors per `specs/002-app-foundation/quickstart.md`

**Checkpoint**: All reference data is populated. Users will find a comprehensive library of options when future tracking features are built.

---

## Phase 5: User Story 4 — Tab-Based App Navigation (Priority: P2)

**Goal**: Convert the authenticated app area from stack-only navigation to a 5-tab bottom navigator, establishing the navigation shell for all future features.

**Independent Test**: Sign in and confirm the tab bar is visible, all tabs are tappable, switching tabs shows the correct section, and the tab bar persists during deep navigation.

**Dependencies**: None — fully independent of database work (Phases 2-4). Can run in parallel with US1-US3.

### Implementation for User Story 4

- [X] T013 [US4] Create tab navigator layout in `app/(app)/(tabs)/_layout.js` — export Expo Router `Tabs` component with 5 tabs: Home (route: index, icon: home-outline), Track (route: track, icon: notebook-edit-outline), Practices (route: practices, icon: checkbox-marked-circle-outline), Insights (route: insights, icon: chart-line), Profile (route: profile, icon: account-outline) using MaterialCommunityIcons, active tab uses theme primary color, inactive tabs muted gray per plan.md Tab Configuration
- [X] T014 [US4] Move home screen from `app/(app)/index.js` to `app/(app)/(tabs)/index.js` — preserve existing content, ensure it renders as the Home tab
- [X] T015 [P] [US4] Create placeholder screen in `app/(app)/(tabs)/track.js` — minimal screen with section name "Track" and "Coming soon" text, centered layout using React Native Paper components
- [X] T016 [P] [US4] Create placeholder screen in `app/(app)/(tabs)/practices.js` — minimal screen with section name "Practices" and "Coming soon" text, same pattern as track.js
- [X] T017 [P] [US4] Create placeholder screen in `app/(app)/(tabs)/insights.js` — minimal screen with section name "Insights" and "Coming soon" text, same pattern as track.js
- [X] T018 [US4] Create profile tab with nested Stack navigator — create `app/(app)/(tabs)/profile/_layout.js` (Stack navigator for profile section with header hidden on index) and `app/(app)/(tabs)/profile/index.js` (profile main screen with account info display and sign out button using AuthContext)
- [X] T019 [US4] Move security settings screen from `app/(app)/settings/security.js` to `app/(app)/(tabs)/profile/security.js` — preserve existing functionality, ensure it appears as a Stack screen within the profile tab with tab bar still visible
- [X] T020 [US4] Update `app/(app)/_layout.js` to use `Slot` instead of `Stack` — the `(tabs)` group handles its own navigation, so the `(app)` layout should render a `Slot` to pass through to the tabs while maintaining the existing auth guard logic (redirect to sign-in if unauthenticated)
- [X] T021 [US4] Remove old `app/(app)/settings/` directory after confirming security screen is moved and accessible via profile tab

**Checkpoint**: Tab navigation works. Users see 5 tabs after sign-in, can switch between them, profile tab has nested navigation to security settings, and auth screens do NOT show the tab bar.

---

## Phase 6: User Story 5 — Fast and Reliable Data Loading (Priority: P3)

**Goal**: Wire up TanStack Query with a configured QueryClient, centralized query key factory, and provider so all future features have consistent data fetching, caching, and cache invalidation.

**Independent Test**: Verify QueryClientProvider wraps the app, query key factory exports all expected keys, and the configured defaults (staleTime, gcTime, retry) are applied.

**Dependencies**: None — independent of database and navigation work. Can run in parallel with Phases 2-5.

### Implementation for User Story 5

- [X] T022 [P] [US5] Create `src/lib/queryClient.js` — export a module-level QueryClient singleton with defaults: staleTime 5 minutes (300000ms), gcTime 30 minutes (1800000ms), retry 2, refetchOnWindowFocus true, refetchOnReconnect true per research.md Decision 5
- [X] T023 [P] [US5] Create `src/lib/queryKeys.js` — export centralized query key factory with keys for all entity types per `specs/002-app-foundation/contracts/supabase-queries.md` Query Key Mapping: symptomCategories (all, byParent), symptomTypes (all, byCategory), metricTypes (all), metricCategories (all), practiceCategories (all), bodyLocations (all, byRegion), symptomLogs (list), practices (active), medications (active), practiceCompletions (today), medicationLogs (today), metrics (range)
- [X] T024 [US5] Add `QueryClientProvider` wrapper in `app/_layout.js` — import queryClient from `src/lib/queryClient.js`, wrap existing app content with `QueryClientProvider` from `@tanstack/react-query`, ensure it wraps above the auth and navigation providers
- [X] T025 [P] [US5] Create unit tests in `__tests__/lib/queryClient.test.js` — test that QueryClient exports a singleton, staleTime is 300000ms, gcTime is 1800000ms, retry is 2
- [X] T026 [P] [US5] Create unit tests in `__tests__/lib/queryKeys.test.js` — test that all query key factory functions return correctly structured arrays, parameterized keys include parameters, and all entity types from the contracts have corresponding keys

**Checkpoint**: TanStack Query infrastructure is ready. Future features can use `useQuery`/`useMutation` hooks with the centralized query client and key factory.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all user stories

- [X] T027 Run full verification checklist from `specs/002-app-foundation/quickstart.md` — database (14 tables, indexes, triggers, RLS, seed data), navigation (5 tabs, auth guard, profile nesting), TanStack Query (provider, keys, caching)
- [X] T028 Run `npm test` to verify no regressions in existing test suite and all new tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verify prerequisites
- **US1 (Phase 2)**: Depends on Setup — BLOCKS US2 and US3 (tables must exist for RLS and seed data)
- **US2 (Phase 3)**: Depends on US1 — tables must exist before enabling RLS
- **US3 (Phase 4)**: Depends on US1 — tables must exist before seeding. Recommended after US2 (RLS should be in place)
- **US4 (Phase 5)**: Independent — can run in parallel with Phases 2-4 (different domain: app code vs database)
- **US5 (Phase 6)**: Independent — can run in parallel with Phases 2-5 (different domain: data fetching infrastructure)
- **Polish (Phase 7)**: Depends on ALL previous phases

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories. Foundation for US2 and US3.
- **US2 (P1)**: Depends on US1 (tables must exist). Independent of US3-US5.
- **US3 (P2)**: Depends on US1 (tables must exist). Should follow US2 (RLS). Independent of US4-US5.
- **US4 (P2)**: Fully independent. Can start after Setup (Phase 1).
- **US5 (P3)**: Fully independent. Can start after Setup (Phase 1).

### Within Each User Story

- Migrations must be applied in listed order (FK dependencies)
- Verification tasks follow implementation tasks
- Tests (US5) can run in parallel but after their implementation tasks

### Parallel Opportunities

**Cross-domain parallelism** (biggest time savings):
- US4 (tab navigation) can run simultaneously with US1 → US2 → US3 (database pipeline)
- US5 (TanStack Query) can run simultaneously with US1 → US2 → US3 (database pipeline)
- US4 and US5 can run simultaneously with each other

**Within-story parallelism**:
- T015, T016, T017 (placeholder tab screens) are parallel — different files, no dependencies
- T022, T023 (queryClient.js, queryKeys.js) are parallel — different files
- T025, T026 (unit test files) are parallel — different files

---

## Parallel Example: Optimal Execution

```text
# Stream A: Database (sequential — migration dependencies)
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012

# Stream B: App Code (can start immediately after T001)
T013 → T014 → [T015 | T016 | T017] → T018 → T019 → T020 → T021

# Stream C: Data Fetching (can start immediately after T001)
[T022 | T023] → T024 → [T025 | T026]

# Final: Polish (after Streams A, B, C complete)
T027 → T028
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: US1 — Schema (T002-T007)
3. **STOP and VALIDATE**: All 14 tables exist with correct structure
4. The database is ready for feature development even without RLS/seed data

### Incremental Delivery

1. Setup → US1 (Schema) → Verify tables exist (MVP database)
2. Add US2 (RLS) → Verify data isolation (secure database)
3. Add US3 (Seed Data) → Verify reference data present (complete database)
4. Add US4 (Tab Navigation) → Verify navigation works (app shell ready)
5. Add US5 (TanStack Query) → Verify caching works (data layer ready)
6. Each story adds value without breaking previous stories

### Recommended Execution Order (Single Developer)

Given cross-domain independence, the most efficient order is:

1. **T001** (Setup)
2. **T002-T007** (US1: Schema) + **T013-T021** (US4: Tabs) — interleave database migrations with app code while waiting for migrations to apply
3. **T008-T009** (US2: RLS)
4. **T010-T012** (US3: Seed Data) + **T022-T026** (US5: TanStack Query) — interleave seed migrations with query infrastructure
5. **T027-T028** (Polish)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- All database migrations applied via Supabase MCP `apply_migration` tool — not local SQL files
- `gen_random_uuid()` replaces `uuid_generate_v4()` in all migrations (research.md Decision 1)
- `INSERT ... ON CONFLICT DO NOTHING` for all seed data (research.md Decision 6)
- Seed data content sourced from `docs/data-dictionary.md` (authoritative)
- Table DDL adapted from `database/schema.sql` (authoritative)
- Commit after each completed phase or logical group
- Stop at any checkpoint to validate the story independently
