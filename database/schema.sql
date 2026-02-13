-- Flare Database Schema
-- PostgreSQL DDL for health tracking application
-- Version: 1.1 (MVP with Practices)

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CATEGORY HIERARCHIES
-- ============================================

-- Symptom categories (Physical > Pain > Head & Face)
CREATE TABLE symptom_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES symptom_categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),
    display_order INTEGER DEFAULT 0,
    is_predefined BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT unique_symptom_category_name_per_parent
        UNIQUE NULLS NOT DISTINCT (name, parent_id, user_id)
);

CREATE INDEX idx_symptom_categories_parent ON symptom_categories(parent_id);
CREATE INDEX idx_symptom_categories_user ON symptom_categories(user_id) WHERE user_id IS NOT NULL;

-- Metric categories (Daily Wellness, Practice-Related, Vitals)
CREATE TABLE metric_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES metric_categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),
    display_order INTEGER DEFAULT 0,
    is_predefined BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT unique_metric_category_name_per_parent
        UNIQUE NULLS NOT DISTINCT (name, parent_id, user_id)
);

CREATE INDEX idx_metric_categories_parent ON metric_categories(parent_id);
CREATE INDEX idx_metric_categories_user ON metric_categories(user_id) WHERE user_id IS NOT NULL;

-- Practice categories (Supplements, Exercise, Mindfulness, Sleep Hygiene, Nutrition, Other)
-- Simple single-level categories for organizing health practices
CREATE TABLE practice_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_predefined BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT unique_practice_category_name
        UNIQUE NULLS NOT DISTINCT (name, user_id)
);

CREATE INDEX idx_practice_categories_user ON practice_categories(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- TYPE DEFINITIONS
-- ============================================

-- Symptom types reference their category
CREATE TABLE symptom_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES symptom_categories(id) ON DELETE CASCADE,
    severity_scale TEXT DEFAULT '0-10',
    is_predefined BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT unique_symptom_type_name_per_category
        UNIQUE NULLS NOT DISTINCT (name, category_id, user_id)
);

CREATE INDEX idx_symptom_types_category ON symptom_types(category_id);
CREATE INDEX idx_symptom_types_user ON symptom_types(user_id) WHERE user_id IS NOT NULL;

-- Metric types
CREATE TABLE metric_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES metric_categories(id) ON DELETE CASCADE,
    unit TEXT,
    default_target NUMERIC,
    is_predefined BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT unique_metric_type_name_per_category
        UNIQUE NULLS NOT DISTINCT (name, category_id, user_id)
);

CREATE INDEX idx_metric_types_category ON metric_types(category_id);
CREATE INDEX idx_metric_types_user ON metric_types(user_id) WHERE user_id IS NOT NULL;

-- Body locations (reference table)
CREATE TABLE body_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    region TEXT NOT NULL,
    display_order INTEGER DEFAULT 0
);

CREATE INDEX idx_body_locations_region ON body_locations(region);

-- ============================================
-- USER DATA TABLES
-- ============================================

-- User symptom logs
CREATE TABLE symptom_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    symptom_type_id UUID NOT NULL REFERENCES symptom_types(id) ON DELETE RESTRICT,
    severity INTEGER NOT NULL CHECK (severity >= 0 AND severity <= 10),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER,
    location_id UUID REFERENCES body_locations(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_symptom_logs_user ON symptom_logs(user_id);
CREATE INDEX idx_symptom_logs_user_started ON symptom_logs(user_id, started_at DESC);
CREATE INDEX idx_symptom_logs_symptom_type ON symptom_logs(symptom_type_id);
CREATE INDEX idx_symptom_logs_started_at ON symptom_logs(started_at DESC);

-- User health practices (commitments to health activities)
CREATE TABLE practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES practice_categories(id),

    -- Tracking configuration
    tracking_type TEXT NOT NULL CHECK (tracking_type IN ('metric', 'completion')),
    target_frequency INTEGER,              -- times per day for completion (e.g., 2 for "2x/day")
    metric_type_id UUID REFERENCES metric_types(id),
    target_value NUMERIC,                  -- target for metrics (e.g., 8 glasses)
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'specific_days')),
    frequency_details JSONB,               -- e.g., {"days": ["mon", "wed", "fri"]}
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_times JSONB,                  -- e.g., ["08:00", "20:00"]

    active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT metric_tracking_requires_metric_type
        CHECK (tracking_type != 'metric' OR metric_type_id IS NOT NULL)
);

CREATE INDEX idx_practices_user ON practices(user_id);
CREATE INDEX idx_practices_user_active ON practices(user_id, active) WHERE active = true;
CREATE INDEX idx_practices_category ON practices(category_id);

-- User metrics (single source of truth for measurable values)
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    metric_type_id UUID NOT NULL REFERENCES metric_types(id) ON DELETE RESTRICT,
    value NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    practice_id UUID REFERENCES practices(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'journal', 'integration')),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_metrics_user ON metrics(user_id);
CREATE INDEX idx_metrics_user_recorded ON metrics(user_id, recorded_at DESC);
CREATE INDEX idx_metrics_metric_type ON metrics(metric_type_id);
CREATE INDEX idx_metrics_practice ON metrics(practice_id) WHERE practice_id IS NOT NULL;
CREATE INDEX idx_metrics_recorded_at ON metrics(recorded_at DESC);

-- Practice completion logs (for completion-based tracking)
CREATE TABLE practice_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed BOOLEAN DEFAULT true,        -- false = explicitly skipped
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_practice_completions_user ON practice_completions(user_id);
CREATE INDEX idx_practice_completions_practice ON practice_completions(practice_id);
CREATE INDEX idx_practice_completions_user_date ON practice_completions(user_id, completed_at DESC);

-- Practice-symptom links (expected improvements)
CREATE TABLE practice_symptoms (
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    symptom_type_id UUID NOT NULL REFERENCES symptom_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (practice_id, symptom_type_id)
);

CREATE INDEX idx_practice_symptoms_symptom ON practice_symptoms(symptom_type_id);

-- ============================================
-- MEDICATIONS
-- ============================================

-- Medications (separate from practices, includes supplements via is_supplement flag)
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    reminder_times JSONB,
    active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_supplement BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_medications_user ON medications(user_id);
CREATE INDEX idx_medications_user_active ON medications(user_id, active) WHERE active = true;

-- Medication-symptom links (expected improvements)
CREATE TABLE medication_symptoms (
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    symptom_type_id UUID NOT NULL REFERENCES symptom_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (medication_id, symptom_type_id)
);

CREATE INDEX idx_medication_symptoms_symptom ON medication_symptoms(symptom_type_id);

-- Medication adherence logs
CREATE TABLE medication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    taken_at TIMESTAMP WITH TIME ZONE NOT NULL,
    taken BOOLEAN DEFAULT true,            -- false = skipped
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_medication_logs_user ON medication_logs(user_id);
CREATE INDEX idx_medication_logs_medication ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_user_date ON medication_logs(user_id, taken_at DESC);

-- ============================================
-- EXPERIMENTS (Post-MVP)
-- ============================================
-- Deferred to post-MVP. Schema preserved for future implementation.
--
-- CREATE TABLE experiments (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID NOT NULL,
--     name TEXT NOT NULL,
--     description TEXT,
--     start_date DATE NOT NULL,
--     end_date DATE,
--     status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
--     practice_ids JSONB,                    -- related practices
--     target_symptoms JSONB,                 -- symptom_type_ids to monitor
--     notes TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
-- );
--
-- CREATE INDEX idx_experiments_user ON experiments(user_id);
-- CREATE INDEX idx_experiments_user_status ON experiments(user_id, status);
-- CREATE INDEX idx_experiments_dates ON experiments(start_date, end_date);

-- ============================================
-- AUTHENTICATION & RATE LIMITING
-- ============================================

-- Login attempts for server-side rate limiting
-- Tracks failed login attempts to prevent brute-force attacks
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, attempted_at DESC);
CREATE INDEX idx_login_attempts_cleanup ON login_attempts(attempted_at);

COMMENT ON TABLE login_attempts IS 'Server-side login attempt tracking for rate limiting';

-- Function to check if login is allowed (rate limiting)
-- Returns TRUE if login is allowed, FALSE if locked out
CREATE OR REPLACE FUNCTION check_login_allowed(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    recent_failures INTEGER;
    lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Count failed attempts in the last 15 minutes, but only since the last successful login
    SELECT COUNT(*)
    INTO recent_failures
    FROM login_attempts
    WHERE email = LOWER(p_email)
      AND success = FALSE
      AND attempted_at > NOW() - INTERVAL '15 minutes'
      AND attempted_at > COALESCE(
        (SELECT MAX(attempted_at) FROM login_attempts
         WHERE email = LOWER(p_email) AND success = TRUE),
        '1970-01-01'::timestamp with time zone
      );

    -- Allow if fewer than 5 failures since last success
    RETURN recent_failures < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO login_attempts (email, success, ip_address)
    VALUES (LOWER(p_email), p_success, p_ip_address);

    -- Clean up old attempts (older than 24 hours) to prevent table bloat
    DELETE FROM login_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get remaining lockout time in seconds
-- Returns 0 if not locked out, otherwise seconds until lockout expires
CREATE OR REPLACE FUNCTION get_lockout_remaining(p_email TEXT)
RETURNS INTEGER AS $$
DECLARE
    last_failure TIMESTAMP WITH TIME ZONE;
    recent_failures INTEGER;
    lockout_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Count failures since last successful login
    SELECT COUNT(*), MAX(attempted_at)
    INTO recent_failures, last_failure
    FROM login_attempts
    WHERE email = LOWER(p_email)
      AND success = FALSE
      AND attempted_at > NOW() - INTERVAL '15 minutes'
      AND attempted_at > COALESCE(
        (SELECT MAX(attempted_at) FROM login_attempts
         WHERE email = LOWER(p_email) AND success = TRUE),
        '1970-01-01'::timestamp with time zone
      );

    IF recent_failures >= 5 AND last_failure IS NOT NULL THEN
        lockout_end := last_failure + INTERVAL '15 minutes';
        IF lockout_end > NOW() THEN
            RETURN EXTRACT(EPOCH FROM (lockout_end - NOW()))::INTEGER;
        END IF;
    END IF;

    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_symptom_logs_updated_at
    BEFORE UPDATE ON symptom_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practices_updated_at
    BEFORE UPDATE ON practices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Post-MVP: experiments trigger
-- CREATE TRIGGER update_experiments_updated_at
--     BEFORE UPDATE ON experiments
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE symptom_categories IS 'Hierarchical symptom categories (Physical > Pain > Head & Face)';
COMMENT ON TABLE symptom_types IS 'Individual symptom definitions within categories';
COMMENT ON TABLE symptom_logs IS 'User symptom entries with severity and timing';
COMMENT ON TABLE metric_categories IS 'Categories for measurable health metrics';
COMMENT ON TABLE metric_types IS 'Metric definitions with units and targets';
COMMENT ON TABLE metrics IS 'Single source of truth for all user metric values';
COMMENT ON TABLE practice_categories IS 'Simple categories for organizing health practices';
COMMENT ON TABLE practices IS 'User health practices (commitments to health activities)';
COMMENT ON TABLE practice_completions IS 'Completion records for practices with completion-based tracking';
COMMENT ON TABLE practice_symptoms IS 'Links practices to symptoms they are expected to help';
COMMENT ON TABLE medications IS 'User medications and supplements';
COMMENT ON TABLE medication_symptoms IS 'Links medications to symptoms they are expected to help';
COMMENT ON TABLE medication_logs IS 'Medication adherence records';
-- Post-MVP: COMMENT ON TABLE experiments IS 'User-defined experiments to test interventions';
COMMENT ON TABLE body_locations IS 'Reference table for anatomical locations';

COMMENT ON COLUMN practices.tracking_type IS 'metric: tracked via metrics table, completion: mark done/skipped';
COMMENT ON COLUMN practices.target_frequency IS 'Times per day for completion tracking (e.g., 2 for "2x/day")';
COMMENT ON COLUMN practices.frequency_details IS 'JSON for specific_days frequency, e.g., {"days": ["mon", "wed", "fri"]}';
COMMENT ON COLUMN practices.reminder_times IS 'JSON array of times, e.g., ["08:00", "20:00"]';
COMMENT ON COLUMN metrics.practice_id IS 'Links metric to practice when applicable';
COMMENT ON COLUMN metrics.source IS 'manual: user entry, journal: from morning/evening journal, integration: external source';
