# Flare

A privacy-first health tracking app for people managing invisible illnesses, undiagnosed conditions, and autoimmune disorders. Track symptoms, medications, and lifestyle choices to uncover patterns that improve your wellbeing.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo 54) — iOS, Android, Web |
| Navigation | Expo Router 6 (file-based routing) |
| Backend | Supabase (PostgreSQL, Auth, RLS, Edge Functions) |
| AI Service | Python, FastAPI, LangChain (planned) |
| Testing | Jest + React Native Testing Library |

## Getting Started

```bash
npm install
```

Create a `.env.local` with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Then start the dev server:

```bash
npm start
```

Or target a specific platform:

```bash
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web browser
```

## Testing & Linting

```bash
npm test           # Run test suite
npm run lint       # Run ESLint
```

## Project Structure

```
app/                     # Expo Router screens
  (auth)/                #   Login, signup, password reset
  (app)/                 #   Authenticated app screens
src/
  services/              # Supabase client, auth, encryption
  contexts/              # Auth state management
docs/                    # Data dictionary, architecture, roadmap
specs/                   # Feature specifications
```

## Privacy & Security

- Tokens stored in device keychain via `expo-secure-store`
- Row-level security (RLS) isolates user data at the database level
- AES-256 encryption at rest, TLS in transit
- User data anonymized before AI processing
- Compliant with FTC Health Breach Notification Rule

## Current Status

**Auth system** — complete and merged (signup, signin, password reset, rate limiting, secure token storage, full test suite).

**App foundation** — in progress (dashboard, data models, Supabase schema).

See [prd.md](prd.md) for the full product requirements and roadmap.

## License

All rights reserved.
