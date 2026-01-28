/**
 * Shared models and interfaces for the Angular Audio Sampler
 */

/**
 * Interface for a sampler pad
 */
export interface Pad {
  index: number;
  buffer: AudioBuffer | null;
  name: string;
  loaded: boolean;
  trimStart: number;
  trimEnd: number;
  gain: number;
}

/**
 * Loading state for each pad
 */
export interface PadLoadingState {
  isLoading: boolean;
  progress: number;
  error: string | null;
}

/**
 * Interface for a sample in a preset
 */
export interface Sample {
  url: string;
  name: string;
}

/**
 * Interface for a preset
 */
export interface Preset {
  id?: string;
  name: string;
  slug?: string;
  type?: string;
  isFactoryPresets?: boolean;
  samples: Sample[];
}

/**
 * Interface for presets grouped by category
 */
export interface PresetsByCategory {
  [category: string]: Preset[];
}

/**
 * Interface for file upload response
 */
export interface UploadResponse {
  uploaded: number;
  files: UploadedFile[];
}

/**
 * Interface for an uploaded file
 */
export interface UploadedFile {
  originalName: string;
  storedName: string;
  size: number;
  url: string;
}

/**
 * Interface for audio upload response (single file)
 */
export interface DriveUploadResponse {
  success: boolean;
  file: {
    id: string;
    name: string;
    url: string; // Relative URL like /api/audio/stream/id
    originalName?: string;
    size?: number;
    mimeType?: string;
  };
}

/**
 * Interface for audio multiple files upload response
 */
export interface DriveUploadMultipleResponse {
  success: boolean;
  uploaded: number;
  files: Array<{
    id: string;
    name: string;
    originalName: string;
    url: string;
    size?: number;
  }>;
}

/**
 * Interface for sample to save (with audio data)
 */
export interface SampleToSave {
  name: string;
  audioBuffer: AudioBuffer;
}

/**
 * Sound segment detected from audio
 */
export interface SoundSegment {
  start: number;
  end: number;
}

/**
 * Keyboard mapping type
 */
export type KeyboardMapping = Readonly<Record<string, number>>;

/**
 * Default keyboard mapping for pads
 * Layout matches a 4x4 grid where pad 0 is at bottom-left
 */
export const KEYBOARD_MAP: KeyboardMapping = {
  // Bottom row (pads 0-3)
  a: 0,
  s: 1,
  d: 2,
  f: 3,
  // Second row (pads 4-7)
  q: 4,
  w: 5,
  e: 6,
  r: 7,
  // Third row (pads 8-11)
  z: 8,
  x: 9,
  c: 10,
  v: 11,
  // Top row (pads 12-15)
  t: 12,
  y: 13,
  u: 14,
  i: 15,
} as const;

/**
 * Available preset categories
 */
export const PRESET_CATEGORIES = [
  'Drumkit',
  'Electronic',
  'Hip-Hop',
  'Acoustic',
  'Piano',
  'Percussion',
  'FX',
  'Other',
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];
