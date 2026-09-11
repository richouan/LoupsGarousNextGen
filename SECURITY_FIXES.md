# 🛡️ Plan de Sécurité & Correctifs Loup-Garou 2026

Ce document regroupe les vulnérabilités identifiées sur l'application (**Serveur Backend**, **Bot Discord**, **Dashboard**, **Base de données**) classées par ordre de priorité, avec leur statut et la solution étape par étape.

---

## 📊 Tableau Récapitulatif

| ID | Vulnérabilité | Cible | Gravité | Statut |
| :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | Contrôle d'accès brisé (IDOR) sur les paramètres serveurs | Backend (`guilds.routes.ts`) | 🔴 **CRITIQUE** | [x] **Corrigé** |
| **SEC-02** | Endpoints internes du Bot non authentifiés (`sync-guilds`) | Backend (`bot.routes.ts`) | 🔴 **CRITIQUE** | [x] **Corrigé** |
| **SEC-03** | CORS permissif en production (`callback(null, true)`) | Backend (`index.ts`) | 🟠 **HAUTE** | [x] **Corrigé** |
| **SEC-04** | Absence de Rate Limiting (Uploads & Auth) | Backend (`upload.routes.ts`, `auth.routes.ts`) | 🟠 **HAUTE** | [x] **Corrigé** |
| **SEC-05** | Clé de secours JWT codée en dur (Fallback Hardcoded Secret) | Backend (`auth.routes.ts`, `guilds.routes.ts`) | 🟡 **MOYENNE** | [x] **Corrigé** |
| **SEC-06** | Absence d'en-têtes HTTP de sécurité (`helmet`) | Backend (`index.ts`) | 🟡 **MOYENNE** | [x] **Corrigé** |
| **SEC-07** | Nettoyage / Validation des entrées d'upload Cloudinary | Backend (`upload.routes.ts`) | 🔵 **BASSE** | [x] **Corrigé** |

---

## 🛠️ Détail des Tâches & Solutions

### 🔴 SEC-01 : Contrôle d'accès brisé (IDOR) sur les serveurs
- **Fichier** : `packages/server/src/routes/guilds.routes.ts`
- **Risque** : N'importe quel utilisateur connecté avec son compte Discord peut modifier la configuration d'un autre serveur en passant son ID dans l'URL (`PUT /api/guilds/:guildId/settings`).
- **Correction** :
  - Créer un middleware `requireGuildAdmin` ou vérifier dans la route que `req.guilds` contient bien `guildId` avec `owner === true` ou les permissions Administrateur Discord (`0x8`).
  - Permettre l'accès si `req.user.isSuperAdmin` ou `req.user.isDev`.
  - Refuser sinon avec un code HTTP `403 Forbidden`.

---

### 🔴 SEC-02 : Endpoints internes du Bot non authentifiés
- **Fichier** : `packages/server/src/routes/bot.routes.ts`
- **Risque** : La route `POST /api/bot/sync-guilds` est accessible publiquement sans aucun token. N'importe qui peut injecter de faux serveurs en base de données.
- **Correction** :
  - Ajouter un secret partagé `INTERNAL_API_SECRET` dans les variables d'environnement.
  - Vérifier l'en-tête `x-bot-secret` sur toutes les routes réservées au bot (`/sync-guilds`, etc.).

---

### 🟠 SEC-03 : CORS permissif en production
- **Fichier** : `packages/server/src/index.ts`
- **Risque** : `cors({ origin: (origin, cb) => cb(null, true) })` autorise n'importe quel domaine web externe à appeler l'API avec des credentials.
- **Correction** :
  - Restreindre l'accès exclusivement aux domaines autorisés (`loupgarou.online`, `www.loupgarou.online`, `localhost:5173`, et le domaine herokuapp).
  - Bloquer explicitement toute autre origine avec `callback(new Error('Bloqué par CORS'))`.

---

### 🟠 SEC-04 : Rate Limiting (DDoS & Protection Cloudinary)
- **Fichiers** : `packages/server/src/index.ts`, `upload.routes.ts`, `auth.routes.ts`
- **Risque** : Un attaquant peut envoyer des milliers de requêtes d'upload pour saturer le quota Cloudinary ou spammer Discord OAuth.
- **Correction** :
  - Installer `express-rate-limit`.
  - Limite globale : 150 requêtes / 15 min par IP.
  - Limite stricte sur `/api/upload` : 10 uploads / 10 minutes par IP.
  - Limite sur `/api/auth/callback` : 10 tentatives / minute par IP.

---

### 🟡 SEC-05 : Révocation du Secret JWT par défaut codé en dur
- **Fichiers** : `packages/server/src/routes/auth.routes.ts`, `guilds.routes.ts`
- **Risque** : Le fallback `'loup-garou-secret-key-2026'` permettrait de forger de faux jetons admins si la variable d'environnement `JWT_SECRET` est absente.
- **Correction** :
  - Supprimer la chaîne par défaut.
  - Lever une erreur fatale au démarrage si `JWT_SECRET` n'est pas configuré.

---

### 🟡 SEC-06 : En-têtes HTTP de sécurité (`helmet`)
- **Fichier** : `packages/server/src/index.ts`
- **Risque** : Clickjacking (dashboard encapsulé dans une iframe malveillante), MIME sniffing, absence de HSTS.
- **Correction** :
  - Installer `helmet`.
  - Configurer `app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))` (adapté pour les web apps React et CDN Discord/Cloudinary).

---

### 🔵 SEC-07 : Validation stricte des fichiers d'upload
- **Fichier** : `packages/server/src/routes/upload.routes.ts`
- **Risque** : Fichiers non-images ou excessivement lourds.
- **Correction** :
  - Valider le type MIME (`fileFilter: (req, file, cb)` vérifiant `image/png`, `image/jpeg`, `image/webp`).
  - Limiter la taille max à 5 Mo (déjà configuré, à sécuriser côté types).

---

## 🎯 Prochaine Étape
Par quel numéro souhaitez-vous commencer ? (Recommandé : **SEC-01** puis **SEC-02**).
