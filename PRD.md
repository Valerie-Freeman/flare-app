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

## MVP Features

### 1. Dashboard (Home Screen)

**Purpose:** Serve as a daily task-oriented hub that encourages adherence and engagement.

**Primary Focus:** A task list of lifestyle choices and medications to be taken/completed today
- Progress rings showing daily completion status
- Clear visual indication of pending vs completed items

**Secondary Focus:** Today's status overview
- Symptoms logged today
- Journal completion status

**Quick Actions:**
- Log symptom button (one-tap to start)
- Morning/evening journal shortcuts
- Frequent symptom tiles for quick logging

**At-a-Glance Metrics:**
- Trend indicators (arrows showing if key symptoms are up/down vs last week)
- Keep other metrics minimal—save detailed data for reports section

---

### 2. Symptom Tracking

**Purpose:** Track every symptom the user experiences to identify patterns and responses to medication and lifestyle changes.

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

**Severity Scale:**
- Unified 0-10 numeric scale stored for all symptoms
- Category-specific descriptive labels displayed in UI:
  - Pain: 0="None", 3="Mild", 5="Moderate", 7="Severe", 10="Worst imaginable"
  - Fatigue: 0="Fully energized", 5="Moderately tired", 10="Completely exhausted"
  - Mood: 0="Very poor", 5="Neutral", 10="Excellent"
- Enables consistent data analysis while maintaining intuitive user experience

---

### 3. Health Practices

**Purpose:** Help users commit to and track health-related activities, habits, and behaviors to identify what improves their wellbeing.

**Overview:**
- Users create "practices" through a unified wizard (supplements, exercise, dietary commitments, etc.)
- Each practice can optionally link to symptoms the user expects it to help
- Practices appear on the dashboard as a daily task list

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

### 4. Medication Tracking

**Purpose:** Track medications that may affect symptoms or interact with lifestyle choices.

**Feature Details:**
- Similar UX to supplement tracking
- Log medication name, dosage, timing, frequency
- Track adherence through daily task list
- Note: Medication interaction warnings are a post-MVP feature

---

### 5. Journal Entries

**Purpose:** Gather daily wellness data beyond immediate symptom tracking.

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

### 6. Reminders & Notifications

**Purpose:** Keep users consistent with their health commitments.

**Push Notifications:**
- Morning journal reminder (user-configured time)
- Evening journal reminder (user-configured time)
- Medication reminders (user-configured times)
- Supplement reminders (user-configured times)

---

### 7. Experiments & A/B Comparisons

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

### 8. Reports & Analytics

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

### 9. Data Export

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
- Voice input for symptom logging
- Apple Health / Google Fit integration
- Wearable device integration
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
- Communicates with Python AI service for report generation and insights
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
- **AI Framework:** LangChain (start with chains for report generation, refactor to LangGraph when conversational agent features require it)
- **LLM Provider:** Provider-agnostic via LangChain abstraction (can switch between OpenAI, Anthropic, Google Gemini)
- **Responsibilities:**
  - Generate AI-powered reports and summaries
  - Correlation detection across symptom and lifestyle data
  - Pattern recognition and anomaly detection
  - Comprehensive health summaries for doctor visits
  - Future: conversational agent for user queries about their data
- **Data flow:** Receives anonymized, time-scoped user data from client/Supabase → processes with LLM → returns structured insights

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
- Start with LangChain for structured report generation chains
- Abstract LLM provider so models can be swapped or compared
- Anonymize user data before sending to LLM services
- Plan architecture to accommodate LangGraph migration when conversational agent features are built
- Agent workflows will evolve: simple chains → multi-step analysis → conversational agent

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
2. Authentication flow details between React Native client, Supabase, and Python AI service
3. CI/CD pipeline specifics (GitHub Actions workflow details)
4. Testing strategy (unit, integration, AI feature testing)
5. Infrastructure as Code tooling choice (Terraform, Pulumi, or DigitalOcean App Spec)
6. Specific LLM model selection for different tasks (cost vs quality tradeoffs)
