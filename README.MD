##  Instructions de démarrage

### 1. Installation
```bash
# Cloner le repo et installer
git clone <your-repo>
cd standup-gamifier

# Installer toutes les dépendances
npm run install:all

# Ou manuellement
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configuration
```bash
# Créer le fichier .env dans backend/
cp backend/.env.example backend/.env

# Modifier MONGODB_URI si nécessaire
```

### 3. Démarrage
```bash
# Démarrer frontend + backend simultanément
npm run dev

# Ou séparément
npm run dev:frontend  # Port 3000
npm run dev:backend   # Port 5000
```

### 4. Accès
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

##  Prêt à utiliser !

L'application est maintenant complètement fonctionnelle avec :
-  Création d'équipes
-  Gestion des meetings
-  Timer en temps réel
-  Système de points
-  Violations et stats
-  Base de données MongoDB
-  API REST complète

Voulez-vous que j'ajoute des fonctionnalités supplémentaires ou des améliorations ? 