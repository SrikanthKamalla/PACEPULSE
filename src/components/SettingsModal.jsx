import React, { useState, useEffect } from 'react';
import { X, Volume2, RotateCcw } from 'lucide-react';
import { WORKOUT_PRESETS, DEFAULT_CONFIG } from '../constants';
import { formatTime } from '../utils/format';
import { playChime } from '../utils/audio';

export function SettingsModal({
  isOpen,
  config,
  onSave,
  onClose,
}) {
  const [runMin, setRunMin] = useState(Math.floor(config.runSeconds / 60));
  const [runSec, setRunSec] = useState(config.runSeconds % 60);

  const [walkMin, setWalkMin] = useState(Math.floor(config.walkSeconds / 60));
  const [walkSec, setWalkSec] = useState(config.walkSeconds % 60);

  const [rounds, setRounds] = useState(config.rounds);
  const [isInfinite, setIsInfinite] = useState(config.isInfinite);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRunMin(Math.floor(config.runSeconds / 60));
      setRunSec(config.runSeconds % 60);
      setWalkMin(Math.floor(config.walkSeconds / 60));
      setWalkSec(config.walkSeconds % 60);
      setRounds(config.rounds);
      setIsInfinite(config.isInfinite);
    }
  }, [isOpen, config]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setRunMin(Math.floor(DEFAULT_CONFIG.runSeconds / 60));
    setRunSec(DEFAULT_CONFIG.runSeconds % 60);
    setWalkMin(Math.floor(DEFAULT_CONFIG.walkSeconds / 60));
    setWalkSec(DEFAULT_CONFIG.walkSeconds % 60);
    setRounds(DEFAULT_CONFIG.rounds);
    setIsInfinite(DEFAULT_CONFIG.isInfinite);
  };

  const applyPreset = (preset) => {
    setRunMin(Math.floor(preset.runSeconds / 60));
    setRunSec(preset.runSeconds % 60);
    setWalkMin(Math.floor(preset.walkSeconds / 60));
    setWalkSec(preset.walkSeconds % 60);
    setRounds(preset.rounds);
    setIsInfinite(preset.isInfinite);
  };

  const handleSave = () => {
    const totalRun = Math.max(5, runMin * 60 + runSec);
    const totalWalk = Math.max(5, walkMin * 60 + walkSec);

    onSave({
      runSeconds: totalRun,
      walkSeconds: totalWalk,
      rounds: Math.max(1, rounds),
      isInfinite,
    });
    onClose();
  };

  const adjustRunSec = (delta) => {
    setRunSec((prev) => {
      let next = prev + delta;
      if (next >= 60) next = 0;
      if (next < 0) next = 45;
      return next;
    });
  };

  const adjustWalkSec = (delta) => {
    setWalkSec((prev) => {
      let next = prev + delta;
      if (next >= 60) next = 0;
      if (next < 0) next = 45;
      return next;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-text">
            <h2 className="modal-title">Configure Practice Timers</h2>
            <div className="storage-status-pill">
              <span className="storage-dot"></span>
              <span>Saved in LocalStorage</span>
            </div>
          </div>
          <button
            id="btn-close-modal"
            className="btn-close-modal"
            onClick={onClose}
            title="Close modal (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          {/* Quick Presets */}
          <div>
            <span className="stepper-label">QUICK WORKOUT PRESETS</span>
            <div className="presets-scroll">
              {WORKOUT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-chip-btn"
                  onClick={() => applyPreset(preset)}
                >
                  <span className="preset-chip-title">{preset.name}</span>
                  <span className="preset-chip-desc">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Run Timer Config Card */}
          <div className="timer-config-card is-run">
            <div className="config-card-header">
              <div className="config-card-title" style={{ color: 'var(--color-run)' }}>
                <span>🏃</span>
                <span>RUN TIMER</span>
              </div>
              <div className="config-card-formatted">
                {formatTime(runMin * 60 + runSec)}
              </div>
            </div>

            <div className="steppers-row">
              {/* Minutes */}
              <div className="stepper-box">
                <span className="stepper-label">MINUTES</span>
                <div className="stepper-controls">
                  <button
                    className="btn-step"
                    onClick={() => setRunMin((prev) => Math.max(0, prev - 1))}
                  >
                    -
                  </button>
                  <span className="stepper-val">{runMin}</span>
                  <button
                    className="btn-step"
                    onClick={() => setRunMin((prev) => Math.min(59, prev + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Seconds */}
              <div className="stepper-box">
                <span className="stepper-label">SECONDS</span>
                <div className="stepper-controls">
                  <button className="btn-step" onClick={() => adjustRunSec(-15)}>
                    -
                  </button>
                  <span className="stepper-val">{String(runSec).padStart(2, '0')}</span>
                  <button className="btn-step" onClick={() => adjustRunSec(15)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Walk Timer Config Card */}
          <div className="timer-config-card is-walk">
            <div className="config-card-header">
              <div className="config-card-title" style={{ color: 'var(--color-walk)' }}>
                <span>🚶</span>
                <span>WALK TIMER</span>
              </div>
              <div className="config-card-formatted">
                {formatTime(walkMin * 60 + walkSec)}
              </div>
            </div>

            <div className="steppers-row">
              {/* Minutes */}
              <div className="stepper-box">
                <span className="stepper-label">MINUTES</span>
                <div className="stepper-controls">
                  <button
                    className="btn-step"
                    onClick={() => setWalkMin((prev) => Math.max(0, prev - 1))}
                  >
                    -
                  </button>
                  <span className="stepper-val">{walkMin}</span>
                  <button
                    className="btn-step"
                    onClick={() => setWalkMin((prev) => Math.min(59, prev + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Seconds */}
              <div className="stepper-box">
                <span className="stepper-label">SECONDS</span>
                <div className="stepper-controls">
                  <button className="btn-step" onClick={() => adjustWalkSec(-15)}>
                    -
                  </button>
                  <span className="stepper-val">{String(walkSec).padStart(2, '0')}</span>
                  <button className="btn-step" onClick={() => adjustWalkSec(15)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Continuous Mode Toggle */}
          <div className="toggle-row">
            <div className="toggle-info">
              <h4>Endless / Continuous Mode</h4>
              <p>Keep alternating Run and Walk without a round limit</p>
            </div>
            <label className="switch-label">
              <input
                id="toggle-infinite-mode"
                type="checkbox"
                checked={isInfinite}
                onChange={(e) => setIsInfinite(e.target.checked)}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          {/* Target Rounds (if not endless) */}
          {!isInfinite && (
            <div className="toggle-row">
              <div className="toggle-info">
                <h4>Target Rounds</h4>
                <p>Number of Run/Walk cycles in this session</p>
              </div>
              <div className="stepper-controls">
                <button
                  className="btn-step"
                  onClick={() => setRounds((prev) => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <span className="stepper-val">{rounds}</span>
                <button
                  className="btn-step"
                  onClick={() => setRounds((prev) => Math.min(99, prev + 1))}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Sound Preview Card */}
          <div className="sound-preview-card">
            <div>
              <div className="sound-preview-title">TRANSITION ALERT</div>
              <div className="sound-preview-desc">3-Stage Extended Chime (1.5s)</div>
            </div>
            <button
              id="btn-test-chime"
              className="btn-test-chime"
              onClick={() => playChime()}
              title="Test audio chime"
            >
              <Volume2 size={16} />
              <span>Test Chime</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            id="btn-reset-defaults"
            type="button"
            className="btn-modal-reset"
            onClick={handleResetDefaults}
            title="Reset to default timer intervals (2m run, 1m walk)"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <div className="modal-footer-actions">
            <button className="btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button id="btn-save-timers" className="btn-modal-save" onClick={handleSave}>
              Save Timers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
