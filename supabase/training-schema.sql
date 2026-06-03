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
