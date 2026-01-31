# Data Model: User Authentication

**Feature**: 001-user-auth
**Date**: 2026-01-31

## Entity Relationship Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│    auth.users       │         │     user_keys       │
│  (Supabase managed) │────────▶│  (encryption keys)  │
└─────────────────────┘    1:1  └─────────────────────┘
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
| raw_user_meta_data | JSONB | NULLABLE | Custom metadata (used for lockout tracking) |

**Metadata Fields (stored in raw_user_meta_data)**:
- `failed_login_attempts`: INTEGER - Count of consecutive failed login attempts
- `lockout_until`: TIMESTAMP - When lockout expires (null if not locked)
- `password_reset_pending`: BOOLEAN - True if user needs to enter recovery passphrase
- `recovery_passphrase_confirmed`: BOOLEAN - Whether user confirmed saving passphrase

---

### 2. user_keys

**Description**: Stores encrypted Master Encryption Keys (MEK) for each user. Each MEK is encrypted twice: once with the password-derived key and once with the recovery passphrase-derived key.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| user_id | UUID | FK → auth.users(id), UNIQUE, NOT NULL | Owner of the keys |
| encrypted_mek_password | TEXT | NOT NULL | MEK encrypted with password-derived KEK |
| encrypted_mek_recovery | TEXT | NOT NULL | MEK encrypted with recovery-passphrase-derived KEK |
| password_salt | TEXT | NOT NULL | Salt for PBKDF2 password derivation |
| recovery_salt | TEXT | NOT NULL | Salt for PBKDF2 recovery passphrase derivation |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update time |

**Indexes**:
- `user_keys_user_id_idx` ON user_id (UNIQUE)

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

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
         │         │    Locked    │─────────────┘
         │         └──────────────┘
         │
         │ Password reset initiated
         ▼
  ┌────────────────────┐
  │  Password Reset    │
  │     Pending        │
  └─────────┬──────────┘
            │ Recovery passphrase entered
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

### Recovery Passphrase
- Exactly 6 words from BIP39 English word list
- Words separated by single space
- Case-insensitive comparison (stored/compared lowercase)

### Failed Login Attempts
- Integer >= 0
- Reset to 0 on successful login
- Lockout triggered at >= 5

### Lockout Duration
- 15 minutes from lockout trigger
- Nullable (null = not locked)

---

## Data Lifecycle

### On User Registration
1. Create auth.users record (Supabase Auth)
2. Generate MEK (256-bit random)
3. Generate recovery passphrase (6 BIP39 words)
4. Derive password KEK and recovery KEK using PBKDF2
5. Encrypt MEK with both KEKs
6. Create user_keys record with encrypted MEKs and salts

### On Password Reset
1. Supabase Auth resets password
2. Set password_reset_pending = true in user metadata
3. On next sign-in, prompt for recovery passphrase
4. Decrypt MEK using recovery KEK
5. Derive new password KEK with new password
6. Re-encrypt MEK with new password KEK
7. Update user_keys.encrypted_mek_password
8. Set password_reset_pending = false

### On Sign Out
1. Clear local session (Supabase client)
2. Clear MEK from expo-secure-store
3. Clear any cached user data

### On Account Deletion (Future)
1. Delete user_keys record
2. Delete auth.users record (cascades through Supabase)
3. Note: Encrypted health data becomes unrecoverable (by design)

---

## Local Storage (Device)

**expo-secure-store Keys**:

| Key | Type | Description |
|-----|------|-------------|
| `supabase.auth.token` | JSON | Supabase session (access + refresh tokens) |
| `flare.mek` | String | Decrypted MEK (hex-encoded) |
| `flare.user_id` | String | Current user's UUID |

**Security Notes**:
- All keys stored in device keychain (iOS Keychain / Android Keystore)
- Cleared on sign out
- MEK should never be logged or transmitted