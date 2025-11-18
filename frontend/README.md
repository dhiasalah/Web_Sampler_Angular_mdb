# Web Audio Sampler - Frontend

Professional web-based audio sampler and beat maker application. Load audio samples, trim them, and trigger playback with 16 pads.

## Technologies

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Axios** - HTTP client
- **Web Audio API** - Audio playback and processing
- **Canvas API** - Waveform visualization

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup & Installation

```bash
# Install dependencies
npm install
```

## Running the Application

```bash
# Start development server (runs on http://localhost:3000)
npm run dev
```

## Features

- 🎹 16 audio pads with keyboard shortcuts (A-P)
- 📊 Waveform visualization and trimming
- 🎚️ Adjustable trim points with interactive drag handles
- 🎵 Preview selected samples before playback
- 🎙️ Audio recording with real-time duration display
- 📦 Load presets from backend server (running on port 5000)
- ⌨️ Keyboard support for hands-free playing

## Backend Requirements

The frontend requires the backend server running on **port 5000**. See the backend README for setup instructions.

## Build for Production

```bash
npm run build
npm start
```
