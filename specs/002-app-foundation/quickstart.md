# Quickstart: App Foundation

**Feature**: 002-app-foundation
**Purpose**: Step-by-step guide to set up, verify, and test the App Foundation feature.

## Prerequisites

- Feature 001 (User Auth) must be complete and deployed
- `login_attempts` table must exist in the Supabase database
- Expo development environment set up (`npx expo start` works)
- Supabase project configured with environment variables

## Setup Steps

### 1. Apply Database Migrations

Migrations are applied in order via the Supabase MCP `apply_migration` tool (or Supabase Dashboard SQL editor). Each migration must complete before the next begins.

**Order**:
1. `create_category_tables` — Creates symptom_categories, metric_categories, practice_categories
2. `create_type_and_reference_tables` — Creates symptom_types, metric_types, body_locations
3. `create_user_data_tables` — Creates symptom_logs, practices, metrics, practice_completions, practice_symptoms
4. `create_medication_tables` — Creates medications, medication_logs, medication_symptoms
5. `create_updated_at_triggers` — Creates trigger function and triggers
6. `enable_rls_and_add_policies` — Enables RLS and creates all policies
7. `seed_categories` — Inserts predefined categories
8. `seed_types_and_locations` — Inserts predefined types and body locations

### 2. Verify Database Schema

Run these verification queries after migrations:

```sql
-- Count all tables (should be 15: 14 new + login_attempts)
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count seed data
SELECT 'symptom_categories' AS tbl, count(*) FROM symptom_categories WHERE is_predefined = true
UNION ALL
SELECT 'symptom_types', count(*) FROM symptom_types WHERE is_predefined = true
UNION ALL
SELECT 'metric_categories', count(*) FROM metric_categories WHERE is_predefined = true
UNION ALL
SELECT 'metric_types', count(*) FROM metric_types WHERE is_predefined = true
UNION ALL
SELECT 'practice_categories', count(*) FROM practice_categories WHERE is_predefined = true
UNION ALL
SELECT 'body_locations', count(*) FROM body_locations;
```

**Expected results**:
- 15 tables total
- All tables have `rowsecurity = true` (including login_attempts)
- symptom_types: 170+
- symptom_categories: ~30
- body_locations: ~62
- practice_categories: 6
- metric_types: ~16
- metric_categories: ~8

### 3. Verify RLS Policies

Test data isolation between two users:

```sql
-- As User A: insert a symptom log
-- As User B: try to select it → should return 0 rows
-- As User B: try to delete it by ID → should affect 0 rows
```

### 4. Install Dependencies (if needed)

No new npm packages required. Verify existing ones:

```bash
npx expo install --check
```

### 5. Start the App

```bash
npx expo start
```

## Verification Checklist

### Database
- [ ] All 14 new tables created successfully
- [ ] All indexes created
- [ ] Triggers fire on UPDATE (test by updating a symptom_log)
- [ ] RLS enabled on all 15 tables (including login_attempts)
- [ ] Seed data counts match expectations
- [ ] Seed data is idempotent (re-running produces no errors and no duplicates)

### RLS Policies
- [ ] Authenticated user can read predefined reference data
- [ ] Authenticated user can create their own data
- [ ] Authenticated user cannot read another user's data
- [ ] Authenticated user cannot modify/delete another user's data
- [ ] User-created custom types visible only to the creating user
- [ ] Unauthenticated requests return zero results
- [ ] Junction table access follows parent table ownership

### Navigation
- [ ] Tab bar visible after sign-in with 5 tabs
- [ ] Tab bar NOT visible on auth screens
- [ ] Tapping each tab shows correct screen
- [ ] Active tab is visually indicated
- [ ] Profile → Security navigates without hiding tab bar
- [ ] Tapping active tab returns to its root screen
- [ ] Sign out from profile tab works correctly

### TanStack Query
- [ ] QueryClientProvider wraps the app
- [ ] Query key factory exports all expected keys
- [ ] Cached data persists across tab switches
- [ ] Network error shows user-friendly message with retry

## Running Tests

```bash
# All tests
npm test

# Specific test files
npm test -- __tests__/lib/queryClient.test.js
npm test -- __tests__/lib/queryKeys.test.js
```

## Troubleshooting

### "relation does not exist" error
Migrations may not have been applied in order. Check `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;` and re-apply missing migrations.

### Seed data has duplicates
The `INSERT ... ON CONFLICT DO NOTHING` pattern requires correct unique constraints. Verify the `UNIQUE NULLS NOT DISTINCT` constraints exist on category and type tables.

### Tab bar not showing
Ensure the `(tabs)` directory is inside `(app)` and the `_layout.js` in `(tabs)` exports a `Tabs` component. Check that `app/(app)/_layout.js` uses `Slot` (not `Stack`) to allow the tabs group to render.

### TanStack Query not caching
Verify `QueryClientProvider` wraps the app in `app/_layout.js` and the `queryClient` instance is created outside the component (module-level singleton).
