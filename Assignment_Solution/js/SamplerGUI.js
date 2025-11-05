import WaveformDrawer from "./WaveformDrawer.js";
import TrimbarsDrawer from "./TrimbarsDrawer.js";
import { pixelToSeconds, secondsToPixel } from "./utils.js";

/**
 * SamplerGUI - Visual interface for the SamplerEngine
 * Handles all UI interactions and visualization
 */
export default class SamplerGUI {
  constructor(samplerEngine) {
    this.engine = samplerEngine;
    this.selectedPadIndex = -1;

    // DOM elements
    this.padsGrid = document.querySelector("#padsGrid");
    this.waveformSection = document.querySelector("#waveformSection");
    this.waveformCanvas = document.querySelector("#waveformCanvas");
    this.overlayCanvas = document.querySelector("#overlayCanvas");
    this.currentPadName = document.querySelector("#currentPadName");

    // Waveform and trim bars
    this.waveformDrawer = new WaveformDrawer();
    this.trimbarsDrawer = new TrimbarsDrawer(this.overlayCanvas, 100, 800);

    this.mousePos = { x: 0, y: 0 };

    // Pad button elements
    this.padButtons = [];

    this.initialize();
  }

  /**
   * Initialize the GUI
   */
  initialize() {
    this.createPadButtons();
    this.setupWaveformControls();
    this.setupCanvasInteraction();
    this.setupKeyboardControls();
    this.startAnimationLoop();
  }

  /**
   * Setup keyboard controls - map keyboard keys to pads
   * All 26 Letters (A-Z) mapped to 16 pads:
   * A-P: Main mapping
   * Q-Z: Additional mapping (cycles through pads)
   */
  setupKeyboardControls() {
    // Map keyboard keys to pad indices (A-Z alphabet)
    const keyToPadMap = {
      // First 16 letters: A-P (direct mapping to pads 0-15)
      a: 0,
      b: 1,
      c: 2,
      d: 3,
      e: 4,
      f: 5,
      g: 6,
      h: 7,
      i: 8,
      j: 9,
      k: 10,
      l: 11,
      m: 12,
      n: 13,
      o: 14,
      p: 15,
      // Additional letters Q-Z (cycles back to pads 0-10)
      q: 0,
      r: 1,
      s: 2,
      t: 3,
      u: 4,
      v: 5,
      w: 6,
      x: 7,
      y: 8,
      z: 9,
    };

    // Track which keys are pressed
    const keysPressed = {};

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();

      if (key in keyToPadMap && !keysPressed[key]) {
        keysPressed[key] = true;
        event.preventDefault();

        const padIndex = keyToPadMap[key];
        const pad = this.engine.getPad(padIndex);

        if (pad && pad.loaded) {
          // Visual feedback
          const button = this.padButtons[padIndex];
          button.classList.add("playing");

          // Play the sound
          this.engine.play(padIndex);

          // Remove visual feedback after a short delay
          setTimeout(() => {
            button.classList.remove("playing");
          }, 150);
        }
      }
    });

    document.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (key in keyToPadMap) {
        keysPressed[key] = false;
        event.preventDefault();
      }
    });

    console.log("Keyboard controls enabled (A-Z Alphabet)!");
    console.log(
      "Use A-P to play pads 1-16, Q-Z to play pads 1-10 (26 letter keys available!)"
    );
  }

  /**
   * Create pad buttons in a 4x4 grid
   */
  createPadButtons() {
    // Create pads from bottom to top, left to right
    // This matches the pattern of samplers like Akai MPC
    const padIndices = [];
    for (let row = 3; row >= 0; row--) {
      for (let col = 0; col < 4; col++) {
        padIndices.push(row * 4 + col);
      }
    }

    // Keyboard shortcuts map (A-Z Alphabet)
    const keyboardShortcuts = [
      "A",
      "B",
      "C",
      "D", // Pads 0-3
      "E",
      "F",
      "G",
      "H", // Pads 4-7
      "I",
      "J",
      "K",
      "L", // Pads 8-11
      "M",
      "N",
      "O",
      "P", // Pads 12-15
    ];

    padIndices.forEach((padIndex) => {
      const button = document.createElement("button");
      button.className = "pad";
      button.disabled = true;
      const shortcut = keyboardShortcuts[padIndex] || "";
      button.innerHTML = `
                <span class="pad-name">Empty</span>
                <span class="pad-shortcut">${shortcut}</span>
                <div class="pad-progress"></div>
            `;

      button.onclick = () => this.selectPad(padIndex);

      this.padButtons[padIndex] = button;
      this.padsGrid.appendChild(button);
    });
  }

  /**
   * Setup waveform control buttons
   */
  setupWaveformControls() {
    document.querySelector("#playSelectedBtn").onclick = () => {
      if (this.selectedPadIndex >= 0) {
        this.engine.play(this.selectedPadIndex);
      }
    };

    document.querySelector("#playFullBtn").onclick = () => {
      if (this.selectedPadIndex >= 0) {
        const pad = this.engine.getPad(this.selectedPadIndex);
        if (pad && pad.loaded) {
          // Temporarily play full sample
          const originalStart = pad.trimStart;
          const originalEnd = pad.trimEnd;
          pad.trimStart = 0;
          pad.trimEnd = pad.buffer.duration;
          this.engine.play(this.selectedPadIndex);
          pad.trimStart = originalStart;
          pad.trimEnd = originalEnd;
        }
      }
    };

    document.querySelector("#resetTrimBtn").onclick = () => {
      if (this.selectedPadIndex >= 0) {
        this.engine.resetPad(this.selectedPadIndex);
        this.updateTrimBarsFromPad();
      }
    };
  }

  /**
   * Setup canvas mouse interaction for trim bars
   */
  setupCanvasInteraction() {
    this.overlayCanvas.onmousemove = (evt) => {
      const rect = this.waveformCanvas.getBoundingClientRect();
      this.mousePos.x = evt.clientX - rect.left;
      this.mousePos.y = evt.clientY - rect.top;
      this.trimbarsDrawer.moveTrimBars(this.mousePos);
    };

    this.overlayCanvas.onmousedown = () => {
      this.trimbarsDrawer.startDrag();
    };

    this.overlayCanvas.onmouseup = () => {
      this.trimbarsDrawer.stopDrag();
      this.updatePadFromTrimBars();
    };
  }

  /**
   * Update pad trim points from trim bar positions
   */
  updatePadFromTrimBars() {
    if (this.selectedPadIndex < 0) return;

    const pad = this.engine.getPad(this.selectedPadIndex);
    if (!pad || !pad.loaded) return;

    const startTime = pixelToSeconds(
      this.trimbarsDrawer.leftTrimBar.x,
      pad.buffer.duration,
      this.waveformCanvas.width
    );
    const endTime = pixelToSeconds(
      this.trimbarsDrawer.rightTrimBar.x,
      pad.buffer.duration,
      this.waveformCanvas.width
    );

    this.engine.setTrimPoints(this.selectedPadIndex, startTime, endTime);
  }

  /**
   * Update trim bars from pad trim points
   */
  updateTrimBarsFromPad() {
    if (this.selectedPadIndex < 0) return;

    const pad = this.engine.getPad(this.selectedPadIndex);
    if (!pad || !pad.loaded || !pad.buffer) return;

    // Make sure trim values are valid
    const duration = pad.buffer.duration;
    const trimStart = Math.max(0, Math.min(pad.trimStart || 0, duration));
    const trimEnd = Math.max(
      trimStart,
      Math.min(pad.trimEnd || duration, duration)
    );

    // Convert time to pixel positions
    const leftPixel = (trimStart / duration) * this.waveformCanvas.width;
    const rightPixel = (trimEnd / duration) * this.waveformCanvas.width;

    this.trimbarsDrawer.leftTrimBar.x = leftPixel;
    this.trimbarsDrawer.rightTrimBar.x = rightPixel;

    // Redraw trim bars on overlay canvas
    this.trimbarsDrawer.clear();
    this.trimbarsDrawer.draw();

    console.log(
      `Trim bars updated - Left: ${leftPixel}px, Right: ${rightPixel}px, Duration: ${duration}s`
    );
  }

  /**
   * Select a pad and show its waveform
   */
  selectPad(padIndex) {
    // Save current trim bar positions
    if (this.selectedPadIndex >= 0) {
      this.updatePadFromTrimBars();
    }

    this.selectedPadIndex = padIndex;
    const pad = this.engine.getPad(padIndex);

    console.log(`Selected pad ${padIndex}:`, pad);

    // Update button states
    this.padButtons.forEach((btn, idx) => {
      if (idx === padIndex) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });

    // Show waveform section
    if (pad && pad.loaded) {
      this.waveformSection.style.display = "block";
      this.currentPadName.textContent = pad.name;

      console.log(`Displaying waveform for pad ${padIndex}:`, {
        name: pad.name,
        duration: pad.buffer.duration,
        trimStart: pad.trimStart,
        trimEnd: pad.trimEnd,
      });

      // Draw waveform
      this.waveformDrawer.init(pad.buffer, this.waveformCanvas, "#667eea");
      this.waveformDrawer.drawWave(0, this.waveformCanvas.height);

      // Sync overlay canvas size with waveform canvas
      this.overlayCanvas.width = this.waveformCanvas.width;
      this.overlayCanvas.height = this.waveformCanvas.height;

      // Update trim bars after waveform is drawn
      // Use requestAnimationFrame to ensure rendering is complete
      requestAnimationFrame(() => {
        this.updateTrimBarsFromPad();
      });
    } else {
      console.warn(`Pad ${padIndex} not loaded or invalid`);
    }
  }

  /**
   * Update pad button state
   */
  updatePadButton(padIndex, state, progress = 0) {
    const button = this.padButtons[padIndex];
    if (!button) return;

    const nameSpan = button.querySelector(".pad-name");
    const progressBar = button.querySelector(".pad-progress");
    const pad = this.engine.getPad(padIndex);

    // Remove all state classes
    button.classList.remove("loading", "error");

    switch (state) {
      case "loading":
        button.classList.add("loading");
        button.disabled = true;
        nameSpan.textContent = "Loading...";
        progressBar.style.setProperty("--progress", `${progress}%`);
        break;

      case "loaded":
        button.disabled = false;
        nameSpan.textContent = pad.name;
        progressBar.style.setProperty("--progress", "100%");
        setTimeout(
          () => progressBar.style.setProperty("--progress", "0%"),
          500
        );
        break;

      case "error":
        button.classList.add("error");
        button.disabled = true;
        nameSpan.textContent = "Error";
        progressBar.style.setProperty("--progress", "0%");
        break;

      case "empty":
        button.disabled = true;
        nameSpan.textContent = "Empty";
        progressBar.style.setProperty("--progress", "0%");
        break;
    }
  }

  /**
   * Start animation loop for trim bars
   */
  startAnimationLoop() {
    const animate = () => {
      this.trimbarsDrawer.clear();
      this.trimbarsDrawer.draw();
      requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Enable pad playback
   */
  enablePad(padIndex) {
    this.updatePadButton(padIndex, "loaded");
  }

  /**
   * Show loading state for pad
   */
  showPadLoading(padIndex, progress) {
    this.updatePadButton(padIndex, "loading", progress);
  }

  /**
   * Show error state for pad
   */
  showPadError(padIndex) {
    this.updatePadButton(padIndex, "error");
  }
}
