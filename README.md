# SailingLoc - Application de gestion de location de bateaux

Bienvenue dans **SailingLoc**, une application Node.js/Express utilisant MongoDB et Prisma.  
Le projet simule un système de gestion de flotte de bateaux pour une plateforme de location.

Une API pour gérer des bateaux (ajout, recherche, suppression, etc.).

## 🔧 Technologies
- Node.js
- Express
- MongoDB + ReplicaSet
- Prisma ORM
- Redis
- Docker / Docker Compos

## Lancement rapide

Cloner le dépôt et lancer avec Docker :

```bash
git clone https://github.com/Anilzer/NO_SQL_MONGO_DP_APP_WITH_DOCKER.git
cd sailingLoc
docker compose down --volumes docker compose up --build
