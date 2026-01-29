# Flare Technical Planning Document

## Overview
This document outlines key architectural decisions for the Flare health tracking application across three critical areas:
1. React Native app architecture
2. Authentication flow
3. Python AI service API design

---

## 1. React Native App Architecture

### Project Structure

```
flare-mobile/
├── src/
│   ├── app/                    # Expo Router app directory
│   │   ├── (auth)/            # Auth-protected routes
│   │   │   ├── (tabs)/        # Tab navigation
│   │   │   │   ├── index.tsx  # Dashboard
│   │   │   │   ├── symptoms.tsx
│   │   │   │   ├── practices.tsx
│   │   │   │   ├── reports.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── symptom/
│   │   │   │   ├── log.tsx    # Log new symptom
│   │   │   │   └── [id].tsx   # View/edit symptom
│   │   │   ├── practice/
│   │   │   │   ├── create.tsx
│   │   │   │   └── [id].tsx
│   │   │   └── _layout.tsx
│   │   ├── (public)/
│   │   │   ├── login.tsx
│   │   │   ├── signup.tsx
│   │   │   └── onboarding.tsx
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ProgressRing.tsx
│   │   ├── symptoms/          # Feature-specific components
│   │   ├── practices/
│   │   ├── dashboard/
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # Supabase client setup
│   │   │   ├── auth.ts        # Auth helpers
│   │   │   └── queries/       # Query functions
│   │   ├── ai-service/
│   │   │   └── client.ts      # AI service API client
│   │   ├── encryption/
│   │   │   └── crypto.ts      # Client-side encryption
│   │   └── utils/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSymptoms.ts
│   │   ├── usePractices.ts
│   │   └── useDashboard.ts
│   ├── store/                 # State management
│   │   ├── authStore.ts
│   │   ├── symptomsStore.ts
│   │   └── practicesStore.ts
│   ├── types/
│   │   ├── database.ts        # Generated from Supabase
│   │   ├── models.ts          # App-specific types
│   │   └── api.ts
│   └── constants/
│       ├── theme.ts
│       └── config.ts
├── app.json
├── package.json
└── tsconfig.json
```

### Technology Stack

| Category | Technology | Rationale |
|----------|-----------|-----------|
| **Framework** | Expo (SDK 51+) | Managed workflow, easy updates, good developer experience |
| **Navigation** | Expo Router | File-based routing, type-safe navigation, built on React Navigation |
| **State Management** | Zustand | Lightweight, simple API, good TypeScript support, less boilerplate than Redux |
| **Data Fetching** | TanStack Query (React Query) | Caching, background refetching, optimistic updates, excellent for Supabase integration |
| **UI Library** | React Native Paper + Custom | Material Design 3 base with custom components for unique design |
| **Forms** | React Hook Form + Zod | Performance, type-safe validation |
| **Styling** | StyleSheet + Theme system | Native performance, consistent theming |
| **Encryption** | expo-crypto + crypto-js | Client-side E2E encryption before Supabase |
| **Notifications** | expo-notifications | Local and push notifications |
| **Storage** | expo-secure-store | Secure local storage for encryption keys |

### State Management Strategy

**Zustand Stores (Global State):**
- `authStore`: User session, profile data
- `symptomsStore`: Active symptom filters, cached categories/types
- `practicesStore`: Active practices cache
- `settingsStore`: User preferences, theme

**TanStack Query (Server State):**
- All Supabase data fetching
- Automatic caching with stale-while-revalidate
- Background syncing
- Optimistic updates for mutations

**Example Query Pattern:**
```typescript
// hooks/useSymptoms.ts
export const useSymptomLogs = (dateRange: DateRange) => {
  const user = useAuthStore(state => state.user);

  return useQuery({
    queryKey: ['symptom-logs', user?.id, dateRange],
    queryFn: () => fetchSymptomLogs(user!.id, dateRange),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user
  });
};

export const useLogSymptom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symptom: NewSymptomLog) => {
      // 1. Encrypt sensitive data
      const encrypted = encryptSymptomData(symptom);
      // 2. Send to Supabase
      return createSymptomLog(encrypted);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['symptom-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
```

### Data Flow Architecture

```
User Action
    ↓
Component + Hook (useMutation)
    ↓
[Encryption Layer] ← Client-side E2E encryption
    ↓
Supabase Client (with RLS)
    ↓
PostgreSQL Database
    ↓
[On Success] → TanStack Query cache invalidation
    ↓
UI Update (automatic)
```

### Client-Side Encryption Strategy

**What gets encrypted:**
- Symptom notes
- Practice notes
- Journal entries
- Any user-entered free text

**What stays plaintext:**
- Symptom type IDs (needed for queries/analysis)
- Severity values (needed for charting)
- Timestamps (needed for sorting/filtering)
- Metric values (needed for calculations)

**Implementation:**
1. Generate user-specific encryption key on signup
2. Store key in `expo-secure-store` (device keychain)
3. Encrypt before sending to Supabase
4. Decrypt after fetching from Supabase

**Key Management:**
- Encryption key derived from user password using PBKDF2
- Stored locally only (never sent to server)
- If user forgets password → data unrecoverable (by design)

### TypeScript Configuration

Generate Supabase types:
```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

Use discriminated unions for forms:
```typescript
type PracticeFormData =
  | { trackingType: 'completion'; targetFrequency: number }
  | { trackingType: 'metric'; metricTypeId: string; targetValue: number };
```

---

## 2. Authentication Flow

### Architecture Overview

```
React Native App
    ↓
Supabase Auth (Session Management)
    ↓
    ├──→ PostgreSQL with RLS (User Data)
    └──→ Python AI Service (with JWT validation)
```

### Supabase Auth Setup

**Authentication Method:**
- Email/password for MVP
- Future: Social auth (Google, Apple)

**Session Management:**
- Supabase handles JWT tokens automatically
- Access token (short-lived, 1 hour)
- Refresh token (long-lived, stored securely)

**Row-Level Security (RLS):**
```sql
-- Enable RLS on all user tables
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own symptom logs"
  ON symptom_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptom logs"
  ON symptom_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptom logs"
  ON symptom_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptom logs"
  ON symptom_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Repeat for all user data tables:
-- practices, practice_completions, metrics, medications,
-- medication_logs, experiments, user-created categories/types
```

**Predefined Data Access:**
Predefined symptom/practice categories and types are globally readable:
```sql
CREATE POLICY "Everyone can read predefined symptom categories"
  ON symptom_categories FOR SELECT
  USING (is_predefined = true OR user_id = auth.uid());
```

### React Native Auth Implementation

**Supabase Client Setup:**
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter for Expo
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Auth Store (Zustand):**
```typescript
// store/authStore.ts
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ session: data.session, user: data.user });
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    // Generate encryption key from password
    await generateEncryptionKey(password);

    set({ session: data.session, user: data.user });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
```

**Auth Protection (Expo Router):**
```typescript
// app/_layout.tsx
import { useAuthStore } from '@/store/authStore';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    initialize();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return <Stack />;
}

// app/(auth)/_layout.tsx
export default function AuthLayout() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Redirect href="/(public)/login" />;
  }

  return <Tabs>{/* Tab screens */}</Tabs>;
}
```

### Python AI Service Authentication

**JWT Validation:**
```python
# ai_service/auth.py
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os

security = HTTPBearer()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Verify Supabase JWT token and return user_id"""
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return {"user_id": payload.get("sub")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Protected AI Endpoints:**
```python
# ai_service/main.py
from fastapi import FastAPI, Depends
from .auth import verify_token

app = FastAPI()

@app.post("/api/insights/generate")
async def generate_insights(
    request: InsightRequest,
    user: dict = Depends(verify_token)
):
    """Generate AI insights for user's symptom data"""
    # user["user_id"] is guaranteed to be the authenticated user
    # Fetch user data from Supabase using service role key
    # Anonymize data before sending to LLM
    # Return insights
    pass
```

**Calling AI Service from React Native:**
```typescript
// lib/ai-service/client.ts
import { supabase } from '@/lib/supabase/client';

export async function generateInsights(dateRange: DateRange) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${AI_SERVICE_URL}/api/insights/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ date_range: dateRange }),
  });

  if (!response.ok) throw new Error('Failed to generate insights');

  return response.json();
}
```

### Environment Variables

**React Native (.env):**
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
EXPO_PUBLIC_AI_SERVICE_URL=https://api.flare.com
```

**Python AI Service (.env):**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # For server-side queries
SUPABASE_JWT_SECRET=your-jwt-secret   # For validating JWTs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 3. Python AI Service API Design

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | FastAPI | Async, fast, automatic OpenAPI docs, type hints |
| **AI Framework** | LangChain | LLM abstraction, provider-agnostic, composable chains |
| **LLM Providers** | OpenAI, Anthropic | Start with both, compare quality/cost |
| **Database Client** | Supabase Python client | Direct PostgreSQL access with service role |
| **Validation** | Pydantic | Type-safe request/response models |
| **Testing** | pytest + pytest-asyncio | Standard Python testing |
| **Deployment** | Docker on DigitalOcean | Containerized, scalable |

### Project Structure

```
flare-ai-service/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Configuration
│   ├── auth.py                    # JWT verification
│   ├── api/
│   │   ├── __init__.py
│   │   ├── insights.py            # Insight generation endpoints
│   │   ├── reports.py             # Report generation endpoints
│   │   └── correlations.py        # Correlation detection
│   ├── services/
│   │   ├── supabase_service.py    # Data fetching from Supabase
│   │   ├── anonymization.py       # Data anonymization
│   │   ├── llm_service.py         # LLM interaction layer
│   │   └── analysis_service.py    # Statistical analysis
│   ├── chains/                    # LangChain chains
│   │   ├── insight_chain.py
│   │   ├── correlation_chain.py
│   │   └── report_chain.py
│   ├── models/                    # Pydantic models
│   │   ├── requests.py
│   │   ├── responses.py
│   │   └── domain.py
│   └── utils/
│       ├── date_utils.py
│       └── prompt_templates.py
├── tests/
├── Dockerfile
├── requirements.txt
└── pyproject.toml
```

### Core API Endpoints

#### 1. Generate Insights (Proactive Analysis)

**Endpoint:** `POST /api/insights/generate`

**Purpose:** Analyze user data and detect patterns, correlations, anomalies

**Request:**
```python
class InsightRequest(BaseModel):
    date_range: DateRange
    focus_symptoms: Optional[List[str]] = None  # Symptom type IDs to focus on
    include_practices: bool = True
    include_medications: bool = True

class DateRange(BaseModel):
    start_date: date
    end_date: date
```

**Response:**
```python
class Insight(BaseModel):
    type: Literal["correlation", "pattern", "anomaly", "improvement"]
    title: str
    description: str
    confidence: float  # 0.0-1.0
    data_points: List[DataPoint]
    visualization_hint: Optional[str]

class InsightResponse(BaseModel):
    insights: List[Insight]
    analysis_period: DateRange
    data_summary: DataSummary
    disclaimer: str = "This analysis is observational only. Consult healthcare professionals."
```

**Example Insight:**
```json
{
  "type": "correlation",
  "title": "Headaches decreased after starting magnesium",
  "description": "Your headache frequency decreased by 40% in the 3 weeks after starting magnesium supplementation (from 12 episodes to 7 episodes per week on average).",
  "confidence": 0.78,
  "data_points": [
    {"date": "2024-01-15", "headache_count": 3, "magnesium_taken": false},
    {"date": "2024-02-01", "headache_count": 1, "magnesium_taken": true}
  ],
  "visualization_hint": "line_chart_with_intervention_marker"
}
```

**Implementation Flow:**
1. Authenticate user via JWT
2. Fetch user data from Supabase (symptoms, practices, medications, journals)
3. Anonymize data (strip user IDs, hash identifiers)
4. Run statistical analysis (correlation detection, trend analysis)
5. Send anonymized data + stats to LLM with structured prompt
6. Parse LLM response into structured insights
7. Return insights with confidence scores

#### 2. Generate Doctor Report

**Endpoint:** `POST /api/reports/doctor`

**Purpose:** Create comprehensive PDF report for healthcare provider

**Request:**
```python
class DoctorReportRequest(BaseModel):
    date_range: DateRange
    include_symptoms: bool = True
    include_practices: bool = True
    include_medications: bool = True
    include_journals: bool = True
    focus_areas: Optional[List[str]] = None  # "pain", "fatigue", "mood", etc.
```

**Response:**
```python
class DoctorReportResponse(BaseModel):
    report_id: str
    download_url: str  # Pre-signed URL for PDF download
    summary: ReportSummary
    generated_at: datetime
```

**Report Contents:**
1. Patient summary (timeline, conditions being tracked)
2. Symptom history (charts, frequency tables)
3. Treatment timeline (practices, medications, start dates)
4. Correlation findings
5. Notable patterns or anomalies
6. Data export (raw CSV/JSON)

#### 3. Ask Question (Conversational - Post-MVP)

**Endpoint:** `POST /api/chat/ask`

**Purpose:** Natural language queries about user's health data

**Request:**
```python
class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None  # For follow-up questions
    date_range: Optional[DateRange] = None
```

**Response:**
```python
class ChatResponse(BaseModel):
    answer: str
    sources: List[DataPoint]  # Data points that informed the answer
    conversation_id: str
    follow_up_suggestions: List[str]
```

### LangChain Integration

**LLM Provider Abstraction:**
```python
# services/llm_service.py
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from enum import Enum

class LLMProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"

def get_llm(provider: LLMProvider, model: str):
    if provider == LLMProvider.OPENAI:
        return ChatOpenAI(model=model, temperature=0.3)
    elif provider == LLMProvider.ANTHROPIC:
        return ChatAnthropic(model=model, temperature=0.3)
    raise ValueError(f"Unknown provider: {provider}")
```

**Insight Generation Chain:**
```python
# chains/insight_chain.py
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate

INSIGHT_SYSTEM_PROMPT = """You are a health data analyst assistant. Analyze the provided symptom and lifestyle data to identify meaningful patterns, correlations, and insights.

Guidelines:
- Be observational, not prescriptive (report patterns, don't give medical advice)
- Quantify findings with specific numbers and percentages
- Note confidence level based on data quality and sample size
- Flag anomalies or concerning trends
- Never diagnose or recommend treatments

Data format:
- Symptoms: type, severity (0-10), timestamp
- Practices: name, completion status, timestamp
- Medications: name, adherence, timestamp
- Metrics: type, value, timestamp
"""

def create_insight_chain(llm):
    prompt = ChatPromptTemplate.from_messages([
        ("system", INSIGHT_SYSTEM_PROMPT),
        ("human", "Analyze this health data and generate insights:\n\n{data_summary}\n\nStatistical analysis:\n{stats}")
    ])

    return LLMChain(llm=llm, prompt=prompt)
```

**Structured Output with Pydantic:**
```python
from langchain.output_parsers import PydanticOutputParser

insight_parser = PydanticOutputParser(pydantic_object=InsightResponse)

chain = create_insight_chain(llm) | insight_parser
```

### Data Anonymization Strategy

**Anonymization Rules:**
1. Remove user IDs (replace with session-specific hashes)
2. Remove absolute timestamps (convert to relative: "Day 1", "Day 30")
3. Remove location data (unless analyzing by body location)
4. Remove all notes/free text (already encrypted, don't send to LLM)
5. Keep symptom types, severity, durations (needed for analysis)
6. Keep practice names, completion status (needed for correlation)

**Example Anonymized Data:**
```python
# Before anonymization
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "symptom_logs": [
    {"id": "...", "symptom_type": "Headache", "severity": 7, "started_at": "2024-01-15T14:30:00Z"}
  ]
}

# After anonymization
{
  "session_id": "anon_abc123",  # Temporary session hash
  "symptom_logs": [
    {"symptom_type": "Headache", "severity": 7, "relative_day": 0, "time_of_day": "afternoon"}
  ]
}
```

### Error Handling & Rate Limiting

**Rate Limiting:**
```python
from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter

@app.post("/api/insights/generate")
@limiter.limit("10/hour")  # 10 requests per hour per user
async def generate_insights(...):
    pass
```

**Graceful Degradation:**
- If LLM fails: Return statistical analysis only (no narrative insights)
- If Supabase fails: Return cached insights (if available)
- If data insufficient: Return clear message about minimum data requirements

### Cost Optimization

**Token Usage Strategy:**
1. **Summarize data before sending to LLM**
   - Don't send raw logs (thousands of records)
   - Pre-compute statistics, send summary
2. **Use cheaper models for simple tasks**
   - GPT-4o-mini for insight generation
   - Claude 3 Haiku for report summaries
   - Reserve expensive models for complex analysis
3. **Cache LLM responses**
   - Same date range + data = cached result (24 hour TTL)
4. **Batch processing**
   - Weekly digest runs once, cached for all users requesting it

---

## Decision Points Discussion

### 1. React Native UI Component Libraries

#### Shadcn for React Native
Unfortunately, **Shadcn does not have an official React Native version**. Shadcn is built for React web apps using Tailwind CSS and Radix UI primitives, which don't work in React Native.

However, there are **Shadcn-inspired alternatives** for React Native:

**1. NativeWind (Tailwind for React Native) + Custom Components**
- Use NativeWind (Tailwind CSS for React Native)
- Build Shadcn-style components manually
- Most similar to Shadcn philosophy
- Pros: Familiar Tailwind API, good DX
- Cons: No pre-built components, more setup

**2. Gluestack UI v2**
- Modern component library with "copy-paste" philosophy similar to Shadcn
- Uses NativeWind (Tailwind) for styling
- Pre-built accessible components
- Pros: Shadcn-like DX, actively maintained, good docs
- Cons: Relatively new, smaller community than RN Paper

**3. React Native Paper (Material Design 3)**
- Most mature and widely used
- Complete component set out of the box
- Excellent theming system
- Pros: Battle-tested, comprehensive, great accessibility
- Cons: Material Design aesthetic (can be overridden)

**4. Tamagui**
- High-performance UI kit with compiler optimizations
- Cross-platform (web + native)
- Pros: Extremely fast, one codebase for web + native
- Cons: Steep learning curve, opinionated architecture

**MCP Server Availability:**
Currently, **no React Native UI libraries have official MCP servers** like Shadcn does for web. This is because:
- MCP is relatively new
- React Native ecosystem is smaller than web
- Most React Native development is done with visual tools

**Recommendation:**
For a **mobile-first app with AI development assistance**, I suggest:

**Option A (Recommended): Gluestack UI v2 + NativeWind**
- Closest to Shadcn philosophy (copy-paste components)
- Modern styling with Tailwind-like API
- Can customize extensively
- AI assistants (like me) can generate components easily

**Option B: React Native Paper + Custom Styling**
- Fastest to MVP
- Reliable, mature library
- Override theme for custom "calming" design
- Well-documented, easier for beginners

Since you're new to React Native, I'd lean toward **Gluestack UI v2** for its Shadcn-like developer experience, or **React Native Paper** for reliability.

---

### 2. Encryption Key Recovery Options (Detailed Analysis)

You're absolutely right - users losing all health data due to a forgotten password is unacceptable. Let's explore solutions:

#### Option A: Hybrid Encryption with Key Escrow (Recommended)

**How it works:**
1. User creates password during signup
2. App derives two keys:
   - **Master Encryption Key (MEK)**: Encrypts all user data
   - **Key Encryption Key (KEK)**: Encrypts the MEK
3. MEK is encrypted with KEK and stored in Supabase
4. KEK is derived from user's password + stored on device
5. For recovery: User creates a **recovery passphrase** (separate from login password)
6. MEK is also encrypted with recovery passphrase and stored

**Recovery flow:**
- User forgets password → Can reset password via email
- After reset, they enter recovery passphrase → MEK is decrypted → Data accessible

**Pros:**
- User data is NOT lost if password forgotten
- Recovery passphrase is only used once (during emergency)
- Data still encrypted at rest in Supabase
- Balances security with usability

**Cons:**
- Not technically "end-to-end" encryption (Supabase stores encrypted MEK)
- Recovery passphrase is a second thing to remember (but only needed once)

**User Experience:**
```
During signup:
1. Create password: ********
2. Create recovery passphrase (shown once, write down):
   "sunset-mountain-river-calm-7821"
3. Confirm you've saved it: [✓] I've written this down safely
```

#### Option B: Social Recovery (Trusted Contacts)

**How it works:**
1. User selects 3-5 trusted contacts (friends, family)
2. Master key is split into "shards" using Shamir's Secret Sharing
3. Each contact receives one shard (via email, encrypted)
4. To recover: User contacts 2-3 people, combines shards, reconstructs key

**Pros:**
- Very secure (no single point of failure)
- No extra passphrase to remember
- Cool "Web3-style" recovery

**Cons:**
- Complex UX (requires trusted contacts)
- Contacts might lose their shards
- Might feel invasive (sharing health data recovery with others)
- **Not recommended for this use case** (too complex for health app)

#### Option C: Biometric-Protected Local Backup

**How it works:**
1. Master key encrypted with device biometrics (Face ID / Touch ID)
2. Encrypted key backed up to iCloud Keychain / Google Cloud Keychain
3. If user forgets password but has same device: Biometric unlocks key
4. If user gets new device: iCloud/Google restores encrypted key

**Pros:**
- Seamless user experience
- No extra passphrase needed
- Native platform integration

**Cons:**
- Relies on Apple/Google infrastructure (some privacy loss)
- Doesn't work if user loses device AND forgets password
- Less portable (tied to ecosystem)

#### Option D: Optional Encryption (User Choice)

**How it works:**
1. During signup, user chooses:
   - **Maximum Privacy Mode**: True E2E encryption, unrecoverable if password lost
   - **Standard Privacy Mode**: Data encrypted at rest, recoverable with email reset

**Pros:**
- Power users get true E2E encryption
- Average users get recoverability
- Transparent about tradeoffs

**Cons:**
- Two different systems to maintain
- Most users will choose "Standard" (less secure by default)

---

**My Recommendation: Option A (Hybrid Encryption with Recovery Passphrase)**

**Why:**
- Balances security with usability
- Health data is too important to lose
- Recovery passphrase is a proven pattern (used by 1Password, Bitwarden)
- User creates it once during signup, stores it safely
- Clear UX: "This is your emergency recovery code. Write it down."

**Implementation Details:**
```typescript
// During signup
async function setupEncryption(password: string, recoveryPassphrase: string) {
  // 1. Generate Master Encryption Key (MEK)
  const mek = await generateRandomKey(256);

  // 2. Derive Key Encryption Key from password
  const passwordKEK = await deriveKey(password, userSalt);

  // 3. Derive Key Encryption Key from recovery passphrase
  const recoveryKEK = await deriveKey(recoveryPassphrase, recoverySalt);

  // 4. Encrypt MEK with both KEKs
  const encryptedMEKPassword = await encrypt(mek, passwordKEK);
  const encryptedMEKRecovery = await encrypt(mek, recoveryKEK);

  // 5. Store encrypted MEKs in Supabase
  await supabase.from('user_keys').insert({
    user_id: userId,
    encrypted_mek_password: encryptedMEKPassword,
    encrypted_mek_recovery: encryptedMEKRecovery,
    salt: userSalt,
    recovery_salt: recoverySalt
  });

  // 6. Store MEK locally on device (for normal use)
  await SecureStore.setItemAsync('mek', mek);
}
```

**Recovery Flow:**
```typescript
async function recoverWithPassphrase(email: string, recoveryPassphrase: string) {
  // 1. User resets password via email
  // 2. User enters recovery passphrase
  const { recovery_salt, encrypted_mek_recovery } = await fetchRecoveryData(email);

  // 3. Derive recovery KEK
  const recoveryKEK = await deriveKey(recoveryPassphrase, recovery_salt);

  // 4. Decrypt MEK
  const mek = await decrypt(encrypted_mek_recovery, recoveryKEK);

  // 5. Re-encrypt MEK with new password
  const newPasswordKEK = await deriveKey(newPassword, recovery_salt);
  const newEncryptedMEKPassword = await encrypt(mek, newPasswordKEK);

  // 6. Update Supabase
  await updateEncryptedKey(userId, newEncryptedMEKPassword);

  // 7. User is back in!
  return mek;
}
```

---

### 3. LLM Provider Cost Breakdown & Comparison

#### OpenAI Pricing (as of Jan 2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| **GPT-4o** | $2.50 | $10.00 | Complex analysis, high accuracy |
| **GPT-4o-mini** | $0.15 | $0.60 | Cost-effective, fast, good quality |
| **GPT-3.5-turbo** | $0.50 | $1.50 | Older, being phased out |

#### Anthropic Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| **Claude 3.5 Sonnet** | $3.00 | $15.00 | Best quality, complex reasoning |
| **Claude 3.5 Haiku** | $0.80 | $4.00 | Fast, cost-effective, good quality |
| **Claude 3 Opus** | $15.00 | $75.00 | Highest quality (overkill for this) |

#### Google Gemini Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| **Gemini 1.5 Pro** | $1.25 | $5.00 | Long context (2M tokens), good value |
| **Gemini 1.5 Flash** | $0.075 | $0.30 | Extremely cheap, fast, decent quality |

#### Example Cost Calculation (Monthly per User)

**Assumptions:**
- User generates weekly insights (4x/month)
- User generates 1 doctor report/month
- Average insight generation: 2,000 input tokens, 500 output tokens
- Average report generation: 5,000 input tokens, 2,000 output tokens

**Monthly per user:**
- Insights: 4 × (2,000 input + 500 output) = 8,000 input, 2,000 output
- Reports: 1 × (5,000 input + 2,000 output) = 5,000 input, 2,000 output
- **Total: 13,000 input tokens, 4,000 output tokens**

**Cost per user per month:**

| Provider | Model | Input Cost | Output Cost | Total |
|----------|-------|-----------|-------------|-------|
| **OpenAI** | GPT-4o-mini | $0.002 | $0.002 | **$0.004** |
| **Anthropic** | Claude 3.5 Haiku | $0.010 | $0.016 | **$0.026** |
| **Google** | Gemini Flash | $0.001 | $0.001 | **$0.002** |
| OpenAI | GPT-4o | $0.033 | $0.040 | $0.073 |
| Anthropic | Claude 3.5 Sonnet | $0.039 | $0.060 | $0.099 |

**At 1,000 users:**
- GPT-4o-mini: **$4/month**
- Gemini Flash: **$2/month**
- Claude 3.5 Haiku: **$26/month**

#### Quality Comparison

**For Structured Data Analysis (Symptom Correlations):**
1. **GPT-4o-mini**: Excellent structured output, fast, great value
2. **Gemini Flash**: Surprisingly good, extremely cheap, fast
3. **Claude 3.5 Haiku**: Great reasoning, but pricier

**For Narrative Reports (Doctor Summaries):**
1. **Claude 3.5 Haiku**: Best at natural language, empathetic tone
2. **GPT-4o**: Very good, more expensive
3. **Gemini 1.5 Pro**: Good long context handling

#### Recommendation

**Option 1: GPT-4o-mini for everything (Simplest)**
- Cost: ~$4-5/month per 1,000 users
- Quality: Excellent for structured insights
- Reliability: Most mature API, best structured output support
- **Best for MVP** - single provider, easy to implement

**Option 2: Hybrid approach (Optimized)**
- **GPT-4o-mini**: Insight generation, correlations (cheap, structured)
- **Claude 3.5 Haiku**: Doctor reports, narrative summaries (better prose)
- Cost: ~$15/month per 1,000 users
- Quality: Best of both worlds
- Complexity: Need to manage two APIs

**Option 3: Gemini Flash for everything (Ultra-cheap)**
- Cost: ~$2-3/month per 1,000 users
- Quality: Good enough for MVP, improving rapidly
- Risk: Less proven for healthcare-adjacent use cases

**My Recommendation: Start with GPT-4o-mini**
- Cheapest mature option ($4/mo per 1,000 users)
- Best structured output support (critical for insight generation)
- Can easily switch providers later (LangChain abstraction)
- Once product is validated, optimize with hybrid approach

---

## Finalized Decisions

1. **UI Library**: React Native Paper ✓
2. **Encryption**: Hybrid with recovery passphrase ✓
3. **LLM**: GPT-4o-mini ✓
4. **React Native Framework**: To be decided (Expo vs React Native CLI)

---

---

## React Native Framework Options: Expo vs React Native CLI

### Understanding React Native from a Web Developer's Perspective

As a web developer, you're familiar with:
- **Create React App** or **Vite** for bootstrapping React projects
- **npm/yarn** for dependencies
- **Browser APIs** (localStorage, fetch, camera, etc.)
- **Build tools** handled automatically

React Native is similar but different:
- Write React (JSX, hooks, components) ✓ Same as web
- Compiles to **native iOS/Android** code (not HTML/CSS)
- Uses **native APIs** instead of browser APIs
- Requires **native build tools** (Xcode for iOS, Android Studio for Android)

**The Challenge:** Setting up native build tools is complex and error-prone.

**The Solution:** Two approaches to React Native development.

---

### Option 1: Expo (Managed Workflow) - Recommended for Beginners

**What is Expo?**
Think of Expo as "Create React App for mobile" - it's a complete toolchain that abstracts away native build complexity.

**How it works:**
```
Your Code (TypeScript/React)
        ↓
Expo CLI (handles build complexity)
        ↓
Expo Go App (development) OR Native App (production)
```

**Developer Experience (Similar to Web):**
```bash
# Create project (like create-react-app)
npx create-expo-app@latest flare-mobile

# Start development server (like npm start)
npx expo start

# Scan QR code with phone → app loads instantly
# Make changes → hot reloads like web development

# Build for production
eas build --platform ios
eas build --platform android
```

**What Expo Provides:**
1. **Zero native configuration** - No Xcode/Android Studio needed for development
2. **Expo Go app** - Test on real device without building
3. **Managed libraries** - Camera, notifications, storage all "just work"
4. **OTA updates** - Push updates without app store review (like deploying web apps)
5. **Build service (EAS)** - Cloud builds iOS/Android apps (no Mac required for iOS!)
6. **Developer-friendly** - Hot reload, TypeScript, great docs

**Limitations:**
- ~~Can't use native code (Swift/Kotlin/Java)~~ ✗ **FALSE** (outdated info)
  - **Modern Expo supports custom native modules** via "dev builds"
- Slightly larger app size (~50MB base vs ~30MB raw React Native)
- Opinionated structure (but good for beginners)

**When to Use Expo:**
- ✅ You're new to mobile development (YOU)
- ✅ You want fast iteration (like web dev)
- ✅ Standard app features (camera, notifications, storage)
- ✅ Don't want to manage native build tools
- ✅ Need to build iOS apps without a Mac

---

### Option 2: React Native CLI (Bare Workflow)

**What is React Native CLI?**
The "vanilla" React Native experience - you manage native projects directly.

**How it works:**
```
Your Code (TypeScript/React)
        ↓
React Native CLI
        ↓
ios/ folder (Xcode project) + android/ folder (Android Studio project)
        ↓
Native Build Tools (Xcode, Android Studio, Gradle)
        ↓
Native App
```

**Developer Experience:**
```bash
# Create project
npx react-native@latest init FlareApp

# Requires Xcode (Mac only) or Android Studio installed
# Start metro bundler
npm start

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android

# Build requires local Xcode/Android Studio
```

**What React Native CLI Provides:**
1. **Full control** - Direct access to native code
2. **Smaller bundle size** - No Expo overhead
3. **Maximum flexibility** - Use any native library

**Challenges:**
1. **Steep learning curve** - Need to understand iOS/Android build systems
2. **Environment setup** - Install Xcode, Android Studio, SDKs, simulators
3. **Dependency hell** - Native module linking can break
4. **Build locally** - Need Mac for iOS builds
5. **Slower development** - No instant preview, slower builds

**When to Use React Native CLI:**
- ✅ Need very specific native functionality
- ✅ Building highly custom app
- ✅ Team has mobile developers
- ✅ App size is critical concern
- ❌ **NOT recommended for beginners**

---

### Comparison Table

| Feature | Expo (Managed) | React Native CLI |
|---------|---------------|------------------|
| **Setup Time** | 5 minutes | 2-4 hours |
| **Learning Curve** | Easy (web-like) | Steep |
| **Native Modules** | Most common ones included | Install manually |
| **Custom Native Code** | Supported (via dev builds) | Full control |
| **Development Speed** | ⚡ Very fast | Moderate |
| **Build iOS without Mac** | ✅ Yes (EAS cloud) | ❌ No |
| **Over-the-Air Updates** | ✅ Built-in | ❌ Need CodePush |
| **App Size** | ~50MB base | ~30MB base |
| **Web Dev Familiarity** | 95% similar | 60% similar |
| **Production Ready** | ✅ Used by large apps | ✅ Used by large apps |

---

### Expo Architecture Evolution (Important!)

**Old Expo (before 2020):**
- "Managed" workflow only
- Couldn't use custom native code
- This is where the "Expo is limited" reputation came from

**Modern Expo (2020+):**
- **Managed workflow** - No native code needed (great for most apps)
- **Dev builds** - Custom native modules when needed
- **Expo modules API** - Write native modules easily
- **Hybrid approach** - Start managed, eject to custom build later

**For Flare, you'd use Managed Workflow:**
- All features (camera, notifications, encryption) supported out-of-box
- Can add custom native code if needed later
- 95% of apps never need to eject

---

### Real-World Examples

**Apps Built with Expo:**
- **Galaxies.dev** (developer community)
- **Flipkart** (e-commerce, India)
- **Coinbase** (cryptocurrency wallet)
- **Brex** (corporate cards)

**Apps Built with React Native CLI:**
- **Meta** (Facebook, Instagram, Messenger)
- **Discord**
- **Shopify**
- **Microsoft Office**

**Note:** Large companies often use CLI because they have dedicated mobile teams. Startups/MVPs often use Expo for speed.

---

### Recommendation for Flare

**Use Expo (Managed Workflow) ✅**

**Why:**
1. **You're coming from web development** - Expo feels natural
2. **Speed to MVP** - No weeks learning Xcode/Android Studio
3. **All features you need are supported:**
   - ✅ Supabase Auth
   - ✅ Camera (for future food logging)
   - ✅ Push notifications
   - ✅ Secure storage (encryption keys)
   - ✅ React Native Paper (works perfectly with Expo)
4. **Build iOS without Mac** - EAS builds in cloud
5. **OTA updates** - Fix bugs instantly without app store delays
6. **Easy to upgrade** - If you ever need custom native code, add a dev build

**Development Flow:**
```bash
# Day 1: Install Expo
npm install -g expo-cli

# Create project
npx create-expo-app flare-mobile --template blank-typescript

# Start development
cd flare-mobile
npx expo start

# Scan QR with Expo Go app on phone → app appears
# Edit code → changes appear instantly
# Feels exactly like web development!
```

**When You'd Need React Native CLI Instead:**
- Building AR/VR features
- Deep Bluetooth integrations
- Custom video processing
- Enterprise security requirements
- **None of these apply to Flare**

---

### Migration Path

If you start with Expo and later need more control:

**Option 1: Dev Build (Stay in Expo)**
```bash
# Add custom native module
npx expo install expo-dev-client
# Create custom build
eas build --profile development
```

**Option 2: Eject to Bare Workflow**
```bash
# Generates ios/ and android/ folders
npx expo prebuild
# Now you have full control, but lose some Expo conveniences
```

**Option 3: Rewrite to React Native CLI**
- Extreme case, rarely needed
- Most apps never need this

---

### Expo Services Breakdown

Expo offers multiple services. Here's what you'll actually use:

#### 1. Expo SDK (100% Free Forever)
**What it is:** The core library of packages for React Native development.

**What you get:**
- Camera API (`expo-camera`)
- File system (`expo-file-system`)
- Secure storage (`expo-secure-store`)
- Notifications (`expo-notifications`)
- Constants (`expo-constants`)
- 50+ other packages

**Cost:** FREE - These are just npm packages
**Required for:** All Expo apps

#### 2. Expo CLI (100% Free Forever)
**What it is:** Command-line tool for development.

**What you get:**
- `npx expo start` - Start development server
- `npx expo install` - Install dependencies
- Hot reloading and debugging
- TypeScript support

**Cost:** FREE
**Required for:** Development

#### 3. Expo Go App (100% Free Forever)
**What it is:** Mobile app for testing during development.

**What you get:**
- Scan QR code to load your app
- Test on real device without building
- Instant updates during development

**Cost:** FREE
**Required for:** Development (optional but highly recommended)
**Limitation:** Only works with managed workflow, can't test custom native code

#### 4. EAS (Expo Application Services) - **This is what has pricing**

EAS includes three paid services:

##### a) EAS Build (Cloud build service)
**What it is:** Builds iOS/Android apps in the cloud (no Mac needed!)

**Free Tier:**
- 30 builds/month for iOS + Android
- Suitable for development/testing

**Paid Tiers:**
- **Production ($99/month):** Unlimited builds
- **Enterprise ($999/month):** Priority builds, dedicated resources

**Alternative (Free):** Build locally with `eas build --local`
- Requires Mac for iOS builds
- No monthly cost, but slower

**For Flare MVP:** Free tier is plenty (you won't need 30 builds/month)

##### b) EAS Submit (App Store submission)
**What it is:** Automates uploading to App Store/Play Store.

**Cost:**
- Included in all EAS Build tiers (even free)
- Manual submission is also free (just more tedious)

**For Flare MVP:** Included in free tier

##### c) EAS Update (Over-the-air updates)
**What it is:** Push bug fixes/features without app store review.

**Free Tier:**
- Unlimited updates
- Unlimited users

**Paid Tiers:**
- Same as Build pricing
- Adds rollback, staged rollouts, analytics

**For Flare MVP:** Free tier is sufficient

---

### What You'll Actually Use for Flare

| Service | Cost | When You Need It |
|---------|------|------------------|
| **Expo SDK** | FREE | Day 1 - Core libraries |
| **Expo CLI** | FREE | Day 1 - Development |
| **Expo Go App** | FREE | Day 1 - Testing on device |
| **EAS Build** | FREE (30 builds/mo) | When ready to test on TestFlight/Play Store |
| **EAS Submit** | FREE | When submitting to app stores |
| **EAS Update** | FREE | After launch for quick fixes |

**Total Cost for MVP: $0/month** ✅

---

### When Would You Pay for Expo?

**Scenario 1: Frequent Builds**
- Building multiple times per day for client demos
- Large team all building simultaneously
- **Solution:** Upgrade to Production ($99/month) OR build locally for free

**Scenario 2: Advanced Update Features**
- Need staged rollouts (10% of users → 50% → 100%)
- Want detailed update analytics
- Need instant rollback capabilities
- **Solution:** Upgrade to Production ($99/month)

**Scenario 3: Priority Support**
- Mission-critical app
- Need guaranteed build times
- **Solution:** Enterprise ($999/month)

**For Flare:** None of these apply during MVP phase.

---

### Cost Comparison Over Time

**Year 1 (MVP Development):**
| Service | Expo | React Native CLI |
|---------|------|------------------|
| Development tools | $0 | $0 |
| iOS builds | $0 (free tier) | $1,200 (Mac mini) |
| Android builds | $0 | $0 |
| CI/CD | $0 | $10-50/month (GitHub Actions) |
| **Total Year 1** | **$0** | **$1,320** |

**Year 2 (Post-Launch, 1,000 users):**
| Service | Expo | React Native CLI |
|---------|------|------------------|
| Builds | $0 (free tier) | $0 (Mac already owned) |
| OTA Updates | $0 | $50/month (CodePush or similar) |
| **Total Year 2** | **$0** | **$600** |

**When you'd upgrade Expo ($99/month):**
- You have paying customers and want unlimited builds
- You're iterating rapidly and hit 30 builds/month
- You want advanced update features

**Realistically:** Most startups stay on free tier until post-launch, then upgrade to $99/month once revenue justifies it.

---

### Alternative: Build Locally (Stay 100% Free)

If you want to avoid any potential costs:

**Setup:**
1. Get a Mac (you have one?) or use cloud Mac (MacStadium, $50/month)
2. Install Xcode (free, but 40GB download)
3. Run `eas build --local`

**Trade-offs:**
- Slower builds (30 min vs 10 min in cloud)
- Need to manage certificates/provisioning profiles
- Still easier than React Native CLI

**For Flare:** Start with free cloud builds, switch to local only if needed

---

### React Native CLI Cost Comparison

**Setup Costs:**
- Mac for iOS builds: $1,000-2,500
- Apple Developer account: $99/year
- Google Play Developer account: $25 one-time

**Ongoing:**
- CI/CD (GitHub Actions): $10-50/month
- CodePush (OTA updates): $50/month
- Manual management time: Hours per week

**Total Year 1:** ~$1,500+

**Expo wins on cost** for solo developers/startups.

---

### Recommended Setup for Flare

**Phase 1: Development (Month 1-3)**
- Expo CLI (free)
- Expo Go app (free)
- Cost: $0

**Phase 2: Testing (Month 3-4)**
- EAS Build free tier (30 builds/month)
- TestFlight (iOS) + Internal testing (Android)
- Cost: $0

**Phase 3: Launch (Month 4+)**
- EAS Build free tier
- EAS Update free tier
- App Store submissions (free with EAS)
- Cost: $0

**Phase 4: Scaling (Month 6+, if needed)**
- Upgrade to EAS Production if you need >30 builds/month
- Cost: $99/month (optional)

**Bottom Line:** You can build, test, and launch Flare completely free with Expo. Only consider paying after you have users and revenue.

---

### Final Recommendation

**Start with Expo:**
1. Faster development (weeks vs months to first version)
2. Gentler learning curve (leverage your web skills)
3. All Flare features supported
4. Can add custom native code later if needed
5. Proven in production by major companies

**React Native CLI is:**
- Overkill for your use case
- Unnecessary complexity upfront
- Better suited for apps needing deep native integration
- Not a blocker - you can migrate later if truly needed

**Bottom Line:** As a web developer building your first mobile app, Expo will feel familiar and let you focus on building features, not fighting build tools.

---

## Final Decisions

1. **UI Library**: React Native Paper ✓
2. **Encryption**: Hybrid with recovery passphrase ✓
3. **LLM**: GPT-4o-mini ✓
4. **React Native Framework**: Expo (Managed Workflow) ✓

---

---

## Summary

We've completed technical planning for the Flare health tracking app and made all critical architectural decisions:

### Architecture Overview
- **Frontend**: Expo (React Native) with React Native Paper UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI Service**: Python FastAPI with LangChain + GPT-4o-mini
- **Encryption**: Hybrid approach with recovery passphrase
- **Deployment**: DigitalOcean for AI service, Supabase Cloud for backend

### Key Design Decisions

**1. Mobile Framework: Expo (Managed Workflow)**
- Zero setup complexity (no Xcode/Android Studio for development)
- Cloud builds (30 free/month) - no Mac required for iOS
- Free OTA updates
- Web-developer friendly (hot reload, TypeScript)
- All Flare features supported out-of-box

**2. UI Library: React Native Paper**
- Mature, battle-tested Material Design 3 library
- Complete component set
- Excellent theming (easy to customize for "calming" aesthetic)
- Great documentation
- Works perfectly with Expo

**3. State Management: Zustand + TanStack Query**
- Zustand for global app state (auth, settings)
- TanStack Query for server state (Supabase data)
- Automatic caching, background refetching
- Optimistic updates
- Simple, minimal boilerplate

**4. Authentication: Supabase Auth**
- Email/password for MVP
- JWT-based with automatic refresh
- Row-level security (RLS) policies
- React Native: Direct Supabase client
- Python AI Service: JWT validation

**5. Encryption: Hybrid with Recovery Passphrase**
- Master Encryption Key (MEK) encrypts all sensitive data
- MEK encrypted with password AND recovery passphrase
- Recovery passphrase stored during signup (like 1Password)
- If user forgets password: Can recover with passphrase
- Balances security with usability (critical for health data)

**6. AI Service: FastAPI + LangChain + GPT-4o-mini**
- Cost: ~$4/month per 1,000 users
- Best structured output support
- Can switch providers later (LangChain abstraction)
- Three main endpoints:
  - Insight generation (proactive correlations)
  - Doctor reports (PDF summaries)
  - Conversational queries (post-MVP)

### Cost Breakdown (MVP Phase)

| Service | Monthly Cost |
|---------|--------------|
| Expo SDK/CLI | $0 |
| EAS Build (30 builds) | $0 |
| EAS Update | $0 |
| Supabase Free Tier | $0 |
| DigitalOcean (Basic Droplet) | $6 |
| GPT-4o-mini (100 users) | $0.40 |
| **Total** | **~$6-7/month** |

**At Scale (1,000 users):**
- Supabase Pro: $25/month
- DigitalOcean (scaled): $24/month
- GPT-4o-mini: $4/month
- **Total: ~$53/month**

---

## Next Steps: Implementation Roadmap

### Phase 1: Foundation Setup (Week 1)

**1. Initialize Projects**
```bash
# Mobile app
npx create-expo-app flare-mobile --template blank-typescript
cd flare-mobile
npm install react-native-paper @supabase/supabase-js zustand @tanstack/react-query

# Python AI service
mkdir flare-ai-service
cd flare-ai-service
# Create virtual environment, install FastAPI, LangChain, etc.
```

**2. Supabase Setup**
- Create Supabase project
- Deploy database schema from [database/schema.sql](database/schema.sql)
- Set up RLS policies
- Seed predefined data (symptom categories, body locations, etc.)
- Add encryption key table (`user_keys`)

**3. Basic Project Structure**
- Set up folder structure per architecture doc
- Configure TypeScript
- Set up environment variables
- Create theme (calming colors, Material Design 3)

### Phase 2: Authentication (Week 2)

**Mobile App:**
- Supabase client setup with expo-secure-store
- Auth store (Zustand)
- Login/signup screens
- Encryption key generation on signup
- Recovery passphrase flow

**Python AI Service:**
- JWT validation middleware
- Auth dependency injection
- Basic health check endpoint

**Test:** Sign up → Log in → Token works for AI endpoint

### Phase 3: First Feature - Symptom Logging (Week 3-4)

**Mobile App:**
- Dashboard screen (empty state)
- Symptom logging form
  - Symptom type picker (hierarchical)
  - Severity slider (0-10)
  - Started at (datetime picker)
  - Optional: duration, location, notes
- Encrypt notes before saving
- Submit to Supabase
- Display logged symptoms on dashboard

**Backend:**
- Symptom categories/types queries
- Create symptom log mutation
- RLS policies tested

**Test:** Log symptom → See it on dashboard → Data encrypted in DB

### Phase 4: Practices & Dashboard (Week 5-6)

**Mobile App:**
- Create practice wizard
- Practice list screen
- Daily task list on dashboard
- Mark practices complete
- Progress rings

**Backend:**
- Practice CRUD operations
- Practice completions
- Dashboard aggregation queries

**Test:** Create practice → Complete it → See progress on dashboard

### Phase 5: AI Insights (Week 7-8)

**Python AI Service:**
- Fetch user data from Supabase (service role key)
- Anonymize data
- LangChain insight generation chain
- GPT-4o-mini integration
- Return structured insights

**Mobile App:**
- Insights screen
- "Generate Insights" button
- Display correlations/patterns
- Disclaimer text

**Test:** Log data for 2 weeks → Generate insights → See correlations

### Phase 6: Polish & Deploy (Week 9-10)

- Journal entries (morning/evening)
- Experiments feature
- Basic reports/charts
- Push notifications setup
- EAS Build for TestFlight
- Internal testing

---

## Critical Files Reference

### Database
- [database/schema.sql](database/schema.sql) - PostgreSQL schema
- [database/schema.dbml](database/schema.dbml) - Visual schema reference
- [docs/data-dictionary.md](docs/data-dictionary.md) - Complete data spec

### Documentation
- [PRD.md](PRD.md) - Product requirements

### To Create
- `flare-mobile/` - Expo React Native app
- `flare-ai-service/` - Python FastAPI service
- RLS policies SQL file
- Seed data SQL file
- Environment variable templates

---

---

## Additional Technical Questions & Decisions

### 1. TypeScript vs JavaScript

**Question:** What's affected if we don't use TypeScript?

**Answer:**

**What TypeScript Provides:**
- Type safety (catch bugs at compile time)
- Better IDE autocomplete
- Self-documenting code
- Easier refactoring

**Impact of Using JavaScript Instead:**

| Area | With TypeScript | With JavaScript | Impact |
|------|-----------------|-----------------|--------|
| **React Native** | Full type safety, Expo supports both | Works perfectly, slightly less IDE help | Low impact |
| **Supabase** | Auto-generated types from schema | Manual type checking | Medium impact - lose auto-complete for DB queries |
| **React Native Paper** | Full component prop types | Works fine, check docs more | Low impact |
| **State Management** | Zustand works great with JS | Actually simpler in JS | **Easier** without TS |
| **TanStack Query** | Type-safe queries | Works perfectly in JS | Low impact |
| **Python (FastAPI)** | Unaffected (Python has its own type hints) | Unaffected | No impact |

**JavaScript Advantages:**
- Faster to write (no type annotations)
- Less boilerplate
- Simpler for solo developers
- Easier learning curve coming from web

**TypeScript Advantages:**
- Catches bugs early
- Better for teams
- Better refactoring support
- Supabase auto-generated types are amazing

**Recommendation for Flare:**

**Use JavaScript** if:
- ✅ You're more comfortable with JS
- ✅ Solo developer (you)
- ✅ Want faster iteration
- ✅ Smaller codebase

**Use TypeScript** if:
- Planning to hire developers soon
- Want maximum type safety
- Willing to spend time learning TS nuances

**My suggestion:** Start with **JavaScript**. You can always add TypeScript later (Expo supports gradual migration - rename `.js` to `.tsx` file by file). The productivity gain from JS familiarity outweighs TS benefits for MVP.

**Setup Changes:**
```bash
# JavaScript version
npx create-expo-app flare-mobile --template blank

# Instead of
npx create-expo-app flare-mobile --template blank-typescript
```

Everything else stays the same - React Native, Expo, Supabase all work identically with JavaScript.

---

### 2. What is RLS (Row-Level Security)?

**RLS = Row-Level Security**

**The Problem It Solves:**

Without RLS:
```sql
-- User A can see ALL users' data
SELECT * FROM symptom_logs;
-- Returns EVERY symptom log from EVERY user (security disaster!)
```

With RLS:
```sql
-- Same query, but Postgres automatically filters
SELECT * FROM symptom_logs;
-- Returns ONLY current user's symptom logs (secure!)
```

**How It Works:**

1. **Supabase Auth** identifies who's making the request
2. **RLS policies** enforce data access rules at the database level
3. **Postgres** automatically filters queries based on the authenticated user

**Example RLS Policy:**

```sql
-- Enable RLS on the table
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own symptom logs
CREATE POLICY "Users can view own symptom logs"
  ON symptom_logs
  FOR SELECT  -- This policy applies to SELECT queries
  USING (auth.uid() = user_id);  -- Only rows where user_id matches authenticated user

-- Create policy: Users can only insert their own data
CREATE POLICY "Users can insert own symptom logs"
  ON symptom_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);  -- Ensure user_id matches authenticated user

-- Create policy: Users can update only their own data
CREATE POLICY "Users can update own symptom logs"
  ON symptom_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete only their own data
CREATE POLICY "Users can delete own symptom logs"
  ON symptom_logs
  FOR DELETE
  USING (auth.uid() = user_id);
```

**What `auth.uid()` Means:**
- Supabase function that returns the currently authenticated user's ID
- Comes from the JWT token sent with the request
- Postgres uses this to filter rows automatically

**Why This is Powerful:**

**Without RLS (old way):**
```javascript
// Mobile app
const { data } = await supabase
  .from('symptom_logs')
  .select('*')
  .eq('user_id', currentUser.id);  // Developer must remember to filter!

// If developer forgets .eq(), ALL data leaks! 🚨
```

**With RLS (secure by default):**
```javascript
// Mobile app
const { data } = await supabase
  .from('symptom_logs')
  .select('*');
  // Postgres automatically filters to current user
  // Developer CANNOT accidentally leak data! ✅
```

**RLS for Flare:**

Every user table needs RLS:
- `symptom_logs` - Users only see their own symptoms
- `practices` - Users only see their own practices
- `medications` - Users only see their own medications
- `experiments` - Users only see their own experiments
- `metrics` - Users only see their own metrics

**Predefined data** (symptom categories, body locations) is globally readable:
```sql
CREATE POLICY "Everyone can read predefined symptom categories"
  ON symptom_categories
  FOR SELECT
  USING (is_predefined = true OR user_id = auth.uid());
  -- Users can see: all predefined categories + their own custom categories
```

**Why RLS is Critical for Health Apps:**
- Health data is highly sensitive
- HIPAA/GDPR requires strict access controls
- RLS enforces security at the database level (not in app code)
- Even if your app code has a bug, data can't leak

---

### 3. What is JWT Validation and JOSE?

**JWT = JSON Web Token**

**What JWT Is:**

A secure way to prove "who you are" without sending your password every time.

**How It Works:**

```
1. User logs in with email/password
   ↓
2. Supabase generates a JWT (like a digital ID card)
   ↓
3. Mobile app stores JWT
   ↓
4. Every request includes JWT in headers
   ↓
5. Server validates JWT (checks if it's real/not expired)
   ↓
6. If valid, server knows who you are
```

**JWT Structure:**

A JWT looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

It has three parts (separated by `.`):
1. **Header**: Algorithm used
2. **Payload**: User data (user ID, expiration time)
3. **Signature**: Proves it hasn't been tampered with

**Why Python AI Service Needs JWT Validation:**

**The Problem:**
```python
# Without JWT validation - INSECURE!
@app.post("/api/insights/generate")
async def generate_insights(user_id: str):
    # Anyone can claim to be any user!
    # Attacker sends: {"user_id": "victim-id"} and steals their data
    pass
```

**The Solution:**
```python
# With JWT validation - SECURE!
@app.post("/api/insights/generate")
async def generate_insights(user: dict = Depends(verify_token)):
    # user["user_id"] is guaranteed to be authentic
    # Attacker can't fake this - JWT signature verifies it
    pass
```

**What JOSE Is:**

**JOSE = JavaScript Object Signing and Encryption**

It's a Python library for working with JWTs.

**How We Use It:**

```python
from jose import jwt, JWTError

def verify_token(token: str):
    try:
        # Decode and verify JWT
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,  # Secret key from Supabase
            algorithms=["HS256"]   # Algorithm Supabase uses
        )
        user_id = payload.get("sub")  # "sub" = subject = user ID
        return {"user_id": user_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Flow in Flare:**

```
Mobile App                     Python AI Service
    |                                |
    |  POST /api/insights/generate   |
    |  Headers:                      |
    |    Authorization: Bearer <JWT> |
    | -----------------------------> |
    |                                |
    |                     Verify JWT with JOSE
    |                     Extract user_id from JWT
    |                                |
    |  { insights: [...] }           |
    | <----------------------------- |
```

**Why This is Secure:**

1. JWT is signed by Supabase with secret key
2. Only Supabase and Python service know the secret
3. If attacker tries to fake a JWT, signature won't match
4. Expired JWTs are rejected automatically

**Alternative (Less Secure):**
```python
# BAD: Trust the user_id sent in request body
@app.post("/api/insights/generate")
async def generate_insights(user_id: str):
    # Attacker can send any user_id! 🚨
    pass
```

**Summary:**
- **JWT**: Digital ID card proving who you are
- **JOSE**: Python library to verify JWTs
- **Why needed**: Secure communication between mobile app and Python service

---

### 4. Synchronous vs Event-Driven Communication

**Question:** Should the mobile app → Python AI service use synchronous or event-driven communication?

**Let's compare:**

#### Option A: Synchronous (HTTP Request/Response)

**How it works:**
```
Mobile App                        Python AI Service
    |                                    |
    | POST /api/insights/generate        |
    | ---------------------------------> |
    |                                    |
    |                    [Processing... 10 seconds]
    |                                    |
    |       { insights: [...] }          |
    | <--------------------------------- |
    |                                    |
    | Display insights to user           |
```

**Pros:**
- ✅ **Simple** - Just HTTP requests (like web APIs)
- ✅ **Easy to debug** - Linear flow
- ✅ **No extra infrastructure** - No message queues/workers
- ✅ **Real-time feedback** - User sees loading state, then result
- ✅ **Error handling is straightforward** - HTTP status codes

**Cons:**
- ❌ **User waits** - Must keep app open during processing
- ❌ **Timeout risk** - If processing takes >30 seconds
- ❌ **No retry** - If app crashes, request is lost

#### Option B: Event-Driven (Async with Message Queue)

**How it works:**
```
Mobile App         Message Queue        Python Worker        Database
    |                   |                      |                 |
    | "Generate insights for user X"          |                 |
    | ----------------> |                      |                 |
    |                   |                      |                 |
    | "Request queued"  |                      |                 |
    | <---------------- |                      |                 |
    |                   |                      |                 |
    | Poll for results  | Job picked up        |                 |
    | ----------------> | ------------------>  |                 |
    |                   |                      | [Processing...] |
    |                   |                      |                 |
    |                   |            Save insights to DB         |
    |                   |                      | --------------> |
    |                   |                      |                 |
    | GET /insights     |                      |                 |
    | --------------------------------------------->            |
    |                   |                      |                 |
    | { insights: [...] }                                        |
    | <------------------------------------------------------ |
```

**Pros:**
- ✅ **Resilient** - If app crashes, job continues
- ✅ **Scalable** - Multiple workers process jobs in parallel
- ✅ **No timeouts** - Long-running jobs are fine
- ✅ **Background processing** - User doesn't wait

**Cons:**
- ❌ **Complex** - Need message queue (Redis, RabbitMQ, etc.)
- ❌ **More infrastructure** - Queue + workers + polling
- ❌ **Harder to debug** - Async flow, jobs can fail silently
- ❌ **Polling overhead** - Mobile app must repeatedly check status

**Infrastructure Comparison:**

| Aspect | Synchronous | Event-Driven |
|--------|-------------|--------------|
| **Services needed** | 1 (FastAPI) | 3 (FastAPI + Queue + Worker) |
| **Monthly cost** | $6 (1 server) | $18+ (3 servers/services) |
| **Setup time** | 1 hour | 1 day |
| **Monitoring** | Simple logs | Queue metrics, worker health |

**Recommendation for Flare:**

**Use Synchronous (HTTP Request/Response)** ✅

**Why:**

1. **Insight generation is fast** - 2-5 seconds with GPT-4o-mini
   - Not long enough to justify async complexity

2. **User expects to wait** - They click "Generate Insights" and want immediate results
   - Similar UX to "generating PDF" or "running analysis"

3. **Simpler architecture** - No message queue, no workers, no polling
   - Faster to build MVP
   - Easier to debug

4. **Cost-effective** - 1 server vs 3+ servers

5. **Error handling is clearer** - User sees error immediately, can retry

**When to Switch to Event-Driven:**

Switch later if:
- Processing time exceeds 30 seconds regularly
- You add batch jobs (e.g., nightly insights for all users)
- You need guaranteed delivery (job retries)
- You're processing thousands of requests/hour

**For MVP:**
```python
# Simple synchronous endpoint
@app.post("/api/insights/generate")
async def generate_insights(
    request: InsightRequest,
    user: dict = Depends(verify_token)
):
    # 1. Fetch user data (1-2 seconds)
    data = fetch_user_data(user["user_id"], request.date_range)

    # 2. Anonymize (< 1 second)
    anon_data = anonymize(data)

    # 3. Call LLM (2-5 seconds)
    insights = await llm_chain.invoke(anon_data)

    # 4. Return immediately
    return insights  # Total: ~5-8 seconds
```

**User experience:**
- User clicks "Generate Insights"
- Loading spinner shows "Analyzing your data..."
- 5 seconds later: Insights appear
- Clean, simple UX

**Summary:** Synchronous is the right choice for Flare MVP. Event-driven adds unnecessary complexity for insight generation that completes in seconds.

---

### 5. What Does Pydantic Provide? Is It Necessary?

**Pydantic = Data validation library for Python**

**What It Does:**

Think of Pydantic as "TypeScript for Python APIs"

**Without Pydantic:**
```python
@app.post("/api/insights/generate")
async def generate_insights(request_data: dict):
    # Is date_range present?
    # Is it in the right format?
    # What if it's missing or invalid?
    # Manual validation code needed!

    if "date_range" not in request_data:
        return {"error": "Missing date_range"}

    if "start_date" not in request_data["date_range"]:
        return {"error": "Missing start_date"}

    # ... 50 more lines of validation code
```

**With Pydantic:**
```python
from pydantic import BaseModel
from datetime import date

class DateRange(BaseModel):
    start_date: date
    end_date: date

class InsightRequest(BaseModel):
    date_range: DateRange
    focus_symptoms: list[str] = []  # Optional, defaults to empty list

@app.post("/api/insights/generate")
async def generate_insights(request: InsightRequest):
    # request.date_range.start_date is GUARANTEED to:
    # - Exist
    # - Be a valid date
    # - Be properly formatted
    # All validation happened automatically!

    print(request.date_range.start_date)  # Works!
```

**What Pydantic Validates Automatically:**

1. **Type checking**
   ```python
   class InsightRequest(BaseModel):
       user_id: str
       count: int

   # Input: {"user_id": "123", "count": "five"}
   # Pydantic error: "count must be an integer"
   ```

2. **Required vs optional**
   ```python
   class InsightRequest(BaseModel):
       date_range: DateRange  # Required
       focus_symptoms: list[str] = []  # Optional

   # Input: {}
   # Pydantic error: "date_range is required"
   ```

3. **Nested validation**
   ```python
   class DateRange(BaseModel):
       start_date: date
       end_date: date

   class InsightRequest(BaseModel):
       date_range: DateRange  # Validates nested object
   ```

4. **Data parsing**
   ```python
   # Input: {"start_date": "2024-01-15"}
   # Pydantic automatically converts string to datetime.date object
   ```

**Pydantic Benefits for Flare:**

| Without Pydantic | With Pydantic |
|------------------|---------------|
| Manual validation (50+ lines) | Automatic (0 lines) |
| Unclear API contract | Self-documenting |
| Runtime errors | Immediate validation errors |
| No auto-generated docs | FastAPI generates OpenAPI docs |

**FastAPI + Pydantic Integration:**

**Automatic API Documentation:**

```python
# This code automatically generates:
# - Interactive API docs at /docs
# - JSON schema
# - Request/response examples

class InsightRequest(BaseModel):
    date_range: DateRange
    focus_symptoms: list[str] = []

    class Config:
        schema_extra = {
            "example": {
                "date_range": {
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31"
                },
                "focus_symptoms": ["headache", "fatigue"]
            }
        }

@app.post("/api/insights/generate")
async def generate_insights(request: InsightRequest):
    return {"insights": []}

# Visit http://localhost:8000/docs
# Interactive Swagger UI automatically generated!
```

**Is Pydantic Necessary?**

**Technically no**, but practically **yes** for FastAPI.

**Without Pydantic:**
```python
@app.post("/api/insights/generate")
async def generate_insights(request: dict):
    # You write 100+ lines of validation
    # You miss edge cases
    # Bugs in production
    # No API docs
```

**With Pydantic:**
```python
@app.post("/api/insights/generate")
async def generate_insights(request: InsightRequest):
    # 0 lines of validation
    # All edge cases handled
    # Auto-generated docs
    # Type safety
```

**For Flare:**
Pydantic is **strongly recommended** because:
- FastAPI is built around Pydantic
- Validates complex nested requests (date ranges, symptom lists)
- Prevents bad data from reaching LLM
- Makes API self-documenting
- Zero overhead (built into FastAPI)

**Cost:** $0 (free library, adds ~100ms validation time)
**Complexity:** Low (intuitive syntax)
**Benefit:** Huge (catch bugs, document API, clean code)

**Recommendation:** **Yes, use Pydantic** - it's the standard way to use FastAPI.

---

### 6. Why Encrypt Notes? LLM Analysis Needs Them!

**This is an excellent question** - you're absolutely right that notes are critical for LLM analysis. Let me clarify the encryption strategy.

**The Confusion:**

Earlier I said:
> "Encrypt notes before storing in Supabase"

But you correctly identified:
> "LLM needs notes to analyze unstructured input"

**Both are true! Here's how:**

#### The Full Picture: Selective Encryption + Temporary Decryption

**What Gets Encrypted in Supabase:**
```sql
-- symptom_logs table
{
  "id": "uuid",
  "user_id": "uuid",
  "symptom_type_id": "uuid",
  "severity": 7,              -- NOT encrypted (needed for queries)
  "started_at": "2024-01-15", -- NOT encrypted (needed for sorting)
  "notes": "enc_AES256..."    -- ✅ ENCRYPTED (sensitive free text)
}
```

**Why Encrypt Notes in the Database:**
- Protect against database breaches
- Supabase employees can't read them
- If someone hacks Supabase, they get gibberish
- Meets HIPAA/GDPR requirements

**How LLM Still Analyzes Notes:**

```
1. Mobile app stores notes encrypted in Supabase
   ↓
2. When generating insights:
   Python AI Service fetches encrypted notes from Supabase
   ↓
3. Python AI Service decrypts notes using user's key
   ↓
4. Python AI Service sends DECRYPTED notes to LLM
   ↓
5. LLM analyzes full context (including notes)
   ↓
6. Insights returned to user
```

**Implementation:**

```python
# Python AI Service
@app.post("/api/insights/generate")
async def generate_insights(user: dict = Depends(verify_token)):
    user_id = user["user_id"]

    # 1. Fetch encrypted data from Supabase
    symptom_logs = await supabase.from("symptom_logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute()

    # 2. Fetch user's encryption key
    user_key = await fetch_user_encryption_key(user_id)

    # 3. Decrypt notes
    for log in symptom_logs:
        if log["notes"]:
            log["notes"] = decrypt(log["notes"], user_key)

    # 4. Send decrypted data to LLM
    insights = await llm_chain.invoke({
        "symptom_logs": symptom_logs  # Full decrypted data
    })

    return insights
```

**Data Flow:**

```
Mobile App (has MEK)
    ↓ Encrypt notes with MEK
Supabase Database (encrypted notes)
    ↓ Fetch encrypted notes
Python AI Service
    ↓ Fetch user's MEK from secure key store
Python AI Service (decrypt with MEK)
    ↓ Decrypted data
LLM (OpenAI/Anthropic)
    ↓ Analyze full context
Insights returned to user
```

**What Gets Sent to LLM:**

```json
{
  "symptom_logs": [
    {
      "symptom": "Headache",
      "severity": 7,
      "started_at": "2024-01-15T14:30:00Z",
      "notes": "Started after skipping coffee this morning. Throbbing pain on left temple. Felt better after taking magnesium."
    },
    {
      "symptom": "Fatigue",
      "severity": 8,
      "started_at": "2024-01-15T16:00:00Z",
      "notes": "Crashed hard after lunch. Slept poorly last night (only 5 hours). Felt foggy and couldn't concentrate."
    }
  ],
  "practices": [
    {
      "name": "Magnesium glycinate",
      "completed": true,
      "notes": "Taking 400mg before bed. Seems to help with sleep quality."
    }
  ]
}
```

**LLM then analyzes:**
- "User's headaches seem related to caffeine withdrawal"
- "Poor sleep correlates with fatigue"
- "Magnesium appears to help headaches"

**Privacy Layers:**

1. **At rest (Supabase)**: Encrypted with MEK
2. **In transit (mobile ↔ Supabase)**: HTTPS encryption
3. **Python AI Service**: Temporarily decrypted for LLM analysis
4. **LLM (OpenAI)**: Data sent via API (OpenAI's privacy policy applies)
5. **Result**: Insights returned, decrypted data discarded

**Alternative: Don't Encrypt Notes**

**Pros:**
- Simpler architecture
- No encryption overhead
- LLM can access directly

**Cons:**
- ❌ If Supabase is breached, all health notes are exposed
- ❌ Supabase employees can theoretically read them
- ❌ Doesn't meet privacy-first PRD requirement
- ❌ Users can't claim "end-to-end encryption"

**Trade-off:**

You're right that encryption adds complexity. Here's the real question:

**"Is protecting notes in the database worth the encryption complexity?"**

**Marketing/Trust Perspective:**
- ✅ "Your data is encrypted end-to-end" (powerful selling point)
- ✅ Privacy-conscious users will choose Flare over competitors
- ✅ HIPAA-adjacent compliance

**Technical Perspective:**
- ❌ More complex architecture
- ❌ Key management overhead
- ❌ If user loses recovery passphrase + password = data lost

**Pragmatic Alternative: Encrypt Later**

**MVP Approach:**
1. **Phase 1 (MVP)**: Don't encrypt notes
   - Store plaintext in Supabase
   - Simpler architecture
   - Faster development
   - Still secure (HTTPS, RLS, Supabase's security)

2. **Phase 2 (Post-launch)**: Add encryption
   - Once product validated
   - Encrypt going forward (don't re-encrypt old data)
   - Migration path: "Enable encryption for enhanced privacy"

**Recommendation:**

**For MVP: Skip note encryption**
- Focus on building features
- Supabase is SOC 2 compliant, GDPR-ready
- Add encryption later if users demand it

**For "privacy-first" positioning: Encrypt notes**
- Implement hybrid encryption as designed
- Unique selling point
- Worth the complexity

**Your call based on priorities:**
- Speed to market → Skip encryption for MVP
- Privacy as core value → Implement encryption from day 1

**My suggestion:** Start without encryption, add it in Phase 2 if users care. Health apps like MyFitnessPal, Cronometer don't encrypt notes, and users are fine with it.

What's your priority? Speed or privacy-first positioning?

---

## Final Technical Decisions

1. **UI Library**: React Native Paper ✓
2. **Encryption**: Hybrid with recovery passphrase + encrypted notes at rest ✓
3. **LLM**: GPT-4o-mini ✓
4. **React Native Framework**: Expo (Managed Workflow) ✓
5. **Language**: JavaScript (recommended for MVP speed)
6. **Communication Pattern**: Synchronous HTTP ✓
7. **Pydantic**: Yes ✓
8. **Notes Encryption**: Yes - encrypt at rest, decrypt for LLM analysis ✓

---

## Privacy & Security Summary

**Encryption Strategy:**
- **At rest (Supabase)**: All sensitive text fields (notes) encrypted with user's Master Encryption Key (MEK)
- **In transit**: HTTPS encryption for all API calls
- **For LLM analysis**: Python service temporarily decrypts notes, sends plaintext to OpenAI, discards after processing
- **Key recovery**: Hybrid approach with recovery passphrase prevents data loss

**What gets encrypted:**
- Symptom notes
- Practice notes
- Journal entries
- Any user-entered free text

**What stays plaintext (needed for queries/analysis):**
- Symptom types, severity, timestamps
- Practice names, completion status
- Metric values
- User IDs, dates

**Marketing position:** "Your sensitive health notes are encrypted at rest. Only you can decrypt them."

**Technical reality:** Encrypted in database, decrypted server-side for AI analysis, sent to OpenAI under their privacy policy.

---

## Technical Planning Complete ✅

**All major architectural decisions finalized:**

| Decision Area | Selected Technology | Rationale |
|---------------|---------------------|-----------|
| **Mobile Framework** | Expo (Managed Workflow) | Zero native tooling setup, cloud builds, OTA updates, web-developer friendly |
| **Programming Language** | JavaScript | Faster MVP development, simpler for solo developer, can migrate to TypeScript later |
| **UI Library** | React Native Paper | Mature Material Design 3 library, complete component set, excellent theming |
| **State Management** | Zustand + TanStack Query | Zustand for global state, React Query for server state with caching |
| **Backend** | Supabase (PostgreSQL + Auth) | Managed PostgreSQL, built-in authentication, Row-Level Security |
| **Authentication** | Supabase Auth + JWT + RLS | Email/password auth, automatic JWT refresh, database-level security |
| **Encryption** | Hybrid with recovery passphrase | MEK encrypted with both password and recovery passphrase, prevents data loss |
| **Note Encryption** | At-rest encryption | Notes encrypted in database, decrypted server-side for LLM analysis |
| **AI Service Framework** | Python FastAPI | Async, fast, automatic OpenAPI docs, Pydantic validation |
| **AI Framework** | LangChain | LLM abstraction, provider-agnostic, composable chains |
| **LLM Provider** | OpenAI GPT-4o-mini | Best cost/quality ratio ($4/month per 1,000 users), excellent structured output |
| **Communication Pattern** | Synchronous HTTP | Simple request/response, fast enough for insight generation (2-5 seconds) |
| **Data Validation** | Pydantic | Automatic type validation, self-documenting API, zero boilerplate |

**Cost Breakdown:**
- MVP (0-100 users): ~$6-7/month (DigitalOcean + minimal LLM usage)
- Scale (1,000 users): ~$53/month (Supabase Pro + scaled compute + LLM)

**Implementation Roadmap:** 10-week plan from setup to MVP launch detailed in sections above.

**Ready to begin implementation.**

