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
| **Secure Storage** | expo-secure-store | Session tokens stored in device keychain |
| **Encryption** | Supabase (AES-256) | Server-side encryption at rest |

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
TanStack Query Mutation
    ↓
Supabase Client (with RLS + JWT)
    ↓
PostgreSQL Database (encrypted at rest)
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

### Security Strategy

**Encryption at Rest:**
- All user data encrypted by Supabase using AES-256
- Encryption handled transparently at database level
- No client-side encryption required (see [decision-record.md](../specs/001-user-auth/decision-record.md))

**Data in Transit:**
- HTTPS/TLS for all API calls (Supabase default)

**Access Control:**
- Row-Level Security (RLS) policies enforce data isolation
- JWT authentication for all requests
- 7-day session validity with automatic refresh
- Server-side rate limiting for login attempts

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

### Security Layers

1. **At Rest:** All data encrypted by Supabase (AES-256)
2. **In Transit:** HTTPS/TLS for all API calls
3. **For LLM Analysis:** Data anonymized before sending to OpenAI (user IDs and absolute timestamps removed)
4. **Access Control:** Row-Level Security (RLS) policies isolate user data

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
| **Encryption** | Supabase AES-256 at rest | Industry standard, no client-side complexity |
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

## Technical Evolution (Post-MVP)

Items discovered during implementation that should be addressed as the application scales. These are not current requirements — they represent known evolution paths for when traffic or complexity warrants the investment.

### Security & Auth

| Item | Trigger | Approach |
|------|---------|----------|
| CAPTCHA on auth forms | Bot traffic or abuse detected | Supabase supports hCaptcha and Cloudflare Turnstile natively |
| Rate limiting migration | Concurrent logins exceed DB comfort zone (~1000+/sec) | Move real-time enforcement to Upstash Redis via Edge Functions; keep DB for audit log |
| Login attempt cleanup | Table growth at scale | Replace per-request DELETE with pg_cron scheduled job |
| Deep link testing | Native build available | Password reset deep links (`flare://reset-password`) require EAS Build to test — see [decision-record.md](../specs/001-user-auth/decision-record.md#future-implementation-deep-linking-for-password-reset) |

### Data & Search

| Item | Trigger | Approach |
|------|---------|----------|
| pgvector / semantic search | Per-user data exceeds LLM context windows | Add pgvector extension in Supabase for embedding-based retrieval |
| Database read replicas | Query latency from combined read/write load | Supabase Pro supports read replicas |

### AI Service

| Item | Trigger | Approach |
|------|---------|----------|
| LangGraph migration | Conversational agent features needed | Refactor LangChain chains to LangGraph for multi-turn interactions |
| LLM provider evaluation | Cost optimization or capability needs | LangChain abstraction allows swapping providers without app changes |

### Infrastructure

| Item | Trigger | Approach |
|------|---------|----------|
| CI/CD pipeline | Team growth or deployment frequency | GitHub Actions for automated testing and deployment |
| Infrastructure as Code | Multi-environment management | Terraform, Pulumi, or DigitalOcean App Spec |
| Supabase Pro upgrade | >100 users or need for production SLA | $25/month for higher limits, support, and daily backups |

---

## Related Documentation

- [Product Requirements](../PRD.md)
- [Data Dictionary](./data-dictionary.md)
- [Database Schema](../database/schema.sql)
