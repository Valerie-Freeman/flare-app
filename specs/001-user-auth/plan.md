# Implementation Plan: User Authentication

**Branch**: `001-user-auth` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-user-auth/spec.md`
**Status**: REVISED

> **Note (2026-02-06)**: This plan has been revised to remove client-side encryption. Security is provided by Supabase's built-in AES-256 encryption at rest and server-side rate limiting. See [decision-record.md](./decision-record.md) for details.

## Summary

Implement secure user authentication for the Flare health tracking app, including email/password signup, sign-in, sign-out, and password reset. Uses Supabase Auth for authentication with expo-secure-store for secure token storage. Security is provided by Supabase's built-in AES-256 encryption at rest and server-side rate limiting.

## Technical Context

**Language/Version**: JavaScript (ES2022+)
**Primary Dependencies**:
- @supabase/supabase-js (authentication)
- expo-secure-store (secure token storage)
- react-hook-form (form handling)
- React Context API (auth state management)

**Storage**:
- Supabase PostgreSQL (user accounts, login attempts)
- expo-secure-store (session tokens on device)

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
| **I. Minimal Dependencies** | PASS | Uses only essential dependencies: Supabase (required for backend), expo-secure-store (required for token storage), react-hook-form (approved in architecture). No extra libraries added. |
| **II. YAGNI** | PASS | Implements only MVP auth features. Social auth, 2FA, biometrics explicitly deferred to post-MVP. |
| **III. Privacy & Data Security** | PASS | Server-side AES-256 encryption at rest via Supabase, RLS for data isolation, server-side rate limiting. |
| **IV. Human-in-the-Loop** | PASS | Plan requires approval before implementation. |
| **V. Clean & Simple UX** | PASS | Minimal auth screens (welcome, sign-in, sign-up, password reset). Clear error messages. Standard email-based password reset. |

**Security Requirements Check:**
- [x] Server-side encryption at rest (Supabase AES-256)
- [x] Row-Level Security (RLS) policies on user data
- [x] Secure token storage via expo-secure-store
- [x] Server-side rate limiting for failed login attempts
- [x] No logging of sensitive user data
- [x] HTTPS for all network communication (Supabase default)

**ADR Reference**: See `docs/adr/001-encryption-key-management.md` (SUPERSEDED) for historical context on encryption approach decision.

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
src/
├── contexts/
│   └── AuthContext.js           # Auth state provider
├── services/
│   ├── supabase.js              # Supabase client config
│   ├── auth.js                  # Auth service functions
│   └── encryption.js            # Local storage helpers (user ID, session)
app/
├── _layout.js                   # Root layout with auth provider
├── (auth)/
│   ├── _layout.js               # Auth flow layout
│   ├── welcome.js
│   ├── sign-in.js
│   ├── sign-up.js
│   ├── forgot-password.js
│   └── reset-password.js        # Deep link handler for password reset
└── (app)/
    ├── _layout.js               # Protected routes layout
    └── settings/
        └── security.js          # Security settings (change password)
```

**Structure Decision**: Expo Router file-based routing with screen logic directly in route files (no separate screens layer). Auth screens in `(auth)` group, protected screens in `(app)` group. Services layer handles business logic, contexts manage global state.

## Task Sequence

Implementation order based on technical dependencies:

### Phase 1: Infrastructure
1. Create `login_attempts` table in Supabase for rate limiting
2. Create `check_login_allowed()` database function
3. Set up RLS policies for user data
4. Create Supabase client with secure storage adapter (`src/services/supabase.js`)

### Phase 2: Core Services
5. Local storage service - user ID and session helpers (`src/services/encryption.js`)
6. Auth service - Supabase auth wrapper + rate limiting (`src/services/auth.js`)

### Phase 3: State Management
7. AuthContext - session state, auth listener (`src/contexts/AuthContext.js`)

### Phase 4: P1 Screens
8. Welcome screen (`app/(auth)/welcome.js`)
9. Sign Up screen (`app/(auth)/sign-up.js`)
10. Sign In screen with rate limiting feedback (`app/(auth)/sign-in.js`)
11. Root layout with auth provider (`app/_layout.js`)

### Phase 5: P2 Screens
12. Forgot Password screen (`app/(auth)/forgot-password.js`)
13. Reset Password screen with deep link handler (`app/(auth)/reset-password.js`)
14. Sign Out action

### Phase 6: Polish
15. Security settings screen (`app/(app)/settings/security.js`)

## Complexity Tracking

No constitution violations requiring justification. All dependencies are minimal and necessary for the feature requirements.

## Security Notes

- **Encryption at rest**: Handled by Supabase (AES-256) — no client-side encryption needed
- **Rate limiting**: Server-side via `login_attempts` table and database function
- **Password reset**: Standard email-based flow (no recovery passphrase)
- **Token storage**: expo-secure-store for JWT tokens on device