# PulseFit — Configuration Supabase

## 1. Projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → exécutez le fichier `supabase/schema.sql`.
3. **Authentication** → activez Email + mot de passe.
4. **Authentication → URL Configuration** : ajoutez votre URL de site (ex. `http://localhost:8080`, `https://votre-app.netlify.app`) dans *Site URL* et *Redirect URLs*.

## 2. Programme sportif premium

Exécutez `supabase/training-schema.sql` pour le coach IA : programmes, séances, exercices, XP, streaks, historique.

## 3. Coach IA Premium

Exécutez `supabase/ai-coach-schema.sql` pour conversations, messages, mémoire, recommandations et insights.

Configurez une clé API dans `js/config.js` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY` ou `GEMINI_API_KEY`).

## 4. Journal IA Premium

Exécutez `supabase/journal-schema.sql` (après nutrition) pour le journal quotidien, analyses IA, sommeil, humeur, insights et badges.

Les tables `weight_history` et `progress_photos` sont partagées avec la nutrition ; le bucket `progress-photos` doit être actif (`storage-progress-photos.sql`).

## 5. Nutrition Premium

Exécutez `supabase/nutrition-schema.sql` puis `supabase/storage-progress-photos.sql` pour :
calculateur (IMC/BMR/TDEE), journal alimentaire, hydratation, poids, photos avant/après, listes de courses.

## 6. Photos de profil (Storage)

Exécutez aussi `supabase/storage-avatars.sql` pour activer l’upload d’image sur `/profile/` (bucket `avatars`).

## 7. Clés frontend

```bash
cp js/config.example.js js/config.js
```

Renseignez dans `js/config.js` :

- `SUPABASE_URL` — Project Settings → API → Project URL
- `SUPABASE_ANON_KEY` — clé `anon` `public`

Ne commitez pas `js/config.js` (déjà dans `.gitignore`).

## 8. Tester

| Mode | Identifiants | Données |
|------|----------------|---------|
| **Démo** | `demo@pulsefit.app` / `demo` | localStorage + badge « Mode démo » |
| **Réel** | Inscription `/register/` | Supabase (profil, séances, journal, coach…) |

## 9. Tables

- `users_profiles` — profil, streak, XP, badges
- `ai_conversations`, `ai_messages`, `ai_memory`, `ai_recommendations`, `ai_insights` — coach IA
- `journal_entries`, `journal_notes`, `sleep_tracking`, `mood_tracking`, `hydration_tracking`, `journal_ai_insights`, `journal_achievements` — journal IA
- `training_programs`, `training_sessions`, `training_exercises`, `completed_sessions`, `training_xp_history`, `training_achievements`, `training_streaks` — programme sportif IA
- `workout_programs` — programme + calendrier (JSON `schedule`, legacy)
- `workout_sessions` — séances planifiées / terminées
- `nutrition_logs` — repas validés
- `ai_coach_messages` — historique coach
- `user_progress` — journal (poids, humeur, énergie, difficulté)
- `subscriptions` — plan free / pro / elite

## 10. Routes app

`/dashboard/`, `/calendar/`, `/journal/`, `/history/`, `/program/`, `/nutrition/`, `/ai-coach/`, `/profile/`, `/community/`, `/pricing/`, `/admin/`

Les anciens liens `login/?next=dashboard/?view=calendar` sont redirigés vers `/calendar/` après connexion.
