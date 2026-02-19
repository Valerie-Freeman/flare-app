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

### Primary Data Flow (NLP Input)

For high-friction data entry — symptom logging, journal entries, and practice/medication creation (see [PRD: Core Interaction Model](../PRD.md#core-interaction-model)):

```
User types natural language (e.g., "my knees are killing me, maybe a 7")
    ↓
Mobile App sends text to AI Service
    ↓
POST /api/v1/parse-input (JWT in Authorization header)
    ↓
Python AI Service:
    1. Validate JWT → extract user_id
    2. Fetch user's configured types from Supabase (symptom types, practices, medications)
    3. Anonymize text (strip PII)
    4. Send to LLM with structured output schema + user types as context
    5. Parse LLM response into entry objects with confidence scores
    ↓
Return structured entries to Mobile App
    ↓
Mobile App shows editable confirmation card
    ↓ (user confirms or adjusts)
    ↓ (if ambiguous fields: follow-up question → user responds → second LLM call)
    ↓
TanStack Query Mutation (with raw_input preserved)
    ↓
Supabase Client (with RLS + JWT)
    ↓
PostgreSQL Database (encrypted at rest)
    ↓
TanStack Query cache invalidation → UI Update
```

### Form-Based Data Flow (Fallback & Simple Interactions)

For low-friction interactions — practice completions, medication adherence, metric entry — and as a fallback/edit mode for NLP entries:

```
User Action (checkbox tap, number stepper, form submission)
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
| **AI Framework** | LangChain | LLM abstraction layer, structured output, provider-agnostic |
| **LLM Provider** | OpenAI GPT-4o-mini | Cost-effective model for structured extraction and insight generation |
| **Validation** | Pydantic | Request/response validation and LLM structured output schemas |
| **Deployment** | Docker on DigitalOcean | Containerized deployment |

### AI Service Responsibilities (Dual-Phase Deployment)

**Phase 1 — NLP Input Parsing (Feature 2 / 003-ai-service):**
- Parse natural language text into structured health data entries
- Supported intents: `symptom_report`, `journal_entry`, `create_practice`, `create_medication`
- Map user descriptions to their existing configured types (symptom types, practices, medications) via fuzzy matching
- Return structured JSON with per-field confidence scores and ambiguity flags
- Handle follow-up conversations for ambiguous critical fields via manual conversation history

**Phase 2 — Analytics & Insights (Feature 10 / 010-reports-analytics):**
- Generate AI-powered health insights from user data
- Detect correlations between symptoms and lifestyle choices
- Pattern recognition and anomaly detection
- Generate doctor visit reports (PDF export)

### NLP Parsing Pipeline

```
Input: Raw text string from user + optional context hint + user's configured types

Pipeline stages:
1. Text sanitization      — Strip PII markers, normalize whitespace
2. Intent classification  — symptom_report | journal_entry | create_practice | create_medication
3. Entity extraction      — Symptom names, severity values, time references, medication names,
                            dosages, frequencies, metric values, body locations
4. Schema mapping         — Map extracted entities to user's configured types via fuzzy matching
5. Confidence scoring     — Per field: high (>0.8) / medium (0.5-0.8) / low (<0.5)
6. Ambiguity detection    — Flag fields needing follow-up (critical fields with low confidence)
7. Response construction  — Structured JSON entries + unmapped text for notes + raw_input preserved
```

Technology: LangChain structured output with Pydantic models defining the extraction schema. User's types/practices/medications injected into the LLM prompt as context (anonymized). Follow-up conversations managed by passing conversation history to a second LLM call.

### NLP API Contract

```
POST /api/v1/parse-input
Authorization: Bearer <supabase-jwt>
Content-Type: application/json

Request:
{
  "text": "woke up with a bad migraine, maybe 7/10, and some nausea",
  "context": "symptom_report",       // optional hint from current screen
  "conversation_history": [],         // prior messages if follow-up
  "user_types": {                     // user's configured schema
    "symptom_types": [...],
    "practices": [...],
    "medications": [...]
  }
}

Response:
{
  "entries": [
    {
      "type": "symptom_log",
      "confidence": 0.92,
      "data": {
        "symptom_type": "Migraine",
        "severity": 7,
        "started_at": "2026-02-19T06:00:00Z",
        "body_location": "head",
        "notes": null
      },
      "ambiguous_fields": []
    },
    {
      "type": "symptom_log",
      "confidence": 0.85,
      "data": {
        "symptom_type": "Nausea",
        "severity": null,
        "started_at": "2026-02-19T06:00:00Z",
        "notes": null
      },
      "ambiguous_fields": ["severity"]
    }
  ],
  "follow_up": {
    "question": "How would you rate the nausea on a 0-10 scale?",
    "target_entry": 1,
    "target_field": "severity"
  },
  "unmapped_text": null,
  "raw_input": "woke up with a bad migraine, maybe 7/10, and some nausea"
}
```

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
- NLP parsing target: <2 seconds per request (single entry)
- AI insight generation completes in 2-5 seconds
- No message queue needed for MVP

---

## Data Security

### Security Layers

1. **At Rest:** All data encrypted by Supabase (AES-256)
2. **In Transit:** HTTPS/TLS for all API calls
3. **For NLP Parsing:** User input text anonymized before sending to LLM (same pipeline as analytics)
4. **For LLM Analysis:** Data anonymized before sending to OpenAI (user IDs and absolute timestamps removed)
5. **Access Control:** Row-Level Security (RLS) policies isolate user data

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
| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Expo SDK/CLI/EAS (30 builds/month) | $0 | |
| Supabase Free Tier | $0 | |
| DigitalOcean Basic Droplet | $6 | AI service hosting |
| GPT-4o-mini — NLP parsing (100 users) | ~$3-8 | ~5-10 parses/user/day, ~200 input + 200 output tokens each |
| GPT-4o-mini — Analytics (100 users) | ~$0.50 | Weekly insight generation |
| **Total** | **~$10-15/month** | |

### At Scale (1,000 users)
| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Expo (upgrade optional) | $0-99 | |
| Supabase Pro | $25 | |
| DigitalOcean (scaled) | $24 | |
| GPT-4o-mini — NLP parsing | ~$30-80 | Per-entry parsing scales linearly with users |
| GPT-4o-mini — Analytics | ~$4 | |
| **Total** | **~$83-232/month** | |

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
| **AI Framework** | FastAPI + LangChain | Fast, modern, provider-agnostic. Structured output for NLP parsing + analytics |
| **LLM** | OpenAI GPT-4o-mini | Best cost/performance for structured extraction and insight generation |
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
| LangGraph migration | Multi-turn follow-up limitations in symptom logging, complex practice/medication creation flows, or analytics queries requiring conversation state | Refactor LangChain chains to LangGraph for stateful multi-turn interactions with conditional routing |
| LLM provider evaluation | Cost optimization or capability needs | LangChain abstraction allows swapping providers without app changes |
| Voice-to-text integration | User demand for hands-free input | Expo Speech API on client converts voice to text, same NLP endpoint processes it — no backend changes |
| On-device NLP parsing | Offline requirement or latency concerns | Local model (ONNX/CoreML) for basic parsing, cloud for complex extraction |
| NLP response caching | Repeated similar inputs detected | Cache parse results for common phrases to reduce LLM costs and latency |

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
