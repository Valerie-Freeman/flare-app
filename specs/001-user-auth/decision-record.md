# Decision Record: Authentication Simplification

**Feature**: 001-user-auth
**Date**: 2026-01-31
**Status**: Approved

## Summary

This document records the decisions made to simplify the authentication implementation by removing client-side encryption (MEK/KEK/recovery passphrase) in favor of relying on Supabase's built-in encryption at rest.

---

## Background: What Was Originally Implemented

The initial 001-user-auth implementation included a sophisticated client-side encryption system:

### Original Architecture

1. **Master Encryption Key (MEK)**: 256-bit random key generated client-side
2. **Key Encryption Keys (KEK)**: Derived from user password and recovery passphrase
3. **Recovery Passphrase**: 6-word BIP39-style phrase for data recovery after password reset
4. **Dual-encrypted storage**: MEK encrypted with both password KEK and recovery KEK

### Files Created

- `src/services/encryption.js` - MEK generation, key derivation, encryption/decryption
- `src/utils/passphrase.js` - BIP39 word list and passphrase generation
- `src/services/auth.js` - Auth flows with encryption key management
- `app/(auth)/sign-up.js` - Signup with passphrase display step
- `app/(auth)/sign-in.js` - Signin with recovery modal for password reset
- `app/(app)/settings/security.js` - Security settings with passphrase viewing/regeneration

### Documented in

- `specs/001-user-auth/research.md` - Research decisions
- `specs/001-user-auth/plan.md` - Implementation plan
- `docs/adr/001-encryption-key-management.md` - Architecture Decision Record

---

## Issues Identified During Review

A thorough security review identified several issues with the implementation:

### Critical Security Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| XOR encryption | Critical | Used XOR instead of AES-GCM, vulnerable to known-plaintext attacks |
| Weak key derivation | Critical | 1,000 SHA-256 iterations vs documented 100,000 PBKDF2 iterations |
| SHA-256 instead of HMAC | High | Authentication tag vulnerable to length extension attacks |
| Low entropy passphrase | High | 256 words = 48 bits, not 77 bits as documented |
| Modulo bias | Medium | Random word selection had non-uniform distribution |
| Client-side lockouts | Medium | Login and passphrase lockouts easily bypassed |

### Architectural Issues

| Issue | Description |
|-------|-------------|
| Recovery passphrase not viewable | Feature claimed but showed placeholder text |
| Admin API rollback | Client-side code used admin API that won't work without service role key |
| Exposed internal functions | MEK functions exposed through AuthContext |
| Silent error swallowing | SecureStore adapter masked failures |

### Code Quality Issues

| Issue | Description |
|-------|-------------|
| Inconsistent quotes | Mixed single/double quotes |
| Deprecated `substr()` | Should use `substring()` |
| Unused constant | `PBKDF2_ITERATIONS` defined but not used |
| Missing form validation | No visual error states |

---

## Research: Legal and Industry Requirements

### Key Finding: HIPAA Does Not Apply

According to [HHS HIPAA guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access-right-health-apps-apis/index.html):

> "The HIPAA Rules do not protect the privacy and security of information that users voluntarily download or enter into mobile apps that are not developed or offered by or on behalf of regulated entities"

**Flare's data** (user-entered symptoms, practices, medications/supplements) is **not subject to HIPAA** because:
- Users enter data themselves (not from healthcare providers)
- Flare is not a covered entity or business associate
- No PHI from covered transactions

### FTC Health Breach Notification Rule

The [FTC Health Breach Notification Rule](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0) **does apply**. Requirements:

| Requirement | Detail |
|-------------|--------|
| Breach notification | Within 60 days to users and FTC |
| Penalties | Up to $43,792 per violation per day |
| Coverage | Health apps that can draw data from multiple sources |
| Effective | July 29, 2024 |

**Key insight**: The FTC rule requires **breach notification**, not specific encryption architectures. There is no legal requirement for client-side E2E encryption with recovery passphrases.

### Industry Standard: Flo Period Tracker

Flo is the closest comparable app (menstrual/health tracking, sensitive data). Their security approach:

| Component | Flo's Approach |
|-----------|---------------|
| Data in transit | TLS 1.2/1.3 |
| Data at rest | AES-256 (server-side) |
| Client-side encryption | **No** |
| Recovery passphrases | **No** |
| Certifications | ISO 27001, ISO 27701 |

Flo uses **standard server-side encryption at rest** - the same thing Supabase provides by default.

### Conclusion

The MEK/KEK/recovery passphrase system was **over-engineered** for Flare's use case:
- Not legally required
- Not industry standard
- Adds complexity without proportional benefit
- Implementation had significant security flaws

---

## Decisions Made

### Decision 1: Remove Client-Side Encryption System

**Choice**: Remove MEK/KEK/recovery passphrase architecture

**Rationale**:
- Not required by HIPAA (doesn't apply) or FTC (requires notification, not specific encryption)
- Industry-leading apps (Flo) use server-side encryption at rest
- Supabase provides AES-256 encryption at rest by default
- Implementation had critical security flaws that would require substantial rework

**Alternative rejected**: Fix the implementation
- Would require integrating native crypto modules (react-native-quick-crypto)
- Significant development effort for marginal benefit
- Users don't expect or need recovery passphrases for health tracking apps

### Decision 2: Move Login Rate Limiting Server-Side

**Choice**: Use Supabase database trigger/function for rate limiting

**Rationale**:
- Client-side lockouts provide no real security
- Server-side tracking prevents bypass via multiple devices or app data clearing
- Proper brute-force protection

**Implementation**: `login_attempts` table with `check_login_allowed()` function

### Decision 3: Use Database Trigger for User Creation Atomicity

**Choice**: Create user profile via Supabase trigger on auth.users insert

**Rationale**:
- Original code tried to use admin API for rollback (won't work client-side)
- Database trigger ensures atomic operation
- Standard Supabase pattern

### Decision 4: Propagate SecureStore Errors

**Choice**: Throw errors after logging instead of silent swallowing

**Rationale**:
- Silent failures can cause inconsistent state
- Callers need to know if storage operations failed
- Better debugging and error handling

### Decision 5: Use Supabase Endpoint for Network Check

**Choice**: Query Supabase instead of google.com

**Rationale**:
- google.com may be blocked in some regions
- `no-cors` mode gives false positives
- Checking actual backend is more relevant

### Decision 6: Generic Error Messages

**Choice**: Use "Authentication failed" instead of specific error messages

**Rationale**:
- Specific errors ("Failed to retrieve keys") leak implementation details
- Generic messages prevent attacker reconnaissance
- Standard security practice

---

## Files Affected

### Deleted

| File | Reason |
|------|--------|
| `src/utils/passphrase.js` | Recovery passphrase no longer needed |

### Significantly Modified

| File | Changes |
|------|---------|
| `src/services/encryption.js` | Remove all MEK/KEK functions, keep only user ID storage |
| `src/services/auth.js` | Remove encryption logic, add server-side rate limiting |
| `app/(auth)/sign-up.js` | Remove passphrase display step |
| `app/(auth)/sign-in.js` | Remove recovery modal |
| `app/(app)/settings/security.js` | Remove passphrase viewing, simplify to change password link |

### Minor Modifications

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.js` | Remove MEK exports, fix network check |
| `src/services/supabase.js` | Propagate errors |
| `app/(auth)/forgot-password.js` | Remove passphrase note |
| `app/(app)/index.js` | Fix quote consistency |

### Database Changes

| Change | Description |
|--------|-------------|
| Add `login_attempts` table | Server-side rate limiting |
| Add `check_login_allowed()` function | Rate limit check |
| Add `on_auth_user_created` trigger | Atomic user profile creation |
| Deprecate `user_keys` table | No longer needed |

---

## What Remains

The simplified authentication system provides:

1. **Supabase Auth** - Email/password authentication
2. **Session management** - Automatic token refresh, 7-day validity
3. **Password reset** - Standard email-based flow (no passphrase required)
4. **Server-side rate limiting** - Real brute-force protection
5. **Encryption at rest** - Provided by Supabase (AES-256)
6. **Encryption in transit** - TLS (Supabase default)
7. **Row Level Security** - Data isolation between users

---

## Historical Reference

The original encryption architecture is preserved in:

- `docs/adr/001-encryption-key-management.md` - Full technical design (marked superseded)
- `specs/001-user-auth/research.md` - Original research decisions
- `specs/001-user-auth/plan.md` - Original implementation plan

These documents provide valuable reference for:
- Understanding why client-side encryption was considered
- Future features that may need similar architecture (e.g., truly zero-knowledge storage)
- Learning from the implementation issues identified

---

## Future Implementation: Deep Linking for Password Reset

**Status**: Pending deployment

### Context

The password reset flow sends an email with a link to `flare://reset-password`. This deep link requires:

1. **Native build** - Deep links don't work in Expo Go development mode
2. **App scheme configuration** - Already configured in `app.json` with `"scheme": "flare"`
3. **Reset password screen** - Created at `app/(auth)/reset-password.js`

### Implementation Steps for Deployment

1. **Build native app** using EAS Build or `expo prebuild`
2. **Test deep link** by clicking the password reset email link on a device with the native build
3. **Verify flow**: Email link → App opens → Reset password screen → New password entry → Success

### Current State

| Component | Status |
|-----------|--------|
| `app.json` scheme | ✅ Configured (`flare`) |
| `reset-password.js` screen | ✅ Created |
| Auth layout registration | ✅ Added |
| Supabase redirect URL | ✅ Set to `flare://reset-password` |
| Native build | ❌ Required for testing |

### Testing Notes

- Deep links cannot be tested in Expo Go
- Requires `eas build` or local development build
- iOS requires associated domains for universal links (optional enhancement)
- Android handles custom schemes automatically

---

## Sources

- [HHS HIPAA Access Right Guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access-right-health-apps-apis/index.html)
- [FTC Health Breach Notification Rule](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)
- [FTC Mobile Health Apps Interactive Tool](https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool)
- [Flo Privacy FAQs](https://flo.health/flo-privacy-faqs)
- [Mozilla Privacy Not Included - Flo Review](https://www.mozillafoundation.org/en/privacynotincluded/flo-ovulation-period-tracker/)
