# Web Audio Sampler – Backend

Backend REST API for the Web Audio Sampler project.

## Features

- Serves audio presets and samples
- Provides REST endpoints for preset management
- Supports file uploads for new samples
- Automated tests and CI workflow

## Core Logic

- Built with Express.js and ES6 modules
- Handles preset and sample file storage
- Communicates with the Angular frontend

## Technologies

- Node.js
- Express.js
- MongoDB

## Setup & Running

### Installation

```bash
cd backend
npm install
```

### Environment Configuration

Create a `.env` file in the `backend` folder with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://dhia:dhia@cluster0.vdntp.mongodb.net/audio-sampler?retryWrites=true&w=majority&appName=Cluster0

# Server Configuration
PORT=5000
```

**Note:** The `.env` file is not tracked by git for security reasons.

### Running the Backend

#### For Local Development

1. Start the backend server:

```bash
npm start
```

The server will run on `http://localhost:5000`

2. Update the Angular frontend to use localhost:
   - Edit `angular-app/src/app/config/environment.ts`
   - Set `BACKEND_URL: 'http://localhost:5000'`

#### For Production

The backend is already deployed at: **https://web-sampler-angular-mdb.onrender.com**

To use the production backend:

- Edit `angular-app/src/app/config/environment.ts`
- Set `BACKEND_URL: 'https://web-sampler-angular-mdb.onrender.com'`

No additional deployment needed - the production backend is live and ready to use.

### Environment Variables

The backend may require the following environment variables:

- `MONGODB_URI` - MongoDB connection string
- `PORT` - Port number (default: 5000)

### Testing

Run the test suite:

```bash
npm test
```

---

## Documentation IA

Pour voir comment l'IA a été utilisée dans ce projet, consultez le fichier [AI-DOCUMENTATION.md](../AI-DOCUMENTATION.md) à la racine du projet.
