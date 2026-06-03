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
