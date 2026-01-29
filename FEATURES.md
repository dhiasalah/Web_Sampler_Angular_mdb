# Features Implémentées

## Parties Obligatoires

### Frontend Sampler

- Back-end NodeJS avec API REST pour les presets
- Séparation complète GUI et moteur audio
- Mode headless pour tests automatisés
- Menu de presets avec requête fetch GET
- Chargement des presets avec affectation aux pads
- Barres de progression animées pendant le chargement
- Clic sur pad joue le son et affiche la waveform
- Système de trimming pour tous les sons

### Angular

- Application Angular séparée
- Liste des presets avec possibilité de renommer

## Parties Optionnelles

### Frontend Sampler

- **Catégories de presets** (Drumkit, Acoustic, Other)
- **Mapping clavier** - Touches A-P pour jouer les pads
- **Enregistrement micro** avec MediaRecorder API
- **Détection de silences** - Analyse post-enregistrement pour découper automatiquement
- **Sauvegarde de presets** - Upload fichiers audio + création JSON sur serveur
- **Réglages par pad** - Gain et trim individuels pour chaque son
- **Web Component** - Application Angular convertie en Web Component réutilisable

### Backend

- **MongoDB Cloud** - Stockage des presets dans MongoDB Atlas
- **Hébergement Render.com** - Backend déployé et accessible en production

### Angular

- **CRUD complet** - Création, suppression, modification des presets
- **Upload fichiers audio** - Possibilité d'uploader des sons lors de la création
- **Gestion complète** - Interface pour gérer tous les aspects des presets

### Déploiement

- **CI/CD GitHub Pages** - Déploiement automatique du frontend via GitHub Actions
- **Hébergement GitHub Pages** - Frontend accessible en ligne

## Parties Non Implémentées

- Support MIDI
- Intégration Freesound.org
- Effets audio (reverb, delay, etc.)
- Enregistrement/replay des patterns

## Déploiement

- Frontend: https://dhiasalah.github.io/Web_Sampler_Angular_mdb/
- Backend: https://web-sampler-angular-mdb.onrender.com
