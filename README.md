# 🐺 Loup-Garou 2026 Engine • Bot Discord & Dashboard Narrateur

Bienvenue sur la suite professionnelle **Loup-Garou 2026**, conçue spécialement pour animer et gérer des parties de Loup-Garou sur de multiples serveurs Discord avec un système d'écoute automatique des rôles, une protection anti-spam avancée, et un tableau de bord web d'administration pour les narrateurs.

---

## 🚀 Fonctionnalités Clés

### 1. Écoute Automatique des Rôles (`messageCreate`)
- **Détection stricte du rôle** : Lorsque quelqu'un envoie **uniquement** le nom du rôle (ex: `Chasseur`, `chasseur`, `Sorcière`, `voyante!`, `hunter`), le bot intercepte et répond instantanément.
- **Ignore les conversations courantes** : Une phrase comme *"Je pense que le chasseur a bien voté"* est naturellement ignorée et ne déclenche aucun spam.
- **Normalisation intelligente** : Insensible à la casse, aux accents (`sorcière` = `sorciere`) et à la ponctuation de fin.

### 2. Modes de Réponse & Confidentialité Personnalisables
- **Texte seul** : Règles complètes, pouvoirs, moment du réveil, conditions de victoire.
- **Photo / Illustration seule** : Carte artistique grand format.
- **Les deux (Rich Embed)** : Fiche de rôle complète aux couleurs du camp (Villageois en bleu, Loups en rouge carmin, Neutres en or, Solitaires en violet).
- **Révélation Secrète (Éphémère)** : Bouton interactif `[👁️ Révéler en secret]` pour que seul le joueur qui a demandé puisse voir la carte en pop-up sans que ses adversaires la voient.
- **Message Privé (DM)** : Le bot chuchote la carte en messages privés.
- **Auto-Delete** : Supprime automatiquement la réponse après $X$ secondes pour garder les salons de jeu propres.

### 3. Filtrage par Salon & Catégorie
- **Liste blanche de salons** : Limitez les réponses aux salons de jeu (ex: `#débats-du-village`).
- **Liste blanche de catégories** : Autorisez tous les salons d'une catégorie (ex: `🎮 PARTIE EN COURS`).
- **Blacklist de salons** : Bloquez les salons d'annonces ou administratifs.

### 4. Sécurité Anti-Spam (Rate Limiting)
- **Cooldown par utilisateur** (ex: 3 secondes) : Bloque les spams en rafale.
- **Cooldown par salon** (ex: 1 seconde) : Empêche les attaques de raid.

### 5. Tableau de Bord Narrateur (Web Dashboard)
- Authentification Discord OAuth2 (vérifie les permissions Administrateur / Gérer le serveur).
- Sélecteur multi-serveurs en direct.
- Éditeur visuel de cartes (création de rôles personnalisés, ajout d'alias et de déclencheurs).
- Simulateur de chat en temps réel pour tester immédiatement le comportement du bot avant de lancer la partie !

---

## 🛠️ Structure du Projet

```
Loup-Garou-2026-beta/
├── packages/
│   ├── bot/            # Client Discord.js v14 & Écoute de messages
│   ├── server/         # API Express & Base de données Prisma SQLite
│   └── dashboard/      # Frontend Web React + Vite (Dark Fantasy UI)
├── package.json        # Configuration npm workspaces
└── README.md
```

---

## ⚡ Démarrage Rapide

### 1. Démarrer le Serveur Backend (Port 3001)
```bash
npm run dev:server
```

### 2. Démarrer le Tableau de Bord (Port 5173)
```bash
npm run dev:dashboard
```
Ouvrez votre navigateur sur `http://localhost:5173`.

### 3. Démarrer le Bot Discord
Ajoutez vos identifiants dans le fichier `.env` :
```env
DISCORD_BOT_TOKEN=votre_token_bot_ici
DISCORD_CLIENT_ID=votre_client_id_ici
```
Puis lancez :
```bash
npm run dev:bot
```

### 4. Lancer les Tests Automatisés du Moteur
```bash
npm --workspace=packages/bot run test:bot
```
*(Valide 19/19 tests : détection exacte des rôles, filtres de salons, rate limiting et embeds).*
