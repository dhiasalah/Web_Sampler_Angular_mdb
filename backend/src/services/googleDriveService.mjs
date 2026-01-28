// src/services/googleDriveService.mjs - Google Drive integration for audio file storage
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your Google credentials JSON file
const CREDENTIALS_PATH =
  process.env.GOOGLE_CREDENTIALS_PATH ||
  path.resolve(__dirname, "../../credentials.json");

// Folder ID in Google Drive where audio files will be stored
// This will be read from environment at runtime via getDriveFolderId()
let DRIVE_FOLDER_ID = null;

let driveClient = null;

/**
 * Get the folder ID (read from env at runtime)
 */
const getConfiguredFolderId = () => {
  return DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || null;
};

/**
 * Initialize Google Drive client with service account credentials
 */
export const initializeDrive = async () => {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.warn(
        "⚠️ Google Drive credentials not found. Audio upload to Drive disabled.",
      );
      console.warn(`   Expected path: ${CREDENTIALS_PATH}`);
      return false;
    }

    // Get folder ID from environment (read at runtime)
    const folderId = getConfiguredFolderId();

    // Check if folder ID is configured
    if (!folderId) {
      console.warn(
        "⚠️ GOOGLE_DRIVE_FOLDER_ID not set. Audio upload to Drive disabled.",
      );
      console.warn("   Set GOOGLE_DRIVE_FOLDER_ID in your .env file");
      return false;
    }

    // Store it for later use
    DRIVE_FOLDER_ID = folderId;
    console.log(`📁 Using Google Drive folder ID: ${DRIVE_FOLDER_ID}`);

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    driveClient = google.drive({ version: "v3", auth });

    // Test connection by getting about info
    await driveClient.about.get({ fields: "user" });

    console.log("✅ Google Drive connected successfully");
    console.log(`   Service account: ${credentials.client_email}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize Google Drive:", error.message);
    return false;
  }
};

/**
 * Check if Google Drive is available
 */
export const isDriveAvailable = () => {
  return driveClient !== null;
};

/**
 * Set the Google Drive folder ID
 */
export const setDriveFolderId = (folderId) => {
  DRIVE_FOLDER_ID = folderId;
};

/**
 * Get the current Google Drive folder ID
 */
export const getDriveFolderId = () => {
  return DRIVE_FOLDER_ID;
};

/**
 * Create a folder in Google Drive if it doesn't exist
 * @param {string} folderName - Name of the folder to create
 * @param {string} parentFolderId - Optional parent folder ID
 * @returns {string} - The folder ID
 */
export const createFolder = async (folderName, parentFolderId = null) => {
  if (!driveClient) {
    throw new Error("Google Drive not initialized");
  }

  // Check if folder already exists
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentFolderId ? ` and '${parentFolderId}' in parents` : ""}`;

  const existing = await driveClient.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id;
  }

  // Create the folder
  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentFolderId
      ? [parentFolderId]
      : DRIVE_FOLDER_ID
        ? [DRIVE_FOLDER_ID]
        : undefined,
  };

  const folder = await driveClient.files.create({
    resource: fileMetadata,
    fields: "id",
  });

  return folder.data.id;
};

/**
 * Upload an audio file to Google Drive
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Name to save the file as in Drive
 * @param {string} mimeType - MIME type of the file (e.g., 'audio/wav', 'audio/mp3')
 * @param {string} folderId - Optional folder ID to upload to (uses default if not provided)
 * @returns {Object} - { id, name, webViewLink, webContentLink, directLink }
 */
export const uploadFile = async (
  filePath,
  fileName,
  mimeType = "audio/mpeg",
  folderId = null,
) => {
  if (!driveClient) {
    throw new Error("Google Drive not initialized");
  }

  const targetFolderId = folderId || DRIVE_FOLDER_ID;

  const fileMetadata = {
    name: fileName,
    parents: targetFolderId ? [targetFolderId] : undefined,
  };

  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  // Upload the file
  const file = await driveClient.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id, name, webViewLink, webContentLink",
  });

  // Make the file publicly accessible (anyone with link can view)
  await driveClient.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // Get the updated file info with sharing links
  const updatedFile = await driveClient.files.get({
    fileId: file.data.id,
    fields: "id, name, webViewLink, webContentLink",
  });

  // Generate direct download/stream link
  // Format: https://drive.google.com/uc?export=download&id=FILE_ID
  const directLink = `https://drive.google.com/uc?export=download&id=${file.data.id}`;

  return {
    id: updatedFile.data.id,
    name: updatedFile.data.name,
    webViewLink: updatedFile.data.webViewLink,
    webContentLink: updatedFile.data.webContentLink,
    directLink, // Use this for audio playback
  };
};

/**
 * Upload audio from a buffer (for handling multipart uploads)
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Name to save the file as
 * @param {string} mimeType - MIME type
 * @param {string} folderId - Optional folder ID
 * @returns {Object} - Upload result with links
 */
export const uploadBuffer = async (
  buffer,
  fileName,
  mimeType = "audio/mpeg",
  folderId = null,
) => {
  if (!driveClient) {
    throw new Error("Google Drive not initialized");
  }

  const targetFolderId = folderId || DRIVE_FOLDER_ID || getConfiguredFolderId();

  // CRITICAL: Must have a folder ID to upload (service accounts have no storage quota)
  if (!targetFolderId) {
    throw new Error(
      "No folder ID configured. Service accounts require a shared folder to upload files. Set GOOGLE_DRIVE_FOLDER_ID in your .env file.",
    );
  }

  console.log(`📤 Uploading to folder: ${targetFolderId}`);

  const { Readable } = await import("stream");

  const fileMetadata = {
    name: fileName,
    parents: [targetFolderId], // Always require parent folder
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  // Upload the file
  const file = await driveClient.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id, name, webViewLink, webContentLink",
  });

  // Make the file publicly accessible
  await driveClient.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // Generate direct link for audio playback
  const directLink = `https://drive.google.com/uc?export=download&id=${file.data.id}`;

  return {
    id: file.data.id,
    name: file.data.name,
    webViewLink: file.data.webViewLink,
    webContentLink: file.data.webContentLink,
    directLink,
  };
};

/**
 * Delete a file from Google Drive
 * @param {string} fileId - The ID of the file to delete
 */
export const deleteFile = async (fileId) => {
  if (!driveClient) {
    throw new Error("Google Drive not initialized");
  }

  await driveClient.files.delete({ fileId });
};

/**
 * Get file info from Google Drive
 * @param {string} fileId - The ID of the file
 */
export const getFileInfo = async (fileId) => {
  if (!driveClient) {
    throw new Error("Google Drive not initialized");
  }

  const file = await driveClient.files.get({
    fileId,
    fields: "id, name, mimeType, size, webViewLink, webContentLink",
  });

  return {
    ...file.data,
    directLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
  };
};

/**
 * List files in a folder
 * @param {string} folderId - Optional folder ID (uses default if not provided)
 */
export const listFiles = async (folderId = null) => {
  if (!driveClient) {
    throw new Error("Google Drive not initialized");
  }

  const targetFolderId = folderId || DRIVE_FOLDER_ID;
  let query = "trashed=false and mimeType contains 'audio/'";

  if (targetFolderId) {
    query += ` and '${targetFolderId}' in parents`;
  }

  const response = await driveClient.files.list({
    q: query,
    fields: "files(id, name, mimeType, size, webViewLink, webContentLink)",
    orderBy: "name",
  });

  return response.data.files.map((file) => ({
    ...file,
    directLink: `https://drive.google.com/uc?export=download&id=${file.id}`,
  }));
};

export default {
  initializeDrive,
  isDriveAvailable,
  setDriveFolderId,
  getDriveFolderId,
  createFolder,
  uploadFile,
  uploadBuffer,
  deleteFile,
  getFileInfo,
  listFiles,
};
