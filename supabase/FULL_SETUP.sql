-- PulseFit FULL SETUP — généré automatiquement

-- ========== supabase/schema.sql ==========
-- PulseFit MVP — Exécuter dans l'éditeur SQL Supabase
-- Auth : géré par Supabase Auth (auth.users)

-- Profil utilisateur
CREATE TABLE IF NOT EXISTS users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  age INT,
  gender TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  target_weight_kg NUMERIC,
  start_weight_kg NUMERIC,
  goal TEXT,
  level TEXT,
  avatar_url TEXT,
  onboarding_done BOOLEAN DEFAULT FALSE,
  streak_current INT DEFAULT 0,
  streak_longest INT DEFAULT 0,
  streak_last_date DATE,
  xp INT DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programme actif + calendrier (schedule JSON)
CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT,
  level TEXT,
  duration TEXT,
  sessions_per_week TEXT,
  program_name TEXT,
  schedule JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_programs_user ON workout_programs(user_id);

-- Séances (planifiées ou terminées)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES workout_programs(id) ON DELETE SET NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  session_type TEXT,
  session_date DATE NOT NULL,
  duration_min INT DEFAULT 0,
  calories INT DEFAULT 0,
  status TEXT DEFAULT 'planned',
  exercises JSONB DEFAULT '[]'::jsonb,
  feeling INT,
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, session_date);

-- Nutrition
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  meal_key TEXT NOT NULL,
  logged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date, meal_key)
);

-- Coach IA
CREATE TABLE IF NOT EXISTS ai_coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_user ON ai_coach_messages(user_id, created_at);

-- Journal / progression (poids, perf, humeur après séance)
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL DEFAULT 'note',
  weight_kg NUMERIC,
  mood INT,
  energy INT,
  difficulty INT,
  comment TEXT,
  exercise TEXT,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, log_date DESC);

-- Abonnement
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON users_profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "programs_own" ON workout_programs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_own" ON workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nutrition_own" ON nutrition_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_own" ON ai_coach_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_own" ON user_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_own" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  INSERT INTO public.subscriptions (user_id, plan) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== supabase/fix-profile-columns.sql ==========
-- Si age / height_cm / weight_kg ne se sauvent pas, exécutez ce script (colonnes manquantes)
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS start_weight_kg NUMERIC;

-- ========== supabase/nutrition-schema.sql ==========
-- PulseFit — Nutrition Premium (exécuter après schema.sql)

-- Profil nutritionnel calculé (BMR, TDEE, macros)
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL DEFAULT 'weight_loss',
  activity_level TEXT NOT NULL DEFAULT 'moderate',
  bmi NUMERIC,
  bmr NUMERIC,
  tdee NUMERIC,
  target_kcal INT,
  protein_g INT,
  carbs_g INT,
  fat_g INT,
  allergies JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '[]'::jsonb,
  budget TEXT DEFAULT 'medium',
  water_goal_l NUMERIC DEFAULT 2.5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entrées alimentaires journalières
CREATE TABLE IF NOT EXISTS nutrition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_key TEXT NOT NULL,
  food_name TEXT NOT NULL,
  quantity TEXT DEFAULT '1 portion',
  calories INT DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_date ON nutrition_entries(user_id, log_date);

-- Repas IA générés (cache par jour)
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_key TEXT NOT NULL,
  title TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_kcal INT DEFAULT 0,
  source TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date, meal_key, source)
);

-- Catalogue aliments (seed optionnel)
CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  per_100g BOOLEAN DEFAULT FALSE,
  calories INT DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  tags TEXT[] DEFAULT '{}'
);

-- Listes de courses IA
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Liste de courses',
  items JSONB DEFAULT '[]'::jsonb,
  estimated_price NUMERIC DEFAULT 0,
  week_start DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id, created_at DESC);

-- Historique poids dédié nutrition
CREATE TABLE IF NOT EXISTS weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_weight_history_user ON weight_history(user_id, log_date DESC);

-- Hydratation
CREATE TABLE IF NOT EXISTS water_tracking (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses INT DEFAULT 0,
  liters NUMERIC DEFAULT 0,
  goal_l NUMERIC DEFAULT 2.5,
  PRIMARY KEY (user_id, log_date)
);

-- Photos avant / après
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('before', 'after')),
  angle TEXT NOT NULL CHECK (angle IN ('face', 'profile', 'back')),
  storage_path TEXT NOT NULL,
  public_url TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phase, angle)
);

-- Badges nutrition
CREATE TABLE IF NOT EXISTS nutrition_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- RLS
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_profiles_own" ON nutrition_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nutrition_entries_own" ON nutrition_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_own" ON meals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "foods_read" ON foods FOR SELECT USING (true);
CREATE POLICY "shopping_lists_own" ON shopping_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_history_own" ON weight_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "water_tracking_own" ON water_tracking FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_photos_own" ON progress_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nutrition_achievements_own" ON nutrition_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== supabase/training-schema.sql ==========
-- PulseFit — Programme sportif premium (exécuter après schema.sql)

CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  goal TEXT,
  level TEXT,
  sessions_per_week INT,
  session_duration_min INT,
  config JSONB DEFAULT '{}'::jsonb,
  intensity_multiplier NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_programs_user ON training_programs(user_id);

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT NOT NULL,
  session_type TEXT,
  session_date DATE NOT NULL,
  day_label TEXT,
  duration_min INT DEFAULT 45,
  calories INT DEFAULT 0,
  difficulty INT DEFAULT 5,
  status TEXT DEFAULT 'planned',
  exercises JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  feeling INT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_date ON training_sessions(user_id, session_date);

CREATE TABLE IF NOT EXISTS training_exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT,
  difficulty TEXT,
  calories_est INT DEFAULT 0,
  media_url TEXT,
  tips TEXT,
  equipment TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS completed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  external_id TEXT,
  title TEXT,
  session_date DATE,
  duration_min INT,
  calories INT,
  exercises_done INT,
  exercises_total INT,
  performance JSONB DEFAULT '{}'::jsonb,
  xp_earned INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_completed_sessions_user ON completed_sessions(user_id, session_date DESC);

CREATE TABLE IF NOT EXISTS training_xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS training_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current INT DEFAULT 0,
  longest INT DEFAULT 0,
  last_active_date DATE,
  weeks_complete INT DEFAULT 0,
  months_complete INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catalogue seed (idempotent)
INSERT INTO training_exercises (id, name, description, muscle_group, difficulty, calories_est, media_url, tips, equipment) VALUES
('pushup', 'Pompes', 'Corps gainé, coudes à 45°', 'pectoraux', 'beginner', 8, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', 'Garder le core serré', ARRAY['poids du corps']),
('squat', 'Squats', 'Pieds largeur épaules', 'jambes', 'beginner', 10, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80', 'Genoux alignés pieds', ARRAY['poids du corps','haltères']),
('plank', 'Gainage', 'Planche sur avant-bras', 'core', 'beginner', 5, 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', 'Ne pas creuser le dos', ARRAY['poids du corps']),
('burpee', 'Burpees', 'Mouvement explosif complet', 'full body', 'intermediate', 15, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', 'Atterrir souple', ARRAY['poids du corps']),
('lunge', 'Fentes', 'Fente avant contrôlée', 'jambes', 'beginner', 9, 'https://images.unsplash.com/photo-1574680096145-d05b474e6976?w=400&q=80', 'Genou arrière vers sol', ARRAY['poids du corps','haltères']),
('pullup', 'Tractions', 'Prise pronation', 'dos', 'advanced', 12, 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80', 'Scapulas engagées', ARRAY['barre']),
('row', 'Rowing haltère', 'Tirage un bras', 'dos', 'intermediate', 8, 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80', 'Dos plat', ARRAY['haltères']),
('bench', 'Développé couché', 'Barre ou haltères', 'pectoraux', 'intermediate', 11, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', 'Omoplates serrées', ARRAY['barre','haltères']),
('deadlift', 'Soulevé de terre', 'Charnières hanches', 'jambes', 'advanced', 14, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80', 'Dos neutre', ARRAY['barre','haltères']),
('jump_rope', 'Corde à sauter', 'Cardio rythmé', 'cardio', 'beginner', 12, 'https://images.unsplash.com/photo-1476480862122-209bfaa8edc1?w=400&q=80', 'Poignets légers', ARRAY['corde']),
('mountain', 'Mountain climbers', 'Genoux poitrine rapide', 'cardio', 'intermediate', 10, 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', 'Hanches basses', ARRAY['poids du corps']),
('dip', 'Dips', 'Sur barres parallèles', 'triceps', 'intermediate', 9, 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80', 'Descente contrôlée', ARRAY['barres']),
('shoulder_press', 'Développé épaules', 'Press vertical', 'épaules', 'intermediate', 9, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', 'Core gainé', ARRAY['haltères']),
('leg_press', 'Presse à cuisses', 'Machine ou équivalent', 'jambes', 'beginner', 10, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80', 'Pleine amplitude', ARRAY['machine']),
('bike', 'Vélo / cardio', 'Cardio modéré', 'cardio', 'beginner', 11, 'https://images.unsplash.com/photo-1476480862122-209bfaa8edc1?w=400&q=80', 'Rythme constant', ARRAY['vélo','machine'])
ON CONFLICT (id) DO NOTHING;

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_programs_own" ON training_programs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "training_sessions_own" ON training_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "training_exercises_read" ON training_exercises FOR SELECT USING (true);
CREATE POLICY "completed_sessions_own" ON completed_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "training_xp_own" ON training_xp_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "training_achievements_own" ON training_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "training_streaks_own" ON training_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== supabase/journal-schema.sql ==========
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

-- ========== supabase/ai-coach-schema.sql ==========
-- PulseFit — Coach IA Premium (exécuter après schema.sql)

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Conversation',
  external_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  source TEXT DEFAULT 'conversation',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, memory_key)
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  action_type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  payload JSONB DEFAULT '{}'::jsonb,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights(user_id, created_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_own" ON ai_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_messages_own" ON ai_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_memory_own" ON ai_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_recommendations_own" ON ai_recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_insights_own" ON ai_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== supabase/storage-avatars.sql ==========
-- PulseFit — Photos de profil (Storage)
-- Exécuter dans SQL Editor Supabase après schema.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========== supabase/storage-progress-photos.sql ==========
-- Photos progression (face / profil / dos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "progress_photos_read" ON storage.objects;
CREATE POLICY "progress_photos_read" ON storage.objects FOR SELECT USING (bucket_id = 'progress-photos');

DROP POLICY IF EXISTS "progress_photos_insert" ON storage.objects;
CREATE POLICY "progress_photos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "progress_photos_update" ON storage.objects;
CREATE POLICY "progress_photos_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
