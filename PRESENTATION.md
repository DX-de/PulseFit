# PulseFit — Fiche de présentation portfolio

> Téléchargez ce fichier ou copiez-le dans Notion / PDF pour vos entretiens et clients.

---

## Pitch (30 secondes)

**PulseFit** est une démo produit d’application fitness IA. Ce n’est pas qu’une landing : après connexion, l’utilisateur configure son programme, suit un **calendrier**, enregistre ses **séances**, tient un **journal de performance**, gère sa **nutrition** et interagit avec un **coach IA** basé sur ses vraies données — le tout dans le navigateur, sans backend.

---

## Parcours démo (3 minutes) — à filmer ou montrer en live

| Étape | URL | Action |
|-------|-----|--------|
| 1 | `/` | Landing → **Créer mon programme IA** (configurateur) |
| 2 | `/login.html` | **Continuer en démo** (1 clic) |
| 3 | `/dashboard/` | **Onboarding** : nom, poids, objectif |
| 4 | Calendrier | Voir le planning 4 semaines |
| 5 | Séance du jour | Chrono → cocher exercices → **Terminer** |
| 6 | Journal | Noter un poids |
| 7 | Coach IA | **Appliquer l’ajustement** |
| 8 | Sidebar | **Exporter PDF** (Imprimer → Enregistrer en PDF) |

**Compte démo :** `demo@pulsefit.app` / `demo`

---

## Ce qui prouve que ce n’est pas “juste un site”

- Auth + onboarding (comme une vraie app)
- Données persistantes (`localStorage`)
- Chaque écran a un rôle métier (calendrier, log, historique)
- Transparence : badge “démo portfolio” + FAQ honnête
- Export PDF du programme

---

## Stack

HTML · CSS · JavaScript vanilla · PWA · pas de backend (volontaire)

---

## Déploiement (quand vous êtes prêt)

### Netlify
1. Repo GitHub → [app.netlify.com](https://app.netlify.com) → Import
2. Build : *(vide)* · Publish : `.`
3. URL publique à mettre sur CV / LinkedIn

### Vercel
```bash
npx vercel
```

### Local
```bash
python3 -m http.server 8080
```

---

## Screenshots recommandés (5)

1. Hero + badge démo  
2. Configurateur → résultat programme  
3. Page connexion  
4. Dashboard accueil + notification  
5. Séance en cours + export PDF  

---

## Limites assumées (à dire en entretien)

- Pas d’app native ni App Store (maquette + web app)
- Pas de cloud / compte réel (auth fictive)
- IA simulée (règles sur les séances, pas d’API OpenAI)

**Suite logique d’un vrai produit :** Supabase + React Native + HealthKit + IA API.

---

## Liens rapides

- Landing : `/index.html`
- Connexion : `/login.html`
- App : `/dashboard/`
- Configurateur : `/#open-config`

---

*PulseFit — Projet portfolio · 2026*
