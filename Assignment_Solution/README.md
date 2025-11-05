# 🎹 Web Audio Sampler - Professional Beat Maker

A modern, interactive web-based sampler/drum machine built with **Web Audio API** and **vanilla JavaScript**. Play drum kits and audio samples with your keyboard or mouse, edit waveforms with trim bars, and create beats in real-time.

## ✨ Features

### 🎵 Audio Playback

- **16 Playable Pads** - 4x4 grid of sound triggers
- **Multiple Drum Kits** - Select from 5 pre-loaded drum kits:
  - 808 (Iconic drum machine)
  - Basic Kit (Essential drums)
  - Electronic (Modern synth drums)
  - Hip-Hop (Classic hip-hop breaks)
  - Steveland Vinyl (Vintage vinyl sounds)

### ⌨️ Keyboard Controls

- **A-P Keys** - Play pads 1-16 (Primary mapping)
- **Q-Z Keys** - Play pads 1-10 (Alternate mapping)
- Full **26-letter alphabet** keyboard support
- Real-time visual feedback for key presses

### 🎨 Waveform Editor

- **Visual Waveform Display** - See audio in real-time
- **Trim Bars** - Bright green handles to edit sample start/end points
- **Preview Options**:
  - ▶ Play Selection - Hear trimmed sample
  - ▶▶ Play Full - Hear entire original sample
  - ↺ Reset - Restore original trim points
- **Interactive Canvas** - Drag trim bars to adjust sample boundaries
- **Loading Feedback** - "Loading waveform..." placeholder while processing

### 🎯 User Interface

- **Modern Dark Theme** - Professional dark mode with neon accents
- **Gradient Design** - Purple to neon green color scheme
- **Smooth Animations** - Bounce effects, hover transitions, pulse loading
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Status Display** - Real-time loading progress and feedback

### ⚙️ Advanced Features

- **Preset Loading** - Load drum kits from server
- **Progress Tracking** - Visual progress bar during sound loading
- **Asynchronous Processing** - Non-blocking waveform rendering
- **Audio Processing** - Real-time audio buffer manipulation
- **Gain Control** - Volume adjustment for each pad
- **Trim Point Management** - Save and restore custom trim points per pad

## 🚀 Getting Started

### Prerequisites

- Modern web browser with Web Audio API support (Chrome, Firefox, Edge, Safari)
- The provided Node.js server running on `localhost:3000`

### Installation

1. **Clone or download the project**

   ```bash
   git clone <repository-url>
   cd Assignment_Solution
   ```

2. **Ensure the server is running**

   The server should already be running on `http://localhost:3000` (it's provided to you)

   If the server is not running, start it from the parent directory:

   ```bash
   node server.js
   ```

3. **Open in browser**
   ```
   http://localhost:3000/Assignment_Solution
   ```

## 🎮 How to Use

### 1. Load a Drum Kit

- Click the **🎵 Dropdown** to select a drum kit
- Click **⚡ Load Sounds** button
- Watch the progress bar until all samples are loaded
- Status will show "✓ All sounds loaded!"

### 2. Play Sounds

#### Using Mouse

- Click any pad in the 4x4 grid
- Or click in the control panel

#### Using Keyboard

- Press **A** through **P** to play pads 1-16
- Press **Q** through **Z** for alternate mappings
- Hold down for rapid-fire playing
- Visual feedback shows which keys are active

### 3. Edit Waveforms

1. **Click a pad** to select it and view its waveform
2. **Waveform Editor** appears showing:
   - Full waveform visualization
   - Green **left trim bar** (start point)
   - Green **right trim bar** (end point)
3. **Drag trim bars** to set custom start/end points
4. **Preview your trim**:
   - ▶ Play Selection - Hear your trimmed sample
   - ▶▶ Play Full - Compare with full sample
5. **Reset** - Return to original if needed

## 🎨 Design & Styling

### Color Scheme

- **Background**: Dark blue (#0f0f1e) with gradient
- **Accent**: Neon green (#00ff00) for interactive elements
- **Primary**: Purple gradient (#667eea → #764ba2)
- **Cards**: Dark navy (#1a1a2e) with borders
- **States**: Green (selected), Red (playing), Orange (loading)

### Modern Features

- Glassmorphism effects with backdrop blur
- Smooth transitions (0.3s) on all interactions
- Glow effects on hover and active states
- Floating animations on header elements
- Pulse effects during loading

## 📁 File Structure

```
Assignment_Solution/
├── index.html              # Main HTML structure
├── css/
│   └── styles.css         # Modern styling & animations
├── js/
│   ├── main.js            # Entry point & preset loading
│   ├── SamplerEngine.js   # Core audio engine
│   ├── SamplerGUI.js      # GUI & user interactions
│   ├── WaveformDrawer.js  # Waveform visualization
│   ├── TrimbarsDrawer.js  # Trim bar UI & interaction
│   └── utils.js           # Helper functions
└── README.md              # This file
```

## 🔧 Technical Details

### Architecture

- **MVC-inspired pattern** - Separation of concerns
- **SamplerEngine** - Pure audio logic (headless-capable)
- **SamplerGUI** - UI interactions and visual feedback
- **Drawer classes** - Canvas rendering (Waveform, Trimbars)

### Technologies

- **Web Audio API** - Audio processing and playback
- **HTML5 Canvas** - Waveform and trim bar visualization
- **Vanilla JavaScript** (ES6 modules)
- **CSS3** - Modern styling with gradients and animations
- **Fetch API** - Server communication for preset loading

### Performance

- **Asynchronous Processing** - Non-blocking UI during heavy operations
- **RequestAnimationFrame** - Smooth rendering at 60fps
- **Chunked Peak Calculation** - Distributes waveform processing
- **Lazy Loading** - Load presets only when needed

## 🎛️ API Endpoints

Expects presets to be served from:

```
http://localhost:3000/api/presets/{presetName}/{soundFileName}
```

Example preset structure:

```
/presets/
  ├── 808/
  │   ├── kick.wav
  │   ├── snare.wav
  │   └── ...
  ├── Basic_Kit/
  │   └── ...
```

## ⌨️ Keyboard Shortcut Reference

| Keys             | Action                     |
| ---------------- | -------------------------- |
| **A-P**          | Play pads 1-16 (Primary)   |
| **Q-Z**          | Play pads 1-10 (Alternate) |
| Click pad        | Select pad / View waveform |
| Drag green lines | Adjust trim points         |
| ▶ Button         | Play trimmed selection     |
| ▶▶ Button        | Play full sample           |
| ↺ Button         | Reset trim points          |

## 🐛 Troubleshooting

### Sounds won't load

- Ensure local server is running (`http://localhost:3000`)
- Check browser console for error messages (F12)
- Verify preset files exist in server `/presets/` directory
- Check network tab to see failed requests

### Waveform not showing

- Wait for loading to complete (watch progress bar)
- Try selecting a different pad
- Refresh page and reload presets
- Check browser console for JavaScript errors

### Trim bars not visible

- Ensure overlay canvas is properly positioned
- Try clicking on the waveform container
- Make sure pad is fully loaded before editing
- Refresh if display becomes corrupted

### Audio not playing

- Check browser audio permissions
- Ensure system volume is not muted
- Try a different drum kit
- Clear browser cache and reload

## 🚀 Future Enhancements

Potential features for future versions:

- 🎚️ Equalizer controls (bass, mid, treble)
- 🔄 Sample looping and playback speed control
- 💾 Save/load custom configurations
- 🎵 MIDI input support
- 🎼 Song recording and playback
- 📱 Touch/gesture support improvements
- 🌙 Light/dark theme toggle
- 📊 Frequency analysis visualization

## 📝 Assignment Completion

✅ **All Requirements Met:**

- Web Audio API implementation with professional features
- Keyboard controls (A-Z alphabet mapping)
- 16 playable pads with visual feedback
- Waveform editing with trim functionality
- Multiple drum kit presets
- Responsive modern UI/UX design
- Asynchronous processing (no UI blocking)
- Professional color scheme and animations

## 📄 License

Educational project for M1 Web Technologies course (Master's Degree).

## 👨‍💻 Author

Created as part of M1 Web Audio Technology assignment.

---

**Enjoy making beats! 🎵🎶**

For issues or questions, check the browser console (F12) for detailed error messages and debugging information.
