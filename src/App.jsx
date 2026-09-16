import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Clock } from 'lucide-react';
import { DEFAULT_CONFIG } from './constants';
import { CircularTimer } from './components/CircularTimer';
import { Controls } from './components/Controls';
import { SettingsModal } from './components/SettingsModal';
import { playChime } from './utils/audio';
import { requestWakeLock, releaseWakeLock } from './utils/wakeLock';
import { formatTime, formatHumanTime } from './utils/format';

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'completed'
  const [currentInterval, setCurrentInterval] = useState('run'); // 'run' | 'walk'
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_CONFIG.runSeconds);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const intervalEndTimeRef = useRef(0);
  const timerIntervalRef = useRef(null);
  const elapsedIntervalRef = useRef(null);

  // Manage browser wake lock while workout is running
  useEffect(() => {
    if (status === 'running') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [status]);

  // Sync secondsLeft when config changes while idle
  useEffect(() => {
    if (status === 'idle') {
      setSecondsLeft(currentInterval === 'run' ? config.runSeconds : config.walkSeconds);
    }
  }, [config, status, currentInterval]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  // Interval completion transition
  const handleIntervalCompletion = useCallback(() => {
    playChime();

    if (currentInterval === 'run') {
      // Transition Run -> Walk
      setCurrentInterval('walk');
      setSecondsLeft(config.walkSeconds);
      intervalEndTimeRef.current = Date.now() + config.walkSeconds * 1000;
    } else {
      // Transition Walk -> Next Round or Completed
      const isLastRound = !config.isInfinite && currentRound >= config.rounds;

      if (isLastRound) {
        setStatus('completed');
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      } else {
        setCurrentRound((prev) => prev + 1);
        setCurrentInterval('run');
        setSecondsLeft(config.runSeconds);
        intervalEndTimeRef.current = Date.now() + config.runSeconds * 1000;
      }
    }
  }, [config, currentInterval, currentRound]);

  // Primary loop manager
  const startTimerLoops = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remainingMs = intervalEndTimeRef.current - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsLeft(remainingSec);

      if (remainingMs <= 0) {
        handleIntervalCompletion();
      }
    }, 200);

    elapsedIntervalRef.current = setInterval(() => {
      setTotalElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [handleIntervalCompletion]);

  // Start workout
  const handleStart = () => {
    setCurrentInterval('run');
    setCurrentRound(1);
    setSecondsLeft(config.runSeconds);
    setTotalElapsedSeconds(0);
    setStatus('running');

    intervalEndTimeRef.current = Date.now() + config.runSeconds * 1000;
    startTimerLoops();
  };

  // Pause workout
  const handlePause = () => {
    setStatus('paused');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
  };

  // Resume workout
  const handleResume = () => {
    setStatus('running');
    intervalEndTimeRef.current = Date.now() + secondsLeft * 1000;
    startTimerLoops();
  };

  // Reset workout
  const handleReset = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);

    setStatus('idle');
    setCurrentInterval('run');
    setSecondsLeft(config.runSeconds);
    setCurrentRound(1);
    setTotalElapsedSeconds(0);
  };

  // Skip interval
  const handleSkip = () => {
    handleIntervalCompletion();
  };

  // Save new configuration
  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    if (status === 'idle') {
      setSecondsLeft(newConfig.runSeconds);
    }
  };

  // Keyboard shortcuts (Space, R, S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSettingsOpen) return; // Don't trigger shortcuts when modal is open

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'idle' || status === 'completed') handleStart();
        else if (status === 'running') handlePause();
        else if (status === 'paused') handleResume();
      } else if (e.code === 'KeyR') {
        if (status !== 'idle') handleReset();
      } else if (e.code === 'KeyS') {
        if (status === 'running' || status === 'paused') handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, isSettingsOpen, secondsLeft, config]);

  const totalIntervalSeconds = currentInterval === 'run' ? config.runSeconds : config.walkSeconds;
  const isRunningPhase = currentInterval === 'run';
  const nextIntervalName = isRunningPhase ? 'Walk' : 'Run';
  const nextIntervalDuration = isRunningPhase ? config.walkSeconds : config.runSeconds;
  const nextIntervalEmoji = isRunningPhase ? '🚶' : '🏃';

  let heroCardClass = 'timer-hero-card';
  if (status === 'running' || status === 'idle') {
    heroCardClass += isRunningPhase ? ' is-run' : ' is-walk';
  } else if (status === 'paused') {
    heroCardClass += ' is-paused';
  } else if (status === 'completed') {
    heroCardClass += ' is-completed';
  }

  return (
    <main className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-icon-badge">
            <Zap size={22} fill="currentColor" />
          </div>
          <div className="logo-title-group">
            <h1>PACE<span className="brand-accent">PULSE</span></h1>
            <span className="logo-subtitle">Run / Walk Practice Timer</span>
          </div>
        </div>

        <div className="header-badge">
          <Clock size={14} />
          <span>TOTAL:</span>
          <span className="elapsed-val">{formatTime(totalElapsedSeconds)}</span>
        </div>
      </header>

      {/* Hero Timer Display Card */}
      <section className={heroCardClass} aria-label="Practice Timer">
        {/* Round Badge */}
        <div
          className="round-pill"
          style={{
            color: isRunningPhase ? 'var(--color-run)' : 'var(--color-walk)',
          }}
        >
          {config.isInfinite
            ? `ROUND ${currentRound} (ENDLESS)`
            : `ROUND ${Math.min(currentRound, config.rounds)} / ${config.rounds}`}
        </div>

        {/* Circular SVG Timer */}
        <CircularTimer
          status={status}
          currentInterval={currentInterval}
          secondsLeft={secondsLeft}
          totalIntervalSeconds={totalIntervalSeconds}
        />

        {/* Next Up Bar */}
        {status !== 'completed' && (
          <div className="next-up-bar">
            <span className="next-up-label">UP NEXT</span>
            <div className="next-up-val">
              <span>{nextIntervalEmoji}</span>
              <span>{nextIntervalName}</span>
              <span className="next-up-duration">({formatTime(nextIntervalDuration)})</span>
            </div>
          </div>
        )}
      </section>

      {/* Action Controls */}
      <Controls
        status={status}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
        onSkip={handleSkip}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Workout Plan Summary */}
      <section className="workout-summary-card" aria-label="Current Plan">
        <div className="summary-col">
          <span className="summary-col-label">RUN INTERVAL</span>
          <span className="summary-col-val color-run">
            {formatHumanTime(config.runSeconds)}
          </span>
        </div>

        <div className="summary-divider"></div>

        <div className="summary-col">
          <span className="summary-col-label">WALK INTERVAL</span>
          <span className="summary-col-val color-walk">
            {formatHumanTime(config.walkSeconds)}
          </span>
        </div>

        <div className="summary-divider"></div>

        <div className="summary-col">
          <span className="summary-col-label">TOTAL PLAN</span>
          <span className="summary-col-val">
            {config.isInfinite ? 'Endless' : `${config.rounds} Rounds`}
          </span>
        </div>
      </section>

      {/* Desktop Keyboard Hints */}
      <footer className="footer-hints">
        <span><kbd className="kbd-hint">Space</kbd> Start/Pause</span>
        <span>•</span>
        <span><kbd className="kbd-hint">R</kbd> Reset</span>
        <span>•</span>
        <span><kbd className="kbd-hint">S</kbd> Skip</span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onSave={handleSaveConfig}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
