# Web Audio Sampler

A professional web-based audio sampler and beat maker application built with modern web technologies.

**Live Demo**: Select presets, load audio samples, trim them with interactive waveform editor, and trigger playback using 16 pads or keyboard shortcuts.

## Project Structure

```
Web-Audio-Sampler/
├── frontend/              # Next.js React application
│   ├── src/
│   ├── package.json
│   └── README.md
├── backend/               # Express.js backend server
│   ├── src/
│   ├── package.json
│   └── README.md
└── Assignment_Solution/   # Original vanilla JS reference
```

## Quick Start

### 1. Backend Server (Port 5000)

```bash
cd backend
npm install
npm start
```

Server runs at: `http://localhost:5000`

### 2. Frontend Application (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

Application runs at: `http://localhost:3000`

## Features

- 🎹 16 audio pads with keyboard shortcuts (A-P)
- 📊 Interactive waveform editor with visual trim markers
- 🎚️ Drag-to-trim interface for precise sample editing
- 🎵 Real-time audio playback with gain control
- 📦 Preset management system
- 🎙️ Audio recording - Capture your performances and download them
- ⌨️ Full keyboard support
- 📱 Responsive design

## Technologies

### Frontend

- Next.js 16 & React 19
- TypeScript
- Axios HTTP client
- Web Audio API
- Canvas API
- CSS3 Animations

### Backend

- Node.js & Express.js
- ES6 Modules
- Multer (file uploads)

## Documentation

- [Frontend README](./frontend/README.md) - Setup, features, and development guide
- [Backend README](./ExampleRESTEndpointCorrige/README.md) - API endpoints and server setup

## License

Project for educational purposes.
