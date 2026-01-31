# API Contracts: User Authentication

**Feature**: 001-user-auth
**Date**: 2026-01-31

## Overview

This document defines the API contracts for user authentication. The authentication system uses Supabase Auth for core operations and custom Supabase database operations for encryption key management.

**Note**: Most auth operations use the Supabase JavaScript client directly. This document describes the expected behavior and data shapes.

---

## Supabase Auth Operations

### 1. Sign Up

**Operation**: `supabase.auth.signUp()`

**Request**:
```javascript
{
  email: string,      // Valid email address
  password: string    // Min 8 chars, 1 upper, 1 lower, 1 digit
}
```

**Response (Success)**:
```javascript
{
  data: {
    user: {
      id: string,           // UUID
      email: string,
      created_at: string,   // ISO timestamp
      // ... other Supabase fields
    },
    session: {
      access_token: string,
      refresh_token: string,
      expires_in: number,   // seconds
      expires_at: number,   // Unix timestamp
    }
  },
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: { user: null, session: null },
  error: {
    message: string,  // e.g., "User already registered"
    status: number    // HTTP status code
  }
}
```

**Error Codes**:
| Status | Message | Handling |
|--------|---------|----------|
| 400 | "User already registered" | Show "Email already in use" with sign-in link |
| 400 | "Password should be at least 8 characters" | Show password requirements |
| 422 | "Invalid email" | Show email format error |

---

### 2. Sign In

**Operation**: `supabase.auth.signInWithPassword()`

**Request**:
```javascript
{
  email: string,
  password: string
}
```

**Response (Success)**:
```javascript
{
  data: {
    user: { id: string, email: string, /* ... */ },
    session: {
      access_token: string,
      refresh_token: string,
      expires_in: number,
      expires_at: number,
    }
  },
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: { user: null, session: null },
  error: {
    message: string,  // "Invalid login credentials"
    status: number
  }
}
```

**Error Handling**:
- Always show generic "Invalid email or password" message
- Do NOT reveal if email exists
- Track failed attempts in user metadata (custom logic)

---

### 3. Sign Out

**Operation**: `supabase.auth.signOut()`

**Request**: None

**Response (Success)**:
```javascript
{
  error: null
}
```

**Post-Sign-Out Actions**:
1. Clear `flare.mek` from expo-secure-store
2. Clear `flare.user_id` from expo-secure-store
3. Navigate to welcome screen

---

### 4. Password Reset Request

**Operation**: `supabase.auth.resetPasswordForEmail()`

**Request**:
```javascript
{
  email: string,
  options: {
    redirectTo: string  // Deep link: flare://reset-password
  }
}
```

**Response (Success)**:
```javascript
{
  data: {},
  error: null
}
```

**Notes**:
- Always returns success even if email doesn't exist (security)
- Email contains link with token
- Rate limited: 60 second cooldown per email

---

### 5. Update Password (After Reset)

**Operation**: `supabase.auth.updateUser()`

**Request**:
```javascript
{
  password: string  // New password meeting requirements
}
```

**Response (Success)**:
```javascript
{
  data: {
    user: { id: string, email: string, /* ... */ }
  },
  error: null
}
```

**Post-Update Actions**:
1. Set `password_reset_pending: true` in user metadata
2. Prompt for recovery passphrase on next app interaction

---

### 6. Get Current Session

**Operation**: `supabase.auth.getSession()`

**Response**:
```javascript
{
  data: {
    session: {
      access_token: string,
      refresh_token: string,
      user: { id: string, email: string, /* ... */ }
    } | null
  },
  error: null
}
```

---

### 7. Auth State Change Listener

**Operation**: `supabase.auth.onAuthStateChange()`

**Events**:
| Event | Trigger |
|-------|---------|
| `SIGNED_IN` | User signs in or session restored |
| `SIGNED_OUT` | User signs out or session expired |
| `TOKEN_REFRESHED` | Access token refreshed automatically |
| `PASSWORD_RECOVERY` | User clicked password reset link |

---

## Custom Database Operations

### 1. Create User Keys (on Sign Up)

**Table**: `user_keys`

**Insert**:
```javascript
{
  user_id: string,              // From auth.uid()
  encrypted_mek_password: string,
  encrypted_mek_recovery: string,
  password_salt: string,
  recovery_salt: string
}
```

**RLS**: Only authenticated user can insert their own record.

---

### 2. Get User Keys (on Sign In)

**Query**:
```javascript
supabase
  .from('user_keys')
  .select('encrypted_mek_password, password_salt')
  .eq('user_id', userId)
  .single()
```

**Response**:
```javascript
{
  data: {
    encrypted_mek_password: string,
    password_salt: string
  },
  error: null
}
```

---

### 3. Get Recovery Key (on Password Reset)

**Query**:
```javascript
supabase
  .from('user_keys')
  .select('encrypted_mek_recovery, recovery_salt')
  .eq('user_id', userId)
  .single()
```

---

### 4. Update Password-Encrypted MEK (After Recovery)

**Update**:
```javascript
supabase
  .from('user_keys')
  .update({
    encrypted_mek_password: newEncryptedMek,
    password_salt: newSalt,
    updated_at: new Date().toISOString()
  })
  .eq('user_id', userId)
```

---

### 5. Update Recovery Passphrase (Regeneration)

**Update**:
```javascript
supabase
  .from('user_keys')
  .update({
    encrypted_mek_recovery: newEncryptedMek,
    recovery_salt: newSalt,
    updated_at: new Date().toISOString()
  })
  .eq('user_id', userId)
```

---

### 6. Track Failed Login Attempts

**Update User Metadata**:
```javascript
supabase.auth.updateUser({
  data: {
    failed_login_attempts: count,
    lockout_until: timestamp | null
  }
})
```

**Check Lockout Status**:
```javascript
supabase.auth.getUser()
// Check user.user_metadata.lockout_until
```

---

### 7. Create User Profile (on Sign Up)

**Insert**:
```javascript
supabase
  .from('user_profiles')
  .insert({
    user_id: userId,
    onboarding_completed: false,
    recovery_passphrase_confirmed: false
  })
```

---

### 8. Confirm Recovery Passphrase Saved

**Update**:
```javascript
supabase
  .from('user_profiles')
  .update({ recovery_passphrase_confirmed: true })
  .eq('user_id', userId)
```

---

## Error Response Format

All custom database operations return errors in this format:

```javascript
{
  data: null,
  error: {
    message: string,
    details: string | null,
    hint: string | null,
    code: string  // PostgreSQL error code
  }
}
```

**Common Error Codes**:
| Code | Meaning | Handling |
|------|---------|----------|
| `23505` | Unique constraint violation | Record already exists |
| `42501` | RLS policy violation | User not authorized |
| `PGRST116` | No rows returned | Record not found |

---

## Rate Limiting

| Operation | Limit | Window |
|-----------|-------|--------|
| Sign Up | 10 requests | per hour per IP |
| Sign In | 10 requests | per minute per IP |
| Password Reset | 1 request | per 60 seconds per email |

**Note**: Rate limiting is handled by Supabase. Custom rate limiting for account lockout is implemented in application logic.