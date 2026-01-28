// src/services/audioStorageService.mjs - Audio file storage in MongoDB
import crypto from "crypto";
import AudioFile from "../models/AudioFile.mjs";
import { isConnected } from "../db.mjs";

/**
 * Check if MongoDB storage is available
 */
export const isStorageAvailable = () => {
  return isConnected();
};

/**
 * Upload an audio file to MongoDB
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Name to save the file as
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type (e.g., 'audio/mpeg')
 * @returns {Object} - Uploaded file info with URL
 */
export const uploadAudio = async (buffer, fileName, originalName, mimeType) => {
  if (!isConnected()) {
    throw new Error("MongoDB not connected. Cannot store audio files.");
  }

  // Generate unique ID
  const id = crypto.randomUUID();

  // Convert buffer to base64
  const base64Data = buffer.toString("base64");

  // Create the audio file document
  const audioFile = new AudioFile({
    id,
    name: fileName,
    originalName,
    mimeType,
    size: buffer.length,
    data: base64Data,
  });

  await audioFile.save();

  // Generate the URL to access this audio file
  // This URL will be served by our backend
  const url = `/api/audio/stream/${id}`;

  return {
    id,
    name: fileName,
    originalName,
    mimeType,
    size: buffer.length,
    url,
    uploadedAt: audioFile.uploadedAt,
  };
};

/**
 * Get audio file by ID (returns metadata only, not data)
 * @param {string} id - Audio file ID
 */
export const getAudioInfo = async (id) => {
  if (!isConnected()) {
    throw new Error("MongoDB not connected");
  }

  const file = await AudioFile.findOne({ id }).select("-data").lean();
  if (!file) return null;

  return {
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    url: `/api/audio/stream/${file.id}`,
    uploadedAt: file.uploadedAt,
  };
};

/**
 * Get audio file data for streaming
 * @param {string} id - Audio file ID
 * @returns {Object} - { mimeType, buffer }
 */
export const getAudioData = async (id) => {
  if (!isConnected()) {
    throw new Error("MongoDB not connected");
  }

  const file = await AudioFile.findOne({ id }).lean();
  if (!file) return null;

  // Convert base64 back to buffer
  const buffer = Buffer.from(file.data, "base64");

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    buffer,
  };
};

/**
 * List all audio files (metadata only)
 * @param {Object} options - Query options
 */
export const listAudioFiles = async ({ q, limit = 100 } = {}) => {
  if (!isConnected()) {
    throw new Error("MongoDB not connected");
  }

  let query = {};

  // Text search on name
  if (q) {
    query.name = { $regex: new RegExp(q, "i") };
  }

  const files = await AudioFile.find(query)
    .select("-data")
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .lean();

  return files.map((file) => ({
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    url: `/api/audio/stream/${file.id}`,
    uploadedAt: file.uploadedAt,
  }));
};

/**
 * Delete an audio file
 * @param {string} id - Audio file ID
 */
export const deleteAudio = async (id) => {
  if (!isConnected()) {
    throw new Error("MongoDB not connected");
  }

  const result = await AudioFile.deleteOne({ id });
  return result.deletedCount > 0;
};

/**
 * Check if audio file exists
 * @param {string} id - Audio file ID
 */
export const audioExists = async (id) => {
  if (!isConnected()) {
    return false;
  }

  const count = await AudioFile.countDocuments({ id });
  return count > 0;
};

export default {
  isStorageAvailable,
  uploadAudio,
  getAudioInfo,
  getAudioData,
  listAudioFiles,
  deleteAudio,
  audioExists,
};
