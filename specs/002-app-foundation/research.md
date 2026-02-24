# Research: App Foundation

**Feature**: 002-app-foundation
**Date**: 2026-02-21

## Decision 1: UUID Generation Strategy

**Decision**: Use `gen_random_uuid()` instead of `uuid_generate_v4()` in all migrations.

**Rationale**: PostgreSQL 13+ includes `gen_random_uuid()` as a built-in function — no extension required. The existing `uuid-ossp` extension is installed in Supabase's `extensions` schema, and `uuid_generate_v4()` works via schema path resolution, but relying on a built-in function is simpler and follows Principle I (Minimal Dependencies). Both functions produce identical v4 UUIDs.

**Alternatives considered**:
- `uuid_generate_v4()` via `uuid-ossp` extension: Already available in Supabase but adds an implicit extension dependency. The existing `login_attempts` table uses `extensions.uuid_generate_v4()` — our new tables will use the built-in alternative for consistency going forward.
- `extensions.uuid_generate_v4()` with explicit schema: Works but ties migrations to Supabase's specific extension schema layout.

**Impact**: The authoritative `database/schema.sql` uses `uuid_generate_v4()`. Migrations will adapt this to `gen_random_uuid()` for the Supabase environment. The schema.sql remains the canonical reference for table structure; migrations are the deployment adaptation.

---

## Decision 2: Migration Granularity

**Decision**: Split the schema into 8 migrations (4 schema + 1 triggers + 1 RLS + 2 seed data).

**Rationale**: Each migration handles one logical concern, making it easier to debug failures and reason about deployment order. The dependency graph (categories → types → user data → junction tables) maps naturally to separate migrations. Seed data is separate from schema to allow re-seeding independently.

**Alternatives considered**:
- Single monolithic migration: Simpler but harder to debug, and mixes DDL with DML (seed data).
- Per-table migrations (14+ files): Too granular, increases migration count without proportional benefit.
- Schema + seed in same migration: Violates Single Responsibility and makes idempotent re-seeding harder.

**Migration order and dependencies**:
```
1. create_category_tables          — no dependencies (self-referencing hierarchies)
2. create_type_and_reference_tables — depends on 1 (FK to categories)
3. create_user_data_tables          — depends on 1, 2 (FK to types, categories, body_locations)
4. create_medication_tables         — depends on 2 (FK to symptom_types)
5. create_updated_at_triggers       — depends on 3, 4 (references tables with updated_at)
6. enable_rls_and_add_policies      — depends on 1-4 (all tables must exist)
7. seed_categories                  — depends on 1 (inserts into category tables)
8. seed_types_and_locations         — depends on 2, 7 (FK to categories, inserts into type tables)
```

---

## Decision 3: RLS Policy Patterns

**Decision**: Three distinct RLS patterns based on table type, following Supabase performance best practices.

**Rationale**: Supabase documentation demonstrates that `(select auth.uid())` wrapping provides 95%+ performance improvement over bare `auth.uid()` calls by enabling PostgreSQL's initPlan caching. Using `TO authenticated` prevents unnecessary policy evaluation for anonymous requests.

### Pattern A: Reference Data Tables (categories + types)
Tables: `symptom_categories`, `metric_categories`, `practice_categories`, `symptom_types`, `metric_types`

```sql
-- Predefined data readable by all authenticated users; user-created data only by owner
CREATE POLICY "select_reference_data" ON table_name FOR SELECT TO authenticated
USING (is_predefined = true OR (select auth.uid()) = user_id);

-- Only the owner can insert user-created entries
CREATE POLICY "insert_user_data" ON table_name FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id AND is_predefined = false);

-- Only the owner can update their user-created entries
CREATE POLICY "update_user_data" ON table_name FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id AND is_predefined = false)
WITH CHECK ((select auth.uid()) = user_id AND is_predefined = false);

-- Only the owner can delete their user-created entries
CREATE POLICY "delete_user_data" ON table_name FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id AND is_predefined = false);
```

### Pattern B: User Data Tables
Tables: `symptom_logs`, `practices`, `metrics`, `practice_completions`, `medications`, `medication_logs`

```sql
CREATE POLICY "select_own" ON table_name FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "insert_own" ON table_name FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update_own" ON table_name FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete_own" ON table_name FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);
```

### Pattern C: Junction Tables (no user_id column)
Tables: `practice_symptoms`, `medication_symptoms`

```sql
-- Access controlled via parent table ownership check
CREATE POLICY "select_own_links" ON practice_symptoms FOR SELECT TO authenticated
USING (
  practice_id IN (SELECT id FROM practices WHERE user_id = (select auth.uid()))
);

CREATE POLICY "insert_own_links" ON practice_symptoms FOR INSERT TO authenticated
WITH CHECK (
  practice_id IN (SELECT id FROM practices WHERE user_id = (select auth.uid()))
);

CREATE POLICY "delete_own_links" ON practice_symptoms FOR DELETE TO authenticated
USING (
  practice_id IN (SELECT id FROM practices WHERE user_id = (select auth.uid()))
);
-- No UPDATE policy — composite PK means delete + re-insert
```

### Pattern D: Read-Only Reference Tables
Tables: `body_locations`

```sql
CREATE POLICY "select_all" ON body_locations FOR SELECT TO authenticated
USING (true);
-- No INSERT/UPDATE/DELETE policies — system-managed data only
```

### Pattern E: Login Attempts (existing table)
```sql
-- Enable RLS (currently disabled) — SECURITY DEFINER functions bypass it
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — all access via SECURITY DEFINER functions
```

**Alternatives considered**:
- Not enabling RLS on `login_attempts`: Leaves the table exposed to direct anon/authenticated access. Enabling RLS with no policies means only SECURITY DEFINER functions can access it — more secure.
- JOIN-based policies for junction tables: Supabase docs warn that joins in RLS policies cause severe performance degradation. Using `IN (SELECT ...)` with the filter on the subquery is the recommended pattern.

---

## Decision 4: Tab Navigation Architecture

**Decision**: Use Expo Router's `Tabs` component within the `(app)` group. Profile tab uses a nested Stack for deeper navigation (security settings) while other tabs are single placeholder screens.

**Rationale**: Expo Router's file-based routing with `Tabs` is the standard approach for bottom tab navigation. Using a `(tabs)` group inside `(app)` preserves the existing auth guard pattern. The profile tab needs a nested Stack because it has a sub-screen (security settings) that should render with the tab bar still visible.

**Alternatives considered**:
- React Native Paper `BottomNavigation` as custom tab bar: Would require writing a complex adapter between Expo Router and Paper's navigation API. Over-engineering for placeholder tabs.
- Single-level tabs (no nested stack for profile): Would require pushing security screen as a modal or on top of tabs, hiding the tab bar. Violates FR-018 (tab bar remains visible during deep navigation).
- Hiding placeholder tabs until features are built: Considered but rejected — the roadmap says "Tab navigator from 002 provides navigation in the interim." Having all tabs visible establishes the app's information architecture from the start.

**Tab implementation details**:
- Tab icons from `@expo/vector-icons` (MaterialCommunityIcons), included with Expo by default
- Active tab uses theme primary color; inactive tabs use muted gray
- Tab bar background matches app theme (clean, minimal per Principle V)

---

## Decision 5: TanStack Query Configuration

**Decision**: Configure QueryClient with stale-while-revalidate defaults, centralized query key factory, and provider at the root layout level.

**Rationale**: TanStack Query is already installed (^5.59) but not wired up. The configuration should establish patterns that all future features follow, per Principle VII (Single Source of Truth).

**Configuration choices**:

| Setting | Value | Rationale |
|---------|-------|-----------|
| `staleTime` | 5 minutes | Reference data rarely changes. User data benefits from caching across tab switches. |
| `gcTime` | 30 minutes | Keep cached data available during a typical usage session. Default of 5 min is too aggressive for tab-switching UX. |
| `retry` | 2 | Two retries for transient failures. More than 3 wastes time on persistent errors. |
| `refetchOnWindowFocus` | `true` | Default behavior — refresh when app returns to foreground. |
| `refetchOnReconnect` | `true` | Refresh when network connectivity is restored. |

**Query key factory pattern** (`src/lib/queryKeys.js`):
```javascript
export const queryKeys = {
  // Reference data (cacheable for longer)
  symptomCategories: {
    all: ['symptomCategories'],
    byParent: (parentId) => ['symptomCategories', 'byParent', parentId],
  },
  symptomTypes: {
    all: ['symptomTypes'],
    byCategory: (categoryId) => ['symptomTypes', 'byCategory', categoryId],
  },
  // ... etc for each entity
};
```

This factory pattern ensures consistent cache keys across the app and makes cache invalidation predictable.

**Alternatives considered**:
- No query key factory (inline strings): Leads to typos and inconsistent cache behavior. Violates Principle VII.
- Redux or Zustand for server state: TanStack Query is already chosen in the tech architecture doc. Adding another state library would violate Principle I.
- Optimistic updates by default: Deferred to individual features — optimistic updates require rollback logic specific to each mutation.

---

## Decision 6: Seed Data Idempotency Strategy

**Decision**: Use `INSERT ... ON CONFLICT DO NOTHING` for all seed data insertions.

**Rationale**: The spec requires idempotent seed data (FR-014). `ON CONFLICT DO NOTHING` is the simplest PostgreSQL approach — it attempts the insert and silently skips if a row with the same unique constraint already exists. This works with our `UNIQUE NULLS NOT DISTINCT` constraints on (name, parent_id, user_id) for categories and (name, category_id, user_id) for types.

**Alternatives considered**:
- `ON CONFLICT DO UPDATE`: Would overwrite existing data, which is dangerous if users have modified predefined data (they shouldn't, but defense in depth).
- Check-then-insert (IF NOT EXISTS): More complex SQL, race-condition-prone, and provides no benefit over ON CONFLICT.
- Delete-and-reinsert: Destructive — would break foreign key references from user data tables.

---

## Decision 7: Handling login_attempts RLS

**Decision**: Enable RLS on the existing `login_attempts` table with no user-facing policies.

**Rationale**: The `login_attempts` table currently has RLS disabled, which means any authenticated user could theoretically query it via the Supabase API (seeing other users' login attempt emails). Enabling RLS with no policies blocks all direct access — only the existing SECURITY DEFINER functions (`check_login_allowed`, `record_login_attempt`, `get_lockout_remaining`) can access it, as they bypass RLS.

**Risk assessment**: Low risk. SECURITY DEFINER functions are unaffected by RLS. No application code directly queries `login_attempts` — all access goes through the functions.
