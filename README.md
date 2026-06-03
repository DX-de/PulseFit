# PulseFit

Landing premium + **application web fonctionnelle** (démo produit portfolio) : calendrier, séances enregistrables, journal de performance, nutrition et coach IA — données persistantes dans le navigateur.

![PulseFit](og-cover.svg)

## Démo locale

```bash
cd PulseFit
python3 -m http.server 8080
```

- Landing : http://localhost:8080/
- Connexion : http://localhost:8080/login.html
- Application : http://localhost:8080/dashboard/ (après connexion)
- Configurateur : http://localhost:8080/#open-config
- Fiche présentation : [PRESENTATION.md](PRESENTATION.md)

## Déploiement

### Netlify

1. Créer un repo GitHub avec ce dossier
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → Import repo
3. Build command : *(vide)* · Publish directory : `.`
4. Deploy

### Vercel

```bash
npx vercel
```

Publier la racine du projet (fichier `vercel.json` inclus).

### GitHub Pages

1. Push sur GitHub
2. **Settings** → **Pages** → Source : GitHub Actions
3. Le workflow `.github/workflows/deploy.yml` déploie automatiquement

## Fonctionnalités

### Landing
- Configurateur IA → génère programme + calendrier (stockage local)
- Section « Boucle produit réelle » (parcours quotidien)
- Transparence : démo portfolio, pas une app store (voir FAQ)
- FR / EN, mode clair/sombre, PWA, comparateur avant/après

### Connexion (`/login.html`)
- Auth fictive + **démo 1 clic** (`demo@pulsefit.app` / `demo`)

### Application (`/dashboard/`)
- **Onboarding** (profil : nom, poids, objectif)
- **Export PDF** du programme
- **Notification** rappel séance (simulée)
- **Calendrier** d'entraînement (4 semaines)
- **Séance du jour** : chrono, exercices, enregistrement (charge, reps, RPE, ressenti)
- **Journal** : poids et notes de performance
- **Nutrition** : validation des repas
- **Coach IA** : conseils selon vos vraies séances + ajustement
- **Objectifs** et **historique** calculés depuis vos actions

## Structure

```
PulseFit/
├── index.html
├── pulsefit-store.js   # Données & logique métier (localStorage)
├── styles.css
├── script.js
├── locales.js
├── dashboard/
│   ├── index.html
│   ├── dashboard.css
│   └── dashboard.js
├── manifest.json
└── sw.js
```

## Portfolio

Voir [PORTFOLIO.md](PORTFOLIO.md) pour la fiche projet (pitch, stack, points forts).

## Note

Application **fictive** — projet portfolio / démonstration UI/UX.
