#!/usr/bin/env node
/**
 * Setup PulseFit — vérifie Supabase + génère le SQL complet
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

async function loadConfig() {
  const raw = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const url = raw.match(/SUPABASE_URL:\s*['"]([^'"]+)['"]/)?.[1];
  const key = raw.match(/SUPABASE_ANON_KEY:\s*['"]([^'"]+)['"]/)?.[1];
  return { url, key };
}

async function checkTable(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (res.status === 200) return 'ok';
  if (res.status === 404 || res.status === 406) return 'missing';
  const body = await res.text();
  if (body.includes('does not exist') || body.includes('PGRST205')) return 'missing';
  return `err_${res.status}`;
}

async function main() {
  console.log('\n◉ PulseFit — Configuration automatique\n');

  const { execSync } = await import('child_process');
  execSync('node scripts/build-full-sql.mjs', { cwd: root, stdio: 'inherit' });

  const { url, key } = await loadConfig();
  if (!url || !key) {
    console.error('❌ js/config.js incomplet');
    process.exit(1);
  }
  console.log('✓ Supabase URL configurée');

  const checks = [
    ['users_profiles', 'Base'],
    ['training_programs', 'Programme'],
    ['nutrition_profiles', 'Nutrition'],
    ['journal_entries', 'Journal'],
    ['ai_conversations', 'Coach IA'],
  ];

  console.log('\nVérification des tables…');
  let missing = 0;
  let networkOk = true;
  for (const [table, label] of checks) {
    let st;
    try {
      st = await checkTable(url, key, table);
    } catch (e) {
      networkOk = false;
      st = 'missing';
    }
    const icon = st === 'ok' ? '✓' : '✗';
    console.log(`  ${icon} ${label} (${table})`);
    if (st !== 'ok') missing += 1;
  }
  if (!networkOk) {
    console.log('\n  (connexion Supabase impossible depuis ce terminal — exécutez le SQL manuellement une fois)\n');
    missing = checks.length;
  }

  const sqlPath = path.join(root, 'supabase', 'FULL_SETUP.sql');
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (missing > 0) {
    console.log('\n⚠ Il manque des tables dans Supabase.\n');
    console.log('👉 UNE SEULE action de votre part (2 minutes) :\n');
    console.log('1. Ouvrez : https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('2. Ouvrez le fichier : supabase/FULL_SETUP.sql');
    console.log('3. Copiez TOUT le contenu → collez dans l’éditeur SQL → Run\n');
    console.log('Puis relancez : npm run setup\n');
  } else {
    console.log('\n✓ Toutes les tables principales sont présentes !\n');
  }

  console.log('Pour lancer l’app : npm start');
  console.log('Puis : http://localhost:8080/login/\n');
  console.log('Démo : demo@pulsefit.app / demo\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
