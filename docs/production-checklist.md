# Production Checklist

**Purpose**: Settings and changes required before deploying to production.

## Supabase Configuration

### Authentication Settings
- [ ] **Enable email confirmation** - Authentication → Providers → Email → Turn ON "Confirm email"
- [ ] **Set production Site URL** - Authentication → URL Configuration → Update Site URL to production domain
- [ ] **Update Redirect URLs** - Add production deep link URLs

### Security
- [ ] **Review RLS policies** - Ensure all tables have appropriate Row Level Security
- [ ] **Rotate API keys** - Consider rotating anon key if it was exposed during development
- [ ] **Enable rate limiting** - Review and adjust rate limits for production traffic

## App Configuration

### Environment Variables
- [ ] **Update .env for production** - Use production Supabase URL and keys
- [ ] **Remove debug logging** - Remove or disable console.error/console.log statements
- [ ] **Update app.json** - Set production bundle identifiers and version numbers

### Code Changes
- [ ] **Remove development shortcuts** - Any dev-only code paths
- [ ] **Error messages** - Ensure user-facing errors don't leak sensitive info

## Pre-Launch Testing

- [ ] Test full sign-up flow with email confirmation enabled
- [ ] Test password reset flow end-to-end
- [ ] Test sign-in/sign-out cycle
- [ ] Test on both iOS and Android devices
- [ ] Test offline behavior and error handling

## Notes

- Email confirmation was disabled during development to avoid rate limits
- Production should use proper email templates (Supabase → Authentication → Email Templates)