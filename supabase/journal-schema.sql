-- PulseFit — Journal IA Premium (exécuter après schema.sql et nutrition-schema.sql)

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INT CHECK (mood BETWEEN 1 AND 10),
  energy INT CHECK (energy BETWEEN 1 AND 10),
  difficulty INT CHECK (difficulty BETWEEN 1 AND 10),
  motivation INT CHECK (motivation BETWEEN 1 AND 10),
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 10),
  hydration INT CHECK (hydration BETWEEN 1 AND 10),
  nutrition_adherence INT CHECK (nutrition_adherence BETWEEN 1 AND 10),
  workout_feeling INT CHECK (workout_feeling BETWEEN 1 AND 10),
  stress INT CHECK (stress BETWEEN 1 AND 10),
  note TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id, log_date DESC);

CREATE TABLE IF NOT EXISTS journal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_notes_user ON journal_notes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sleep_tracking (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quality INT CHECK (quality BETWEEN 1 AND 10),
  hours NUMERIC,
  note TEXT,
  PRIMARY KEY (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS mood_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INT CHECK (mood BETWEEN 1 AND 10),
  energy INT CHECK (energy BETWEEN 1 AND 10),
  stress INT CHECK (stress BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_tracking_user ON mood_tracking(user_id, log_date DESC);

CREATE TABLE IF NOT EXISTS hydration_tracking (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INT CHECK (score BETWEEN 1 AND 10),
  liters NUMERIC DEFAULT 0,
  glasses INT DEFAULT 0,
  PRIMARY KEY (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS journal_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  payload JSONB DEFAULT '{}'::jsonb,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_ai_insights_user ON journal_ai_insights(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS journal_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydration_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_own" ON journal_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_notes_own" ON journal_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_sleep_own" ON sleep_tracking FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_mood_own" ON mood_tracking FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_hydration_own" ON hydration_tracking FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_ai_insights_own" ON journal_ai_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_achievements_own" ON journal_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
