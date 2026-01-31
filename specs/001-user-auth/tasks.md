# Tasks: User Authentication

**Input**: Design documents from `/specs/001-user-auth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.md

**Tests**: Not included (not explicitly requested in feature specification)

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Exact file paths included in descriptions

## Path Conventions

- **Services**: `src/services/`
- **Contexts**: `src/contexts/`
- **Utils**: `src/utils/`
- **Routes**: `app/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Supabase database setup

- [ ] T001 Create `user_keys` table in Supabase SQL Editor per quickstart.md
- [ ] T002 Enable RLS and create policies for `user_keys` table in Supabase SQL Editor
- [ ] T003 Configure Supabase Auth settings (Site URL, Redirect URLs for deep links) in Supabase Dashboard

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create Supabase client with expo-secure-store adapter in src/services/supabase.js
- [x] T005 [P] Implement encryption service (MEK generation, PBKDF2 key derivation, encrypt/decrypt) in src/services/encryption.js
- [x] T006 [P] Implement passphrase generator (BIP39 6-word) in src/utils/passphrase.js
- [x] T007 Implement auth service (signUp, signIn, signOut, resetPassword, MEK management) in src/services/auth.js
- [x] T008 Create AuthContext with session state and onAuthStateChange listener in src/contexts/AuthContext.js
- [x] T009 Create root layout with AuthContext provider in app/_layout.js
- [x] T010 Create auth flow layout for unauthenticated routes in app/(auth)/_layout.js
- [x] T011 Create protected routes layout with auth guard in app/(app)/_layout.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - New User Registration (Priority: P1)

**Goal**: Users can create accounts with email/password and receive a recovery passphrase

**Independent Test**: Complete signup flow, verify recovery passphrase is displayed, confirm user can access app main screen

### Implementation for User Story 1

- [x] T012 [US1] Create welcome screen with Create Account and Sign In buttons in app/(auth)/welcome.js
- [x] T013 [US1] Create sign-up screen with email/password form and validation in app/(auth)/sign-up.js
- [x] T014 [US1] Add password validation (8+ chars, upper, lower, digit) to sign-up form in app/(auth)/sign-up.js
- [x] T015 [US1] Integrate signUp auth service call with MEK generation in app/(auth)/sign-up.js
- [x] T016 [US1] Display recovery passphrase after successful signup with copy functionality in app/(auth)/sign-up.js
- [x] T017 [US1] Add passphrase confirmation step (user acknowledges saving) in app/(auth)/sign-up.js
- [x] T018 [US1] Handle signup errors (email exists, invalid password) with user-friendly messages in app/(auth)/sign-up.js
- [x] T019 [US1] Navigate to app main screen after passphrase confirmation in app/(auth)/sign-up.js

**Checkpoint**: User Story 1 complete - new users can register and receive recovery passphrase

---

## Phase 4: User Story 2 - Returning User Sign In (Priority: P1)

**Goal**: Returning users can sign in and access their encrypted data

**Independent Test**: Sign in with valid credentials, verify automatic sign-in on app restart within session validity

### Implementation for User Story 2

- [x] T020 [US2] Create sign-in screen with email/password form in app/(auth)/sign-in.js
- [x] T021 [US2] Integrate signIn auth service call with MEK decryption in app/(auth)/sign-in.js
- [x] T022 [US2] Handle sign-in errors with generic "Invalid email or password" message in app/(auth)/sign-in.js
- [x] T023 [US2] Implement automatic session restore on app launch in src/contexts/AuthContext.js
- [x] T024 [US2] Navigate to app main screen after successful sign-in in app/(auth)/sign-in.js

**Checkpoint**: User Stories 1 AND 2 complete - users can register and sign in

---

## Phase 5: User Story 3 - Password Reset (Priority: P2)

**Goal**: Users can reset forgotten password and recover encrypted data via recovery passphrase

**Independent Test**: Request password reset, follow email link, enter new password, enter recovery passphrase, verify data access

### Implementation for User Story 3

- [x] T025 [US3] Create forgot-password screen with email input in app/(auth)/forgot-password.js
- [x] T026 [US3] Integrate resetPasswordForEmail auth service call in app/(auth)/forgot-password.js
- [x] T027 [US3] Show success message after password reset email sent in app/(auth)/forgot-password.js
- [x] T028 [US3] Handle PASSWORD_RECOVERY auth event for deep link callback in src/contexts/AuthContext.js
- [x] T029 [US3] Detect password_reset_pending flag and prompt for recovery passphrase in src/contexts/AuthContext.js
- [x] T030 [US3] Create recovery passphrase entry modal/screen for post-reset MEK recovery in app/(auth)/sign-in.js
- [x] T031 [US3] Implement MEK recovery using recovery passphrase (decrypt + re-encrypt with new password) in src/services/auth.js
- [x] T032 [US3] Handle incorrect recovery passphrase with clear error message in app/(auth)/sign-in.js
- [x] T033 [US3] Implement passphrase entry lockout after 3 incorrect attempts (temporary lock with clear message) in src/services/auth.js

**Checkpoint**: User Story 3 complete - password reset with data recovery works

---

## Phase 6: User Story 4 - User Sign Out (Priority: P2)

**Goal**: Users can sign out, clearing local session and encryption keys

**Independent Test**: Sign out from settings, verify return to welcome screen, verify re-authentication required

### Implementation for User Story 4

- [x] T034 [US4] Add sign out button/action to app (settings or profile area)
- [x] T035 [US4] Implement signOut in auth service with local key clearing in src/services/auth.js
- [x] T036 [US4] Clear MEK and user_id from expo-secure-store on sign out in src/services/auth.js
- [x] T037 [US4] Navigate to welcome screen after sign out in src/contexts/AuthContext.js

**Checkpoint**: User Story 4 complete - sign out clears all local auth state

---

## Phase 7: User Story 5 - Recovery Passphrase Management (Priority: P2)

**Goal**: Users can view and regenerate their recovery passphrase

**Independent Test**: View recovery passphrase in settings, copy to clipboard, generate new passphrase with warning

### Implementation for User Story 5

- [x] T038 [US5] Create security settings screen with passphrase management in app/(app)/settings/security.js
- [x] T039 [US5] Add re-authentication requirement before viewing passphrase in app/(app)/settings/security.js
- [x] T040 [US5] Display current recovery passphrase with copy functionality in app/(app)/settings/security.js
- [x] T041 [US5] Implement passphrase regeneration with confirmation warning in app/(app)/settings/security.js
- [x] T042 [US5] Update encrypted_mek_recovery in user_keys after passphrase regeneration in src/services/auth.js

**Checkpoint**: User Story 5 complete - users can manage their recovery passphrase

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Account lockout, edge cases, and final improvements

- [x] T043 Implement failed login attempt tracking in user metadata in src/services/auth.js
- [x] T044 Add lockout check before sign-in attempts (15 min after 5 failures) in src/services/auth.js
- [x] T045 Display lockout status with remaining time to user in app/(auth)/sign-in.js
- [x] T046 Reset failed attempt count on successful sign-in in src/services/auth.js
- [x] T047 Add offline detection with "Internet connection required" message in src/contexts/AuthContext.js
- [x] T048 Create ADR for encryption key management in docs/adr/001-encryption-key-management.md
- [ ] T049 Run quickstart.md validation (manual test checklist)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and can run in parallel
  - US3, US4, US5 are P2 and can run in parallel after P1
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational - Builds on sign-in flow from US2
- **User Story 4 (P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 5 (P2)**: Can start after Foundational - No dependencies on other stories

### Within Each User Story

- Service integrations before UI completion
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

Within **Foundational Phase**:
- T005 (encryption.js) and T006 (passphrase.js) can run in parallel

Within **User Story 1**:
- After T013 (form created), T014-T018 build sequentially

Within **Phase 8 (Polish)**:
- T043-T046 (lockout logic) are sequential
- T047 (offline detection) can run in parallel with other polish tasks
- T048 (ADR) already complete

---

## Parallel Example: Foundational Phase

```bash
# Launch parallel foundational tasks:
Task: "Implement encryption service in src/services/encryption.js"
Task: "Implement passphrase generator in src/utils/passphrase.js"

# Then sequential (depends on above):
Task: "Implement auth service in src/services/auth.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (New User Registration)
4. Complete Phase 4: User Story 2 (Returning User Sign In)
5. **STOP and VALIDATE**: Test registration and sign-in independently
6. Deploy/demo if ready - this is a functional MVP

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently (users can register)
3. Add User Story 2 -> Test independently (users can sign in) -> **MVP Complete**
4. Add User Story 3 -> Test independently (password reset works)
5. Add User Story 4 -> Test independently (sign out works)
6. Add User Story 5 -> Test independently (passphrase management)
7. Add Polish phase -> Full feature complete

### Suggested MVP Scope

**Minimum**: User Stories 1 + 2 (registration + sign-in)
**Recommended**: User Stories 1 + 2 + 4 (add sign-out for complete auth cycle)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No tests included (not requested in spec) - add if needed later
