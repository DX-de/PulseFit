-- Si age / height_cm / weight_kg ne se sauvent pas, exécutez ce script (colonnes manquantes)
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS start_weight_kg NUMERIC;
