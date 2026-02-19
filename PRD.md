# Flare - Product Requirements Document

## Overview

**App Name:** Flare
**Mission:** Help individuals with invisible illnesses, undiagnosed conditions, autoimmune disorders, and other health challenges track symptoms and lifestyle choices to identify what improves their wellbeing.

**Target Users:** Self-directed individuals managing their own health journey independently. Users who want to take control of their health data and see patterns in their symptoms and lifestyle choices.

**Design Philosophy:** Clean, minimal, and calming. The app should avoid overstimulation and prevent users from feeling overwhelmed—especially important for those already dealing with health challenges.

---

## Technical Requirements

### Platform
- **Primary:** Mobile-first (iOS and Android)
- **Framework:** React Native with Expo
- **Connectivity:** Online required (no offline-first architecture for MVP)

### Privacy & Security
- **Data Storage:** Privacy-first with encryption at rest (Supabase AES-256) and in transit (TLS 1.2/1.3)
- **Authentication:** Supabase Auth with row-level security (RLS)
- **AI Processing:** Cloud AI with anonymization—strip identifying information before sending data to AI services
- **Data Ownership:** Users can export all their data (PDF reports + raw JSON/CSV)

#### Regulatory Context

**HIPAA**: Does not apply to Flare. Per [HHS guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access-right-health-apps-apis/index.html), HIPAA rules do not apply to health information that users voluntarily enter into apps not developed by or on behalf of covered entities. Flare collects user-entered symptoms, practices, and medications—not PHI from healthcare providers.

**FTC Health Breach Notification Rule**: Applies to Flare. The [FTC rule](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0) requires health apps to notify users and the FTC within 60 days of a data breach. Penalties can reach $43,792 per violation per day.

#### Industry Standards

Based on analysis of comparable apps (Flo, period/health trackers), industry standard security for consumer health apps includes:
- TLS for data in transit
- AES-256 encryption at rest (server-side)
- ISO 27001/27701 certifications (goal for production)

Client-side end-to-end encryption with recovery passphrases is **not** industry standard for consumer health tracking apps and adds complexity without proportional benefit. See [specs/001-user-auth/decision-record.md](specs/001-user-auth/decision-record.md) for detailed research.

---

## User Experience

### Onboarding
A hybrid approach balancing speed with value demonstration:
- Minimal steps to avoid user frustration
- Condition-based templates to quickly populate relevant symptoms and lifestyle factors
- Guided setup that shows the app's potential without requiring extensive initial input
- Users can start tracking immediately and refine their setup over time

### Visual Design
- Clean and minimal aesthetic
- Calming color palette and typography
- Subtle progress indicators (progress rings/bars for daily tasks)
- Avoid visual clutter and overstimulation
- Trend indicators should be understated but informative

### Quick Logging
- **Home screen widget:** Quick access to log symptoms without opening full app
- **Frequent symptom tiles:** One-tap logging for commonly tracked symptoms
- **Journal shortcuts:** Quick access to morning/evening journal entries

---

## Core Interaction Model

**Guiding principle:** The user should never have to think about Flare's data model. They tell the app how they're feeling, and the app takes care of the rest. (See Constitution Principle X: AI-Assisted Data Entry.)

### NLP-Primary Interactions (high cognitive load reduced)

Natural language input is the primary method for interactions that traditionally require complex, multi-step forms:

- **Symptom logging:** "My knees are killing me today, worse than yesterday, probably from the hike" → symptom log with body_location=knees, severity=7-8 (inferred from "killing me"), trigger=physical activity, notes="probably from the hike"
- **Journal entries:** "Slept about 6 hours, pretty restless, woke up with moderate pain around a 5, energy is low" → metrics for sleep_duration=6, sleep_quality=poor, morning_pain=5, morning_energy=low
- **Practice creation:** "I want to start taking 400mg magnesium glycinate every night before bed, hoping it helps with my headaches" → practice with name="Magnesium glycinate 400mg", category=supplements, tracking_type=completion, frequency=daily, reminder_times=["21:00"], expected_symptoms=[headache], notes="400mg before bed"
- **Medication creation:** "I take 10mg Lexapro every morning and 50mg hydroxyzine at bedtime as needed" → two medication entries with appropriate dosages, frequencies, and timing

### Form-Primary Interactions (already low friction)

Simple interactions stay form-based because they're already faster than typing:

- **Practice completions:** Checkbox on the daily task list (1 tap vs ~20 keystrokes)
- **Medication adherence:** Taken/skipped toggle on the daily task list
- **Simple metric entry:** Number stepper for values like water glasses, steps

### Confirmation UX

All NLP-parsed entries are presented in an editable confirmation card before saving. The user can:
- Tap "Save" to accept the parsed result as-is
- Adjust any field the LLM inferred (edit severity, change body location, etc.)
- Switch to the full detailed form if they prefer manual entry

### Follow-Up Questions

When the LLM cannot confidently parse a critical field, it asks a minimal follow-up question:
- **Example:** "my arm hurts" → "Which arm—left, right, or both? And how would you rate the pain on a 0-10 scale?"
- Follow-ups are conversational, not a replacement interrogation form
- Only asked for critical ambiguous fields (severity, symptom type)—not for every missing optional field

### Data Preservation

- **`raw_input` column:** The user's original text is always preserved alongside the structured extraction
- **`notes` catch-all:** Anything the LLM cannot confidently map to a structured field goes into `notes` verbatim—no user data is ever lost
- **`source` tracking:** Every entry records whether it was created via `'manual'` (form) or `'nlp'` (natural language)

### Voice Input (Post-MVP)

The NLP endpoint accepts text strings agnostic of input method. Voice-to-text (via Expo Speech API) will feed into the same parsing pipeline when implemented. The architecture supports this by design—no backend changes needed.

### Dashboard Implication

The dashboard's primary surface is the daily task list (checkboxes for practices and medications). The NLP input serves as the "how am I feeling right now?" capture tool—a prominent text field for symptom logging and journaling, not a replacement for the task list.

---

## MVP Features

### 1. User Authentication

**Status:** Implemented (see [specs/001-user-auth/](specs/001-user-auth/))

Email/password authentication via Supabase Auth with server-side rate limiting, session management, password reset, and row-level security. See feature spec for full details.

---

### 2. AI Service (NLP Input)

**Purpose:** Provide the NLP parsing backend that powers the natural language interaction model described above. This is the infrastructure feature that enables NLP-first input across all subsequent data entry features.

**Deployment:** The AI service deploys with this feature—earlier than originally planned (was tied to Reports & Analytics). It has dual responsibility: (1) NLP input parsing now, (2) analytics and insights later (Feature 10).

**NLP Parsing Endpoint:**

`POST /api/v1/parse-input` — accepts raw text, returns structured data matching the existing database schema.

**Supported Intents:**
| Intent | Description | Example Input |
|--------|-------------|---------------|
| `symptom_report` | Log one or more symptoms | "my knees are killing me, maybe a 7" |
| `journal_entry` | Morning or evening wellness narrative | "slept 6 hours, restless, pain around 5" |
| `create_practice` | Set up a new health practice | "start taking 400mg magnesium every night" |
| `create_medication` | Set up a new medication entry | "I take 10mg Lexapro every morning" |

**Response Format:**
- Structured JSON entries with confidence scores per field
- List of ambiguous fields needing follow-up (if any)
- Unmapped text preserved for `notes` column
- Original user text preserved as `raw_input`

**Follow-Up Handling:**
- When critical fields are ambiguous, the response includes follow-up question context
- Client displays the follow-up conversationally and sends the user's reply for re-parsing
- Managed via LangChain with manual conversation history (LangGraph migration planned when multi-turn limitations surface)

**Fallback Behavior:**
- If parsing fails entirely, fall back to the manual form with the user's text pre-populated in `notes`
- Graceful degradation—the user never loses their input

**Technology:**
- Python FastAPI with Pydantic validation
- LangChain structured output for entity extraction
- OpenAI GPT-4o-mini for parsing (provider-agnostic via LangChain abstraction)
- User's configured symptom types, practices, and medications sent as parsing context (anonymized)

**Privacy:**
- All text anonymized before sending to LLM (same pipeline as analytics data)
- JWT validation on all requests
- No logging of raw user health text on the AI service

---

### 3. Dashboard (Home Screen)

**Purpose:** Serve as a daily task-oriented hub that encourages adherence and engagement.

**Primary Focus:** A task list of lifestyle choices and medications to be taken/completed today
- Progress rings showing daily completion status
- Clear visual indication of pending vs completed items

**Secondary Focus:** Today's status overview
- Symptoms logged today
- Journal completion status

**Quick Actions:**
- NLP text input — "How are you feeling?" prompt for symptom logging and journaling (see Core Interaction Model)
- Morning/evening journal shortcuts
- Frequent symptom tiles for quick one-tap logging (form-based fallback)

**At-a-Glance Metrics:**
- Trend indicators (arrows showing if key symptoms are up/down vs last week)
- Keep other metrics minimal—save detailed data for reports section

---

### 4. Symptom Tracking

**Purpose:** Track every symptom the user experiences to identify patterns and responses to medication and lifestyle changes.

**Primary Input: Natural Language** (see Core Interaction Model)

Symptom logging is the highest-value NLP use case. Users describe what they're experiencing in plain language, and the AI service parses it into structured data:

> "My knees are killing me today, worse than yesterday, probably a 7. Maybe from the hike."
> → symptom_type=knee pain, severity=7, body_location=knees, notes="worse than yesterday, probably from the hike"

**Manual/Edit Mode:** Users can switch to the detailed form to enter or adjust any field directly. The form is also the fallback if NLP parsing fails.

**Symptom Types:**
- Predefined symptom library with comprehensive options
- Users can add custom symptoms within any category
- Three top-level categories: **Physical**, **Mental/Emotional**, **Sleep**
- Extensible subcategory hierarchy (see [Data Dictionary](docs/data-dictionary.md) for full list)

**Symptom Log Attributes:**
| Attribute | Required | Description |
|-----------|----------|-------------|
| Symptom | Yes | Selected from predefined list or user-created |
| Severity | Yes | 0-10 scale with category-specific descriptors |
| Started at | Yes | When the symptom began |
| Duration | No | How long it lasted (or "ongoing") |
| Location | No | Body location (for physical symptoms) |
| Notes | No | Free text for additional context |
| Raw input | No | Original user text if entered via NLP |
| Source | Auto | `'manual'` or `'nlp'` — how the entry was created |

**Severity Scale:**
- Unified 0-10 numeric scale stored for all symptoms
- Category-specific descriptive labels displayed in UI:
  - Pain: 0="None", 3="Mild", 5="Moderate", 7="Severe", 10="Worst imaginable"
  - Fatigue: 0="Fully energized", 5="Moderately tired", 10="Completely exhausted"
  - Mood: 0="Very poor", 5="Neutral", 10="Excellent"
- Enables consistent data analysis while maintaining intuitive user experience

---

### 5. Health Practices

**Purpose:** Help users commit to and track health-related activities, habits, and behaviors to identify what improves their wellbeing.

**Overview:**
- Users create "practices" — either via natural language or a form-based wizard
- Each practice can optionally link to symptoms the user expects it to help
- Practices appear on the dashboard as a daily task list

**Practice Creation: NLP-Primary** (see Core Interaction Model)

Setting up a new practice is the tedious part — name, category, tracking type, frequency, targets, reminders, symptom links. NLP simplifies this:

> "I want to start taking 400mg magnesium glycinate every night before bed, hoping it helps with my headaches"
> → name="Magnesium glycinate 400mg", category=supplements, tracking_type=completion, frequency=daily, target_frequency=1, expected_symptoms=[headache], notes="before bed"

The parsed result is presented in an editable confirmation card. Users can adjust any field or switch to the full creation wizard.

**Practice Completion/Logging: Form-Primary**

Daily completion tracking stays form-based — checkboxes on the dashboard task list are faster than typing. Metric logging uses number steppers.

**Categories (Optional):**
- **Supplements** — Vitamins, minerals, herbal supplements
- **Exercise** — Physical activities, movement routines
- **Mindfulness** — Meditation, breathing exercises, stress management
- **Sleep Hygiene** — Bedtime routines, sleep-related habits
- **Nutrition** — Hydration, dietary commitments
- **Other** — Anything that doesn't fit above

**Tracking Types:**

| Type | Description | Example |
|------|-------------|---------|
| Completion | Mark done/skipped per occurrence | "Take magnesium", "Meditate" |
| Metric | Log a numeric value | "Log steps", "Water intake (glasses)" |

**Practice Attributes:**
| Attribute | Required | Description |
|-----------|----------|-------------|
| Name | Yes | "Magnesium glycinate", "Morning walk" |
| Category | No | One of the six categories above |
| Tracking type | Yes | `completion` or `metric` |
| Target frequency | No | Times per day for completion (e.g., 2x/day) |
| Target value | No | For metrics (e.g., 8 glasses, 10000 steps) |
| Frequency | Yes | `daily`, `weekly`, or `specific_days` |
| Reminder times | No | When to send push notifications |
| Expected symptoms | No | Link to symptoms this should help |
| Notes | No | Recipes, links, dosage details |

**Symptom Linking:**
- Users can select which symptom types they expect a practice to help
- Enables AI correlation: "Your headaches decreased 40% after starting magnesium"
- Many-to-many relationship (one practice can target multiple symptoms)

**Dashboard Task List:**
```
[ ] take magnesium (9:00pm)          → 0/1 completions
[1/2] drink adrenal cocktail         → 1/2 completions
[x] pilates routine                  → 1/1 completions
[—] log steps                        → no metric logged
```

**Completion Logging:**
- Each completion is a separate record with timestamp
- Enables timing analysis (e.g., "Did taking magnesium at night vs morning matter?")
- Users can log past completions (retroactive entry)

See [Data Dictionary](docs/data-dictionary.md) for database schema details.

**Post-MVP:**
- Inactive practices (plan but not actively track)
- Checklists/routines (UI wizard grouping practices)
- Dietary protocols (AIP, low-FODMAP, eliminations)
- AI-generated practice suggestions

---

### 6. Medication Tracking

**Purpose:** Track medications that may affect symptoms or interact with lifestyle choices.

**Medication Creation: NLP-Primary** (see Core Interaction Model)

> "I take 10mg Lexapro every morning and 50mg hydroxyzine at bedtime as needed"
> → Two medication entries with appropriate names, dosages, frequencies, and timing

The parsed result is presented in an editable confirmation card. Users can adjust any field or use the manual creation form.

**Medication Adherence: Form-Primary**

Daily taken/skipped tracking stays form-based — toggles on the dashboard task list are faster than typing.

**Feature Details:**
- Log medication name, dosage, timing, frequency
- Track adherence through daily task list
- Note: Medication interaction warnings are a post-MVP feature

---

### 7. Journal Entries

**Purpose:** Gather daily wellness data beyond immediate symptom tracking.

**Primary Input: Natural Language** (see Core Interaction Model)

Journal entries are a natural fit for NLP — users describe their morning/evening state as a single narrative instead of filling in 4-5 separate fields:

> "Slept about 6 hours, pretty restless. Woke up with moderate pain around a 5. Energy is low, maybe a 3."
> → metrics: sleep_duration=6, sleep_quality=poor (inferred from "restless"), morning_pain=5, morning_energy=3

Anything the parser can't map to a structured metric goes into the journal's notes field.

**Manual/Edit Mode:** Users can switch to individual sliders/inputs for each field, or adjust any value the LLM inferred.

**Morning Journal:**
- Hours of sleep
- Quality of sleep
- Pain level upon waking
- Energy level
- Custom morning routine checklist
- Additional notes

**Evening Journal:**
- Overall mood throughout the day
- Overall energy level throughout the day
- Custom bedtime routine checklist
- Overall pain level throughout the day
- Additional notes

---

### 8. Reminders & Notifications

**Purpose:** Keep users consistent with their health commitments.

**Push Notifications:**
- Morning journal reminder (user-configured time)
- Evening journal reminder (user-configured time)
- Medication reminders (user-configured times)
- Supplement reminders (user-configured times)

---

### 9. Experiments & A/B Comparisons

**Purpose:** Allow users to formally test lifestyle interventions and compare results.

**Feature Details:**
- Create named experiments (e.g., "Testing magnesium for 30 days")
- Set start and end dates
- Compare two different periods/approaches side by side
- Comprehensive comparison across all tracked data:
  - Symptom frequency and severity
  - Journal-based wellness scores (mood, energy, sleep quality)
  - Lifestyle adherence rates

---

### 10. Reports & Analytics

**Note:** The AI service infrastructure deploys with Feature 2 (AI Service / NLP Input). This feature extends that service with analytics and reporting endpoints.

#### Graphs and Statistics
**Purpose:** Quick visualization of symptom patterns over time.

**Time Ranges:**
- Standard presets: week, month, 3 months, 6 months, year, all time
- Custom date picker for any start/end date

**Visualization Types:**
- Line charts over time (classic time-series)
- Calendar heatmaps (color-coded days showing intensity)
- Milestone markers (show when lifestyle changes started)
- Multi-symptom overlay (compare up to 3-4 symptoms on one chart)

**Historical Trends:**
- Long-term pattern visualization
- Compare symptoms against lifestyle change start dates

#### AI-Powered Insights

**Automated Insights (Proactive):**
- **Correlation detection:** "Your headaches decreased 40% after starting magnesium"
- **Pattern recognition:** "You tend to have more fatigue on days after poor sleep"
- **Anomaly alerts:** "Your pain levels this week are higher than your 30-day average"

**AI Behavior:**
- Observational only—report patterns and correlations
- No actionable recommendations or medical suggestions
- Strong disclaimers on all AI-generated content

**Report Cadence:**
- User-configurable frequency
- Options: weekly digest, on-demand, or smart triggers when significant patterns are detected

#### Doctor Reports

**Purpose:** Generate comprehensive summaries for healthcare provider visits.

**Content:**
- Full health overview: symptoms, medications, lifestyle choices, trends
- Visual timeline of symptom history
- Treatment/intervention effectiveness analysis
- Export as PDF for easy sharing

---

### 11. Data Export

**Purpose:** Ensure users own their health data.

**Export Options:**
- **PDF reports:** Formatted summaries for doctors or personal records
- **Raw data export:** Complete data in CSV and/or JSON format
- All data exportable at any time

---

## Post-MVP Features (Future Roadmap)

### Medication/Supplement Interaction Warnings
- Integrate with drug interaction database
- Automatic alerts for potential interactions
- Dietary interaction warnings

### Social/Community Features
- Anonymous community sharing
- Learn from others with similar conditions
- Share specific reports with chosen contacts

### Additional Features to Consider
- Apple Health / Google Fit integration
- Wearable device integration
- On-device NLP model for offline parsing (reduces latency, enables offline use)
- On-device AI for maximum privacy option

---

## Technical Architecture

### Overview
A three-tier architecture separating concerns:
1. **Client:** React Native (Expo) mobile app
2. **Backend/Data:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
3. **AI Service:** Python FastAPI microservice for AI/ML features

### Client — React Native (Expo)
- Cross-platform mobile app (iOS and Android)
- Communicates with Supabase directly for CRUD operations
- Communicates with Python AI service for NLP input parsing and insights
- Home screen widget for quick symptom logging

### Backend — Supabase
- **Database:** PostgreSQL for all structured data (symptoms, medications, lifestyle choices, journal entries)
- **Auth:** Built-in authentication with row-level security (RLS) for data isolation
- **Storage:** File storage for food journal photos
- **Edge Functions:** Lightweight serverless functions for business logic (reminders, data aggregation)
- **Real-time:** Subscriptions for dashboard state sync
- No vector database for MVP — structured time-period queries are sufficient for LLM context. Re-evaluate if data volume per user exceeds LLM context windows.

### AI Service — Python (FastAPI + LangChain)
- **Framework:** FastAPI with Pydantic validation
- **AI Framework:** LangChain structured output (start with chains, migrate to LangGraph when multi-turn follow-up limitations surface)
- **LLM Provider:** Provider-agnostic via LangChain abstraction (can switch between OpenAI, Anthropic, Google Gemini)
- **Dual Responsibility (phased deployment):**
  - **Phase 1 — NLP Input Parsing (Feature 2):** Parse natural language into structured health data. Supports symptom logging, journal entries, practice creation, and medication creation. Returns structured JSON with confidence scores and ambiguity flags.
  - **Phase 2 — Analytics & Insights (Feature 10):** Generate AI-powered reports, correlation detection, pattern recognition, anomaly alerts, and doctor visit summaries.
- **Data flow (NLP):** User text → anonymize → LLM structured extraction → return parsed entries to client for confirmation → client writes to Supabase
- **Data flow (Analytics):** Receives anonymized, time-scoped user data from Supabase → processes with LLM → returns structured insights

### Deployment & Infrastructure
- **AI Service:** Docker container deployed to DigitalOcean (App Platform or Droplet)
- **CI/CD:** GitHub Actions for automated testing and deployment
- **Supabase:** Managed hosting (Supabase Cloud)
- **Infrastructure as Code:** To be determined (Terraform, Pulumi, or DigitalOcean App Spec)

### Data Strategy
- **Primary data store:** Supabase PostgreSQL for all structured, time-series health data
- **No vector database for MVP:** User data within a time period is sent directly to LLM for analysis. A single user's yearly data (~1,000-2,000 entries) fits within modern LLM context windows.
- **Future consideration:** Add vector search (pgvector in Supabase or dedicated vector DB) if semantic search over long history becomes necessary
- **Encryption:** Server-side encryption at rest (Supabase AES-256) + TLS in transit. See Privacy & Security section for rationale.

### AI/LLM Approach
- Start with LangChain structured output for NLP input parsing (Feature 2) and later report generation (Feature 10)
- Abstract LLM provider so models can be swapped or compared
- Anonymize user data before sending to LLM services
- Follow-up conversations managed via manual conversation history passing (second LLM call with prior context)
- LangGraph migration planned when multi-turn follow-up limitations surface in symptom logging, complex practice/medication creation flows, or analytics queries requiring conversation state
- Voice-to-text (post-MVP): Expo Speech API on client feeds text into the same NLP endpoint—no backend changes needed

---

## Success Metrics (to be refined)

- Daily active users and retention
- Journal completion rates
- Symptom logging frequency
- Experiment completion rates
- User-reported insight value

---

## Open Questions

1. Monetization model (free with premium, subscription, one-time purchase)
2. ~~Authentication flow details between React Native client, Supabase, and Python AI service~~ — Partially resolved in [specs/001-user-auth/](specs/001-user-auth/). JWT forwarding to AI service still needs specification.
3. CI/CD pipeline specifics (GitHub Actions workflow details)
4. Testing strategy (unit, integration, AI feature testing)
5. Infrastructure as Code tooling choice (Terraform, Pulumi, or DigitalOcean App Spec)
6. Specific LLM model selection for different tasks (cost vs quality tradeoffs)
7. Acceptable latency for NLP parsing? (target: <2 seconds for single-entry parsing)
8. Should NLP support batch entries from a single multi-topic input? (e.g., "Took magnesium, headache is a 6, did yoga for 30 min" → 3 separate entries across types)
