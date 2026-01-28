import { Injectable } from '@angular/core';
import type { Pad, SoundSegment } from '../models';

// Re-export Pad for backward compatibility
export type { Pad } from '../models';

/**
 * Audio Engine configuration constants
 */
const AUDIO_CONFIG = {
  MAX_PADS: 16,
  DEFAULT_GAIN: 1.0,
  MAX_GAIN: 2.0,
  MIN_GAIN: 0,
  RECORDING_MIME_TYPE: 'audio/webm;codecs=opus',
  RECORDING_INTERVAL_MS: 100,
} as const;

/**
 * Default silence detection configuration
 */
const SILENCE_DETECTION_DEFAULTS = {
  THRESHOLD: 0.02,
  MIN_SILENCE_DURATION: 0.1,
  MIN_SOUND_DURATION: 0.05,
} as const;

/**
 * Progress callback type
 */
type ProgressCallback = (progress: number) => void;

/**
 * AudioEngine - Core audio processing engine (headless)
 * This service is completely independent from the GUI
 * Can be used in headless mode for testing or automation
 */
@Injectable({
  providedIn: 'root',
})
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private pads: Pad[] = [];
  private masterGain: GainNode | null = null;

  // Recording state
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;

  /**
   * Initialize the audio engine
   * Must be called after user interaction
   */
  async initialize(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.initializePads();
  }

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.ctx !== null;
  }

  /**
   * Get audio context (for advanced usage)
   */
  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Resume audio context if suspended
   */
  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // ==================== PAD MANAGEMENT ====================

  /**
   * Initialize empty pads
   */
  private initializePads(): void {
    this.pads = Array.from({ length: AUDIO_CONFIG.MAX_PADS }, (_, i) => this.createEmptyPad(i));
  }

  /**
   * Create an empty pad object
   */
  private createEmptyPad(index: number): Pad {
    return {
      index,
      buffer: null,
      name: `Pad ${index + 1}`,
      loaded: false,
      trimStart: 0,
      trimEnd: 1,
      gain: AUDIO_CONFIG.DEFAULT_GAIN,
    };
  }

  /**
   * Validate pad index
   */
  private isValidPadIndex(padIndex: number): boolean {
    return padIndex >= 0 && padIndex < AUDIO_CONFIG.MAX_PADS;
  }

  /**
   * Ensure engine is initialized, throw if not
   */
  private ensureInitialized(): void {
    if (!this.ctx) {
      throw new Error('AudioEngine not initialized');
    }
  }

  /**
   * Get pad data
   */
  getPad(padIndex: number): Pad | null {
    if (!this.isValidPadIndex(padIndex)) return null;
    return this.pads[padIndex];
  }

  /**
   * Get all pads
   */
  getAllPads(): Pad[] {
    return [...this.pads];
  }

  /**
   * Reset a pad to default trim and gain
   */
  resetPad(padIndex: number): void {
    if (!this.isValidPadIndex(padIndex)) return;

    const pad = this.pads[padIndex];
    if (pad.loaded && pad.buffer) {
      pad.trimStart = 0;
      pad.trimEnd = pad.buffer.duration;
      pad.gain = AUDIO_CONFIG.DEFAULT_GAIN;
    }
  }

  /**
   * Clear a specific pad
   */
  clearPad(padIndex: number): void {
    if (!this.isValidPadIndex(padIndex)) return;
    this.pads[padIndex] = this.createEmptyPad(padIndex);
  }

  /**
   * Clear all pads
   */
  clearAll(): void {
    this.pads.forEach((_, index) => this.clearPad(index));
  }

  // ==================== LOADING ====================

  /**
   * Load a sound into a specific pad
   */
  async loadSound(
    padIndex: number,
    audioData: ArrayBuffer,
    name: string | null = null,
    progressCallback: ProgressCallback | null = null,
  ): Promise<Pad> {
    this.ensureInitialized();

    if (!this.isValidPadIndex(padIndex)) {
      throw new Error(`Invalid pad index: ${padIndex}`);
    }

    try {
      const buffer = await this.ctx!.decodeAudioData(audioData);

      const pad = this.pads[padIndex];
      pad.buffer = buffer;
      pad.name = name || `Pad ${padIndex + 1}`;
      pad.loaded = true;
      pad.trimStart = 0;
      pad.trimEnd = buffer.duration;
      pad.gain = AUDIO_CONFIG.DEFAULT_GAIN;

      progressCallback?.(100);

      return pad;
    } catch (error) {
      console.error(`Error decoding audio for pad ${padIndex}:`, error);
      throw error;
    }
  }

  /**
   * Load a sound from URL
   */
  async loadSoundFromURL(
    padIndex: number,
    url: string,
    progressCallback: ProgressCallback | null = null,
    customName?: string,
  ): Promise<Pad> {
    this.ensureInitialized();

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch sound from ${url}: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await this.fetchWithProgress(response, progressCallback);
    const fileName = customName || this.extractFileNameFromUrl(url);

    return await this.loadSound(padIndex, arrayBuffer, fileName, progressCallback);
  }

  /**
   * Load an AudioBuffer directly into a pad
   */
  loadBuffer(padIndex: number, buffer: AudioBuffer, name: string): Pad {
    if (!this.isValidPadIndex(padIndex)) {
      throw new Error(`Invalid pad index: ${padIndex}`);
    }

    const pad = this.pads[padIndex];
    pad.buffer = buffer;
    pad.name = name;
    pad.loaded = true;
    pad.trimStart = 0;
    pad.trimEnd = buffer.duration;
    pad.gain = AUDIO_CONFIG.DEFAULT_GAIN;

    return pad;
  }

  /**
   * Fetch response body with progress tracking
   */
  private async fetchWithProgress(
    response: Response,
    progressCallback: ProgressCallback | null,
  ): Promise<ArrayBuffer> {
    const contentLength = response.headers.get('content-length');
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (progressCallback && contentLength) {
        const progress = (receivedLength / parseInt(contentLength, 10)) * 100;
        progressCallback(progress);
      }
    }

    // Combine chunks into single ArrayBuffer
    const combined = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      combined.set(chunk, position);
      position += chunk.length;
    }

    return combined.buffer;
  }

  /**
   * Extract filename from URL
   */
  private extractFileNameFromUrl(url: string): string {
    return (
      url
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') || 'sound'
    );
  }

  // ==================== PLAYBACK ====================

  /**
   * Play a pad
   */
  play(padIndex: number): void {
    if (!this.ctx || !this.masterGain) {
      console.warn('AudioEngine not initialized');
      return;
    }

    if (!this.isValidPadIndex(padIndex)) {
      console.warn(`Invalid pad index: ${padIndex}`);
      return;
    }

    const pad = this.pads[padIndex];

    if (!pad.loaded || !pad.buffer) {
      console.warn(`Pad ${padIndex} is not loaded`);
      return;
    }

    this.playBuffer(pad.buffer, pad.trimStart, pad.trimEnd, pad.gain);
  }

  /**
   * Play an audio buffer with optional trim and gain
   */
  private playBuffer(
    buffer: AudioBuffer,
    startTime: number,
    endTime: number,
    gain: number = AUDIO_CONFIG.DEFAULT_GAIN,
  ): void {
    if (!this.ctx || !this.masterGain) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = gain;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Clamp times to valid range
    const clampedStart = Math.max(0, Math.min(startTime, buffer.duration));
    const clampedEnd = Math.max(clampedStart, Math.min(endTime, buffer.duration));

    source.start(0, clampedStart, clampedEnd - clampedStart);
  }

  // ==================== TRIM & GAIN ====================

  /**
   * Set trim points for a pad
   */
  setTrimPoints(padIndex: number, startTime: number, endTime: number): void {
    if (!this.isValidPadIndex(padIndex)) return;

    const pad = this.pads[padIndex];
    if (!pad.loaded || !pad.buffer) return;

    pad.trimStart = Math.max(0, startTime);
    pad.trimEnd = Math.min(pad.buffer.duration, endTime);
  }

  /**
   * Set gain for a pad
   */
  setGain(padIndex: number, gain: number): void {
    if (!this.isValidPadIndex(padIndex)) return;
    const pad = this.pads[padIndex];
    pad.gain = Math.max(AUDIO_CONFIG.MIN_GAIN, Math.min(AUDIO_CONFIG.MAX_GAIN, gain));
  }

  // ==================== MICROPHONE RECORDING ====================

  /**
   * Start recording from microphone
   */
  async startRecording(): Promise<void> {
    this.ensureInitialized();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordedChunks = [];

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: AUDIO_CONFIG.RECORDING_MIME_TYPE,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(AUDIO_CONFIG.RECORDING_INTERVAL_MS);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return the audio buffer
   */
  async stopRecording(): Promise<AudioBuffer> {
    this.ensureInitialized();
    if (!this.mediaRecorder) throw new Error('No recording in progress');

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          // Stop all tracks
          this.mediaStream?.getTracks().forEach((track) => track.stop());

          // Create blob from chunks
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });

          // Convert to ArrayBuffer
          const arrayBuffer = await blob.arrayBuffer();

          // Decode to AudioBuffer
          const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);

          this.cleanupRecording();
          resolve(audioBuffer);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder!.stop();
    });
  }

  /**
   * Cancel ongoing recording
   */
  cancelRecording(): void {
    if (this.mediaRecorder?.state !== 'inactive') {
      this.mediaRecorder?.stop();
    }
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.cleanupRecording();
  }

  /**
   * Clean up recording resources
   */
  private cleanupRecording(): void {
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.recordedChunks = [];
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  // ==================== AUDIO ANALYSIS ====================

  /**
   * Detect silence segments in an audio buffer
   * Returns array of { start, end } in seconds for non-silent segments
   */
  detectSoundSegments(
    buffer: AudioBuffer,
    silenceThreshold: number = SILENCE_DETECTION_DEFAULTS.THRESHOLD,
    minSilenceDuration: number = SILENCE_DETECTION_DEFAULTS.MIN_SILENCE_DURATION,
    minSoundDuration: number = SILENCE_DETECTION_DEFAULTS.MIN_SOUND_DURATION,
  ): SoundSegment[] {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const segments: SoundSegment[] = [];

    const minSilenceSamples = minSilenceDuration * sampleRate;
    const minSoundSamples = minSoundDuration * sampleRate;

    let isInSound = false;
    let soundStart = 0;
    let silenceStart = 0;

    for (let i = 0; i < data.length; i++) {
      const amplitude = Math.abs(data[i]);

      if (amplitude > silenceThreshold) {
        if (!isInSound) {
          isInSound = true;
          soundStart = i;
        }
        silenceStart = i;
      } else if (isInSound && i - silenceStart >= minSilenceSamples) {
        const segmentLength = silenceStart - soundStart;
        if (segmentLength >= minSoundSamples) {
          segments.push({
            start: soundStart / sampleRate,
            end: silenceStart / sampleRate,
          });
        }
        isInSound = false;
      }
    }

    // Handle last segment
    if (isInSound) {
      const segmentLength = data.length - soundStart;
      if (segmentLength >= minSoundSamples) {
        segments.push({
          start: soundStart / sampleRate,
          end: data.length / sampleRate,
        });
      }
    }

    return segments;
  }

  /**
   * Split an audio buffer into segments
   */
  splitBuffer(buffer: AudioBuffer, segments: SoundSegment[]): AudioBuffer[] {
    this.ensureInitialized();

    return segments
      .map((segment) => this.extractBufferSegment(buffer, segment))
      .filter((buf): buf is AudioBuffer => buf !== null);
  }

  /**
   * Extract a segment from a buffer
   */
  private extractBufferSegment(buffer: AudioBuffer, segment: SoundSegment): AudioBuffer | null {
    const startSample = Math.floor(segment.start * buffer.sampleRate);
    const endSample = Math.floor(segment.end * buffer.sampleRate);
    const length = endSample - startSample;

    if (length <= 0) return null;

    const newBuffer = this.ctx!.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const destData = newBuffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        destData[i] = sourceData[startSample + i];
      }
    }

    return newBuffer;
  }
}
