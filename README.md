# Web Audio Sampler

A professional web-based audio sampler and beat maker application built with modern web technologies.

## Équipe

- **BEN SALAH Mohamed Dhia**
- **KHALIA Mohamed Mehdi**

**Live Demo**: https://dhiasalah.github.io/BenSalah_Khalia_Web_Sampler_Angular/

Select presets, load audio samples, trim them with interactive waveform editor, and trigger playback using 16 pads or keyboard shortcuts.

**Production Backend**: https://web-sampler-angular-mdb.onrender.com

## Project Structure

```
Web-Audio-Sampler/
├── angular-app/           # Angular 19 frontend application
│   ├── src/
│   ├── package.json
│   └── README.md
├── backend/               # Express.js backend server
│   ├── src/
│   ├── package.json
│   └── README.md
└── AI-DOCUMENTATION.md    # Documentation IA
```

## Quick Start

### 1. Backend Server (Port 5000)

```bash
cd backend
npm install
npm start
```

Server runs at: `http://localhost:5000`

### 2. Angular Frontend (Port 4200)

```bash
cd angular-app
npm install
npm start
```

Application runs at: `http://localhost:4200`

## Features

- 🎹 16 audio pads with keyboard shortcuts (A-P)
- 📊 Interactive waveform editor with visual trim markers
- 🎚️ Drag-to-trim interface for precise sample editing
- 🎵 Real-time audio playback with gain control
- 📦 Preset management system (CRUD complet)
- 🎙️ Microphone recording with silence detection
- ⌨️ Full keyboard support
- 📱 Responsive design
- ☁️ MongoDB Cloud storage
- 🚀 Backend deployed on Render.com

## CI/CD Pipeline

The project uses continuous integration and deployment pipelines:

### Frontend (GitHub Actions)

- Automated workflow defined in `.github/workflows/deploy-angular.yml`
- Triggers on push to `main` branch
- Builds the Angular application (`npm run build:gh-pages`)
- Deploys artifacts to **GitHub Pages**

### Backend (Render)

- Continuous deployment integration with Render.com
- Triggers automatically on git push
- Installs dependencies and starts the Express server

## Technologies

### Frontend (Angular)

- Angular 19
- TypeScript
- RxJS
- Web Audio API
- Canvas API
- CSS3 Animations

### Backend

- Node.js & Express.js
- MongoDB & Mongoose
- ES6 Modules
- Multer (file uploads)

## Documentation

- [Features Implemented](./FEATURES.md) - Complete list of required and optional features
- [Frontend README (Angular)](./angular-app/README.md) - Setup, features, and development guide
- [Backend README](./backend/README.md) - API endpoints and server setup
- [AI Documentation](./AI-DOCUMENTATION.md) - Utilisation de l'IA dans le projet

## License

Project for educational purposes.
