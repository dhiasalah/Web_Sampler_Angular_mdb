// src/models/AudioFile.mjs - MongoDB Schema for Audio Files
import mongoose from "mongoose";

/**
 * AudioFile Schema - stores audio files as base64 in MongoDB
 */
const AudioFileSchema = new mongoose.Schema(
  {
    // Custom ID (UUID)
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // File name
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Original filename
    originalName: {
      type: String,
      required: true,
    },
    // MIME type (audio/mpeg, audio/wav, etc.)
    mimeType: {
      type: String,
      required: true,
    },
    // File size in bytes
    size: {
      type: Number,
      required: true,
    },
    // Audio data as base64 string
    data: {
      type: String,
      required: true,
    },
    // Upload timestamp
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        // Don't include data in list responses (too large)
        // Use separate endpoint to get the actual audio data
        return ret;
      },
    },
  },
);

// Index for searching by name
AudioFileSchema.index({ name: "text" });

const AudioFile = mongoose.model("AudioFile", AudioFileSchema);

export default AudioFile;
