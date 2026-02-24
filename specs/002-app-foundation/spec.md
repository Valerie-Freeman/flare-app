# Feature Specification: App Foundation

**Feature Branch**: `002-app-foundation`
**Created**: 2026-02-21
**Status**: Draft
**Input**: User description: "Apply the full database schema as Supabase migrations (excluding login_attempts which exists). Add RLS policies for all tables. Seed predefined data (170+ symptom types, metric types, body locations, practice categories). Convert the app layout from Stack to tab navigator. Wire up TanStack Query."

## Overview

App Foundation establishes the data layer, security policies, reference data, navigation shell, and data-fetching infrastructure that all subsequent features depend on. While largely invisible to end users, this feature transforms the app from an authentication-only shell into a platform ready for health tracking features. Users will see a new tab-based navigation structure; behind the scenes, the database schema, security rules, and data synchronization layer are put in place.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Health Data Can Be Stored and Retrieved (Priority: P1)

The system must be capable of persisting all types of health tracking data — symptom logs, practices, medications, metrics, and journal data — with proper relationships and constraints. This story is verified by successfully writing and reading data across all tables, confirming that the data layer is structurally sound for every feature that follows.

**Why this priority**: Without the data layer, no subsequent feature (symptom tracking, practices, medications, journals, dashboard, reports) can function. This is the foundation everything builds on.

**Independent Test**: Can be verified by inserting and retrieving sample health data (a symptom log, a practice, a medication, a metric) and confirming all constraints, relationships, and data integrity rules are enforced.

**Acceptance Scenarios**:

1. **Given** a user's account exists, **When** health data (symptom log, practice, medication, metric) is created for that user, **Then** the data is persisted with all required fields, relationships, and constraints enforced.
2. **Given** health data exists for a user, **When** that data is queried, **Then** all related data (linked symptom types, categories, body locations) is retrievable through defined relationships.
3. **Given** a record with a foreign key reference, **When** the referenced entity does not exist, **Then** the system rejects the record and returns a clear constraint error.
4. **Given** the database schema, **When** all table structures are inspected, **Then** every table defined in the Data Dictionary is present with the correct columns, types, and constraints (excluding `login_attempts` which was created in Feature 001).

---

### User Story 2 - User Health Data Is Isolated and Protected (Priority: P1)

Each user's health data must be strictly isolated at the database level. Even if application code has a bug, one user must never be able to read, modify, or delete another user's health data. Predefined reference data (symptom types, body locations, etc.) should be readable by all authenticated users.

**Why this priority**: Equal to P1 — a health tracking app without data isolation is a liability. Data privacy is non-negotiable, especially for sensitive health information.

**Independent Test**: Can be verified by attempting cross-user data access and confirming it is denied at the database level, independent of application code.

**Acceptance Scenarios**:

1. **Given** User A has symptom logs, **When** User B queries the symptom logs table, **Then** User B sees zero results (not User A's data).
2. **Given** User A has a practice record, **When** User B attempts to update or delete that record by ID, **Then** the operation fails silently or returns zero affected rows.
3. **Given** predefined symptom types exist (system-level reference data), **When** any authenticated user queries symptom types, **Then** all predefined types are visible.
4. **Given** User A created a custom symptom type, **When** User B queries symptom types, **Then** User B sees all predefined types but NOT User A's custom type.
5. **Given** an unauthenticated request, **When** any data table is queried, **Then** the request returns zero results.

---

### User Story 3 - Predefined Health Reference Data Is Available (Priority: P2)

When users eventually open symptom tracking, practice creation, or journal features, they should find a comprehensive library of predefined options — not an empty screen. The system must come pre-populated with symptom types organized by category, body locations, practice categories, and wellness metric types.

**Why this priority**: Reference data is critical for user experience in all data-entry features. Without it, users would have to manually create every symptom type, category, and metric before they can start tracking — an unacceptable onboarding friction point.

**Independent Test**: Can be verified by querying reference data tables and confirming the expected catalog is present with correct categorization and hierarchy.

**Acceptance Scenarios**:

1. **Given** the database is initialized, **When** symptom types are queried, **Then** at least 170 predefined symptom types are returned, organized under the three top-level categories: Physical, Mental/Emotional, and Sleep.
2. **Given** the database is initialized, **When** symptom categories are queried, **Then** a hierarchical structure exists with three levels (top-level → subcategory → sub-subcategory) matching the Data Dictionary.
3. **Given** the database is initialized, **When** body locations are queried, **Then** all body locations from the Data Dictionary are present, organized by region (Head/Face, Neck, Shoulders, Arms, Hands, Chest, Back, Abdomen, Hips, Legs, Feet, General).
4. **Given** the database is initialized, **When** practice categories are queried, **Then** the six predefined categories are present: Supplements, Exercise, Mindfulness, Sleep Hygiene, Nutrition, and Other.
5. **Given** the database is initialized, **When** metric types are queried, **Then** predefined metric types for daily wellness (sleep duration, sleep quality, energy, pain, mood), practice-related metrics (water intake, exercise duration, steps, meditation minutes), and health vitals (weight, blood pressure, heart rate, temperature) are present.
6. **Given** predefined reference data exists, **When** the seed data process is run again, **Then** it is idempotent — no duplicate entries are created.

---

### User Story 4 - Tab-Based App Navigation (Priority: P2)

After signing in, users see a persistent bottom navigation bar with tabs for the major app sections. This replaces the current stack-only navigation with a familiar mobile pattern that lets users quickly switch between sections without losing their place.

**Why this priority**: The navigation shell determines how users move through the app for every feature that follows. It must be in place before feature-specific screens are built.

**Independent Test**: Can be verified by signing in and confirming the tab bar is visible, all tabs are tappable, and switching tabs shows the correct section.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they complete sign-in, **Then** they see a bottom navigation bar with labeled tabs for the primary app sections.
2. **Given** an authenticated user viewing any tab, **When** they tap a different tab, **Then** the app navigates to that section and the active tab is visually indicated.
3. **Given** an authenticated user on a tab, **When** they navigate deeper within that tab (e.g., into a detail screen), **Then** the bottom navigation bar remains visible.
4. **Given** an unauthenticated user, **When** they are on the sign-in or sign-up screen, **Then** the tab navigation bar is NOT visible.
5. **Given** an authenticated user, **When** they view the tab bar, **Then** the tabs cover these primary sections: Home (dashboard), health logging/tracking, daily practices/tasks, insights/reports, and profile/settings.

---

### User Story 5 - Fast and Reliable Data Loading (Priority: P3)

When users navigate between screens, data loads quickly from a local cache when available and refreshes from the server in the background. Users see their data immediately on return visits to a screen rather than a loading spinner every time. Data mutations (creating, updating, deleting records) reflect in the UI immediately.

**Why this priority**: Data synchronization infrastructure is less visible than navigation but equally important — every feature that reads or writes data depends on it. Without it, each feature would implement ad-hoc data fetching with inconsistent UX.

**Independent Test**: Can be verified by loading data on a screen, navigating away, returning, and confirming data appears instantly from cache rather than showing a loading state.

**Acceptance Scenarios**:

1. **Given** a user has previously loaded data on a screen, **When** they navigate away and return, **Then** the previously loaded data appears immediately (from cache) while a background refresh occurs.
2. **Given** a user creates a new record, **When** the creation succeeds, **Then** the relevant data lists update immediately without requiring a manual refresh.
3. **Given** the user's device loses network connectivity, **When** they navigate to a screen with cached data, **Then** the cached data is displayed with an indication that it may be stale.
4. **Given** a data request fails due to a network error, **When** the user is on the affected screen, **Then** the app displays a user-friendly error message with an option to retry.

---

### Edge Cases

- What happens if the predefined seed data changes between app versions (e.g., new symptom types added)? The seed process must be additive — new reference data is inserted without modifying or removing existing entries, and user-created custom data is never affected.
- What happens if a user creates a custom symptom type with the same name as a predefined one? Both should coexist — the predefined one remains system-level and the custom one belongs to that user. The UI in future features should handle deduplication display logic.
- What happens when a user is on a deep screen within one tab and taps the same tab again? The tab should navigate back to its root screen (standard mobile convention).
- What happens when database migrations run against an existing database that already has the `login_attempts` table? The migrations must not conflict with or recreate the existing `login_attempts` table and its associated functions.

## Requirements *(mandatory)*

### Functional Requirements

#### Database Schema

- **FR-001**: System MUST create all data tables defined in the Data Dictionary (symptom_categories, symptom_types, metric_categories, metric_types, practice_categories, body_locations, symptom_logs, metrics, practices, practice_completions, practice_symptoms, medications, medication_logs, medication_symptoms) without conflicting with the existing `login_attempts` table.
- **FR-002**: System MUST enforce referential integrity between all related tables (e.g., symptom logs reference valid symptom types, practices reference valid practice categories).
- **FR-003**: System MUST support hierarchical category structures with up to three levels for symptom categories and metric categories (top-level, subcategory, sub-subcategory).
- **FR-004**: System MUST support both predefined (system) and user-created entries in all category and type tables, distinguished by an ownership flag and optional user association.
- **FR-005**: System MUST include NLP-readiness columns (`raw_input`, `source`, `notes`) on all user data entry tables to support future natural language input.

#### Data Isolation & Security

- **FR-006**: System MUST enforce row-level data isolation on ALL user data tables — users can only read, create, update, and delete their own records.
- **FR-007**: System MUST allow all authenticated users to read predefined (system-level) reference data in category and type tables.
- **FR-008**: System MUST restrict user-created reference data (custom symptom types, custom categories) to only the user who created them.
- **FR-009**: System MUST deny all data access to unauthenticated requests.

#### Predefined Reference Data

- **FR-010**: System MUST seed at least 170 predefined symptom types, organized under the hierarchical category structure defined in the Data Dictionary (Physical → Pain, Neurological, Fatigue, Digestive, etc.; Mental/Emotional → Mood, Stress, Motivation, Social; Sleep → Falling Asleep, Staying Asleep, Sleep Quality, Sleep Disorders, Daytime Effects).
- **FR-011**: System MUST seed all body locations from the Data Dictionary, organized by region (12 regions: Head/Face, Neck, Shoulders, Arms, Hands, Chest, Back, Abdomen, Hips, Legs, Feet, General).
- **FR-012**: System MUST seed the six predefined practice categories: Supplements, Exercise, Mindfulness, Sleep Hygiene, Nutrition, Other.
- **FR-013**: System MUST seed predefined metric types for daily wellness, practice-related metrics, and health vitals as defined in the Data Dictionary.
- **FR-014**: Seed data insertion MUST be idempotent — running the seed process multiple times must not create duplicate entries.

#### Navigation

- **FR-015**: System MUST provide persistent bottom tab navigation for authenticated users with tabs covering: home/dashboard, health logging, daily tasks/practices, insights/reports, and profile/settings.
- **FR-016**: System MUST visually indicate the currently active tab.
- **FR-017**: System MUST NOT display the tab navigation bar for unauthenticated users (sign-in, sign-up, and other auth screens).
- **FR-018**: Each tab MUST maintain its own navigation history — navigating deep within one tab and switching to another must preserve the first tab's state.

#### Data Fetching Infrastructure

- **FR-019**: System MUST cache server data locally and serve cached data immediately on screen revisits while refreshing from the server in the background.
- **FR-020**: System MUST automatically update relevant data lists in the UI when a record is created, updated, or deleted (no manual refresh required).
- **FR-021**: System MUST display user-friendly error messages when data requests fail, with a retry option.
- **FR-022**: System MUST handle authentication token expiration during data requests gracefully — either by refreshing the token transparently or redirecting to sign-in.

### Key Entities

- **Symptom Category**: A hierarchical grouping for symptom types. Supports up to 3 levels (e.g., Physical → Pain → Head & Face). Can be predefined (system) or user-created. Relates to parent category (self-referencing) and contains many symptom types.
- **Symptom Type**: An individual symptom that users can log (e.g., "Migraine", "Brain fog"). Belongs to a symptom category. Can be predefined or user-created. Referenced by symptom logs.
- **Metric Category**: A hierarchical grouping for metric types (e.g., Daily Wellness → Sleep). Similar structure to symptom categories.
- **Metric Type**: A measurable health value definition (e.g., "Sleep duration" in hours, "Morning energy" on 0-10 scale). Belongs to a metric category. Defines the unit and optional default target. Referenced by metric entries.
- **Practice Category**: A single-level grouping for health practices (Supplements, Exercise, Mindfulness, Sleep Hygiene, Nutrition, Other). Can be predefined or user-created.
- **Body Location**: A reference entry representing a physical body area (e.g., "Knee (left)", "Lower back"). Organized by region. Used to annotate symptom logs with physical location.
- **Symptom Log**: A user's record of experiencing a symptom — includes type, severity (0-10), timing, optional body location, and notes. Supports NLP input provenance tracking.
- **Practice**: A user-defined health commitment (e.g., "Take magnesium", "Morning walk"). Has a tracking type (completion or metric), frequency, optional category, and optional links to symptoms it's expected to help.
- **Practice Completion**: A single instance of a user completing (or skipping) a practice. Multiple completions per day are supported for multi-dose practices.
- **Metric**: A single numeric health measurement recorded by a user. Shared table across practice-related metrics, journal metrics, and standalone measurements. Source field tracks origin (manual, journal, NLP, integration).
- **Medication**: A user's medication record with name, dosage, frequency, and timing. Separate from practices. Supports NLP creation and symptom linking.
- **Medication Log**: A single instance of a user taking (or skipping) a medication dose. Tracks adherence over time.
- **Practice-Symptom Link**: A many-to-many relationship connecting a practice to symptom types the user expects it to improve. Enables future AI correlation analysis.
- **Medication-Symptom Link**: A many-to-many relationship connecting a medication to symptom types. Same purpose as practice-symptom links.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 14 data tables (plus existing login_attempts) pass structural validation — correct columns, types, constraints, and foreign key relationships matching the Data Dictionary.
- **SC-002**: 100% of cross-user data access attempts are blocked at the database level — no user can read, create, update, or delete another user's health data, regardless of application code.
- **SC-003**: At least 170 predefined symptom types are available across 3 top-level categories and their subcategories upon database initialization.
- **SC-004**: All 12 body location regions with their locations are seeded (approximately 60+ individual body locations).
- **SC-005**: Users can navigate between all primary app sections using bottom tabs in under 1 second per transition.
- **SC-006**: Returning to a previously visited screen displays data within 200ms from local cache.
- **SC-007**: Seed data process completes without errors on a fresh database and produces identical results when run repeatedly (idempotent).

## Scope

### In Scope

- Database schema creation for all tables in the Data Dictionary (excluding `login_attempts`)
- Row-level security policies for every table
- Predefined seed data for symptom types/categories, body locations, practice categories, metric types/categories
- Bottom tab navigation shell with placeholder screens for sections not yet implemented
- Data fetching and caching infrastructure setup
- Database indexes for common query patterns

### Out of Scope

- Actual feature screens (symptom logging UI, practice creation UI, etc.) — those are Features 004-007
- Dashboard content and layout — Feature 008
- NLP input parsing — Feature 003
- Push notifications — Feature 009
- Custom theme/styling beyond what exists — no visual redesign in this feature
- Offline-first data access — per PRD, online is required for MVP
- Real-time data subscriptions — not needed for MVP

## Assumptions

- The existing `login_attempts` table and its associated database functions (from Feature 001) will remain untouched and compatible with the new schema.
- The database schema in the Data Dictionary (`docs/data-dictionary.md`) and `database/schema.sql` are the authoritative source for table structures.
- Predefined seed data quantities are approximate — the Data Dictionary lists the specific symptom types, and the exact count may vary slightly from "170+" as the catalog is finalized.
- Tab sections for features not yet implemented (symptoms, practices, reports) will display simple placeholder screens indicating the section name and "Coming soon" status.
- The data caching strategy uses standard stale-while-revalidate patterns — cached data is shown immediately while fresh data loads in the background.
- Display order fields in reference tables determine the default sort order shown to users in future feature UIs.

## Dependencies

- **Feature 001 (User Auth)**: Must be complete — authentication, session management, and the `login_attempts` table must exist.
- **Data Dictionary** (`docs/data-dictionary.md`): Authoritative source for all entity definitions, hierarchies, and seed data content.
- **Database Schema** (`database/schema.sql`): Authoritative source for table DDL, constraints, indexes, and functions.
