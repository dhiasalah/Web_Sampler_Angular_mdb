"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useAudioEngine,
  useKeyboardControls,
  usePresetLoader,
  usePadSelection,
  useRecording,
} from "@/hooks";
import Header from "./Header";
import ControlPanel from "./ControlPanel";
import StatusPanel from "./StatusPanel";
import PadsGrid from "./PadsGrid";
import WaveformEditor from "./WaveformEditor";
import WaveformControls from "./WaveformControls";
import RecordingPanel from "./RecordingPanel";
import InfoSection from "./InfoSection";
import Footer from "./Footer";

export default function SamplerApp() {
  // Use custom hooks
  const engine = useAudioEngine();
  const { selectPadRef } = usePadSelection();
  const {
    presets,
    statusText,
    statusClass,
    progress,
    isLoading,
    soundsLoaded,
    loadPresetsFromServer,
    loadPresetSounds,
  } = usePresetLoader();
  const {
    isRecording,
    recordedBlob,
    recordingDuration,
    startRecording,
    stopRecording,
    playRecording,
    downloadRecording,
    clearRecording,
  } = useRecording();

  // Local state
  const [selectedPreset, setSelectedPreset] = useState("");
  const [selectedPadIndex, setSelectedPadIndex] = useState(-1);
  const [showWaveform, setShowWaveform] = useState(false);

  // Setup keyboard controls
  useKeyboardControls({ engine });

  // Load presets on mount
  useEffect(() => {
    loadPresetsFromServer();
  }, [loadPresetsFromServer]);

  // Handle pad selection
  const handlePadSelect = useCallback(
    (padIndex: number) => {
      selectPadRef.current(padIndex, engine);
      setSelectedPadIndex(padIndex);

      const pad = engine?.getPad(padIndex);
      if (pad && pad.buffer) {
        setShowWaveform(true);
      }
    },
    [engine, selectPadRef]
  );

  // Handle load sounds
  const handleLoadSounds = useCallback(async () => {
    await loadPresetSounds(selectedPreset, engine);
  }, [selectedPreset, engine, loadPresetSounds]);

  return (
    <div className="container">
      <Header />
      <ControlPanel
        presets={presets}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        onLoadSounds={handleLoadSounds}
        isLoading={isLoading}
      />
      <StatusPanel
        statusText={statusText}
        statusClass={statusClass}
        progress={progress}
      />
      <PadsGrid onPadSelect={handlePadSelect} />
      {showWaveform && selectedPadIndex >= 0 && (
        <>
          <WaveformEditor
            key={selectedPadIndex}
            engine={engine}
            selectedPadIndex={selectedPadIndex}
            visible={true}
          />
          <WaveformControls
            engine={engine}
            selectedPadIndex={selectedPadIndex}
            visible={true}
          />
        </>
      )}
      {soundsLoaded && (
        <RecordingPanel
          engine={engine}
          isRecording={isRecording}
          recordedBlob={recordedBlob}
          recordingDuration={recordingDuration}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onPlayRecording={playRecording}
          onDownloadRecording={downloadRecording}
          onClearRecording={clearRecording}
        />
      )}
      <InfoSection />
      <Footer />
    </div>
  );
}
