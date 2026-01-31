# Quickstart: User Authentication

**Feature**: 001-user-auth
**Date**: 2026-01-31

## Prerequisites

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- Supabase project created at [supabase.com](https://supabase.com)
- iOS Simulator (macOS) or Android Emulator, or Expo Go app on physical device

## 1. Project Setup

### Initialize Expo Project (if not exists)

```bash
npx create-expo-app flare-mobile --template blank
cd flare-mobile
```

### Install Dependencies

```bash
npm install @supabase/supabase-js expo-secure-store expo-crypto react-hook-form
npm install react-native-paper react-native-safe-area-context
npm install @tanstack/react-query
```

### Install Expo Router

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
```

## 2. Supabase Setup

### Create Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User keys table for encryption
CREATE TABLE user_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  encrypted_mek_password TEXT NOT NULL,
  encrypted_mek_recovery TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  recovery_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name VARCHAR(100),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  recovery_passphrase_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX user_keys_user_id_idx ON user_keys(user_id);
CREATE INDEX user_profiles_user_id_idx ON user_profiles(user_id);
```

### Enable Row-Level Security

```sql
-- Enable RLS
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- user_keys policies
CREATE POLICY "Users can view own keys" ON user_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keys" ON user_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own keys" ON user_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- user_profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

### Configure Auth Settings

In Supabase Dashboard → Authentication → Settings:

1. **Site URL**: Set to your Expo deep link (e.g., `flare://`)
2. **Redirect URLs**: Add `flare://reset-password`
3. **Email Templates**: Customize password reset email (optional)
4. **JWT Expiry**: Keep default (3600 seconds / 1 hour)

## 3. Environment Configuration

### Create Environment File

Create `.env` in project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Update app.json

```json
{
  "expo": {
    "scheme": "flare",
    "extra": {
      "supabaseUrl": "${EXPO_PUBLIC_SUPABASE_URL}",
      "supabaseAnonKey": "${EXPO_PUBLIC_SUPABASE_ANON_KEY}"
    }
  }
}
```

## 4. Core Files to Create

### File Structure

```
src/
├── services/
│   ├── supabase.js
│   ├── auth.js
│   └── encryption.js
├── contexts/
│   └── AuthContext.js
├── utils/
│   └── passphrase.js
└── hooks/
    └── useAuth.js

app/
├── _layout.js
├── (auth)/
│   ├── _layout.js
│   ├── welcome.js
│   ├── sign-in.js
│   ├── sign-up.js
│   └── forgot-password.js
└── (app)/
    └── _layout.js
```

### Supabase Client (src/services/supabase.js)

```javascript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## 5. Running the App

### Start Development Server

```bash
npx expo start
```

### Run on Devices

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

## 6. Testing Authentication

### Manual Test Checklist

1. **Sign Up**
   - [ ] Create account with valid email/password
   - [ ] Verify recovery passphrase is displayed
   - [ ] Confirm passphrase saved successfully
   - [ ] User redirected to app

2. **Sign In**
   - [ ] Sign in with valid credentials
   - [ ] Session persists across app restart
   - [ ] Invalid credentials show generic error

3. **Sign Out**
   - [ ] Sign out clears session
   - [ ] User redirected to welcome screen
   - [ ] Re-opening app requires sign in

4. **Password Reset**
   - [ ] Request password reset email
   - [ ] Click reset link in email
   - [ ] Set new password
   - [ ] Prompted for recovery passphrase
   - [ ] Access restored after passphrase entry

## 7. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Network request failed" | Check Supabase URL and API key |
| "User already registered" | Email already in use |
| Session not persisting | Verify expo-secure-store is installed |
| RLS policy error | Check user_id matches auth.uid() |
| Deep link not working | Verify scheme in app.json |

### Debug Mode

Add to supabase.js for debugging:

```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ... other options
    debug: __DEV__,  // Enable auth debug logs in development
  },
});
```

## Next Steps

After authentication is working:

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement remaining screens (security settings, passphrase management)
3. Add account lockout logic
4. Create ADR for encryption key management
