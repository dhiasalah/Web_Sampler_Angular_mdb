# Google Drive Audio Storage Setup Guide

This guide will help you set up Google Drive integration for storing audio files.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Web Audio Sampler")
4. Click "Create"

## Step 2: Enable Google Drive API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on it and click "Enable"

## Step 3: Create a Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - Service account name: `audio-uploader`
   - Service account ID: `audio-uploader`
4. Click "Create and Continue"
5. For "Grant this service account access to project", select role: **"Editor"**
6. Click "Continue" → "Done"

## Step 4: Create and Download Credentials Key

1. In the Credentials page, click on your service account
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select **JSON** format
5. Click "Create" - this downloads the key file
6. **Rename the downloaded file to `credentials.json`**
7. **Move it to the `backend/` folder** of your project

## Step 5: Create a Google Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder for your audio files (e.g., "Sampler Audio Files")
3. **Share the folder with your service account email**:
   - Right-click the folder → "Share"
   - Add the service account email (found in credentials.json as `client_email`)
   - Give it **"Editor"** access
4. Open the folder and copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          This is your FOLDER_ID
   ```

## Step 6: Configure Environment Variables

Create a `.env` file in the `backend/` folder (or update existing):

```env
# Google Drive Configuration
GOOGLE_CREDENTIALS_PATH=./credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
```

## Step 7: Test the Integration

Start your backend server:

```bash
cd backend
npm run dev
```

You should see:

```
✅ Google Drive connected successfully
🎵 Audio storage: Google Drive
```

## API Endpoints

### Upload a Single Audio File

```http
POST /api/audio/upload
Content-Type: multipart/form-data

file: <audio file>
name: (optional) Custom name for the file
```

**Response:**

```json
{
  "success": true,
  "file": {
    "id": "google_drive_file_id",
    "name": "my-sound.wav",
    "url": "https://drive.google.com/uc?export=download&id=...",
    "webViewLink": "https://drive.google.com/file/d/.../view"
  }
}
```

### Upload Multiple Audio Files

```http
POST /api/audio/upload-multiple
Content-Type: multipart/form-data

files: <audio files...>
names: (optional) JSON array of custom names ["name1", "name2"]
```

### List Audio Files

```http
GET /api/audio/files
```

### Delete an Audio File

```http
DELETE /api/audio/:fileId
```

### Check Storage Status

```http
GET /api/storage/status
```

**Response:**

```json
{
  "mode": "mongodb",
  "mongoConnected": true,
  "driveConnected": true,
  "driveFolderId": "your_folder_id",
  "dataDir": "..."
}
```

## Using the Audio URL in Presets

When you upload an audio file, use the returned `url` field as the sample URL in your preset:

```json
{
  "name": "My Preset",
  "type": "Custom",
  "samples": [
    {
      "name": "Kick",
      "url": "https://drive.google.com/uc?export=download&id=..."
    }
  ]
}
```

## Troubleshooting

### "Google Drive credentials not found"

- Make sure `credentials.json` exists in the `backend/` folder
- Check that `GOOGLE_CREDENTIALS_PATH` points to the correct file

### "Permission denied" when uploading

- Make sure you shared the Google Drive folder with the service account email
- The service account email is in `credentials.json` as `client_email`

### Audio doesn't play from Google Drive URL

- Make sure the file is shared publicly (the API does this automatically)
- Some browsers may block direct downloads; try a different browser
- Use the `directLink` format: `https://drive.google.com/uc?export=download&id=FILE_ID`

## Security Notes

⚠️ **Important:**

- Never commit `credentials.json` to git! Add it to `.gitignore`
- The credentials file contains sensitive information
- Uploaded files are made public (anyone with the link can access)
