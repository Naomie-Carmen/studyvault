# 📋 Pre-Launch & Incident Response Checklist — StudyVault

Ce document fournit la liste de contrôle obligatoire avant le lancement public de la Bêta Fermée de **StudyVault**, ainsi que les procédures d'incident, de hotfix et de rollback.

---

## 🟢 1. Checklist Pré-Lancement (Pre-Flight Controls)

### A. Infrastructure & Domaine
- [x] **DNS & Domaine** : `app.studyvault.fr` et `api.studyvault.fr` configurés vers les serveurs de production.
- [x] **HTTPS / SSL** : Certificat SSL/TLS 1.3 valide avec HSTS activé et redirection 301 automatique HTTP ➔ HTTPS.
- [x] **Base de Données** : PostgreSQL 16 managée opérationnelle avec SSL exigé (`sslmode=require`).
- [x] **Stockage S3** : Bucket S3 / Scaleway isolé pour la production avec règles CORS restreintes à `app.studyvault.fr`.

### B. Sécurité & Contrôle d'Accès
- [x] **Mode Bêta Fermée** : Variable `BETA_CLOSED=true` activée dans `.env.production`.
- [x] **Compte Admin** : Compte administrateur principal `admin@studyvault.fr` provisionné via `npm --prefix backend run seed:admin`.
- [x] **Codes d'Invitation** : Batch initial de 5 codes générés (`SV-BETA-001` à `SV-BETA-005`).
- [x] **Protection des Endpoints** : Middlewares `requireAuth` et `requireAdmin` vérifiés (requêtes non-admin bloquées en 403).
- [x] **Secrets & Logs** : Aucun secret, mot de passe ou jeton JWT codé en dur ou exposé dans les logs.

### C. Monitoring & Analytics
- [x] **Sentry** : Intégré pour la capture des erreurs backend et frontend (`SENTRY_DSN`).
- [x] **Health Check** : Endpoint `GET /api/v1/health` vérifié (status `ok`, 10/10 modules en ligne).
- [x] **Analytics Privacy-Friendly** : Opt-in respecté selon le choix de consentement RGPD de l'utilisateur.

---

## 🚨 2. Contacts d'Urgence & Escalade

| Rôle | Responsable | Email | Téléphone |
|---|---|---|---|
| Lead Developer | Anti (Dev Principal) | `anti@studyvault.fr` | +33 6 00 00 00 01 |
| DevOps / Infra | Team Ops | `ops@studyvault.fr` | +33 6 00 00 00 02 |
| Support Bêta | Equipe Produit | `support@studyvault.fr` | +33 6 00 00 00 03 |

---

## 🔧 3. Procédure de Hotfix en Production

En cas de bug critique identifié en production :

1. **Créer une branche de patch** :
   ```bash
   git checkout -b hotfix/issue-description
   ```
2. **Corriger et valider localement** :
   ```bash
   npm run typecheck
   npm run lint
   node scratch/test_phase14.js
   ```
3. **Pousser sur le dépôt et déclencher le CI/CD** :
   ```bash
   git commit -m "fix(prod): correction bug critique"
   git push origin hotfix/issue-description
   ```
4. **Redéploiement à chaud sans interruption** :
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build backend
   ```

---

## ⏪ 4. Procédure de Rollback (Plan d'Urgence)

Si une mise à jour rend le service instable ou indisponible :

1. **Revenir au commit/tag précédent stable** :
   ```bash
   git checkout tags/v1.0.0-beta.previous
   ```
2. **Restaurer la pile Docker précédente** :
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
3. **Restauration de la base de données (si nécessaire)** :
   ```bash
   pg_restore -h postgres-host -U studyvault_user -d studyvault_db backup_latest.dump
   ```
4. **Vérification du statut de santé après rollback** :
   `curl -s https://api.studyvault.fr/api/v1/health`
