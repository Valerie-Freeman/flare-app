# ADR-001: Encryption Key Management

**Status**: SUPERSEDED
**Date**: 2026-01-31
**Superseded Date**: 2026-01-31
**Context**: User Authentication Feature (001-user-auth)

> **SUPERSEDED**: This ADR has been superseded. After security review and research into regulatory requirements (HIPAA, FTC) and industry standards, the client-side encryption approach was determined to be over-engineered for Flare's use case. The application now uses Supabase's built-in encryption at rest (AES-256) instead.
>
> See [specs/001-user-auth/decision-record.md](/specs/001-user-auth/decision-record.md) for the full decision record.
>
> This document is preserved for historical reference.

## Decision

Implement client-side encryption using a Master Encryption Key (MEK) architecture with dual-encrypted key storage for recovery capability.

### Key Components

1. **Master Encryption Key (MEK)**: 256-bit random key generated client-side using expo-crypto
2. **Key Encryption Keys (KEK)**: Derived from user password and recovery passphrase using PBKDF2
3. **Recovery Passphrase**: 6-word BIP39-style phrase providing ~77 bits of entropy
4. **Storage**: Encrypted MEK stored in Supabase; decrypted MEK cached locally in expo-secure-store

## Context

Flare is a health tracking application handling sensitive user data. The constitution mandates client-side encryption before storage (Principle III: Privacy & Data Security). Users must be able to recover their encrypted data after a password reset without server-side access to plaintext keys.

### Requirements

- Client-side encryption of all sensitive health data
- Data recovery after password reset (without admin intervention)
- No plaintext keys stored on server
- Works within Expo managed workflow constraints

## Considered Alternatives

### Key Derivation Function

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **PBKDF2** | Available in expo-crypto, industry standard | Slower than Argon2 | **Selected** |
| Argon2 | Better security, memory-hard | Not in expo-crypto, requires native module | Rejected |
| scrypt | Memory-hard | Not in Expo managed workflow | Rejected |

### Recovery Mechanism

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Dual-encrypted MEK** | User controls recovery, no server access to keys | Requires user to save passphrase | **Selected** |
| Server-stored recovery key | Simpler for user | Violates privacy-first design | Rejected |
| Email-based recovery | Familiar pattern | Would require storing plaintext key | Rejected |
| Admin-assisted recovery | Standard enterprise approach | Violates privacy-first design | Rejected |

### Passphrase Format

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **6-word BIP39** | Human-readable, ~77 bits entropy, familiar to crypto users | Requires careful transcription | **Selected** |
| 12-word BIP39 | Higher security | Overkill for this use case | Rejected |
| 4-word phrase | Easier to remember | Too weak for security-critical recovery | Rejected |
| Random alphanumeric | Higher density | Hard to transcribe, more user errors | Rejected |

### Local Key Storage

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **expo-secure-store** | Device keychain (iOS Keychain/Android Keystore), secure | Limited to strings | **Selected** |
| AsyncStorage | Simple API | Not encrypted, visible in backups | Rejected |
| In-memory only | Maximum security | Requires re-derivation on each app open | Rejected |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Mobile App)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    PBKDF2    ┌──────────────┐                │
│  │   Password   │ ──────────▶  │  Password    │                │
│  │              │              │     KEK      │                │
│  └──────────────┘              └──────┬───────┘                │
│                                       │                         │
│                                       ▼                         │
│                              ┌──────────────┐                   │
│                              │     MEK      │◀── 256-bit random │
│                              │  (plaintext) │                   │
│                              └──────┬───────┘                   │
│                                     │                           │
│         ┌───────────────────────────┼───────────────────────┐   │
│         │                           │                       │   │
│         ▼                           ▼                       ▼   │
│  ┌─────────────┐            ┌─────────────┐         ┌──────────┐│
│  │ Encrypted   │            │ Encrypted   │         │  expo-   ││
│  │ MEK (pass)  │            │ MEK (recov) │         │ secure-  ││
│  └──────┬──────┘            └──────┬──────┘         │  store   ││
│         │                          │                └────┬─────┘│
│         │                          │                     │      │
│  ┌──────────────┐    PBKDF2    ┌──────────────┐         │      │
│  │  Recovery    │ ──────────▶  │  Recovery    │    (cached     │
│  │  Passphrase  │              │     KEK      │     MEK)       │
│  └──────────────┘              └──────────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      user_keys table                     │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  user_id                 │ UUID (FK to auth.users)       │    │
│  │  encrypted_mek_password  │ TEXT (encrypted with pass KEK)│    │
│  │  encrypted_mek_recovery  │ TEXT (encrypted with rec KEK) │    │
│  │  password_salt           │ TEXT (for PBKDF2)             │    │
│  │  recovery_salt           │ TEXT (for PBKDF2)             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  RLS: auth.uid() = user_id (user can only access own keys)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flows

### Registration Flow

1. User provides email + password
2. Generate 256-bit MEK using `expo-crypto.getRandomBytes(32)`
3. Generate 6-word recovery passphrase from BIP39 word list
4. Generate random salts for password and recovery derivation
5. Derive password KEK using PBKDF2(password, password_salt)
6. Derive recovery KEK using PBKDF2(passphrase, recovery_salt)
7. Encrypt MEK with password KEK → `encrypted_mek_password`
8. Encrypt MEK with recovery KEK → `encrypted_mek_recovery`
9. Store both encrypted MEKs + salts in Supabase `user_keys`
10. Cache plaintext MEK in expo-secure-store
11. Display recovery passphrase to user (must save securely)

### Sign-In Flow

1. User provides email + password
2. Authenticate via Supabase Auth
3. Fetch `encrypted_mek_password` and `password_salt` from `user_keys`
4. Derive password KEK using PBKDF2(password, password_salt)
5. Decrypt MEK using password KEK
6. Cache plaintext MEK in expo-secure-store
7. User can now access encrypted data

### Password Reset Flow

1. User resets password via Supabase email flow
2. User signs in with new password
3. Detect `password_reset_pending` flag in user metadata
4. Prompt user for recovery passphrase
5. Fetch `encrypted_mek_recovery` and `recovery_salt` from `user_keys`
6. Derive recovery KEK using PBKDF2(passphrase, recovery_salt)
7. Decrypt MEK using recovery KEK
8. Generate new password salt
9. Derive new password KEK using PBKDF2(new_password, new_salt)
10. Re-encrypt MEK with new password KEK
11. Update `encrypted_mek_password` and `password_salt` in Supabase
12. Clear `password_reset_pending` flag
13. Cache plaintext MEK in expo-secure-store

### Sign-Out Flow

1. Call Supabase signOut
2. Delete `flare.mek` from expo-secure-store
3. Delete `flare.user_id` from expo-secure-store
4. Navigate to welcome screen

## Security Considerations

### Strengths

- **Zero-knowledge server**: Server never sees plaintext MEK or user password
- **Dual recovery path**: Password OR recovery passphrase can decrypt MEK
- **Device keychain**: MEK cached in OS-level secure storage
- **RLS enforcement**: Database policies prevent cross-user access

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| User loses both password AND passphrase | Data unrecoverable by design (privacy feature) |
| Weak password chosen | Enforce password requirements (8+ chars, mixed case, digit) |
| Recovery passphrase not saved | Confirmation step during signup, warning on regeneration |
| Device compromise | MEK only cached while signed in, cleared on sign-out |
| PBKDF2 weaker than Argon2 | Use high iteration count (100,000+), acceptable for MVP |

### What This Does NOT Protect Against

- Malware on user's device with memory access
- User sharing their password or passphrase
- Physical access to unlocked device
- Screenshots of recovery passphrase

## Implementation Notes

### PBKDF2 Parameters

```javascript
{
  algorithm: 'SHA-256',
  iterations: 100000,  // Minimum recommended
  keyLength: 32        // 256 bits
}
```

### BIP39 Passphrase Generation

```javascript
// Use standard BIP39 English word list (2048 words)
// Generate 6 random indices using expo-crypto
// Each word provides ~11 bits of entropy
// Total: ~66 bits from words + additional entropy from random selection
```

### expo-secure-store Keys

| Key | Content |
|-----|---------|
| `supabase.auth.token` | Supabase session tokens (managed by Supabase client) |
| `flare.mek` | Decrypted MEK (hex-encoded, 64 chars) |
| `flare.user_id` | Current user's UUID |

## Consequences

### Positive

- Users have complete control over their encryption keys
- Password reset doesn't require admin intervention
- Server breach doesn't expose health data
- Complies with privacy-first constitution principle

### Negative

- Lost passphrase = unrecoverable data (by design)
- Additional complexity in auth flows
- User education required for passphrase importance
- Slightly longer registration flow

### Neutral

- PBKDF2 is adequate for MVP, can upgrade to Argon2 post-MVP if native modules added
- 6-word passphrase is a balance between security and usability

## References

- [BIP39 Word List](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)
- [PBKDF2 RFC 2898](https://tools.ietf.org/html/rfc2898)
- [expo-crypto Documentation](https://docs.expo.dev/versions/latest/sdk/crypto/)
- [expo-secure-store Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
