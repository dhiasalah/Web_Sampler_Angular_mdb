import {
  Component,
  inject,
  input,
  signal,
  effect,
  output,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioEngine } from '../../services/audio-engine';
import { PresetService } from '../../services/preset';
import { WaveformDrawer } from '../../utils/waveform-drawer';
import { environment } from '../../config/environment';
import type {
  Pad,
  Preset,
  Sample,
  SampleToSave,
  PadLoadingState,
  SoundSegment,
} from '../../models';
import { KEYBOARD_MAP, PRESET_CATEGORIES } from '../../models';

/**
 * Grid configuration constants
 */
const GRID_CONFIG = {
  TOTAL_PADS: 16,
  GRID_SIZE: 4,
  ANIMATION_DURATION_MS: 150,
  RECORDING_TIMER_INTERVAL_MS: 100,
} as const;

/**
 * PadsGrid - Visual grid of sampler pads
 * Layout: 4x4 grid with pad 0 (kick) at bottom left
 * Supports keyboard controls like a piano
 */
@Component({
  selector: 'app-pads-grid',
  imports: [CommonModule, FormsModule],
  templateUrl: './pads-grid.html',
  styleUrl: './pads-grid.css',
})
export class PadsGrid {
  private readonly audioEngine = inject(AudioEngine);
  private readonly presetService = inject(PresetService);
  private readonly waveformDrawer = inject(WaveformDrawer);

  // Canvas reference for waveform display
  @ViewChild('waveformCanvas') waveformCanvas!: ElementRef<HTMLCanvasElement>;

  // Input: preset to load
  preset = input<Preset | null>(null);

  // Output: when all samples are loaded
  loadingComplete = output<void>();

  // Pad state
  pads = signal<Pad[]>([]);
  loadingStates = signal<PadLoadingState[]>([]);
  isLoadingPreset = signal(false);
  overallProgress = signal(0);
  activePad = signal<number | null>(null);
  pressedKeys = signal<Set<string>>(new Set());

  // Selected pad state
  selectedPadIndex = signal<number | null>(null);
  selectedPadName = signal<string>('');

  // Trim controls state
  trimStart = signal(0); // 0-1 normalized
  trimEnd = signal(1); // 0-1 normalized
  isDragging = signal<'start' | 'end' | null>(null);
  audioDuration = signal(0);

  // Recording state
  isRecording = signal(false);
  recordingTime = signal(0);
  recordedBuffer = signal<AudioBuffer | null>(null);
  showRecordingPanel = signal(false);
  targetPadForRecording = signal<number | null>(null);
  autoSplitEnabled = signal(true);
  silenceThreshold = signal(0.02);
  detectedSegments = signal<SoundSegment[]>([]);
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  activeRecordedPad = signal(false);
  recordedPadTrimStart = signal(0);
  recordedPadTrimEnd = signal(1);

  // Current preset tracking
  currentPresetName = signal<string | null>(null);

  // Save preset state
  showSavePanel = signal(false);
  savePresetName = signal('');
  savePresetCategory = signal('Drumkit');
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  // Import audio dialog state
  showImportDialog = signal(false);
  importFileName = signal('');
  pendingImportFile = signal<File | null>(null);
  targetPadIndex = signal<number | null>(null);
  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  uploadSuccess = signal(false);

  // Available categories for presets (from shared models)
  readonly categories = PRESET_CATEGORIES;

  // Base URL for audio files
  private readonly baseUrl = `${environment.BACKEND_URL}/presets`;

  constructor() {
    this.initializeLoadingStates();

    // Watch for preset changes and load automatically
    effect(() => {
      const currentPreset = this.preset();
      if (currentPreset) {
        this.currentPresetName.set(currentPreset.name);
        this.loadPreset(currentPreset);
      }
    });
  }

  /**
   * Handle keyboard key down
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    // Ignore keyboard events when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      return;
    }

    const key = event.key.toLowerCase();

    // Handle spacebar for recorded sound
    if (key === ' ') {
      if (this.recordedBuffer()) {
        event.preventDefault();
        this.playRecordedSound();
      }
      return;
    }

    // Prevent default for keys we're using
    if (key in KEYBOARD_MAP) {
      event.preventDefault();

      // Prevent repeated keydown events when holding key
      if (this.pressedKeys().has(key)) return;

      this.pressedKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.add(key);
        return newKeys;
      });

      const padIndex = KEYBOARD_MAP[key];
      this.playPad(padIndex);
    }
  }

  /**
   * Handle keyboard key up
   */
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key in KEYBOARD_MAP) {
      this.pressedKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.delete(key);
        return newKeys;
      });
    }
  }

  /**
   * Initialize loading states for all pads
   */
  private initializeLoadingStates(): void {
    const states = Array.from({ length: GRID_CONFIG.TOTAL_PADS }, () => ({
      isLoading: false,
      progress: 0,
      error: null,
    }));
    this.loadingStates.set(states);
  }

  /**
   * Load all samples from a preset into the pads
   */
  async loadPreset(preset: Preset): Promise<void> {
    this.isLoadingPreset.set(true);
    this.overallProgress.set(0);
    this.initializeLoadingStates();

    try {
      if (!this.audioEngine.isInitialized()) {
        await this.audioEngine.initialize();
      }

      this.audioEngine.clearAll();

      const samples = preset.samples;
      const totalSamples = Math.min(samples.length, GRID_CONFIG.TOTAL_PADS);
      let loadedCount = 0;

      for (let i = 0; i < totalSamples; i++) {
        const sample = samples[i];
        const url = this.buildSampleUrl(sample.url);

        this.updateLoadingState(i, { isLoading: true, progress: 0, error: null });

        try {
          await this.audioEngine.loadSoundFromURL(
            i,
            url,
            (progress) => {
              this.updateLoadingState(i, { isLoading: true, progress, error: null });

              const overall = ((loadedCount + progress / 100) / totalSamples) * 100;
              this.overallProgress.set(Math.round(overall));
            },
            sample.name,
          );

          // Mark as loaded
          this.updateLoadingState(i, { isLoading: false, progress: 100, error: null });
          loadedCount++;
        } catch (error) {
          console.error(`Failed to load sample ${sample.name}:`, error);
          this.updateLoadingState(i, {
            isLoading: false,
            progress: 0,
            error: `Failed to load: ${sample.name}`,
          });
        }
      }

      // Update pads signal
      this.pads.set(this.audioEngine.getAllPads());
      this.overallProgress.set(100);
      this.loadingComplete.emit();
    } catch (error) {
      console.error('Error loading preset:', error);
    } finally {
      this.isLoadingPreset.set(false);
    }
  }

  /**
   * Build full URL for sample
   */
  private buildSampleUrl(sampleUrl: string): string {
    // If it's already a full URL (http/https), return as-is
    if (sampleUrl.startsWith('http://') || sampleUrl.startsWith('https://')) {
      return sampleUrl;
    }

    // If it starts with /api/, it's a MongoDB stream URL - prepend backend URL
    if (sampleUrl.startsWith('/api/')) {
      return `${environment.BACKEND_URL}${sampleUrl}`;
    }

    // If it starts with /presets/, it's a static file URL - prepend backend URL only
    if (sampleUrl.startsWith('/presets/')) {
      return `${environment.BACKEND_URL}${sampleUrl}`;
    }

    // Remove leading ./ if present
    const cleanUrl = sampleUrl.replace(/^\.\//, '');

    // For relative paths without /presets/, add the base URL
    return `${this.baseUrl}/${cleanUrl}`;
  }

  /**
   * Update loading state for a specific pad
   */
  private updateLoadingState(index: number, state: PadLoadingState): void {
    this.loadingStates.update((states) => {
      const newStates = [...states];
      newStates[index] = state;
      return newStates;
    });
  }

  /**
   * Play a pad
   */
  playPad(index: number): void {
    if (!this.audioEngine.isInitialized()) return;

    const pad = this.audioEngine.getPad(index);
    if (pad?.loaded) {
      this.audioEngine.play(index);
      this.triggerPadAnimation(index);
      this.displayWaveform(index);
    }
  }

  /**
   * Handle pad click - play if loaded, import file if empty
   */
  onPadClick(
    event: Event,
    padIndex: number,
    pad: Pad | null | undefined,
    fileInput: HTMLInputElement,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    if (!pad?.loaded) {
      // Empty pad - trigger file selection
      fileInput.click();
    } else {
      // Loaded pad - play sound
      this.playPad(padIndex);
    }
  }

  /**
   * Handle file selection for a specific pad
   */
  async onPadFileSelected(event: Event, padIndex: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Get clean name from filename (remove extension) as default
    const defaultName = file.name.replace(/\.[^/.]+$/, '');

    // Show import dialog for naming
    this.pendingImportFile.set(file);
    this.targetPadIndex.set(padIndex);
    this.importFileName.set(defaultName);
    this.uploadError.set(null);
    this.uploadSuccess.set(false);
    this.showImportDialog.set(true);

    // Reset input
    input.value = '';
  }

  /**
   * Cancel import dialog
   */
  cancelImport(): void {
    this.showImportDialog.set(false);
    this.pendingImportFile.set(null);
    this.targetPadIndex.set(null);
    this.importFileName.set('');
    this.uploadError.set(null);
    this.uploadSuccess.set(false);
  }

  /**
   * Confirm import and upload to Google Drive
   */
  async confirmImport(): Promise<void> {
    const file = this.pendingImportFile();
    const padIndex = this.targetPadIndex();
    const customName = this.importFileName().trim();

    if (!file || padIndex === null || !customName) {
      this.uploadError.set('Please enter a name for the audio file');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);

    try {
      // First, upload to MongoDB storage

      const uploadResponse = await this.presetService
        .uploadAudioToDrive(file, customName)
        .toPromise();

      if (!uploadResponse?.success) {
        throw new Error('Upload failed');
      }

      // Build full URL (response contains relative path like /api/audio/stream/id)
      const fullUrl = uploadResponse.file.url.startsWith('http')
        ? uploadResponse.file.url
        : `${environment.BACKEND_URL}${uploadResponse.file.url}`;


      // Now load the audio into the pad locally
      await this.loadAudioBufferToPad(file, padIndex, customName);

      // Update or create the current preset with the new sample
      const presetName = this.currentPresetName();
      if (presetName) {
        try {
          // Get current preset and add the new sample
          const preset = await this.presetService.getPreset(presetName).toPromise();
          if (preset) {
            const newSample = {
              url: fullUrl,
              name: customName,
            };
            const updatedSamples = [...preset.samples, newSample];
            await this.presetService
              .updatePreset(presetName, { samples: updatedSamples })
              .toPromise();
          }
        } catch (error) {
          console.error('Error updating preset:', error);
          // Continue anyway - file is uploaded and loaded locally
        }
      }

      this.uploadSuccess.set(true);

      // Close dialog after a short delay
      setTimeout(() => {
        this.cancelImport();
      }, 1000);
    } catch (error: any) {
      console.error('Upload failed:', error);
      this.uploadError.set(
        error?.error?.error || error?.message || 'Failed to upload. Please try again.',
      );
    } finally {
      this.isUploading.set(false);
    }
  }

  /**
   * Load audio buffer into a pad (without uploading)
   */
  private async loadAudioBufferToPad(file: File, padIndex: number, name: string): Promise<void> {
    // Ensure AudioEngine is initialized
    if (!this.audioEngine.isInitialized()) {
      await this.audioEngine.initialize();
    }

    // Update loading state
    this.updateLoadingState(padIndex, {
      isLoading: true,
      progress: 0,
      error: null,
    });

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Update progress
    this.updateLoadingState(padIndex, {
      isLoading: true,
      progress: 50,
      error: null,
    });

    // Decode audio
    const ctx = this.audioEngine.getAudioContext();
    if (!ctx) throw new Error('No audio context');
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Load into pad
    this.audioEngine.loadBuffer(padIndex, audioBuffer, name);

    // Update loading state
    this.updateLoadingState(padIndex, {
      isLoading: false,
      progress: 100,
      error: null,
    });

    // Update pads signal
    this.updatePadsFromEngine();

  }

  /**
   * Display waveform for a pad in the canvas
   */
  private displayWaveform(padIndex: number): void {
    const pad = this.audioEngine.getPad(padIndex);
    if (!pad?.buffer) return;

    // Set signals first to show the canvas container
    this.selectedPadIndex.set(padIndex);
    this.selectedPadName.set(pad.name);
    this.audioDuration.set(pad.buffer.duration);

    // Load current trim values from pad (normalized 0-1)
    const duration = pad.buffer.duration;
    this.trimStart.set(pad.trimStart / duration);
    this.trimEnd.set(pad.trimEnd / duration);

    // Wait for next tick so the canvas is rendered in the DOM
    setTimeout(() => {
      this.drawWaveformWithTrim();
    }, 0);
  }

  /**
   * Draw the waveform on the canvas with trim indicators
   */
  private drawWaveformWithTrim(): void {
    const padIndex = this.selectedPadIndex();
    if (padIndex === null || !this.waveformCanvas) return;

    const pad = this.audioEngine.getPad(padIndex);
    if (!pad?.buffer) return;

    this.waveformDrawer.drawWaveform(
      this.waveformCanvas,
      pad.buffer,
      this.trimStart(),
      this.trimEnd(),
    );
  }

  /**
   * Handle mouse down on canvas for trim dragging
   */
  onCanvasMouseDown(event: MouseEvent): void {
    if (!this.waveformCanvas) return;

    const normalizedX = this.waveformDrawer.getNormalizedPosition(event, this.waveformCanvas);
    const target = this.waveformDrawer.getTrimBarTarget(
      normalizedX,
      this.trimStart(),
      this.trimEnd(),
    );

    if (target) {
      this.isDragging.set(target);
    }
  }

  /**
   * Handle mouse move on canvas for trim dragging
   */
  onCanvasMouseMove(event: MouseEvent): void {
    const dragging = this.isDragging();
    if (!dragging || !this.waveformCanvas) return;

    const normalizedX = this.waveformDrawer.getNormalizedPosition(event, this.waveformCanvas);
    const newPosition = this.waveformDrawer.calculateTrimPosition(
      normalizedX,
      this.trimStart(),
      this.trimEnd(),
      dragging,
    );

    if (dragging === 'start') {
      this.trimStart.set(newPosition);
    } else {
      this.trimEnd.set(newPosition);
    }

    // Update display
    if (this.selectedPadIndex() === -1) {
      this.updateRecordedTrimValues();
      const buffer = this.recordedBuffer();
      if (buffer) this.drawRecordedWaveform(buffer);
    } else {
      this.updateTrimValues();
      this.drawWaveformWithTrim();
    }
  }

  /**
   * Handle mouse up to stop dragging
   */
  onCanvasMouseUp(): void {
    this.isDragging.set(null);
  }

  /**
   * Handle mouse leave to stop dragging
   */
  onCanvasMouseLeave(): void {
    this.isDragging.set(null);
  }

  /**
   * Update trim values in the audio engine
   */
  private updateTrimValues(): void {
    const padIndex = this.selectedPadIndex();
    if (padIndex === null) return;

    const duration = this.audioDuration();
    const startTime = this.trimStart() * duration;
    const endTime = this.trimEnd() * duration;

    this.audioEngine.setTrimPoints(padIndex, startTime, endTime);
  }

  /**
   * Get formatted time from normalized value
   */
  getFormattedTime(normalized: number): string {
    const seconds = normalized * this.audioDuration();
    return seconds.toFixed(2) + 's';
  }

  /**
   * Reset trim to full sample
   */
  resetTrim(): void {
    this.trimStart.set(0);
    this.trimEnd.set(1);

    if (this.selectedPadIndex() === -1) {
      // Recorded sound
      this.updateRecordedTrimValues();
      const buffer = this.recordedBuffer();
      if (buffer) this.drawRecordedWaveform(buffer);
    } else {
      // Regular pad
      this.updateTrimValues();
      this.drawWaveformWithTrim();
    }
  }

  /**
   * Preview the trimmed sound
   */
  previewTrimmedSound(): void {
    const padIndex = this.selectedPadIndex();

    if (padIndex === -1) {
      // Preview recorded sound
      this.playRecordedSound();
    } else if (padIndex !== null) {
      // Preview regular pad
      this.audioEngine.play(padIndex);
    }
  }

  /**
   * Trigger visual animation on pad
   */
  private triggerPadAnimation(index: number): void {
    this.activePad.set(index);
    setTimeout(() => {
      if (this.activePad() === index) {
        this.activePad.set(null);
      }
    }, GRID_CONFIG.ANIMATION_DURATION_MS);
  }

  /**
   * Get pad display index for grid layout
   * Reorders so pad 0 is at bottom-left
   * Grid layout (visual):
   *   12 13 14 15  (row 0, top)
   *    8  9 10 11  (row 1)
   *    4  5  6  7  (row 2)
   *    0  1  2  3  (row 3, bottom)
   */
  getPadIndexForPosition(position: number): number {
    const row = Math.floor(position / GRID_CONFIG.GRID_SIZE);
    const col = position % GRID_CONFIG.GRID_SIZE;
    const invertedRow = GRID_CONFIG.GRID_SIZE - 1 - row;
    return invertedRow * GRID_CONFIG.GRID_SIZE + col;
  }

  /**
   * Get position in grid for a given pad index
   */
  getPositionForPadIndex(padIndex: number): number {
    const row = Math.floor(padIndex / GRID_CONFIG.GRID_SIZE);
    const col = padIndex % GRID_CONFIG.GRID_SIZE;
    const invertedRow = GRID_CONFIG.GRID_SIZE - 1 - row;
    return invertedRow * GRID_CONFIG.GRID_SIZE + col;
  }

  /**
   * Get array of grid positions (0-15)
   */
  getGridPositions(): number[] {
    return Array.from({ length: GRID_CONFIG.TOTAL_PADS }, (_, i) => i);
  }

  /**
   * Get pad info for a grid position
   */
  getPadForPosition(position: number): Pad | null {
    const padIndex = this.getPadIndexForPosition(position);
    return this.pads()[padIndex] ?? null;
  }

  /**
   * Get loading state for a grid position
   */
  getLoadingStateForPosition(position: number): PadLoadingState {
    const padIndex = this.getPadIndexForPosition(position);
    return this.loadingStates()[padIndex] ?? { isLoading: false, progress: 0, error: null };
  }

  /**
   * Check if pad at position is active (playing)
   */
  isPadActive(position: number): boolean {
    const padIndex = this.getPadIndexForPosition(position);
    return this.activePad() === padIndex;
  }

  /**
   * Get keyboard key for a pad index
   */
  getKeyForPad(padIndex: number): string | null {
    for (const [key, index] of Object.entries(KEYBOARD_MAP)) {
      if (index === padIndex) {
        return key.toUpperCase();
      }
    }
    return null;
  }

  /**
   * Get keyboard key for a grid position
   */
  getKeyForPosition(position: number): string | null {
    const padIndex = this.getPadIndexForPosition(position);
    return this.getKeyForPad(padIndex);
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return this.pressedKeys().has(key.toLowerCase());
  }

  /**
   * Check if the key for this position is pressed
   */
  isPositionKeyPressed(position: number): boolean {
    const key = this.getKeyForPosition(position);
    return key ? this.isKeyPressed(key) : false;
  }

  // ==================== MICROPHONE RECORDING ====================

  /**
   * Toggle recording panel visibility
   */
  toggleRecordingPanel(): void {
    this.showRecordingPanel.update((v) => !v);
    if (!this.showRecordingPanel()) {
      this.resetRecordingState();
    }
  }

  /**
   * Start recording from microphone
   */
  async startRecording(): Promise<void> {
    try {
      if (!this.audioEngine.isInitialized()) {
        await this.audioEngine.initialize();
      }

      await this.audioEngine.startRecording();
      this.isRecording.set(true);
      this.recordingTime.set(0);
      this.recordedBuffer.set(null);
      this.detectedSegments.set([]);

      // Start timer
      this.recordingTimer = setInterval(() => {
        this.recordingTime.update((t) => t + 0.1);
      }, GRID_CONFIG.RECORDING_TIMER_INTERVAL_MS);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    try {
      // Stop timer
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }

      const buffer = await this.audioEngine.stopRecording();
      this.isRecording.set(false);
      this.recordedBuffer.set(buffer);

      // Auto-detect segments if enabled
      if (this.autoSplitEnabled()) {
        this.analyzeRecording();
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording.set(false);
    }
  }

  /**
   * Analyze recording for silence detection
   */
  analyzeRecording(): void {
    const buffer = this.recordedBuffer();
    if (!buffer) return;

    const segments = this.audioEngine.detectSoundSegments(
      buffer,
      this.silenceThreshold(),
      0.1, // min silence duration
      0.05, // min sound duration
    );

    this.detectedSegments.set(segments);
  }

  /**
   * Assign recorded sound to a single pad
   */
  assignToSinglePad(padIndex: number): void {
    const buffer = this.recordedBuffer();
    if (!buffer) return;

    const name = `Rec ${new Date().toLocaleTimeString()}`;
    this.audioEngine.loadBuffer(padIndex, buffer, name);
    this.pads.set(this.audioEngine.getAllPads());
    this.displayWaveform(padIndex);
    this.showRecordingPanel.set(false);
    this.resetRecordingState();
  }

  /**
   * Split recording and assign to multiple pads
   */
  splitAndAssignToPads(): void {
    const buffer = this.recordedBuffer();
    const segments = this.detectedSegments();

    if (!buffer || segments.length === 0) {
      alert('No segments detected. Try adjusting the silence threshold or record again.');
      return;
    }

    // Split the buffer
    const splitBuffers = this.audioEngine.splitBuffer(buffer, segments);

    // Assign to pads starting from pad 0
    const maxPads = Math.min(splitBuffers.length, 16);
    for (let i = 0; i < maxPads; i++) {
      const name = `Rec ${i + 1}`;
      this.audioEngine.loadBuffer(i, splitBuffers[i], name);
    }

    this.pads.set(this.audioEngine.getAllPads());

    // Select first pad to show waveform
    if (maxPads > 0) {
      this.displayWaveform(0);
    }

    this.showRecordingPanel.set(false);
    this.resetRecordingState();
  }

  /**
   * Preview recorded sound
   */
  previewRecording(): void {
    const buffer = this.recordedBuffer();
    if (!buffer || !this.audioEngine.isInitialized()) return;

    // Create a temporary source to play the buffer
    const ctx = this.audioEngine.getAudioContext();
    if (!ctx) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }

  /**
   * Reset recording state
   */
  private resetRecordingState(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.isRecording.set(false);
    this.recordingTime.set(0);
    this.recordedBuffer.set(null);
    this.detectedSegments.set([]);
    this.targetPadForRecording.set(null);
  }

  /**
   * Get formatted recording time
   */
  getFormattedRecordingTime(): string {
    const time = this.recordingTime();
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms}`;
  }

  /**
   * Update silence threshold
   */
  updateSilenceThreshold(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.silenceThreshold.set(value);
    this.analyzeRecording();
  }

  /**
   * Get first empty pad index
   */
  getFirstEmptyPadIndex(): number {
    const allPads = this.pads();
    for (let i = 0; i < allPads.length; i++) {
      if (!allPads[i]?.loaded) {
        return i;
      }
    }
    return 0; // Default to first pad if all are full
  }

  /**
   * Get number of segments (max 16)
   */
  getSegmentsCount(): number {
    return Math.min(this.detectedSegments().length, 16);
  }

  // ==================== RECORDED PAD METHODS ====================

  /**
   * Play recorded sound
   */
  playRecordedSound(): void {
    const buffer = this.recordedBuffer();
    if (!buffer || !this.audioEngine.isInitialized()) return;

    const ctx = this.audioEngine.getAudioContext();
    if (!ctx) return;

    const duration = buffer.duration;
    const startTime = this.recordedPadTrimStart() * duration;
    const endTime = this.recordedPadTrimEnd() * duration;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0, startTime, endTime - startTime);

    this.activeRecordedPad.set(true);
    setTimeout(() => {
      this.activeRecordedPad.set(false);
    }, 150);
  }

  /**
   * Check if recorded pad is active
   */
  isRecordedPadActive(): boolean {
    return this.activeRecordedPad();
  }

  /**
   * Display recorded waveform in canvas for trimming
   */
  displayRecordedWaveform(): void {
    const buffer = this.recordedBuffer();
    if (!buffer) return;

    // Set signals for waveform display
    this.selectedPadIndex.set(-1); // Special index for recorded sound
    this.selectedPadName.set(`Recorded Sound (${this.recordingTime().toFixed(1)}s)`);
    this.audioDuration.set(buffer.duration);

    // Load current trim values
    this.trimStart.set(this.recordedPadTrimStart());
    this.trimEnd.set(this.recordedPadTrimEnd());

    // Wait for next tick so the canvas is rendered in the DOM
    setTimeout(() => {
      this.drawRecordedWaveform(buffer);
    }, 0);
  }

  /**
   * Draw recorded waveform on canvas (uses red color scheme)
   */
  private drawRecordedWaveform(buffer: AudioBuffer): void {
    if (!this.waveformCanvas) return;

    this.waveformDrawer.drawRecordedWaveform(
      this.waveformCanvas,
      buffer,
      this.trimStart(),
      this.trimEnd(),
    );
  }

  /**
   * Update trim values for recorded sound
   */
  private updateRecordedTrimValues(): void {
    this.recordedPadTrimStart.set(this.trimStart());
    this.recordedPadTrimEnd.set(this.trimEnd());
  }

  /**
   * Delete recorded sound
   */
  deleteRecording(): void {
    this.recordedBuffer.set(null);
    this.recordingTime.set(0);
    this.recordedPadTrimStart.set(0);
    this.recordedPadTrimEnd.set(1);
    this.detectedSegments.set([]);

    // Clear waveform if showing recorded sound
    if (this.selectedPadIndex() === -1) {
      this.selectedPadIndex.set(null);
      this.selectedPadName.set('');
    }
  }

  // ===== SAVE PRESET METHODS =====

  /**
   * Toggle save preset panel visibility
   */
  toggleSavePanel(): void {
    this.showSavePanel.update((v) => !v);
    this.saveError.set(null);
    this.saveSuccess.set(false);
  }

  /**
   * Get count of loaded samples that can be saved
   */
  getLoadedSamplesCount(): number {
    const pads = this.pads();
    let count = pads.filter((p) => p.loaded && p.buffer).length;
    // Add recorded sound if exists
    if (this.recordedBuffer()) {
      count++;
    }
    return count;
  }

  /**
   * Save current preset to server
   */
  savePreset(): void {
    const name = this.savePresetName().trim();
    const category = this.savePresetCategory();

    // Validation
    if (!name) {
      this.saveError.set('Please enter a preset name');
      return;
    }

    if (name.length < 2) {
      this.saveError.set('Preset name must be at least 2 characters');
      return;
    }

    // Collect samples to save
    const samplesToSave: SampleToSave[] = [];
    const pads = this.pads();

    // Add loaded pads
    for (const pad of pads) {
      if (pad.loaded && pad.buffer) {
        samplesToSave.push({
          name: pad.name,
          audioBuffer: pad.buffer,
        });
      }
    }

    // Add recorded sound if exists
    const recordedBuf = this.recordedBuffer();
    if (recordedBuf) {
      samplesToSave.push({
        name: 'Recorded',
        audioBuffer: recordedBuf,
      });
    }

    if (samplesToSave.length === 0) {
      this.saveError.set('No samples to save. Load some sounds first.');
      return;
    }

    // Start saving
    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.presetService.savePresetWithAudio(name, category, samplesToSave).subscribe({
      next: (preset) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.savePresetName.set('');

        // Hide success message after 3 seconds
        setTimeout(() => {
          this.saveSuccess.set(false);
        }, 3000);
      },
      error: (err) => {
        console.error('Error saving preset:', err);
        this.isSaving.set(false);
        this.saveError.set(
          err.error?.error || err.error?.errors?.[0] || 'Failed to save preset. Please try again.',
        );
      },
    });
  }

  // ===== IMPORT AUDIO FILES METHODS =====

  /**
   * Handle file selection from file input
   */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0]; // Get the first file

    // Find the first available pad
    const pads = this.pads();
    let targetPadIndex = null;
    for (let i = 0; i < 16; i++) {
      if (!pads[i]?.loaded) {
        targetPadIndex = i;
        break;
      }
    }

    if (targetPadIndex === null) {
      console.warn('No available pads for import');
      input.value = '';
      return;
    }

    // Open the import dialog with the file
    this.pendingImportFile.set(file);
    this.targetPadIndex.set(targetPadIndex);
    this.importFileName.set(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
    this.showImportDialog.set(true);

    // Reset the input so the same file can be selected again
    input.value = '';
  }

  /**
   * Import audio files into available pads
   */
  private async importAudioFiles(files: File[]): Promise<void> {
    // Ensure AudioEngine is initialized
    if (!this.audioEngine.isInitialized()) {
      await this.audioEngine.initialize();
    }

    // Find available pads (not loaded)
    const pads = this.pads();
    const availablePadIndices: number[] = [];

    for (let i = 0; i < 16; i++) {
      if (!pads[i]?.loaded) {
        availablePadIndices.push(i);
      }
    }

    if (availablePadIndices.length === 0) {
      console.warn('No available pads for import');
      return;
    }

    // Limit files to available pads
    const filesToLoad = files.slice(0, availablePadIndices.length);

    // Check if we have a current preset to update
    const presetName = this.currentPresetName();
    let uploadedToServer = false;

    // Load each file into a pad
    for (let i = 0; i < filesToLoad.length; i++) {
      const file = filesToLoad[i];
      const padIndex = availablePadIndices[i];

      // Update loading state
      this.updateLoadingState(padIndex, {
        isLoading: true,
        progress: 0,
        error: null,
      });

      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Update progress
        this.updateLoadingState(padIndex, {
          isLoading: true,
          progress: 50,
          error: null,
        });

        // Decode audio
        const ctx = this.audioEngine.getAudioContext();
        if (!ctx) throw new Error('No audio context');
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        // Get clean name from filename (remove extension)
        const name = file.name.replace(/\.[^/.]+$/, '');

        // Load into pad
        this.audioEngine.loadBuffer(padIndex, audioBuffer, name);

        // Update loading state
        this.updateLoadingState(padIndex, {
          isLoading: false,
          progress: 100,
          error: null,
        });

        // Update pads signal
        this.updatePadsFromEngine();

      } catch (error) {
        console.error(`Error importing ${file.name}:`, error);
        this.updateLoadingState(padIndex, {
          isLoading: false,
          progress: 0,
          error: `Failed to load ${file.name}`,
        });
      }
    }

    // Upload files to MongoDB storage and update preset
    if (presetName && filesToLoad.length > 0) {
      try {

        // Get current preset
        const currentPreset = await this.presetService.getPreset(presetName).toPromise();
        if (!currentPreset) {
          console.error('Preset not found');
          return;
        }

        // Start with existing samples or create array of 16 empty slots
        const updatedSamples = [...currentPreset.samples];
        while (updatedSamples.length < 16) {
          updatedSamples.push(null as any); // Fill empty slots
        }

        // Upload each file and insert it at the correct pad position
        for (let i = 0; i < filesToLoad.length; i++) {
          const file = filesToLoad[i];
          const padIndex = availablePadIndices[i];
          const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension


          const uploadResponse = await this.presetService
            .uploadAudioToDrive(file, name)
            .toPromise();

          if (uploadResponse?.success) {
            // Build full URL
            const fullUrl = uploadResponse.file.url.startsWith('http')
              ? uploadResponse.file.url
              : `${environment.BACKEND_URL}${uploadResponse.file.url}`;

            // Insert at the pad position where it was loaded
            updatedSamples[padIndex] = { url: fullUrl, name };
          }
        }

        // Remove null entries (keep only loaded samples)
        const finalSamples = updatedSamples.filter((s) => s !== null);

        // Update the preset with the new samples
        await this.presetService.updatePreset(presetName, { samples: finalSamples }).toPromise();
        uploadedToServer = true;
      } catch (error) {
        console.error('Error uploading files to MongoDB:', error);
        // Continue anyway - files are loaded locally
      }
    }
  }

  /**
   * Update pads signal from engine
   */
  private updatePadsFromEngine(): void {
    const pads: Pad[] = [];
    for (let i = 0; i < 16; i++) {
      const pad = this.audioEngine.getPad(i);
      if (pad) {
        pads.push(pad);
      }
    }
    this.pads.set(pads);
  }

  /**
   * Update preset with newly uploaded samples
   */
  private async updatePresetWithNewSamples(
    presetName: string,
    uploadedFiles: Array<{ url: string; originalName: string }>,
  ): Promise<void> {
    try {
      // Get current preset data
      const currentPreset = await this.presetService.getPreset(presetName).toPromise();

      if (!currentPreset) {
        throw new Error('Preset not found');
      }

      // Add new samples to existing samples
      const newSamples: Sample[] = uploadedFiles.map((file) => ({
        url: file.url,
        name: file.originalName.replace(/\.[^/.]+$/, ''), // Remove extension
      }));

      // Merge with existing samples
      const updatedSamples = [...currentPreset.samples, ...newSamples];

      // Update preset via PATCH endpoint
      await this.presetService
        .updatePreset(presetName, {
          samples: updatedSamples,
        })
        .toPromise();

    } catch (error) {
      console.error('Error updating preset:', error);
      throw error;
    }
  }

  /**
   * Clear all pads (reset)
   */
  clearAllPads(): void {
    for (let i = 0; i < 16; i++) {
      this.audioEngine.clearPad(i);
      this.updateLoadingState(i, {
        isLoading: false,
        progress: 0,
        error: null,
      });
    }
    this.updatePadsFromEngine();
    this.selectedPadIndex.set(null);
    this.selectedPadName.set('');
  }
}
