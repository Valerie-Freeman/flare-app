# Implementation Plan: User Authentication

**Branch**: `001-user-auth` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-user-auth/spec.md`

## Summary

Implement secure user authentication for the Flare health tracking app, including email/password signup, sign-in, sign-out, and password reset. The implementation must generate a Master Encryption Key (MEK) during signup, encrypted with both user password and a recovery passphrase, enabling data recovery after password reset. Uses Supabase Auth for authentication with expo-secure-store for local key storage.

## Technical Context

**Language/Version**: JavaScript (ES2022+)
**Primary Dependencies**:
- @supabase/supabase-js (authentication)
- expo-secure-store (secure key storage)
- expo-crypto (encryption key generation)
- react-hook-form (form handling)
- React Context API (auth state management)

**Storage**:
- Supabase PostgreSQL (user accounts, encrypted MEK)
- expo-secure-store (local MEK storage on device)

**Testing**: Jest + React Native Testing Library
**Target Platform**: iOS and Android via Expo (Managed Workflow)
**Project Type**: Mobile application
**Performance Goals**: Sign-in under 10 seconds, registration under 2 minutes
**Constraints**: Online-only (no offline auth for MVP), 7-day session validity
**Scale/Scope**: MVP targeting 0-100 users initially

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Minimal Dependencies** | PASS | Uses only essential dependencies: Supabase (required for backend), expo-secure-store (required for security), expo-crypto (required for encryption), react-hook-form (approved in architecture). No extra libraries added. |
| **II. YAGNI** | PASS | Implements only MVP auth features. Social auth, 2FA, biometrics explicitly deferred to post-MVP. |
| **III. Privacy & Data Security** | PASS | Client-side encryption with MEK, recovery passphrase for data recovery, expo-secure-store for key storage, Supabase RLS for data isolation. |
| **IV. Human-in-the-Loop** | PASS | Plan requires approval before implementation. ADR will be created for encryption approach. |
| **V. Clean & Simple UX** | PASS | Minimal auth screens (welcome, sign-in, sign-up, password reset). Clear error messages. Recovery passphrase display with copy functionality. |

**Security Requirements Check:**
- [x] Client-side encryption using expo-crypto
- [x] MEK stored encrypted with password AND recovery passphrase
- [x] Secure storage via expo-secure-store
- [x] No logging of sensitive user data
- [x] HTTPS for all network communication (Supabase default)

**ADR Required**: Yes - Document encryption key management approach in `docs/adr/001-encryption-key-management.md`

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── auth-api.md      # Authentication API contracts
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
flare-mobile/
├── src/
│   ├── contexts/
│   │   └── AuthContext.js       # Auth state provider
│   ├── services/
│   │   ├── supabase.js          # Supabase client config
│   │   ├── auth.js              # Auth service functions
│   │   └── encryption.js        # MEK generation and management
│   └── utils/
│       └── passphrase.js        # Recovery passphrase generation
├── app/
│   ├── _layout.js               # Root layout with auth provider
│   ├── (auth)/
│   │   ├── _layout.js           # Auth flow layout
│   │   ├── welcome.js
│   │   ├── sign-in.js
│   │   ├── sign-up.js
│   │   └── forgot-password.js
│   └── (app)/
│       └── _layout.js           # Protected routes layout
└── __tests__/
    └── services/
        ├── auth.test.js
        └── encryption.test.js
```

**Structure Decision**: Expo Router file-based routing with screen logic directly in route files (no separate screens layer). Auth screens in `(auth)` group, protected screens in `(app)` group. Services layer handles business logic, contexts manage global state.

## Task Sequence

Implementation order based on technical dependencies:

### Phase 1: Infrastructure
1. Create `user_keys` table in Supabase
2. Set up RLS policies for `user_keys`
3. Create Supabase client with secure storage adapter (`src/services/supabase.js`)

### Phase 2: Core Services
4. Encryption service - MEK generation, PBKDF2, encrypt/decrypt (`src/services/encryption.js`)
5. Passphrase utility - BIP39 word generation (`src/utils/passphrase.js`)
6. Auth service - Supabase auth wrapper + key management (`src/services/auth.js`)

### Phase 3: State Management
7. AuthContext - session state, auth listener (`src/contexts/AuthContext.js`)

### Phase 4: P1 Screens
8. Welcome screen (`app/(auth)/welcome.js`)
9. Sign Up screen with passphrase display (`app/(auth)/sign-up.js`)
10. Sign In screen (`app/(auth)/sign-in.js`)
11. Root layout with auth provider (`app/_layout.js`)

### Phase 5: P2 Screens
12. Forgot Password screen (`app/(auth)/forgot-password.js`)
13. Password reset deep link handler
14. Recovery passphrase entry (after password reset)
15. Sign Out action

### Phase 6: Polish
16. Account lockout logic (failed attempt tracking)

## Complexity Tracking

No constitution violations requiring justification. All dependencies are minimal and necessary for the feature requirements.