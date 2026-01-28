import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import type {
  Preset,
  Sample,
  PresetsByCategory,
  UploadResponse,
  SampleToSave,
  DriveUploadResponse,
  DriveUploadMultipleResponse,
} from '../models';
import { environment } from '../config/environment';

// Re-export types for backward compatibility
export type {
  Preset,
  Sample,
  PresetsByCategory,
  UploadResponse,
  SampleToSave,
  DriveUploadResponse,
  DriveUploadMultipleResponse,
} from '../models';

/**
 * API configuration
 */
const API_CONFIG = {
  BASE_URL: `${environment.BACKEND_URL}/api`,
} as const;

@Injectable({
  providedIn: 'root',
})
export class PresetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.BASE_URL;

  /**
   * Fetch all presets from the backend
   */
  getPresets(): Observable<Preset[]> {
    return this.http.get<Preset[]>(`${this.apiUrl}/presets`);
  }

  /**
   * Fetch a single preset by name
   */
  getPreset(name: string): Observable<Preset> {
    return this.http.get<Preset>(`${this.apiUrl}/presets/${encodeURIComponent(name)}`);
  }

  /**
   * Fetch presets filtered by type/category
   */
  getPresetsByType(type: string): Observable<Preset[]> {
    return this.http.get<Preset[]>(`${this.apiUrl}/presets`, {
      params: { type },
    });
  }

  /**
   * Fetch presets and group them by category (type)
   */
  getPresetsGroupedByCategory(): Observable<PresetsByCategory> {
    return this.getPresets().pipe(
      map((presets) => {
        const grouped: PresetsByCategory = {};

        presets.forEach((preset) => {
          const category = preset.type || 'Other';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(preset);
        });

        return grouped;
      }),
    );
  }

  /**
   * Upload audio files to a folder on the server
   * @param folderName Folder name where files will be stored
   * @param files Array of File objects to upload
   */
  uploadAudioFiles(folderName: string, files: File[]): Observable<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file, file.name);
    });
    return this.http.post<UploadResponse>(
      `${this.apiUrl}/upload/${encodeURIComponent(folderName)}`,
      formData,
    );
  }

  /**
   * Create a new preset on the server
   * @param preset The preset object to create
   */
  createPreset(preset: Omit<Preset, 'id' | 'slug'>): Observable<Preset> {
    return this.http.post<Preset>(`${this.apiUrl}/presets`, preset);
  }

  /**
   * Update an existing preset on the server
   * @param name The preset name
   * @param updates Partial preset data to update
   */
  updatePreset(name: string, updates: Partial<Preset>): Observable<Preset> {
    return this.http.patch<Preset>(`${this.apiUrl}/presets/${encodeURIComponent(name)}`, updates);
  }

  /**
   * Rename a preset
   * @param oldName Current preset name
   * @param newName New preset name
   */
  renamePreset(oldName: string, newName: string): Observable<Preset> {
    return this.http.patch<Preset>(`${this.apiUrl}/presets/${encodeURIComponent(oldName)}`, {
      name: newName,
    });
  }

  /**
   * Delete a preset from the server
   * @param name The preset name to delete
   */
  deletePreset(name: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/presets/${encodeURIComponent(name)}`);
  }

  // ==================== GOOGLE DRIVE AUDIO UPLOAD ====================

  /**
   * Upload a single audio file to Google Drive
   * @param file The audio file to upload
   * @param customName Optional custom name for the file
   * @returns Observable with the uploaded file info including Google Drive URL
   */
  uploadAudioToDrive(file: File, customName?: string): Observable<DriveUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (customName) {
      formData.append('name', customName);
    }
    return this.http.post<DriveUploadResponse>(`${this.apiUrl}/audio/upload`, formData);
  }

  /**
   * Upload multiple audio files to Google Drive
   * @param files Array of files to upload
   * @param customNames Optional array of custom names for the files
   * @returns Observable with uploaded files info
   */
  uploadMultipleAudioToDrive(
    files: File[],
    customNames?: string[],
  ): Observable<DriveUploadMultipleResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file, file.name);
    });
    if (customNames && customNames.length > 0) {
      formData.append('names', JSON.stringify(customNames));
    }
    return this.http.post<DriveUploadMultipleResponse>(
      `${this.apiUrl}/audio/upload-multiple`,
      formData,
    );
  }

  /**
   * Upload audio file to Drive and add to current preset's samples
   * @param presetName Name of the preset to add the sample to
   * @param file The audio file to upload
   * @param sampleName The name for the sample
   */
  uploadAndAddSampleToPreset(
    presetName: string,
    file: File,
    sampleName: string,
  ): Observable<Preset> {
    return this.uploadAudioToDrive(file, sampleName).pipe(
      switchMap((uploadResponse) => {
        // Add the new sample to the preset
        return this.getPreset(presetName).pipe(
          switchMap((preset) => {
            const newSample: Sample = {
              url: uploadResponse.file.url,
              name: sampleName,
            };
            const updatedSamples = [...preset.samples, newSample];
            return this.updatePreset(presetName, { samples: updatedSamples });
          }),
        );
      }),
    );
  }

  /**
   * Save a complete preset with audio files
   * This will:
   * 1. Convert AudioBuffers to WAV files
   * 2. Upload the audio files to the server
   * 3. Create the preset JSON with sample URLs
   *
   * @param name Preset name
   * @param type Preset category/type
   * @param samples Array of samples with AudioBuffer data
   */
  savePresetWithAudio(name: string, type: string, samples: SampleToSave[]): Observable<Preset> {
    // Convert AudioBuffers to WAV files
    const files = samples.map((sample) => {
      const wavBlob = this.audioBufferToWav(sample.audioBuffer);
      const fileName = this.sanitizeFileName(sample.name) + '.wav';
      return new File([wavBlob], fileName, { type: 'audio/wav' });
    });

    // Upload files first, then create preset
    return this.uploadAudioFiles(name, files).pipe(
      switchMap((uploadResponse) => {
        // Build samples array with URLs from upload response
        const presetSamples: Sample[] = uploadResponse.files.map((file, index) => ({
          url: file.url,
          name: samples[index].name,
        }));

        // Create the preset
        const preset: Omit<Preset, 'id' | 'slug'> = {
          name,
          type,
          isFactoryPresets: false,
          samples: presetSamples,
        };

        return this.createPreset(preset);
      }),
    );
  }

  /**
   * Convert an AudioBuffer to a WAV Blob
   * @param buffer The AudioBuffer to convert
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    // Interleave channels
    const length = buffer.length * numChannels * (bitDepth / 8);
    const wavBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Get channel data
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    // Interleave and write samples
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /**
   * Sanitize a file name to be URL-friendly
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
