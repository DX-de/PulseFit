# PulseFit — Démarrage (2 minutes)

## Étape 1 — SQL Supabase (une seule fois)

1. Ouvre : https://supabase.com/dashboard/project/snszmfyomlumpvtoulsp/sql/new  
2. Ouvre le fichier **`supabase/FULL_SETUP.sql`** dans ce projet  
3. **Tout sélectionner** → copier → coller dans Supabase → bouton **Run**

C’est tout pour la base de données.

## Étape 2 — Lancer l’app

Dans un terminal, à la racine du projet :

```bash
npm start
```

Puis dans le navigateur :

- http://localhost:8080/login/
- Compte **démo** : `demo@pulsefit.app` / `demo`  
- Ou **crée un compte** (données sauvegardées sur Supabase)

## Pages

| URL | Fonction |
|-----|----------|
| /dashboard/ | Accueil |
| /program/ | Programme IA |
| /nutrition/ | Nutrition |
| /journal/ | Journal |
| /ai-coach/ | Coach IA |

## Coach Claude / GPT (évite CORS)

Le navigateur **ne peut pas** appeler Anthropic directement. Deux options :

### Option A — Local (le plus simple)

Terminal 1 :
```bash
npm run ai-proxy
```

Terminal 2 :
```bash
npm start
```

Dans `js/config.js` : `AI_PROVIDER: 'anthropic'`, clé `ANTHROPIC_API_KEY`, et `AI_PROXY_URL: 'http://localhost:8787'`.

### Option B — Production (Supabase)

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase functions deploy ai-chat
```

Retire la clé du `config.js` client (elle reste dans les secrets Supabase).

Sans proxy ni clé : mode contextuel local (déjà fonctionnel).

## Vérifier que tout est OK

```bash
npm run setup
```

Les ✓ verts = base prête.
