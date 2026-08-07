# Guide de Déploiement Production — StudyVault

Ce document décrit les procédures de déploiement en production de **StudyVault**.

## 1. Variables d'Environnement de Production

### Backend (`.env.production`) :
```env
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://app.studyvault.fr
DATABASE_URL=postgresql://user:password@postgres-host:5432/studyvault_db?sslmode=require

# Stockage Cloud S3-Compatible
STORAGE_DRIVER=s3
S3_ENDPOINT=https://s3.fr-par.scw.cloud
S3_REGION=fr-par
S3_ACCESS_KEY_ID=SCWXXXXXXXXXXXXX
S3_SECRET_ACCESS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
S3_BUCKET_NAME=studyvault-prod-documents

# Sécurité & Auth
JWT_ACCESS_SECRET=votre_cle_secrete_super_longue_et_securisee
JWT_REFRESH_SECRET=votre_cle_refresh_super_longue_et_securisee
LOG_LEVEL=info

# Mode Bêta Fermée
BETA_CLOSED=true
BETA_MAX_USERS=100
EMAIL_API_KEY=re_123456789_your_resend_api_key
EMAIL_FROM=no-reply@studyvault.fr
SENTRY_DSN=https://xxxxxxxxxxxxxxxx@sentry.io/1234567
```

## 2. Déploiement avec Docker Compose

```bash
# 1. Cloner le dépôt et copier les variables d'environnement
cp .env.production.example .env.production

# 2. Lancer la pile Docker de production
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Exécuter la migration de base de données Prisma
docker-compose -f docker-compose.prod.yml exec backend npx prisma db push

# 4. Provisionner le compte administrateur et les 5 premiers codes d'invitation bêta
docker-compose -f docker-compose.prod.yml exec backend npm run seed:admin
```

## 3. Monitoring & Sante API

L'endpoint de santé est accessible sur :
`GET https://api.studyvault.fr/api/v1/health`

## 4. Build & Distribution de l'Application Desktop (Tauri)

### Compilation Locale des Installeurs :
```bash
# Installeur Windows (.msi / .exe)
npm --prefix desktop run build

# Résultat : desktop/src-tauri/target/release/bundle/msi/StudyVault_1.0.0_x64_en-US.msi
```

### Signature et Mises à Jour Automatiques (CI/CD) :
1. Générer la paire de clés updater :
   `npx tauri signer generate`
2. Configurer les secrets dans GitHub Actions (`Settings -> Secrets`) :
   - `TAURI_SIGNING_PRIVATE_KEY` : contenu de la clé privée générée
   - `TAURI_KEY_PASSWORD` : mot de passe optionnel de la clé
3. Créer un tag git (ex: `git tag v1.0.0 && git push origin v1.0.0`).
4. Le workflow `.github/workflows/desktop-release.yml` s'exécute automatiquement pour construire et publier les paquets Windows, macOS et Linux sur GitHub Releases.

## 5. Activation Mode Bêta & Provisionnement Admin

1. Définir `BETA_CLOSED=true` dans `.env.production`.
2. Exécuter le script de seed admin :
   `npm --prefix backend run seed:admin`
3. Vérifier les codes générés (`SV-BETA-001` à `SV-BETA-005`).
4. Accéder à l'interface d'administration : `https://app.studyvault.fr/admin/beta-dashboard`.
