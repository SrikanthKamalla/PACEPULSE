import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Sliders } from 'lucide-react';

export function Controls({
  status,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onOpenSettings,
}) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle';
  const isCompleted = status === 'completed';

  const handlePrimaryClick = () => {
    if (isIdle || isCompleted) onStart();
    else if (isRunning) onPause();
    else if (isPaused) onResume();
  };

  let primaryLabel = 'START WORKOUT';
  let PrimaryIcon = Play;
  let primaryBtnClass = 'btn-primary-action btn-start';

  if (isRunning) {
    primaryLabel = 'PAUSE';
    PrimaryIcon = Pause;
    primaryBtnClass = 'btn-primary-action btn-pause';
  } else if (isPaused) {
    primaryLabel = 'RESUME';
    PrimaryIcon = Play;
    primaryBtnClass = 'btn-primary-action btn-resume';
  } else if (isCompleted) {
    primaryLabel = 'START AGAIN';
    PrimaryIcon = RotateCcw;
    primaryBtnClass = 'btn-primary-action btn-start';
  }

  return (
    <div className="controls-container">
      {/* Big Main Play/Pause Button */}
      <button
        id="btn-primary-action"
        className={primaryBtnClass}
        onClick={handlePrimaryClick}
      >
        <PrimaryIcon size={24} strokeWidth={2.5} />
        <span>{primaryLabel}</span>
        <span className="kbd-hint">Space</span>
      </button>

      {/* Secondary Controls Row */}
      <div className="secondary-actions-row">
        <button
          id="btn-reset"
          className="btn-secondary"
          onClick={onReset}
          disabled={isIdle}
          title="Reset timer to beginning (R)"
        >
          <RotateCcw size={16} />
          <span>Reset</span>
          <span className="kbd-hint">R</span>
        </button>

        <button
          id="btn-skip"
          className="btn-secondary"
          onClick={onSkip}
          disabled={isIdle || isCompleted}
          title="Skip to next interval (S)"
        >
          <SkipForward size={16} />
          <span>Skip</span>
          <span className="kbd-hint">S</span>
        </button>

        <button
          id="btn-edit-timers"
          className="btn-secondary btn-edit-timers"
          onClick={onOpenSettings}
          title="Customize timer intervals"
        >
          <Sliders size={16} />
          <span>Edit Timers</span>
        </button>
      </div>
    </div>
  );
}
