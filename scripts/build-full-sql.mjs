#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const files = [
  'supabase/schema.sql',
  'supabase/fix-profile-columns.sql',
  'supabase/nutrition-schema.sql',
  'supabase/training-schema.sql',
  'supabase/journal-schema.sql',
  'supabase/ai-coach-schema.sql',
  'supabase/storage-avatars.sql',
  'supabase/storage-progress-photos.sql',
];

const parts = ['-- PulseFit FULL SETUP — généré automatiquement\n'];
for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.warn('Manquant:', f);
    continue;
  }
  parts.push(`\n-- ========== ${f} ==========\n`);
  parts.push(fs.readFileSync(p, 'utf8'));
}
const out = path.join(root, 'supabase', 'FULL_SETUP.sql');
fs.writeFileSync(out, parts.join(''));
console.log('OK → supabase/FULL_SETUP.sql (' + parts.join('').length + ' caractères)');
