# Flare Technical Architecture

## Overview
This document outlines the technical architecture and key technology decisions for the Flare health tracking application.

---

## Architecture Overview

### Three-Tier Architecture
1. **Client:** React Native mobile app (Expo)
2. **Backend:** Supabase (PostgreSQL, Auth, Storage)
3. **AI Service:** Python FastAPI microservice

---

## Mobile App Stack

### Core Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Expo (Managed Workflow) | Cross-platform mobile development with managed build process |
| **Language** | JavaScript | Simpler for solo development, faster iteration |
| **Navigation** | Expo Router | File-based routing built on React Navigation |
| **UI Library** | React Native Paper | Material Design 3 component library |
| **Styling** | StyleSheet + Theme | Native performance with consistent theming |

### State Management

| Type | Solution | Use Cases |
|------|----------|-----------|
| **App State** | React Context API | User session, auth state, app preferences |
| **Server State** | TanStack Query | Supabase data fetching, caching, mutations |

### Forms & Validation

| Category | Technology |
|----------|-----------|
| **Form Management** | React Hook Form |
| **Validation** | Built-in React Hook Form validation |

### Security & Storage

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Encryption** | expo-crypto | Client-side encryption for sensitive data |
| **Secure Storage** | expo-secure-store | Encryption keys stored in device keychain |
| **Key Management** | PBKDF2 + Recovery Passphrase | Hybrid approach - password + recovery key |

### Notifications & Background

| Category | Technology |
|----------|-----------|
| **Push Notifications** | expo-notifications |

---

## Data Flow

### Standard Data Flow
```
User Action
    ↓
Component (with React Hook Form)
    ↓
[Encryption Layer] (for sensitive fields)
    ↓
TanStack Query Mutation
    ↓
Supabase Client (with RLS)
    ↓
PostgreSQL Database
    ↓
TanStack Query cache invalidation
    ↓
UI Update (automatic re-render)
```

---

## Backend Architecture (Supabase)

### Services Used

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Primary data store for all user data |
| **Auth** | Email/password authentication with JWT |
| **Storage** | File storage (future: food journal photos) |
| **Row-Level Security (RLS)** | Database-level data isolation per user |

### Authentication Flow

1. User logs in with email/password via Supabase Auth
2. Supabase generates JWT access token (1 hour) and refresh token
3. Mobile app stores tokens securely in expo-secure-store
4. All Supabase queries automatically include JWT in headers
5. RLS policies enforce data access at database level
6. Tokens auto-refresh before expiration

### Encryption Strategy

**What gets encrypted (client-side before Supabase):**
- Symptom notes
- Practice notes
- Journal entries
- Any user-entered free text

**What stays plaintext (needed for queries/analysis):**
- Symptom types, severity, timestamps
- Practice names, completion status
- Metric values
- User IDs, dates

**Key Management:**
- Master Encryption Key (MEK) generated on signup
- MEK encrypted with user password AND recovery passphrase
- Encrypted MEK stored in Supabase
- Recovery passphrase enables password reset without data loss

---

## AI Service Architecture (Python)

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI | Async API framework with automatic OpenAPI docs |
| **AI Framework** | LangChain | LLM abstraction layer, provider-agnostic |
| **LLM Provider** | OpenAI GPT-4o-mini | Cost-effective model for insight generation |
| **Validation** | Pydantic | Request/response validation |
| **Deployment** | Docker on DigitalOcean | Containerized deployment |

### AI Service Responsibilities

- Generate AI-powered health insights from user data
- Detect correlations between symptoms and lifestyle choices
- Pattern recognition and anomaly detection
- Generate doctor visit reports (PDF export)

### Data Flow for AI Insights

```
Mobile App
    ↓
JWT token in Authorization header
    ↓
Python AI Service (JWT validation)
    ↓
Fetch user data from Supabase (service role key)
    ↓
Anonymize data (remove user IDs, absolute timestamps)
    ↓
Send to LLM API (OpenAI)
    ↓
Parse LLM response into structured insights
    ↓
Return to mobile app
```

### Authentication Between Services

**Mobile App → Python AI Service:**
- Mobile app sends Supabase JWT in Authorization header
- Python service validates JWT using Supabase JWT secret (JOSE library)
- Extracts user_id from validated token
- Uses user_id to fetch data securely

**Python AI Service → Supabase:**
- Uses Supabase service role key (server-side admin access)
- Fetches only the authenticated user's data

### Communication Pattern

- Synchronous HTTP request/response
- AI insight generation completes in 2-5 seconds
- No message queue needed for MVP

---

## Data Security

### Encryption Layers

1. **At Rest (Supabase):** Sensitive text fields encrypted with MEK
2. **In Transit:** HTTPS for all API calls
3. **For LLM Analysis:** Data temporarily decrypted server-side, sent to OpenAI
4. **Key Storage:** MEK stored encrypted in Supabase, decryption key in device keychain

### Row-Level Security (RLS)

All user data tables have RLS policies enforcing:
- Users can only SELECT their own data
- Users can only INSERT/UPDATE/DELETE their own data
- Predefined data (symptom categories, etc.) is globally readable

---

## Deployment & Infrastructure

### Mobile App
- Expo Application Services (EAS) for cloud builds
- Over-the-air updates via EAS Update
- Deployed to iOS App Store and Google Play Store

### Backend (Supabase)
- Supabase Cloud (managed hosting)
- Free tier for MVP (0-100 users)
- Supabase Pro ($25/month) at scale (1,000+ users)

### AI Service
- Docker container on DigitalOcean Droplet
- Basic Droplet ($6/month) for MVP
- Scale up as user count grows

---

## Cost Breakdown

### MVP Phase (0-100 users)
| Service | Monthly Cost |
|---------|--------------|
| Expo SDK/CLI/EAS (30 builds/month) | $0 |
| Supabase Free Tier | $0 |
| DigitalOcean Basic Droplet | $6 |
| GPT-4o-mini (100 users) | ~$0.50 |
| **Total** | **~$7/month** |

### At Scale (1,000 users)
| Service | Monthly Cost |
|---------|--------------|
| Expo (upgrade optional) | $0-99 |
| Supabase Pro | $25 |
| DigitalOcean (scaled) | $24 |
| GPT-4o-mini | $4 |
| **Total** | **~$53-152/month** |

---

## Key Technical Decisions Summary

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| **Mobile Framework** | Expo (Managed) | Zero native setup, cloud builds, OTA updates |
| **Language** | JavaScript | Faster development, simpler for solo developer |
| **UI Library** | React Native Paper | Mature, comprehensive Material Design 3 library |
| **App State** | React Context API | Built-in, no extra dependencies |
| **Server State** | TanStack Query | Automatic caching, optimistic updates |
| **Form Management** | React Hook Form | Less boilerplate, better performance |
| **Backend** | Supabase | Managed PostgreSQL + Auth + RLS |
| **Auth** | Supabase Auth + JWT | Industry standard, automatic token refresh |
| **Encryption** | Hybrid (password + recovery key) | Balances security with recoverability |
| **AI Framework** | FastAPI + LangChain | Fast, modern, provider-agnostic |
| **LLM** | OpenAI GPT-4o-mini | Best cost/performance for structured output |
| **Deployment** | EAS + Supabase Cloud + DigitalOcean | Low cost, managed services |

## Development Environment Setup

### Mobile App
```bash
npx create-expo-app flare-mobile --template blank
cd flare-mobile
npm install react-native-paper @supabase/supabase-js @tanstack/react-query react-hook-form
```

### Python AI Service
```bash
mkdir flare-ai-service
cd flare-ai-service
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn langchain openai supabase python-jose
```

### Environment Variables

**Mobile App (.env):**
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_AI_SERVICE_URL

**Python Service (.env):**
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_JWT_SECRET
- OPENAI_API_KEY

---

## Related Documentation

- [Product Requirements](../PRD.md)
- [Data Dictionary](./data-dictionary.md)
- [Database Schema](../database/schema.sql)
