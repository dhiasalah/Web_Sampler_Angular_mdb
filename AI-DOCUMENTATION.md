# Documentation IA - Web Audio Sampler

Ce document décrit l'utilisation de l'Intelligence Artificielle comme assistant dans certaines parties du développement.

## Outils IA Utilisés

- **GitHub Copilot** - Assistant de programmation intégré à VS Code

---

## Utilisation de l'IA dans le Projet

L'IA a été utilisée pour assister le développement de certaines fonctionnalités et optimiser le code existant.

---

## Prompts Utilisés

### Prompt 1 : Création du système d'enregistrement audio

```
Créer un système d'enregistrement audio dans Angular avec les fonctionnalités suivantes :
- Utiliser l'API MediaRecorder pour capturer l'audio du microphone
- Afficher un timer pendant l'enregistrement
- Convertir l'enregistrement en AudioBuffer pour pouvoir le manipuler
- Permettre d'affecter le son enregistré à un pad du sampler
- Afficher la forme d'onde du son enregistré dans un canvas
```

---

### Prompt 2 : Détection automatique des silences

```
Implémenter une fonction de détection de silences dans un AudioBuffer :
- Analyser l'amplitude du signal audio après l'enregistrement
- Détecter les segments où le volume est en dessous d'un seuil configurable
- Retourner un tableau de segments {start, end} en secondes représentant les parties sonores
- Permettre de découper automatiquement un enregistrement en plusieurs parties
- Affecter chaque segment à un pad différent, en commençant par le pad 0
- Note: L'analyse se fait après l'arrêt manuel de l'enregistrement, pas en temps réel
```

---

### Prompt 3 : Système de sauvegarde de presets

```
Créer un système complet de sauvegarde de presets :
- Interface permettant de nommer le preset et choisir une catégorie
- Upload des fichiers audio vers le serveur via HTTP POST multipart/form-data
- Création d'un fichier JSON contenant les métadonnées du preset
- Stockage des fichiers audio dans un dossier dédié sur le serveur
- Afficher un feedback de succès ou d'erreur à l'utilisateur
```

---

### Prompt 4 : Intégration MongoDB pour les presets

```
Adapter le backend pour stocker les presets dans MongoDB Atlas :
- Créer un modèle Mongoose pour les presets avec name, category, samples
- Modifier les endpoints REST pour utiliser MongoDB au lieu du système de fichiers
- Gérer la connexion à la base de données avec les variables d'environnement
- Synchroniser les fichiers audio avec les documents MongoDB
```

---

### Prompt 5 : Configuration centralisée de l'environnement

```
Créer un fichier de configuration centralisé pour l'application Angular :
- Définir une variable BACKEND_URL facilement modifiable
- Utiliser cette variable dans tous les services qui font des appels HTTP
- Permettre de basculer facilement entre localhost et l'URL de production
- Documenter dans le README comment modifier cette configuration
```

---

### Prompt 6 : Conversion en Web Component

```
Transformer l'application Angular en Web Component réutilisable :
- Utiliser @angular/elements pour convertir le composant principal
- Utiliser createCustomElement() pour créer un custom element
- Enregistrer avec customElements.define() sous le nom 'web-audio-sampler'
- Installer zone.js comme dépendance
- Modifier index.html pour utiliser le custom element
```

---


## Features Optionnelles Implémentées

Voici les fonctionnalités optionnelles développées dans ce projet :

| Feature               | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| Enregistrement micro  | Capture audio via MediaRecorder API                              |
| Détection de silences | Analyse post-enregistrement et découpage automatique des sons    |
| Sauvegarde presets    | Upload de fichiers audio et création JSON                        |
| MongoDB Cloud         | Stockage des presets dans MongoDB Atlas                          |
| Hébergement Render    | Backend déployé sur https://web-sampler-angular-mdb.onrender.com |
| Gestion presets       | CRUD complet (création, suppression, modification)               |
| Web Component         | Application convertie en custom element réutilisable             |
| CI/CD GitHub Pages    | Déploiement automatique via GitHub Actions                       |

---

## Conclusion

L'IA a été utilisée comme outil d'assistance pour accélérer le développement et améliorer la qualité du code.
