# Flare Data Dictionary

This document contains detailed data specifications for the Flare health tracking application. It serves as a reference for the symptom hierarchy, metric types, and database schema.

---

## Table of Contents

1. [Symptom Categories & Types](#symptom-categories--types)
2. [Practice Categories & Types](#practice-categories--types)
3. [Metric Categories & Types](#metric-categories--types)
4. [Database Schema](#database-schema)
5. [Body Locations](#body-locations)

---

## Symptom Categories & Types

### Overview

Symptoms are organized in a hierarchical structure:
- **Top-level categories:** Physical, Mental/Emotional, Sleep
- **Subcategories:** Nested groupings (e.g., Physical > Pain > Head & Face)
- **Symptom types:** Individual symptoms within the lowest subcategory

Users can add custom symptoms within any category. Custom categories can also be created.

### Physical

#### Pain

**Head & Face**
- Headache (tension)
- Migraine
- Sinus pain
- Jaw pain (TMJ)
- Eye pain
- Facial pain
- [User custom]

**Neck & Spine**
- Neck pain
- Upper back pain
- Lower back pain
- Tailbone pain
- Sciatica
- [User custom]

**Joints**
- Shoulder pain
- Elbow pain
- Wrist pain
- Hand/finger pain
- Hip pain
- Knee pain
- Ankle pain
- Foot/toe pain
- [User custom]

**Muscle**
- Muscle aches (general)
- Muscle cramps
- Muscle stiffness
- Muscle weakness
- [User custom]

**Nerve Pain**
- Burning pain
- Shooting pain
- Electric shock sensations
- Radiating pain
- [User custom]

**Chest**
- Chest pain
- Chest tightness
- Rib pain
- [User custom]

**Abdominal**
- Stomach pain
- Cramping
- Pelvic pain
- [User custom]

#### Neurological

**Cognitive**
- Brain fog
- Difficulty concentrating
- Memory problems (short-term)
- Memory problems (long-term)
- Word-finding difficulty
- Confusion
- Slowed thinking
- [User custom]

**Sensory**
- Numbness
- Tingling (pins and needles)
- Burning sensation
- Hypersensitivity to touch
- Light sensitivity
- Sound sensitivity
- Temperature sensitivity
- [User custom]

**Motor**
- Tremors
- Muscle twitching
- Coordination problems
- Balance issues
- Weakness
- [User custom]

**Vestibular**
- Dizziness
- Vertigo
- Lightheadedness
- Feeling faint
- [User custom]

**Vision**
- Blurred vision
- Double vision
- Visual disturbances
- Floaters
- Tunnel vision
- [User custom]

#### Fatigue & Energy

- General fatigue
- Post-exertional malaise (PEM)
- Physical exhaustion
- Mental exhaustion
- Weakness (general)
- Heavy limbs feeling
- Low stamina
- [User custom]

#### Digestive

**Upper GI**
- Nausea
- Vomiting
- Acid reflux/heartburn
- Difficulty swallowing
- Loss of appetite
- Early fullness
- [User custom]

**Lower GI**
- Bloating
- Gas
- Constipation
- Diarrhea
- Irregular bowel movements
- Abdominal cramping
- [User custom]

**General**
- Food intolerances (reaction)
- Nausea after eating
- [User custom]

#### Respiratory

- Shortness of breath
- Difficulty breathing
- Wheezing
- Coughing
- Chest congestion
- Air hunger
- [User custom]

#### Cardiovascular

- Heart palpitations
- Racing heart
- Irregular heartbeat
- Chest pressure
- Blood pressure fluctuations
- [User custom]

#### Skin

- Rash
- Hives
- Itching
- Dry skin
- Flushing
- Swelling
- Bruising easily
- Slow wound healing
- [User custom]

#### Immune/Inflammatory

- Swollen lymph nodes
- Low-grade fever
- Chills
- Feeling "flu-like"
- General inflammation feeling
- Frequent infections
- [User custom]

#### Ear/Nose/Throat

- Tinnitus (ringing in ears)
- Ear pain
- Hearing changes
- Sore throat
- Nasal congestion
- Post-nasal drip
- Sinus pressure
- [User custom]

#### Eyes

- Dry eyes
- Eye strain
- Watery eyes
- Eye twitching
- [User custom]

#### Other Physical

- Temperature dysregulation
- Night sweats
- Excessive sweating
- Frequent urination
- Thirst (excessive)
- [User custom]

---

### Mental/Emotional

#### Mood

- Depression
- Low mood
- Sadness
- Hopelessness
- Anxiety
- Panic
- Worry
- Irritability
- Anger
- Mood swings
- Emotional numbness
- Crying spells
- [User custom]

#### Stress & Overwhelm

- Feeling overwhelmed
- Stress
- Burnout
- Sensory overload
- [User custom]

#### Motivation & Interest

- Lack of motivation
- Loss of interest
- Difficulty starting tasks
- Procrastination
- [User custom]

#### Social

- Social withdrawal
- Social anxiety
- Difficulty communicating
- [User custom]

#### Other Mental

- [User custom]

---

### Sleep

#### Falling Asleep

- Insomnia (can't fall asleep)
- Racing thoughts at bedtime
- Restlessness
- [User custom]

#### Staying Asleep

- Waking frequently
- Waking too early
- Restless sleep
- [User custom]

#### Sleep Quality

- Unrefreshing sleep
- Vivid dreams
- Nightmares
- Night terrors
- Sleep paralysis
- [User custom]

#### Sleep Disorders

- Sleep apnea symptoms
- Snoring
- Teeth grinding
- Sleepwalking
- [User custom]

#### Daytime Effects

- Excessive daytime sleepiness
- Falling asleep unintentionally
- [User custom]

---

## Practice Categories & Types

### Overview

Practices are user-defined health commitments — activities, habits, and behaviors users track to identify what improves their wellbeing. Unlike symptoms (which happen to users), practices are things users actively choose to do.

**Naming:** "Practices" is the user-facing term. Database tables use `practices`, `practice_completions`, `practice_symptoms`.

### Categories

Simple, single-level categories for organization. Users assign one category (or none) when creating a practice.

| Category | Description | Examples |
|----------|-------------|----------|
| **Supplements** | Vitamins, minerals, herbal supplements | Magnesium, Vitamin D, Fish oil |
| **Exercise** | Physical activities, movement routines | Walking, Yoga, Strength training |
| **Mindfulness** | Meditation, breathing, stress management | Morning meditation, Breathing exercises |
| **Sleep Hygiene** | Bedtime routines, sleep-related habits | No screens before bed, Sleep by 10pm |
| **Nutrition** | Hydration, dietary commitments | Water intake, No caffeine |
| **Other** | Anything that doesn't fit above | Posture checks, Gratitude journaling |

### Tracking Types

| Type | Description | Data Storage | Example |
|------|-------------|--------------|---------|
| **Completion** | Mark done/skipped per occurrence | `practice_completions` table | "Take magnesium" — done ✓ |
| **Metric** | Log a numeric value | `metrics` table with `practice_id` | "Water intake" — 8 glasses |

### Multi-Dose Tracking

For practices done multiple times per day (e.g., "Adrenal cocktail 2x/day"):
- Set `target_frequency` to the number of times per day
- Each completion is logged separately with timestamp
- Dashboard shows progress: `[1/2] drink adrenal cocktail`

### Symptom Linking

Users can optionally link practices to symptom types they expect the practice to help:
- Stored in `practice_symptoms` junction table
- Enables AI correlation: "Your headaches decreased 40% after starting magnesium"
- Many-to-many relationship (one practice can target multiple symptoms)

### Frequency Options

| Frequency | Description | frequency_details |
|-----------|-------------|-------------------|
| `daily` | Every day | — |
| `weekly` | Once per week | — |
| `specific_days` | Certain days only | `{"days": ["mon", "wed", "fri"]}` |

---

## Metric Categories & Types

### Daily Wellness

| Metric | Unit | Typical Source |
|--------|------|----------------|
| Sleep duration | Hours | Morning journal |
| Sleep quality | 0-10 scale | Morning journal |
| Morning energy level | 0-10 scale | Morning journal |
| Morning pain level | 0-10 scale | Morning journal |
| Evening energy level | 0-10 scale | Evening journal |
| Evening mood | 0-10 scale | Evening journal |
| Overall daily pain | 0-10 scale | Evening journal |

### Practice-Related

| Metric | Unit | Typical Source |
|--------|------|----------------|
| Water intake | Glasses or oz/ml | Practice (metric tracking) |
| Exercise duration | Minutes | Practice (metric tracking) |
| Steps | Count | Practice or integration |
| Meditation minutes | Minutes | Practice (metric tracking) |
| Screen time | Hours | Practice (metric tracking) |

### Health Vitals

| Metric | Unit | Typical Source |
|--------|------|----------------|
| Weight | lbs or kg | Manual entry |
| Blood pressure (systolic) | mmHg | Manual entry |
| Blood pressure (diastolic) | mmHg | Manual entry |
| Heart rate (resting) | BPM | Manual or wearable |
| Body temperature | °F or °C | Manual entry |

---

## Database Schema

### Category Hierarchies

```sql
-- Symptom categories (Physical > Pain > Head & Face)
symptom_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES symptom_categories,
  level INTEGER NOT NULL,              -- 1=top, 2=sub, 3=sub-sub
  display_order INTEGER DEFAULT 0,
  is_predefined BOOLEAN DEFAULT true,
  user_id UUID,                        -- null for predefined, set for user-created
  created_at TIMESTAMP DEFAULT now()
)

-- Metric categories (Daily Wellness, Lifestyle, Vitals)
metric_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES metric_categories,
  level INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_predefined BOOLEAN DEFAULT true,
  user_id UUID,
  created_at TIMESTAMP DEFAULT now()
)

-- Practice categories (Supplements, Exercise, Mindfulness, etc.)
practice_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_predefined BOOLEAN DEFAULT true,
  user_id UUID,                        -- null for predefined, set for user-created
  created_at TIMESTAMP DEFAULT now()
)
```

### Type Definitions

```sql
-- Symptom types reference their category
symptom_types (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES symptom_categories,
  severity_scale TEXT DEFAULT '0-10',
  is_predefined BOOLEAN DEFAULT true,
  user_id UUID,
  created_at TIMESTAMP DEFAULT now()
)

-- Metric types
metric_types (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES metric_categories,
  unit TEXT,
  default_target NUMERIC,
  is_predefined BOOLEAN DEFAULT true,
  user_id UUID,
  created_at TIMESTAMP DEFAULT now()
)

-- Body locations (reference table)
body_locations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  display_order INTEGER DEFAULT 0
)
```

### User Data Tables

```sql
-- User symptom logs
symptom_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  symptom_type_id UUID REFERENCES symptom_types,
  severity INTEGER NOT NULL CHECK (severity >= 0 AND severity <= 10),
  started_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER,            -- null = ongoing or unknown
  location_id UUID REFERENCES body_locations,
  raw_input TEXT,                        -- original NLP text, null for manual
  source TEXT DEFAULT 'manual',          -- 'manual' or 'nlp'
  notes TEXT,
  metadata JSONB,                      -- flexible additional data
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
)

-- User metrics (single source of truth for measurable values)
metrics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type_id UUID REFERENCES metric_types,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMP NOT NULL,
  practice_id UUID REFERENCES practices,  -- nullable link to practice
  raw_input TEXT,                        -- original NLP text, null for manual
  source TEXT DEFAULT 'manual',        -- 'manual', 'journal', 'integration', 'nlp'
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
)
```

### Practices & Medications

```sql
-- User health practices (commitments to health activities)
practices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES practice_categories,

  -- Tracking configuration
  tracking_type TEXT NOT NULL,         -- 'metric' or 'completion'
  target_frequency INTEGER,            -- times per day for completion (e.g., 2 for "2x/day")
  metric_type_id UUID REFERENCES metric_types,
  target_value NUMERIC,                -- target for metrics (e.g., 8 glasses)
  frequency TEXT,                      -- 'daily', 'weekly', 'specific_days'
  frequency_details JSONB,             -- e.g., {"days": ["mon", "wed", "fri"]}
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_times JSONB,                -- e.g., ["08:00", "20:00"]

  active BOOLEAN DEFAULT true,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  raw_input TEXT,                        -- original NLP text, null for manual
  source TEXT DEFAULT 'manual',          -- 'manual' or 'nlp'
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
)

-- Practice completion logs (for completion-based tracking)
practice_completions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  practice_id UUID REFERENCES practices,
  completed_at TIMESTAMP NOT NULL,
  completed BOOLEAN DEFAULT true,      -- false = explicitly skipped
  raw_input TEXT,                        -- original NLP text, null for manual
  source TEXT DEFAULT 'manual',          -- 'manual' or 'nlp'
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
)

-- Practice-symptom links (expected improvements)
practice_symptoms (
  practice_id UUID REFERENCES practices,
  symptom_type_id UUID REFERENCES symptom_types,
  PRIMARY KEY (practice_id, symptom_type_id)
)

-- Medications (separate from practices, includes supplements)
medications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  reminder_times JSONB,
  active BOOLEAN DEFAULT true,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  raw_input TEXT,                        -- original NLP text, null for manual
  source TEXT DEFAULT 'manual',          -- 'manual' or 'nlp'
  notes TEXT,
  is_supplement BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
)

-- Medication-symptom links (expected improvements)
medication_symptoms (
  medication_id UUID REFERENCES medications,
  symptom_type_id UUID REFERENCES symptom_types,
  PRIMARY KEY (medication_id, symptom_type_id)
)

-- Medication adherence logs
medication_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  medication_id UUID REFERENCES medications,
  taken_at TIMESTAMP NOT NULL,
  taken BOOLEAN DEFAULT true,          -- false = skipped
  raw_input TEXT,                        -- original NLP text, null for manual
  source TEXT DEFAULT 'manual',          -- 'manual' or 'nlp'
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
)
```

### Experiments

```sql
experiments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active',        -- 'active', 'completed', 'cancelled'
  lifestyle_choice_ids JSONB,          -- related lifestyle choices
  target_symptoms JSONB,               -- symptom_type_ids to monitor
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
)
```

---

## Body Locations

Reference data for the `body_locations` table:

| Region | Locations |
|--------|-----------|
| Head/Face | Head (general), Forehead, Temple (left), Temple (right), Back of head, Face, Jaw, Eyes, Ears, Nose, Mouth |
| Neck | Neck (front), Neck (back), Neck (left), Neck (right) |
| Shoulders | Shoulder (left), Shoulder (right), Shoulders (both) |
| Arms | Upper arm (left), Upper arm (right), Elbow (left), Elbow (right), Forearm (left), Forearm (right), Wrist (left), Wrist (right) |
| Hands | Hand (left), Hand (right), Fingers (left), Fingers (right) |
| Chest | Chest (center), Chest (left), Chest (right), Ribs |
| Back | Upper back, Mid back, Lower back |
| Abdomen | Stomach, Upper abdomen, Lower abdomen, Pelvic area |
| Hips | Hip (left), Hip (right), Hips (both) |
| Legs | Thigh (left), Thigh (right), Knee (left), Knee (right), Calf (left), Calf (right), Shin (left), Shin (right), Ankle (left), Ankle (right) |
| Feet | Foot (left), Foot (right), Toes (left), Toes (right) |
| General | Whole body, Multiple locations |

---

## Notes

- All category tables support user-created entries via `is_predefined = false` and `user_id` set
- JSONB columns (`metadata`, `frequency_details`, `reminder_times`) allow flexible data without schema changes
- Severity is stored as INTEGER 0-10; UI displays category-specific descriptors
- `practice_id` in the `metrics` table links metric-based practices to their values (single source of truth)
- `practice_symptoms` and `medication_symptoms` enable AI correlation analysis between interventions and symptom improvements
