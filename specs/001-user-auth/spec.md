# Feature Specification: User Authentication

**Feature Branch**: `001-user-auth`
**Created**: 2026-01-31
**Status**: Revised
**Input**: User description: "Create a specification for user Authentication. Please refer to PRD.md"

> **Note (2026-02-06)**: This specification has been revised to remove client-side encryption (MEK/recovery passphrase). Security is now provided by Supabase's built-in AES-256 encryption at rest. See [decision-record.md](./decision-record.md) for details.

## Overview

User Authentication enables secure access to the Flare health tracking application. Users must be able to create accounts, sign in, sign out, and recover forgotten passwords. Security is provided through Supabase's built-in encryption at rest (AES-256), row-level security policies, and standard email-based password recovery.

## User Scenarios & Testing

### User Story 1 - New User Registration (Priority: P1)

A new user downloads Flare and wants to create an account to start tracking their health symptoms and practices. They provide their email and password, and the system creates their account securely.

**Why this priority**: Without account creation, no other features can be used. This is the entry point for all users.

**Independent Test**: Can be fully tested by completing the signup flow and verifying the user can access the app's main screen.

**Acceptance Scenarios**:

1. **Given** a user is on the welcome screen, **When** they tap "Create Account" and enter a valid email and password, **Then** an account is created and they are taken to onboarding.
2. **Given** a user is signing up, **When** they enter a password that doesn't meet requirements, **Then** they see a clear error message explaining the password requirements.
3. **Given** a user is signing up, **When** they enter an email already associated with an account, **Then** they see a message that the email is already registered with an option to sign in instead.

---

### User Story 2 - Returning User Sign In (Priority: P1)

A returning user opens Flare and wants to sign in to access their existing health data. They enter their credentials and gain access to their data.

**Why this priority**: Equal priority with signup - returning users must be able to access their data.

**Independent Test**: Can be fully tested by signing in with valid credentials and verifying access to previously stored data.

**Acceptance Scenarios**:

1. **Given** a user is on the welcome screen, **When** they tap "Sign In" and enter valid credentials, **Then** they are authenticated and taken to the dashboard.
2. **Given** a user is signing in, **When** they enter incorrect credentials, **Then** they see an error message without revealing which credential was wrong.
3. **Given** a user is signing in, **When** they enter credentials for a non-existent account, **Then** they see the same generic error message as incorrect credentials.
4. **Given** a user has an active session, **When** they reopen the app within the session validity period, **Then** they are automatically signed in without re-entering credentials.

---

### User Story 3 - Password Reset (Priority: P2)

A user has forgotten their password and needs to regain access to their account.

**Why this priority**: Important for user retention but less frequent than daily sign-in scenarios.

**Independent Test**: Can be fully tested by initiating password reset, following the email link, and successfully signing in with a new password.

**Acceptance Scenarios**:

1. **Given** a user is on the sign-in screen, **When** they tap "Forgot Password" and enter their email, **Then** they receive an email with password reset instructions.
2. **Given** a user receives a password reset email, **When** they tap the reset link and enter a new password, **Then** their password is updated.
3. **Given** a user has reset their password, **When** they sign in with the new password, **Then** they can access their data normally.

---

### User Story 4 - User Sign Out (Priority: P2)

A user wants to sign out of the app, either for security reasons or to switch accounts.

**Why this priority**: Standard feature but less critical than core authentication flows.

**Independent Test**: Can be fully tested by signing out and verifying the user must re-authenticate to access the app.

**Acceptance Scenarios**:

1. **Given** a user is signed in, **When** they navigate to settings and tap "Sign Out", **Then** they are signed out and returned to the welcome screen.
2. **Given** a user has signed out, **When** they reopen the app, **Then** they must sign in again to access their data.
3. **Given** a user signs out, **When** the sign out completes, **Then** local session data is cleared from the device.

---

### Edge Cases

- What happens when a user tries to sign in while offline? They see a clear message that internet connection is required.
- What happens when password reset email doesn't arrive? User can request another email after a cooldown period (60 seconds).
- What happens when a user's session expires while using the app? They are prompted to re-authenticate without losing unsaved work.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create accounts using email and password.
- **FR-002**: System MUST validate email format and uniqueness during registration.
- **FR-003**: System MUST enforce password requirements (minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number).
- **FR-004**: System MUST allow users to sign in with email and password.
- **FR-005**: System MUST maintain user sessions with automatic token refresh.
- **FR-006**: System MUST allow users to sign out, clearing local session data.
- **FR-007**: System MUST provide password reset functionality via email.
- **FR-008**: System MUST NOT reveal whether an email is registered during failed sign-in attempts.
- **FR-009**: System MUST implement server-side rate limiting after 5 consecutive failed sign-in attempts.
- **FR-010**: System MUST display clear, user-friendly error messages for all authentication failures.

### Key Entities

- **User Account**: Represents a registered user with email, password hash, and account status (active, locked, unverified).
- **Session**: Represents an authenticated user session with access token and refresh token.
- **Login Attempt**: Tracks sign-in attempts for server-side rate limiting.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete account registration in under 2 minutes.
- **SC-002**: Users can sign in successfully in under 10 seconds.
- **SC-003**: 95% of password reset requests result in successful password change within 10 minutes.
- **SC-004**: Users remain signed in across app restarts for up to 7 days without re-entering credentials.
- **SC-005**: Zero incidents of unauthorized access to user accounts or health data.

## Scope

### In Scope

- Email/password authentication
- Account creation
- Password reset via email
- Session management with automatic refresh
- Sign out functionality
- Server-side rate limiting after failed attempts

### Out of Scope

- Social authentication (Google, Apple Sign-In) - Post-MVP
- Two-factor authentication (2FA) - Post-MVP
- Biometric authentication (Face ID, fingerprint) - Post-MVP
- Account deletion - Separate feature
- Email verification on signup - Assumed handled by auth provider

## Assumptions

- Users have a valid email address they can access.
- Users have internet connectivity (no offline authentication for MVP).
- Email delivery is reliable (standard email infrastructure).
- Session validity period of 7 days is acceptable for health tracking app usage patterns.
- Rate limiting duration of 15 minutes after 5 failed attempts balances security and usability.

## Dependencies

- Email delivery service for password reset functionality.
- Secure storage capability on mobile devices for session tokens.
- Supabase backend availability (authentication and database).