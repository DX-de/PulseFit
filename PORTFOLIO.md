# PulseFit — Fiche projet portfolio

## En une phrase

Démo produit complète d’application fitness IA : landing de conversion + **application web fonctionnelle** (calendrier, séances, journal, nutrition, coach) avec persistance locale honnête.

## Problème

Les landing pages fitness ressemblent à des vitrines : beaucoup de promesses, peu de systèmes qui servent à quelque chose au quotidien.

## Solution

### Landing (`/`)
- Configurateur IA multi-étapes → génère un **vrai programme** stocké localement
- Section **« Boucle produit réelle »** : matin → séance → journal → ajustement IA
- Badge transparent : démo portfolio, données dans le navigateur
- Preuves sociales, métriques, FAQ honnête sur le statut « app installable »

### Application (`/dashboard/`)
Chaque module a un rôle métier :

| Module | Rôle |
|--------|------|
| **Accueil** | Stats calculées depuis les séances réelles, séance du jour, courbe de poids |
| **Calendrier** | Planning 4 semaines généré depuis le configurateur |
| **Séance** | Chrono, checklist exercices, log charge/reps/RPE, enregistrement |
| **Journal** | Poids + notes de performance |
| **Nutrition** | Validation des repas du jour (macros cibles selon objectif) |
| **Coach IA** | Messages basés sur séances faites / manquées + bouton d’ajustement |
| **Objectifs** | Progression hebdo, poids cible, repas |
| **Historique** | Liste des séances terminées avec ressenti |

### Données (`pulsefit-store.js`)
- `localStorage` : programme, calendrier, logs, journal, nutrition
- Lien configurateur landing → `PulseFitStore.setProgram()`
- Bouton « Réinitialiser la démo »

## Stack

- HTML5, CSS3, JavaScript vanilla
- Chart.js (aperçu landing uniquement)
- PWA (manifest + service worker)
- Pas de backend (volontaire pour portfolio ; évolutif vers Supabase/Firebase)

## Parcours à montrer en entretien (3 min)

1. Landing → **Créer mon programme IA**
2. Dashboard → **Calendrier** → choisir un jour → **Lancer séance**
3. Terminer → stats et **historique** mis à jour
4. **Journal** → noter poids / perf
5. **Coach IA** → appliquer ajustement selon assiduité

## Liens

- Landing : `/`
- App : `/dashboard/`
- Configurateur : `/#open-config`
- Calendrier direct : `/dashboard/?view=calendar`

## Pitch oral (30 s)

« PulseFit est une démo fictive, mais structurée comme un vrai produit : configurateur, calendrier, séances enregistrables, journal de performance et coach contextuel. Je montre que je sais penser la boucle utilisateur complète, pas seulement une page marketing. »

## Évolution possible (vrai produit)

- Auth + API + sync montres
- App React Native / Flutter
- Notifications push
- IA backend avec historique cloud
