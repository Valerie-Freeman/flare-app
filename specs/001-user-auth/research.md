# Research: User Authentication

**Feature**: 001-user-auth
**Date**: 2026-01-31

## Research Areas

### 1. Supabase Auth Integration with Expo

**Decision**: Use @supabase/supabase-js with custom storage adapter for expo-secure-store

**Rationale**:
- Supabase Auth handles email/password authentication, session management, and password reset out of the box
- Custom storage adapter allows tokens to be stored securely in device keychain instead of AsyncStorage
- Automatic token refresh is built-in with configurable session duration
- Row-Level Security (RLS) policies work seamlessly with Supabase Auth

**Alternatives Considered**:
- Firebase Auth: Would require additional backend setup, not aligned with Supabase choice in architecture
- Custom JWT implementation: Unnecessary complexity, reinventing the wheel
- Auth0: Additional cost and dependency, overkill for MVP

**Key Implementation Notes**:
- Create custom storage adapter using expo-secure-store for `getItem`, `setItem`, `removeItem`
- Set `detectSessionInUrl: false` for React Native (no URL-based auth)
- Configure `autoRefreshToken: true` and `persistSession: true`

---

### 2. Master Encryption Key (MEK) Generation and Storage

**Decision**: Use PBKDF2 for key derivation with expo-crypto, store encrypted MEK in Supabase

**Rationale**:
- PBKDF2 is industry-standard for deriving encryption keys from passwords
- expo-crypto provides cryptographically secure random number generation
- Storing encrypted MEK in Supabase allows recovery via passphrase after password reset
- Local MEK cached in expo-secure-store for performance (no re-derivation on each app open)

**Alternatives Considered**:
- Argon2: Better security but not available in expo-crypto, would require native module
- scrypt: Similar to Argon2, not available in Expo managed workflow
- Store MEK only locally: Would lose data on device loss/password reset

**Key Implementation Notes**:
- Generate 256-bit MEK using expo-crypto randomBytes
- Derive Key Encryption Keys (KEK) from password and recovery passphrase using PBKDF2
- Encrypt MEK with both KEKs, store both encrypted versions in Supabase `user_keys` table
- On sign-in: fetch encrypted MEK, decrypt with password-derived KEK, cache in expo-secure-store
- On password reset: decrypt MEK with recovery passphrase KEK, re-encrypt with new password KEK

---

### 3. Recovery Passphrase Generation

**Decision**: Use BIP39-style word list with 6 words (providing ~77 bits of entropy)

**Rationale**:
- Human-readable and memorable compared to random strings
- 6 words balances security with usability (easy to write down)
- BIP39 word list is well-tested and widely used in crypto wallets
- Users familiar with seed phrases from cryptocurrency experience

**Alternatives Considered**:
- Random alphanumeric string: Harder to transcribe accurately, more user errors
- 12-word phrase (standard BIP39): More secure but overkill for encryption recovery
- 4-word phrase: Too weak for security-critical recovery mechanism

**Key Implementation Notes**:
- Use standard BIP39 English word list (2048 words)
- Generate 6 random words using expo-crypto randomBytes
- Display in grouped format (e.g., "sunset mountain river calm ocean breeze")
- Include checksum or confirmation step to verify user saved correctly

---

### 4. Session Management Strategy

**Decision**: Use Supabase default session with 1-hour access token and 7-day refresh token

**Rationale**:
- Access token (1 hour) limits exposure if token is compromised
- Refresh token (7 days) matches spec requirement (SC-004: 7-day session)
- Automatic refresh handled by Supabase client
- Aligns with architecture document specification

**Alternatives Considered**:
- Longer access token (24 hours): Higher security risk if compromised
- Shorter refresh token (1 day): Poor UX requiring frequent re-login
- Custom session implementation: Unnecessary, Supabase handles this well

**Key Implementation Notes**:
- Session state managed in React Context (AuthContext)
- Listen to `onAuthStateChange` for automatic state updates
- Clear expo-secure-store on sign-out (both tokens and MEK)
- Handle session expiry gracefully (prompt re-login without data loss)

---

### 5. Account Lockout Implementation

**Decision**: Client-side tracking with Supabase database for persistent lockout state

**Rationale**:
- Supabase Auth doesn't have built-in lockout, need custom implementation
- Store failed attempt count and lockout timestamp in `user_accounts` table
- 15-minute lockout after 5 failed attempts (per spec assumptions)
- Client provides immediate feedback, server enforces policy

**Alternatives Considered**:
- Client-only tracking: Easily bypassed, not secure
- Rate limiting at API level: Doesn't track per-account attempts
- Third-party service: Unnecessary dependency

**Key Implementation Notes**:
- Create `failed_login_attempts` and `lockout_until` columns in user table
- Increment on failed login, reset on successful login
- Check lockout status before attempting authentication
- Return generic error to prevent user enumeration

---

### 6. Password Reset Flow with Recovery Passphrase

**Decision**: Two-step reset: (1) Reset password via Supabase email, (2) Enter recovery passphrase to restore MEK

**Rationale**:
- Supabase handles password reset email securely
- Recovery passphrase step ensures encrypted data remains accessible
- Separates authentication reset from encryption key recovery
- User must have saved recovery passphrase (by design for privacy)

**Alternatives Considered**:
- Skip recovery passphrase: Would lose all encrypted data on password reset
- Recovery via email only: Would require storing plaintext MEK or recovery key on server
- Admin-assisted recovery: Violates privacy-first design

**Key Implementation Notes**:
- After password reset, user signs in with new password
- Detect "password recently reset" state (flag in user metadata or local storage)
- Prompt for recovery passphrase before accessing encrypted data
- Derive new password KEK, re-encrypt MEK, update in Supabase
- Clear old password-encrypted MEK version

---

## Database Schema Requirements

Based on research, the following database additions are needed:

**Table: `user_keys`**
- `user_id` (FK to auth.users)
- `encrypted_mek_password` (encrypted with password-derived KEK)
- `encrypted_mek_recovery` (encrypted with recovery-passphrase-derived KEK)
- `password_salt` (for PBKDF2 derivation)
- `recovery_salt` (for PBKDF2 derivation)
- `created_at`, `updated_at`

**Table: `user_accounts` (extends auth.users metadata)**
- `failed_login_attempts` (integer)
- `lockout_until` (timestamp, nullable)
- `password_reset_pending` (boolean, for triggering recovery passphrase prompt)

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Word list for passphrase? | BIP39 English (2048 words) |
| Number of words in passphrase? | 6 words (~77 bits entropy) |
| Lockout duration? | 15 minutes (per spec assumptions) |
| Session duration? | 7 days refresh, 1 hour access (Supabase default) |
| Key derivation function? | PBKDF2 (available in expo-crypto) |

---

## Dependencies Confirmed

| Dependency | Version | Purpose |
|------------|---------|---------|
| @supabase/supabase-js | ^2.x | Auth and database |
| expo-secure-store | ~12.x | Secure key storage |
| expo-crypto | ~12.x | Cryptographic operations |
| react-hook-form | ^7.x | Form handling (per architecture) |

No additional dependencies required beyond those specified in technical architecture.