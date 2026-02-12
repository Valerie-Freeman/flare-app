# Data Model: User Authentication

**Feature**: 001-user-auth
**Date**: 2026-01-31
**Revised**: 2026-02-06

> **Note (2026-02-06)**: Revised to remove `user_keys` table and MEK/recovery passphrase architecture. See [decision-record.md](./decision-record.md) for details.

## Entity Relationship Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│    auth.users       │         │   login_attempts    │
│  (Supabase managed) │────────▶│   (rate limiting)   │
└─────────────────────┘   1:N   └─────────────────────┘
```

## Entities

### 1. auth.users (Supabase Managed)

**Description**: Core user identity managed by Supabase Auth. Contains authentication credentials and metadata.

**Note**: This table is managed by Supabase Auth and should not be modified directly. Use Supabase Auth APIs for user management.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| encrypted_password | VARCHAR | NOT NULL | Bcrypt-hashed password (managed by Supabase) |
| email_confirmed_at | TIMESTAMP | NULLABLE | Email verification timestamp |
| created_at | TIMESTAMP | NOT NULL | Account creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update time |

---

### 2. login_attempts

**Description**: Tracks login attempts per email for server-side rate limiting. Used by the `check_login_allowed()` database function to enforce lockout after repeated failures.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| email | TEXT | NOT NULL | Email address of the attempt |
| attempted_at | TIMESTAMPTZ | DEFAULT now() | When the attempt occurred |
| ip_address | TEXT | NULLABLE | IP address of the attempt |
| success | BOOLEAN | DEFAULT false | Whether the attempt succeeded |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation time |

**Indexes**:
- `login_attempts_email_idx` ON email
- `login_attempts_email_attempted_at_idx` ON (email, attempted_at)

**Note**: This table intentionally does NOT have RLS enabled. It is accessed by database functions during the login flow before a user is authenticated.

---

## State Transitions

### User Account States

```
                    ┌──────────────┐
                    │   Created    │
                    │ (unverified) │
                    └──────┬───────┘
                           │ Email verified (optional)
                           ▼
                    ┌──────────────┐
         ┌─────────│    Active    │◀────────────┐
         │         └──────┬───────┘             │
         │                │                     │
         │    5 failed    │      15 min        │
         │    attempts    │      elapsed       │
         │                ▼                     │
         │         ┌──────────────┐             │
         │         │ Rate Limited │─────────────┘
         │         └──────────────┘
         │
         │ Password reset initiated
         ▼
  ┌────────────────────┐
  │  Password Reset    │
  │     Pending        │
  └─────────┬──────────┘
            │ User sets new password via email link
            ▼
     ┌──────────────┐
     │    Active    │
     └──────────────┘
```

### Session States

```
┌───────────────┐      Sign in       ┌───────────────┐
│ Unauthenticated│─────────────────▶│ Authenticated │
└───────────────┘                    └───────┬───────┘
       ▲                                     │
       │                                     │
       │    Sign out / Session expired       │
       └─────────────────────────────────────┘
```

---

## Validation Rules

### Email
- Must be valid email format (RFC 5322)
- Must be unique across all users
- Case-insensitive comparison (stored lowercase)

### Password
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- No maximum length restriction (handled by Supabase)

### Rate Limiting
- Lockout triggered after 5 consecutive failed attempts within 15 minutes
- Lockout duration: 15 minutes from last failed attempt
- Successful login resets the failed attempt count

---

## Data Lifecycle

### On User Registration
1. Create auth.users record via Supabase Auth
2. User profile created atomically via database trigger (`on_auth_user_created`)
3. Session tokens stored in expo-secure-store

### On Sign In
1. Check rate limiting via `check_login_allowed()` database function
2. Authenticate via Supabase Auth
3. Record login attempt (success/failure) in `login_attempts`
4. On success: store session tokens in expo-secure-store
5. On failure: increment attempt count; lock after 5 failures

### On Password Reset
1. User requests reset via email
2. Supabase sends reset link to `flare://reset-password`
3. User taps link, app opens reset-password screen
4. User enters new password
5. Supabase Auth updates password
6. User can sign in normally with new password

### On Sign Out
1. Clear local session (Supabase client)
2. Clear user ID from expo-secure-store
3. Clear any cached user data

### On Account Deletion (Future)
1. Delete user data (cascades through Supabase)
2. Delete auth.users record
3. Login attempts for that email remain for audit purposes

---

## Local Storage (Device)

**expo-secure-store Keys**:

| Key | Type | Description |
|-----|------|-------------|
| `supabase.auth.token` | JSON | Supabase session (access + refresh tokens) |
| `flare.user_id` | String | Current user's UUID |

**Security Notes**:
- All keys stored in device keychain (iOS Keychain / Android Keystore)
- Cleared on sign out
- Session tokens should never be logged or transmitted outside Supabase SDK