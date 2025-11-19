import { useEffect, useRef } from "react";
import SamplerEngine from "@/lib/SamplerEngine";
import WaveformDrawer from "@/lib/WaveformDrawer";
import TrimbarsDrawer from "@/lib/TrimbarsDrawer";
import { pixelToSeconds } from "@/lib/utils";

interface WaveformEditorProps {
  engine: SamplerEngine | null;
  selectedPadIndex: number;
  visible: boolean;
  onWaveformReady?: () => void;
}

export default function WaveformEditor({
  engine,
  selectedPadIndex,
  visible,
  onWaveformReady,
}: WaveformEditorProps) {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformDrawerRef = useRef<WaveformDrawer | null>(null);
  const trimbarsDrawerRef = useRef<TrimbarsDrawer | null>(null);

  const updateTrimBarsFromPadRef = useRef<() => void>(() => {});
  const startAnimationLoopRef = useRef<() => void>(() => {});

  // Expose refs for external access
  useEffect(() => {
    const globalWindow = typeof window !== "undefined" ? window : null;
    if (globalWindow) {
      (globalWindow as unknown as Record<string, unknown>).__waveformDrawerRef =
        waveformDrawerRef;
      (globalWindow as unknown as Record<string, unknown>).__trimbarsDrawerRef =
        trimbarsDrawerRef;
      (globalWindow as unknown as Record<string, unknown>).__waveformCanvasRef =
        waveformCanvasRef;
      (
        globalWindow as unknown as Record<string, unknown>
      ).__updateTrimBarsFromPadRef = updateTrimBarsFromPadRef;
    }
  }, []);

  // Setup canvas interaction
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const waveformCanvas = waveformCanvasRef.current;
    if (!overlayCanvas || !waveformCanvas || !visible) return;

    // Update trim bars from pad
    const updateTrimBarsFromPad = () => {
      if (
        selectedPadIndex < 0 ||
        !engine ||
        !waveformCanvasRef.current ||
        !trimbarsDrawerRef.current
      )
        return;

      const pad = engine.getPad(selectedPadIndex);
      if (!pad || !pad.loaded || !pad.buffer) return;

      const duration = pad.buffer.duration;
      const trimStart = Math.max(0, Math.min(pad.trimStart || 0, duration));
      const trimEnd = Math.max(
        trimStart,
        Math.min(pad.trimEnd || duration, duration)
      );

      const leftPixel =
        (trimStart / duration) * waveformCanvasRef.current.width;
      const rightPixel = (trimEnd / duration) * waveformCanvasRef.current.width;

      trimbarsDrawerRef.current.getLeftTrimBar().x = leftPixel;
      trimbarsDrawerRef.current.getRightTrimBar().x = rightPixel;

      trimbarsDrawerRef.current.clear();
      trimbarsDrawerRef.current.draw();
    };

    // Update pad from trim bars
    const updatePadFromTrimBars = () => {
      if (
        selectedPadIndex < 0 ||
        !engine ||
        !waveformCanvasRef.current ||
        !trimbarsDrawerRef.current
      )
        return;

      const pad = engine.getPad(selectedPadIndex);
      if (!pad || !pad.loaded) return;

      const startTime = pixelToSeconds(
        trimbarsDrawerRef.current.getLeftTrimBar().x,
        pad.buffer!.duration,
        waveformCanvasRef.current.width
      );
      const endTime = pixelToSeconds(
        trimbarsDrawerRef.current.getRightTrimBar().x,
        pad.buffer!.duration,
        waveformCanvasRef.current.width
      );

      engine.setTrimPoints(selectedPadIndex, startTime, endTime);
    };

    // Animation loop
    let animationFrameId: number;
    const startAnimationLoop = () => {
      if (!overlayCanvasRef.current || !trimbarsDrawerRef.current) return;

      const animate = () => {
        trimbarsDrawerRef.current?.clear();
        trimbarsDrawerRef.current?.draw();
        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);
    };

    // Store in refs for access from other functions
    updateTrimBarsFromPadRef.current = updateTrimBarsFromPad;
    startAnimationLoopRef.current = startAnimationLoop;

    const handleMouseMove = (evt: MouseEvent) => {
      const rect = waveformCanvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      if (trimbarsDrawerRef.current) {
        trimbarsDrawerRef.current.moveTrimBars({ x, y });
      }
    };

    const handleMouseDown = (evt: MouseEvent) => {
      const rect = waveformCanvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      if (trimbarsDrawerRef.current) {
        // First update highlight to see which bar is selected
        trimbarsDrawerRef.current.highLightTrimBarsWhenClose({ x, y });
        // Then start drag based on which bar is selected
        trimbarsDrawerRef.current.startDrag();
      }
    };

    const handleMouseUp = () => {
      if (trimbarsDrawerRef.current) {
        trimbarsDrawerRef.current.stopDrag();
        updatePadFromTrimBars();
      }
    };

    // Reset trim bar drag state when mouse leaves canvas
    const handleMouseLeave = () => {
      if (trimbarsDrawerRef.current) {
        trimbarsDrawerRef.current.stopDrag();
      }
    };

    overlayCanvas.addEventListener("mousemove", handleMouseMove);
    overlayCanvas.addEventListener("mousedown", handleMouseDown);
    overlayCanvas.addEventListener("mouseup", handleMouseUp);
    overlayCanvas.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      overlayCanvas.removeEventListener("mousemove", handleMouseMove);
      overlayCanvas.removeEventListener("mousedown", handleMouseDown);
      overlayCanvas.removeEventListener("mouseup", handleMouseUp);
      overlayCanvas.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [selectedPadIndex, engine, visible]);

  // Initialize waveform when pad is selected
  useEffect(() => {
    if (!visible || !engine || selectedPadIndex < 0) {
      return;
    }

    const pad = engine.getPad(selectedPadIndex);
    if (!pad || !pad.buffer) return;

    // Immediately clear canvases and reset drawer
    if (waveformCanvasRef.current && overlayCanvasRef.current) {
      const waveformCtx = waveformCanvasRef.current.getContext("2d");
      const overlayCtx = overlayCanvasRef.current.getContext("2d");

      if (waveformCtx) {
        waveformCtx.clearRect(
          0,
          0,
          waveformCanvasRef.current.width,
          waveformCanvasRef.current.height
        );
      }
      if (overlayCtx) {
        overlayCtx.clearRect(
          0,
          0,
          overlayCanvasRef.current.width,
          overlayCanvasRef.current.height
        );
      }

      // Always recreate WaveformDrawer to ensure fresh state
      waveformDrawerRef.current = new WaveformDrawer();
      waveformDrawerRef.current.init(
        pad.buffer!,
        waveformCanvasRef.current,
        "#667eea"
      );
      waveformDrawerRef.current.drawWave(0, waveformCanvasRef.current.height);

      overlayCanvasRef.current.width = waveformCanvasRef.current.width;
      overlayCanvasRef.current.height = waveformCanvasRef.current.height;

      // Always recreate TrimbarsDrawer to reset state
      const leftX = 100;
      const rightX = waveformCanvasRef.current.width - 100;
      trimbarsDrawerRef.current = new TrimbarsDrawer(
        overlayCanvasRef.current,
        leftX,
        rightX
      );
      trimbarsDrawerRef.current.clear();
      trimbarsDrawerRef.current.draw();

      // Initialize trim bars and animation
      if (updateTrimBarsFromPadRef.current) {
        updateTrimBarsFromPadRef.current();
      }
      if (startAnimationLoopRef.current) {
        startAnimationLoopRef.current();
      }

      onWaveformReady?.();
    }
  }, [visible, engine, selectedPadIndex, onWaveformReady]);

  if (!visible) return null;

  return (
    <section className="waveform-section">
      <div className="waveform-header">
        <h2>Waveform Editor</h2>
        <span className="current-sample">
          {engine?.getPad(selectedPadIndex)?.name || "-"}
        </span>
      </div>

      <div
        className="waveform-container"
        style={{
          position: "relative",
          display: "inline-block",
          width: "900px",
          height: "200px",
        }}
      >
        <canvas
          ref={waveformCanvasRef}
          width={900}
          height={200}
          className="waveform-canvas"
          style={{
            display: "block",
            border: "1px solid #667eea",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        ></canvas>
        <canvas
          ref={overlayCanvasRef}
          width={900}
          height={200}
          className="overlay-canvas"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            cursor: "pointer",
            zIndex: 10,
            width: "100%",
            height: "100%",
          }}
        ></canvas>
        <div
          className="trim-hint"
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Drag the green lines to trim the sample
        </div>
      </div>
    </section>
  );
}

// Helper functions for external access
export function getWaveformDrawerRef() {
  const globalWindow = typeof window !== "undefined" ? window : null;
  return (
    (globalWindow as unknown as Record<string, unknown>)?.__waveformDrawerRef ||
    null
  );
}

export function getTrimbarsDrawerRef() {
  const globalWindow = typeof window !== "undefined" ? window : null;
  return (
    (globalWindow as unknown as Record<string, unknown>)?.__trimbarsDrawerRef ||
    null
  );
}

export function getWaveformCanvasRef() {
  const globalWindow = typeof window !== "undefined" ? window : null;
  return (
    (globalWindow as unknown as Record<string, unknown>)?.__waveformCanvasRef ||
    null
  );
}

export function getUpdateTrimBarsFromPadRef() {
  const globalWindow = typeof window !== "undefined" ? window : null;
  return (
    (globalWindow as unknown as Record<string, unknown>)
      ?.__updateTrimBarsFromPadRef || { current: () => {} }
  );
}
