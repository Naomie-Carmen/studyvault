# StudyVault — Plateforme d'Organisation Académique Intelligente

> **"Importez vos documents, StudyVault les range au bon endroit — vous, vous étudiez."**

---

## 📌 Présentation du projet

**StudyVault** est une application web SaaS moderne conçue pour les étudiants. Elle permet d'organiser et de centraliser automatiquement tous les documents universitaires (cours, TD, TP, examens, documents administratifs) au sein d'une arborescence académique claire et fidèle à leur maquette pédagogique réelle.

### ✨ Principes Clés
- **Application Web Responsive** (Mobile, Tablette, Desktop).
- **IA de Rangement (Non Pédagogique)** : L'IA classe les fichiers et lit l'emploi du temps par OCR ; elle n'enseigne ni ne résume les cours.
- **Validation Utilisateur Obligatoire** : L'étudiant reste maître absolu de l'emplacement final de ses documents.

---

## 🛠️ Stack Technologique (Phase 1 — Fondations)

- **Frontend** : React 18, Vite, TypeScript Strict, CSS Tokens (Glassmorphic Theme, Dark/Light responsive layout), Lucide Icons.
- **Backend API** : Node.js, Express, TypeScript Strict, Middleware d'erreur centralisé, standardisation des réponses JSON.
- **Base de données** : PostgreSQL (Docker Compose local) + Prisma ORM.
- **Outillage & Qualité** : ESLint, TypeScript Check (`tsc --noEmit`), Concurrently.

---

## 🚀 Démarrage Rapide En Local

### Préréquis
- **Node.js** >= 18.x
- **npm** >= 9.x
- *(Optionnel mais recommandé)* **Docker & Docker Compose** pour PostgreSQL

### 1. Installation des dépendances

À la racine du projet, lancez :
```bash
npm run install:all
```
*Cette commande installe les dépendances du projet racine, du backend et du frontend.*

### 2. Configuration des variables d'environnement

Copiez les fichiers d'exemple `.env.example` vers `.env` dans les dossiers `backend` et `frontend` :

```bash
# Dans le dossier backend/
cp backend/.env.example backend/.env

# Dans le dossier frontend/
cp frontend/.env.example frontend/.env
```

### 3. Lancer la base de données (Docker)

```bash
npm run db:up
```
*(Accès à Adminer sur http://localhost:8080 pour inspecter PostgreSQL).*

### 4. Lancer l'application en mode développement

À la racine du projet :
```bash
npm run dev
```

L'application démarre simultanément :
- 🎨 **Frontend (React)** : [http://localhost:5173](http://localhost:5173)
- ⚙️ **Backend API (Express)** : [http://localhost:5000](http://localhost:5000)
- 🟢 **Endpoint de Santé API** : [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🌐 Déploiement en Production

### Backend API (Render)

1. Créez un **Web Service** Render pointant vers le dossier `backend/`.
2. Build command : `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
3. Start command : `npm run start`
4. Variables d'environnement :
   - `DATABASE_URL` — PostgreSQL distant (Neon, Supabase, Render Postgres…), ex. `postgresql://…?sslmode=require`
   - `CLIENT_URL` — URL exacte du site statique frontend, ex. `https://studyvault.onrender.com`
   - `JWT_SECRET` / `REFRESH_TOKEN_SECRET` — secrets longs et aléatoires
   - `GEMINI_API_KEY` — Clé d'API Google Gemini pour l'extraction vision IA des maquettes et plannings
   - `GEMINI_MODEL` — Modèle d'extraction Vision (défaut : `gemini-2.5-flash-preview-05-20` avec fallback automatique sur `gemini-2.0-flash` et `gemini-1.5-flash-latest`)
   - `STORAGE_DRIVER=local` (optionnel), `NODE_ENV=production`
5. ⚠️ **Démarrage à froid** : sur le plan gratuit, Render met l'instance en veille. Le premier appel peut prendre **30 à 60 s**. Les requêtes échouées avant le réveil doivent être rejouées.

### Frontend statique (Render Static Site)

1. Créez un **Static Site** Render pointant vers le dossier `frontend/`.
2. Build command : `npm install && npm run build`
3. Publish directory : `dist`
4. Fichier `frontend/.env.production` (ou variables d'environnement Render) :
   ```
   VITE_API_BASE_URL=https://studyvault-api.onrender.com/api/v1
   ```
   > Le fichier `.env.production` est **ignoré par git** (ne pas le committer). `npm run build` l'utilise automatiquement en environnement de build Render.

### Application desktop (Tauri)

```bash
cd desktop
npm install
npm run tauri dev        # développement
npm run tauri build      # paquet de production (MSI/NSIS sous Windows)
```
- Le desktop pointe vers l'API **uniquement via `VITE_API_BASE_URL`** au build (défaut dev : `http://localhost:5000/api/v1`).
- La session est persistée localement (tokens access + refresh) : l'utilisateur reste connecté après redémarrage de l'application.
- `desktop/src-tauri/target/` est **exclu de git** (artefacts de compilation Rust).

---

## 🔍 Scripts Utiles

| Commande | Description |
|---|---|
| `npm run dev` | Lance simultanément le Frontend et le Backend en mode watch. |
| `npm run build` | Compile le Backend (TS ➔ JS) et construit le bundle Frontend de production. |
| `npm run typecheck` | Exécute la vérification stricte des types TypeScript sur tout le projet. |
| `npm run lint` | Lance le linter ESLint sur le Frontend et le Backend. |
| `npm run db:up` | Démarrage des conteneurs PostgreSQL et Adminer via Docker. |
| `npm run db:down` | Arrêt des conteneurs Docker. |

---

## 🏗️ Architecture du Projet

```
studyvault/
├── backend/                    # API REST Express (TypeScript)
│   ├── src/
│   │   ├── config/             # Config variables & DB
│   │   ├── controllers/        # Handlers API (Health, etc.)
│   │   ├── middleware/         # Gestion d'erreurs, CORS, Helmet, Logger
│   │   ├── routes/             # Routage v1 (`/api/v1`)
│   │   ├── services/           # Modules métier futurs (Auth, Academic, Docs...)
│   │   ├── types/              # Types API & interfaces
│   │   └── server.ts           # Serveur Express & Listener
│   ├── prisma/                 # Schéma Prisma & Migrations DB
│   └── package.json
├── frontend/                   # Client React (Vite + TS)
│   ├── src/
│   │   ├── components/         # Layout (Header, Sidebar, AppShell)
│   │   ├── config/             # Endpoints API
│   │   ├── pages/              # Shell Dashboard & vues
│   │   ├── services/           # Client API HTTP
│   │   ├── styles/             # Tokens CSS, Glassmorphism, Breakpoints
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml          # Container PostgreSQL local
└── README.md
```

---

## 📄 Licence
Projet sous licence propriétaire StudyVault — Tous droits réservés.
