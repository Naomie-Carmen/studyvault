# 🚀 Guide de Lancement Bêta Fermée — StudyVault (Phase 13)

Ce document résume l'architecture technique, les procédures d'administration et les métriques de la **Bêta Fermée StudyVault** (50-100 étudiants).

---

## 🔐 1. Système d'Invitation & Bêta Fermée

- **Activer la Bêta Fermée** : Définir `BETA_CLOSED=true` dans les variables d'environnement (.env.production).
- **Validation à l'inscription** : Si `BETA_CLOSED=true`, toute inscription nécessite un `inviteCode` valide et non expiré (14 jours).
- **Page d'Attente Public** : Les visiteurs sans invitation sont redirigés vers la landing page bêta (`BetaLandingPage.tsx`) et peuvent rejoindre la liste d'attente (`POST /api/v1/beta/waitlist`).

### Endpoints Bêta
| Methode | Endpoint | Accès | Description |
|---|---|---|---|
| `POST` | `/api/v1/beta/invite` | Admin | Générer et envoyer un code d'invitation unique |
| `POST` | `/api/v1/beta/validate` | Public | Vérifier si un code d'invitation est valide |
| `GET` | `/api/v1/beta/status` | Auth | Consulter le statut bêta de l'utilisateur courant |
| `POST` | `/api/v1/beta/waitlist` | Public | Enregistrer un email sur la liste d'attente |

---

## 💬 2. Widget de Feedback Flottant

- **Affichage** : Bouton discret en bas à droite pour tout utilisateur connecté (`<FeedbackWidget />`).
- **Types de retours** : 🐛 Bug, 💡 Idée/Suggestion, ❤️ Avis/Compliment, ❓ Question.
- **Captures automatiques** : URL de la page courante, navigateur, système d'exploitation et version StudyVault (sans contenu de document).
- **Note de satisfaction** : Évaluation optionnelle 1 à 5 étoiles.

---

## 📊 3. Dashboard Admin Bêta (`/admin/beta-dashboard`)

Accessible uniquement aux utilisateurs ayant le rôle `admin` (`requireAdmin` middleware) :
- **Compteur d'utilisateurs** : Total inscrits + Actifs au cours des 7 derniers jours.
- **Gestion des invitations** : Codes générés vs utilisés, nombre de personnes en liste d'attente.
- **Métriques d'usage** : Nombre total de documents + **Taux d'acceptation du classement IA** (ex: 95%+).
- **Répartition des feedbacks** : Histogramme par type (bugs, idées, avis, questions) et liste détaillée des commentaires reçus.

---

## 📧 4. Emails Transactionnels & Notifications

- **Service d'email abstrait** ([`emailService.ts`](file:///c:/Users/DELL/Desktop/Study/backend/src/services/emailService.ts)) : Support de Resend, SendGrid ou SMTP avec fallback de logging local en dev.
- **Modèles d'emails** : Invitation Bêta avec bouton magique d'inscription (`?invite=CODE`).

---

## ⚙️ 5. Fichiers de Configuration Produit

- **Guide Utilisateur Bêta** : [`docs/BETA_USER_GUIDE.md`](file:///c:/Users/DELL/Desktop/Study/docs/BETA_USER_GUIDE.md)
- **Template Variables d'Environnement** : [`.env.production.example`](file:///c:/Users/DELL/Desktop/Study/.env.production.example)

---

## ✅ Résultats de la Campagne de Validation Phase 13

```
╔══════════════════════════════════════════════╗
║  StudyVault — Phase 13 Verification Tests   ║
╚══════════════════════════════════════════════╝
  ✅ [PASS] Admin user authenticated
  ✅ [PASS] Standard user authenticated
  ✅ [PASS] Admin invite returns 201
  ✅ [PASS] Invite contains inviteCode
  ✅ [PASS] Validate invite code returns 200
  ✅ [PASS] Validation flag is true
  ✅ [PASS] Waitlist submission returns 200
  ✅ [PASS] Response contains confirmation message
  ✅ [PASS] Feedback submission returns 201
  ✅ [PASS] Feedback response contains success message
  ✅ [PASS] Admin feedback list returns 200
  ✅ [PASS] Items array exists
  ✅ [PASS] Total count > 0
  ✅ [PASS] Admin dashboard metrics returns 200
  ✅ [PASS] Metrics contain users count
  ✅ [PASS] Metrics contain invites count
  ✅ [PASS] Metrics contain classificationAcceptanceRate
  ✅ [PASS] Metrics contain feedbacks breakdown
  ✅ [PASS] Standard user is forbidden (403)
```
