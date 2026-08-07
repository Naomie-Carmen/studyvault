# CAHIER DES CHARGES — STUDYVAULT
### Plateforme numérique d'organisation académique pour étudiants
**Version 1.0 — Document de cadrage produit & technique**
**Destinataires : équipe produit, design, développement**

---

## 1. Vision du produit

StudyVault est la **bibliothèque universitaire numérique personnelle** de l'étudiant : un espace unique, structuré automatiquement selon son parcours académique réel (université, formation, niveau, année, semestre, UE, ECUE, matière), où chaque document trouve sa place sans effort manuel de classement.

L'ambition n'est pas de remplacer les outils de révision, les LMS (Moodle, etc.) ou les professeurs, mais de résoudre un problème purement **organisationnel** : la dispersion et la perte de temps liées à la gestion des fichiers académiques. StudyVault se positionne comme le **"Google Drive intelligent et pré-structuré" de la vie étudiante**, avec une intelligence artificielle au service du rangement, jamais du contenu pédagogique.

**Proposition de valeur en une phrase :**
> "Importez vos documents, StudyVault les range au bon endroit — vous, vous étudiez."

---

## 2. Problématique utilisateur

### 2.1 Constats
- Les étudiants accumulent des centaines de fichiers (cours, TD, TP, sujets d'examens, corrigés, documents administratifs) sur plusieurs supports (PC, smartphone, cloud personnel, clé USB, boîte mail).
- L'arborescence de dossiers est rarement homogène, rarement maintenue à jour, et diffère d'un semestre à l'autre.
- La recherche d'un document précis (ex. "le TD3 d'Algèbre du semestre 2") peut prendre plusieurs minutes, voire échouer.
- L'emploi du temps est souvent une image ou un PDF isolé, non relié aux documents de cours.
- Les documents administratifs personnels (CV, diplômes, relevés de notes) sont mélangés avec les documents de cours, ce qui complique leur récupération en période de candidature (stage, alternance, poursuite d'études).

### 2.2 Conséquences
- Perte de temps répétée et frustration.
- Risque de perte définitive de documents importants (fin d'année, changement d'ordinateur).
- Difficulté à réviser efficacement faute de retrouver le bon support au bon moment.
- Manque de vision d'ensemble sur son propre parcours académique (UE validées, documents manquants, etc.).

---

## 3. Solution

StudyVault propose :
1. Une **arborescence académique automatique**, générée à partir du profil de l'étudiant (université → formation → niveau → année → semestre → UE → ECUE → matière → type de document).
2. Un **import intelligent de l'emploi du temps** (image ou PDF) qui, via OCR, extrait automatiquement matières, horaires, salles et types de séance, et pré-génère la structure correspondante.
3. Un **classement assisté par IA** : à chaque import de fichier, le système analyse le nom et le contenu du document et propose un emplacement — la validation reste **toujours manuelle**, l'utilisateur garde la main.
4. Une **recherche transversale** (nom, matière, UE, contenu du document).
5. Un **espace documents personnels**, cloisonné du reste, pour les pièces administratives et de candidature.

**Ce que StudyVault n'est pas :** un outil de révision, un générateur de résumés de cours, un tuteur IA, ou un LMS. L'IA embarquée est strictement un moteur de **reconnaissance et de classement**, pas un moteur pédagogique.

---

## 4. Personas utilisateurs

### Persona 1 — Léa, 20 ans, Licence 2 Économie-Gestion
- Beaucoup de cours par semestre, fichiers PDF envoyés par les enseignants sur des plateformes différentes.
- Peu organisée, dossier "Téléchargements" qui déborde.
- Attend : gain de temps, tout centraliser sans effort.

### Persona 2 — Karim, 23 ans, Master 1 Informatique
- Très organisé mais chronophage : il passe du temps chaque semaine à renommer et ranger ses fichiers.
- Multiplie les supports (PC portable, PC fixe, cloud).
- Attend : automatisation, fiabilité, recherche rapide par contenu.

### Persona 3 — Fatou, 25 ans, étudiante en alternance, BTS puis Licence Pro
- Jongle entre documents de cours et documents professionnels/administratifs (contrats, attestations, CV).
- Besoin de retrouver rapidement un document pour une candidature ou un entretien.
- Attend : séparation claire entre "cours" et "documents personnels", fiabilité et sécurité du stockage.

### Persona 4 — Thomas, 19 ans, Première année (L1), peu à l'aise avec l'informatique
- Ne sait pas structurer un classement de fichiers.
- Reçoit son emploi du temps en photo via un groupe WhatsApp.
- Attend : simplicité extrême, automatisation maximale, pas de configuration manuelle complexe.

---

## 5. Analyse des besoins

### 5.1 Besoins fonctionnels
- Créer et gérer un compte étudiant relié à un parcours académique précis.
- Définir/actualiser université, formation, niveau, année, semestre.
- Importer un emploi du temps et en extraire automatiquement la structure UE/ECUE/matières et le planning.
- Importer, organiser, déplacer, renommer, supprimer et prévisualiser des documents.
- Recevoir une proposition de classement automatique à l'import, avec validation obligatoire.
- Rechercher un document par nom, matière, UE ou contenu textuel.
- Gérer un espace distinct pour documents personnels/administratifs.

### 5.2 Besoins non fonctionnels
- **Performance** : import et classement d'un fichier en quelques secondes.
- **Fiabilité** : aucune perte de données, sauvegardes régulières.
- **Sécurité** : confidentialité des documents (personnels et académiques), chiffrement, contrôle d'accès strict par utilisateur.
- **Ergonomie** : prise en main immédiate, sans formation nécessaire (persona Thomas).
- **Scalabilité** : architecture supportant la croissance du nombre d'utilisateurs et du volume de fichiers.
- **Interopérabilité future** : possibilité d'ouvrir des connecteurs vers des LMS (Moodle, etc.) dans une version ultérieure.

---

## 6. User stories

### Compte & profil académique
- En tant qu'étudiant, je veux créer un compte pour accéder à mon espace personnel.
- En tant qu'étudiant, je veux renseigner mon université, ma formation et mon niveau pour que ma structure académique se génère automatiquement.
- En tant qu'étudiant, je veux modifier mon profil académique lors d'un changement d'année ou de formation.

### Organisation académique
- En tant qu'étudiant, je veux que mes UE et ECUE soient organisées par semestre pour m'y retrouver comme dans ma maquette pédagogique officielle.
- En tant qu'étudiant, je veux pouvoir ajouter/modifier manuellement une matière si elle n'a pas été détectée automatiquement.

### Gestion documentaire
- En tant qu'étudiant, je veux importer un PDF, un fichier Word ou une image en un clic.
- En tant qu'étudiant, je veux créer des dossiers personnalisés si besoin.
- En tant qu'étudiant, je veux déplacer, renommer ou supprimer un fichier facilement.
- En tant qu'étudiant, je veux prévisualiser un document sans le télécharger.

### Emploi du temps
- En tant qu'étudiant, je veux importer une photo ou un PDF de mon emploi du temps.
- En tant qu'étudiant, je veux que le système en extraie automatiquement mes matières, horaires, salles et types de séance (CM/TD/TP).
- En tant qu'étudiant, je veux que la structure UE/ECUE/matières correspondante soit créée automatiquement à partir de cet emploi du temps.
- En tant qu'étudiant, je veux corriger manuellement une erreur d'extraction OCR.

### Classement intelligent
- En tant qu'étudiant, je veux que le système me propose un classement lors de l'import d'un fichier.
- En tant qu'étudiant, je veux valider ou modifier cette proposition avant que le fichier soit rangé définitivement.

### Recherche
- En tant qu'étudiant, je veux rechercher un document par son nom.
- En tant qu'étudiant, je veux rechercher tous les documents liés à une matière ou une UE.
- En tant qu'étudiant, je veux rechercher un document à partir d'un mot présent dans son contenu.

### Documents personnels
- En tant qu'étudiant, je veux un espace séparé pour mon CV, mes lettres de motivation, mes attestations, mes diplômes et mes relevés de notes.
- En tant qu'étudiant, je veux que cet espace soit clairement distinct de mes documents de cours.

---

## 7. Fonctionnalités détaillées

### 7.1 Gestion du compte étudiant
- Inscription (email/mot de passe, éventuellement OAuth Google dans une V2).
- Connexion sécurisée, récupération de mot de passe.
- Profil : nom, université, formation, niveau, photo (optionnelle).
- Modification du parcours académique à tout moment (changement d'année, réorientation).

### 7.2 Organisation académique
- Arborescence : Université → Formation → Niveau → Année universitaire → Semestre → UE → ECUE → Matière → Type de document.
- Création automatique de cette arborescence à partir du profil et/ou de l'emploi du temps importé.
- Édition manuelle possible à tout niveau de l'arborescence (ajout, renommage, suppression d'une UE/ECUE/matière).

### 7.3 Gestionnaire de documents
- Import multi-format : PDF, Word (.doc/.docx), images (JPG/PNG).
- Création de sous-dossiers libres à l'intérieur d'une matière (ex. "Corrigés", "Annales").
- Déplacement par glisser-déposer ou menu contextuel.
- Renommage, suppression (avec corbeille temporaire avant suppression définitive).
- Aperçu intégré (visionneuse PDF, image, extrait Word) sans téléchargement.
- Historique des versions d'un même document (fonctionnalité V2).

### 7.4 Importation d'emploi du temps (OCR + IA)
- Import d'une image (photo) ou d'un PDF d'emploi du temps.
- Extraction automatique via OCR + modèle de reconnaissance :
  - matières,
  - jours et horaires,
  - salles,
  - type de séance (CM, TD, TP).
- Génération automatique de la structure UE/ECUE/matières correspondante si elle n'existe pas encore.
- Écran de validation/correction : l'étudiant vérifie et corrige les éléments extraits avant confirmation.
- Vue "emploi du temps" consultable (calendrier hebdomadaire) reliée aux dossiers de matières.

### 7.5 Classement intelligent des fichiers
- Analyse du nom du fichier (mots-clés, motifs récurrents : "TD1_Algebre", "Examen_Final_Micro", etc.).
- Analyse du contenu (extraction de texte du PDF/Word, reconnaissance de texte sur image).
- Proposition d'un emplacement (UE/ECUE/matière/type de document) avec niveau de confiance affiché.
- **Validation obligatoire par l'utilisateur** avant classement définitif (aucun classement n'est appliqué automatiquement sans confirmation).
- Apprentissage progressif des habitudes de classement de l'utilisateur (amélioration continue, V2).

### 7.6 Recherche
- Barre de recherche globale.
- Filtres : nom de fichier, matière, UE, type de document, date d'import.
- Recherche plein texte dans le contenu des documents indexés.
- Résultats avec aperçu et chemin de classement.

### 7.7 Documents personnels
- Espace "Documents personnels" distinct de l'arborescence académique.
- Catégories prédéfinies : CV, lettres de motivation, attestations, diplômes, relevés de notes.
- Mêmes fonctionnalités de gestion (import, renommage, suppression, aperçu) que les documents de cours.
- Confidentialité renforcée possible (dossier verrouillable par mot de passe, V2).

---

## 8. MVP (première version)

**Objectif du MVP : valider l'usage central — importer un document et le voir automatiquement bien rangé, sans complexité inutile.**

Inclus dans le MVP :
1. Inscription / connexion (email + mot de passe).
2. Profil académique simple (université, formation, niveau, année, semestre — saisie manuelle).
3. Création manuelle de l'arborescence UE/ECUE/matière.
4. Import de documents (PDF, Word, images) avec classement manuel dans l'arborescence.
5. Classement intelligent basique : proposition de destination à partir du **nom du fichier** (l'analyse de contenu complète peut arriver en V1.1/V2), avec validation obligatoire.
6. Gestion documentaire de base : déplacer, renommer, supprimer, prévisualiser.
7. Recherche par nom, matière, UE.
8. Espace "Documents personnels" (import + catégories de base).

Volontairement **exclu du MVP** : import d'emploi du temps par OCR (complexe et à forte valeur ajoutée, mais nécessite un module IA dédié), recherche plein texte dans le contenu, apprentissage des habitudes de classement.

---

## 9. Fonctionnalités futures (post-MVP)

- Import d'emploi du temps (image/PDF) avec OCR et génération automatique de structure.
- Classement intelligent avancé basé sur l'analyse du contenu des documents (pas seulement le nom).
- Recherche plein texte dans le contenu des documents.
- Apprentissage des préférences de classement de l'étudiant.
- Connexion OAuth (Google, Microsoft).
- Application mobile (iOS/Android).
- Partage de documents entre étudiants d'une même promotion (ex. partage d'un cours manqué).
- Statistiques personnelles : nombre de documents par matière, complétude du semestre.
- Intégration avec des LMS existants (Moodle, etc.) pour import direct.
- Mode hors-ligne / synchronisation.
- Verrouillage renforcé (mot de passe dédié) pour l'espace documents personnels.

---

## 10. Priorisation MoSCoW

**Must have (MVP)**
- Inscription/connexion
- Profil académique manuel
- Arborescence académique manuelle
- Import de documents (PDF, Word, images)
- Classement manuel + proposition basique sur nom de fichier
- Gestion documentaire (déplacer, renommer, supprimer, prévisualiser)
- Recherche par nom/matière/UE
- Espace documents personnels

**Should have (V1.1 – V2)**
- Import d'emploi du temps par OCR
- Analyse de contenu pour le classement intelligent
- Recherche plein texte
- Corbeille / restauration de fichiers supprimés

**Could have**
- Apprentissage des habitudes de classement
- Statistiques de complétude académique
- Verrouillage renforcé des documents personnels
- Historique de versions des documents

**Won't have (pour l'instant, hors périmètre produit)**
- Fonctions de révision, résumés de cours ou explication de contenu par IA
- Tutorat ou assistant pédagogique
- Réseau social étudiant
- Génération automatique de contenu de cours

---

## 11. Parcours utilisateur (exemple type)

1. **Inscription** : Léa crée son compte et renseigne son université, sa formation (L2 Économie-Gestion) et son niveau.
2. **Structuration initiale** : elle crée manuellement (MVP) ou importe (V2, via OCR) son emploi du temps ; la structure UE/ECUE/matières se met en place.
3. **Premier import** : elle importe un PDF nommé "TD2_Microeconomie.pdf".
4. **Proposition de classement** : le système propose "UE Économie > ECUE Microéconomie > TD" avec un niveau de confiance affiché.
5. **Validation** : Léa confirme (ou corrige) l'emplacement proposé ; le fichier est rangé.
6. **Recherche ultérieure** : avant un examen, elle recherche "microéconomie" et retrouve instantanément tous les documents liés, cours comme TD.
7. **Gestion administrative** : en parallèle, elle dépose son CV et son relevé de notes dans l'espace "Documents personnels" pour une candidature à un stage.

---

## 12. Architecture fonctionnelle

```
┌─────────────────────────────────────────────────────────┐
│                     INTERFACE UTILISATEUR                │
│   (Web App — Dashboard, Arborescence, Import, Recherche) │
└───────────────────────────┬───────────────────────────────┘
                            │ API REST/GraphQL
┌───────────────────────────┴───────────────────────────────┐
│                     COUCHE APPLICATIVE (Backend)           │
│                                                             │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Module Compte │  │ Module Structure│  │ Module        │ │
│  │ & Profil      │  │ Académique      │  │ Documents      │ │
│  └───────────────┘  └────────────────┘  └───────────────┘ │
│                                                             │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Module Import  │ │ Module IA       │  │ Module         │ │
│  │ Emploi du temps│ │ Classement +OCR │  │ Recherche      │ │
│  └───────────────┘  └────────────────┘  └───────────────┘ │
└───────────────────────────┬───────────────────────────────┘
                            │
┌───────────────────────────┴───────────────────────────────┐
│                    COUCHE DONNÉES & STOCKAGE                │
│   Base de données relationnelle   +   Stockage objets       │
│   (métadonnées, structure)            (fichiers réels)      │
└─────────────────────────────────────────────────────────────┘
```

**Modules fonctionnels clés :**
- **Module Compte & Profil** : authentification, gestion de session, profil académique.
- **Module Structure Académique** : gestion CRUD de l'arborescence université → type de document.
- **Module Documents** : import, organisation, prévisualisation, versionnage.
- **Module Import Emploi du temps** : OCR + extraction structurée + génération d'arborescence.
- **Module IA Classement** : analyse nom/contenu, proposition de destination, boucle de validation.
- **Module Recherche** : indexation et requêtes multicritères.

---

## 13. Architecture technique recommandée

**Approche : architecture en microservices légers ou "modular monolith" évolutif, selon la taille de l'équipe.**

Pour une équipe réduite en phase MVP, un **monolithe modulaire** bien découpé (par domaine : compte, structure, documents, IA, recherche) est recommandé — plus simple à opérer, migrable vers des microservices si la charge le justifie plus tard (notamment le module IA/OCR, gourmand en ressources, qui peut être isolé en service dédié dès le départ).

```
┌───────────────┐     ┌────────────────────┐
│  Frontend Web │────▶│   API Gateway /     │
│  (SPA)        │     │   Backend principal │
└───────────────┘     └─────────┬──────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                    │
      ┌───────▼──────┐  ┌────────▼────────┐  ┌───────▼────────┐
      │ Service Auth │  │ Service Documents│  │ Service IA/OCR │
      │ & Profil     │  │ & Structure       │  │ (asynchrone)   │
      └───────┬──────┘  └────────┬────────┘  └───────┬────────┘
              │                  │                    │
              └──────────────────┼────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Base de données + Stockage objets │
                    └─────────────────────────┘
```

**Points clés d'architecture :**
- Le **module IA/OCR** doit être **asynchrone** (file d'attente/queue) : l'analyse d'un document ou d'un emploi du temps ne doit pas bloquer l'interface utilisateur.
- Le **stockage des fichiers** est séparé du stockage des métadonnées (voir section 15).
- Une **API Gateway** centralise l'authentification et le routage vers les services.
- Prévoir un **cache** (ex. Redis) pour les recherches fréquentes et les sessions.

---

## 14. Base de données

**Type recommandé : base relationnelle (PostgreSQL)** pour la structure académique fortement hiérarchique et relationnelle, complétée par un **index de recherche plein texte** (ex. PostgreSQL full-text search ou Elasticsearch/OpenSearch en V2).

### Modèle de données simplifié

- **Utilisateur** (id, email, mot de passe hashé, nom, université_id, formation_id, niveau, date_création)
- **Université** (id, nom, pays)
- **Formation** (id, université_id, nom)
- **Niveau** (id, formation_id, nom — ex. L1, L2, M1)
- **AnnéeUniversitaire** (id, niveau_id, libellé — ex. 2025-2026)
- **Semestre** (id, année_id, numéro)
- **UE** (id, semestre_id, code, intitulé)
- **ECUE** (id, ue_id, code, intitulé)
- **Matière** (id, ecue_id, nom, enseignant [optionnel])
- **Document** (id, matière_id ou dossier_personnel_id, nom, type_document [cours/TD/TP/examen/autre], chemin_stockage, taille, format, date_import, statut_classement [en attente/validé])
- **DossierPersonnel** (id, utilisateur_id, catégorie [CV/lettre/attestation/diplôme/relevé])
- **EmploiDuTempsImport** (id, utilisateur_id, fichier_source, date_import, statut_traitement)
- **SéanceExtraite** (id, emploi_du_temps_id, matière_détectée, jour, heure_début, heure_fin, salle, type_séance)
- **PropositionClassement** (id, document_id, matière_id_proposée, score_confiance, statut [acceptée/rejetée/modifiée])

### Relations clés
- Hiérarchie stricte : Université 1—N Formation 1—N Niveau 1—N AnnéeUniversitaire 1—N Semestre 1—N UE 1—N ECUE 1—N Matière 1—N Document.
- Un Document appartient soit à une Matière (académique), soit à un DossierPersonnel (personnel) — jamais les deux.

---

## 15. Sécurité

- **Authentification** : hachage des mots de passe (bcrypt/argon2), gestion de session via tokens (JWT avec expiration + refresh token), option d'authentification à deux facteurs en V2.
- **Autorisation** : cloisonnement strict par utilisateur — un étudiant ne peut accéder qu'à ses propres documents (contrôle d'accès systématique côté backend, jamais uniquement côté frontend).
- **Chiffrement** : chiffrement des données au repos (stockage objets) et en transit (HTTPS/TLS obligatoire partout).
- **Protection des documents personnels** : niveau de sensibilité plus élevé (CV, diplômes, relevés de notes) → envisager un chiffrement dédié ou un verrouillage par mot de passe secondaire (V2).
- **Conformité RGPD** : consentement explicite, droit à l'export et à la suppression des données, minimisation des données collectées, hébergement idéalement en zone UE.
- **Journalisation** : logs d'accès et d'actions sensibles (suppression, export) à des fins d'audit.
- **Sauvegardes** : sauvegardes régulières et automatisées de la base de données et du stockage de fichiers, avec tests de restauration.
- **Sécurité applicative** : validation stricte des fichiers importés (type MIME réel, taille maximale, scan antivirus/malware avant stockage).

---

## 16. Gestion du stockage des fichiers

- **Séparation métadonnées / fichiers** : les métadonnées (nom, chemin, matière, type) vivent en base relationnelle ; les fichiers eux-mêmes sont stockés dans un **stockage objets** (type S3-compatible : Amazon S3, Cloudflare R2, ou équivalent OVH/Scaleway pour un hébergement européen).
- **Organisation logique du stockage** : chemin d'objet reflétant l'arborescence (ex. `utilisateur_id/université/formation/niveau/année/semestre/ue/ecue/matière/document.pdf`) pour faciliter audits et migrations, sans dépendre uniquement du chemin (la base reste la source de vérité).
- **Quota utilisateur** : mise en place d'un quota de stockage par compte (modulable selon plan gratuit/payant).
- **Gestion de version** (V2) : conservation des versions précédentes d'un document en cas de remplacement.
- **Corbeille** : suppression "douce" (soft delete) avec purge définitive après un délai (ex. 30 jours).
- **CDN** : pour les aperçus/miniatures de documents afin d'accélérer le chargement.

---

## 17. Technologies recommandées

| Couche | Technologie recommandée | Justification |
|---|---|---|
| Frontend | React (ou Next.js) + TypeScript | Écosystème mature, SPA performante, typage sécurisé |
| Backend | Node.js (NestJS) ou Python (FastAPI/Django) | NestJS pour cohérence TypeScript full-stack ; Python si l'équipe IA est forte en Python |
| Base de données | PostgreSQL | Fiabilité, gestion fine des relations hiérarchiques, full-text search intégré |
| Stockage fichiers | S3-compatible (AWS S3 / Cloudflare R2 / OVH Object Storage) | Scalable, standard de l'industrie, hébergement UE possible |
| OCR | Google Cloud Vision API / AWS Textract / Tesseract (open-source) | Extraction fiable de texte depuis image/PDF |
| Analyse & classement IA | Modèle de classification (NLP) via API (ex. modèle de langage) + règles métier | Combine reconnaissance sémantique et logique métier explicite |
| Recherche plein texte | PostgreSQL full-text search (MVP) → Elasticsearch/OpenSearch (V2) | Montée en charge progressive |
| Authentification | JWT + bcrypt/argon2, OAuth2 (V2) | Standard robuste et éprouvé |
| Cache / files d'attente | Redis + système de queue (BullMQ, Celery) | Traitement asynchrone de l'OCR et du classement IA |
| Infrastructure | Docker + Kubernetes (ou PaaS type Render/Railway en phase MVP) | Portabilité, montée en charge progressive sans sur-ingénierie initiale |
| CI/CD | GitHub Actions / GitLab CI | Déploiements automatisés et fiables |
| Monitoring | Sentry (erreurs) + Grafana/Prometheus (métriques) | Visibilité sur la santé de la plateforme |

---

## 18. Plan de développement étape par étape

**Phase 0 — Cadrage (2-3 semaines)**
- Validation du présent cahier des charges avec l'équipe.
- Maquettes UX/UI (wireframes puis maquettes haute fidélité).
- Choix définitif de la stack technique et de l'infrastructure d'hébergement.

**Phase 1 — Socle technique (3-4 semaines)**
- Mise en place de l'architecture backend/frontend de base.
- Authentification, gestion de profil.
- Modélisation et mise en place de la base de données (structure académique).

**Phase 2 — MVP fonctionnel (6-8 semaines)**
- Arborescence académique manuelle (CRUD).
- Import et gestion documentaire de base (upload, déplacement, renommage, suppression, aperçu).
- Classement basique sur nom de fichier + validation utilisateur.
- Recherche simple (nom, matière, UE).
- Espace documents personnels.

**Phase 3 — Tests & lancement MVP (2-3 semaines)**
- Tests utilisateurs (panel d'étudiants représentatif des personas).
- Corrections et ajustements UX.
- Mise en production, ouverture à un premier cercle d'utilisateurs (bêta fermée).

**Phase 4 — V1.1/V2 : Intelligence (8-10 semaines)**
- Module OCR d'import d'emploi du temps.
- Classement intelligent basé sur l'analyse de contenu.
- Recherche plein texte.

**Phase 5 — Croissance produit (continu)**
- Application mobile.
- Fonctionnalités collaboratives (partage entre étudiants).
- Intégrations LMS.
- Optimisation infrastructure selon la charge réelle observée.

---

## 19. Modèle économique possible

**Modèle Freemium recommandé**, adapté à une cible étudiante sensible au prix :

- **Offre gratuite** : quota de stockage limité (ex. 2-5 Go), fonctionnalités de base (arborescence manuelle, import, recherche simple, classement basique).
- **Offre Premium étudiant** (abonnement mensuel/annuel à faible coût, ex. 2-4 €/mois) : stockage étendu, classement intelligent avancé, import d'emploi du temps par OCR, recherche plein texte, historique de versions.
- **Partenariats institutionnels** (piste à moyen terme) : licences groupées pour des universités ou écoles souhaitant offrir l'outil à leurs étudiants, avec éventuelle intégration au LMS de l'établissement.
- **Alternative publicitaire** : à éviter en priorité pour préserver la confidentialité des documents (personnels et académiques), incompatible avec la promesse de sécurité du produit.

---

## Annexe — Points de vigilance pour l'équipe de développement

- Le module IA doit rester **strictement cantonné au classement et à l'OCR** — toute dérive vers de l'assistance pédagogique doit être validée explicitement par le produit avant développement, car cela sort du positionnement défini.
- La **validation utilisateur obligatoire** avant tout classement automatique est une exigence produit non négociable (confiance et contrôle de l'utilisateur sur ses propres données).
- Prévoir dès la conception de la base de données la séparation claire entre documents académiques et documents personnels, pour faciliter les futures évolutions de sécurité (verrouillage renforcé).
- Anticiper la charge du module OCR/IA (traitement asynchrone) pour ne jamais bloquer l'expérience d'import côté utilisateur.
