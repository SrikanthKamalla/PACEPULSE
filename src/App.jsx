import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Clock } from 'lucide-react';
import { CircularTimer } from './components/CircularTimer';
import { Controls } from './components/Controls';
import { SettingsModal } from './components/SettingsModal';
import {
  playChime,
  initAudio,
  startBackgroundAudio,
  stopBackgroundAudio,
  setupMediaSession,
  updateMediaSessionMetadata,
} from './utils/audio';
import { requestWakeLock, releaseWakeLock } from './utils/wakeLock';
import { formatTime, formatHumanTime } from './utils/format';
import { createTimerWorker } from './utils/timerWorker';
import { getStoredTimerConfig, saveStoredTimerConfig } from './utils/storage';

export default function App() {
  const [config, setConfig] = useState(() => getStoredTimerConfig());
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'completed'
  const [currentInterval, setCurrentInterval] = useState('run'); // 'run' | 'walk'
  const [secondsLeft, setSecondsLeft] = useState(() => getStoredTimerConfig().runSeconds);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const intervalEndTimeRef = useRef(0);
  const timerIntervalRef = useRef(null);
  const timerWorkerRef = useRef(null);
  const elapsedIntervalRef = useRef(null);

  // Synchronized refs to avoid stale closure issues in timer callbacks & key listeners
  const configRef = useRef(config);
  const statusRef = useRef(status);
  const currentIntervalRef = useRef(currentInterval);
  const currentRoundRef = useRef(currentRound);
  const secondsLeftRef = useRef(secondsLeft);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    currentIntervalRef.current = currentInterval;
  }, [currentInterval]);

  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // Initialize Web Worker timer on mount
  useEffect(() => {
    timerWorkerRef.current = createTimerWorker();
    return () => {
      if (timerWorkerRef.current) timerWorkerRef.current.terminate();
    };
  }, []);

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
      const dur = currentInterval === 'run' ? config.runSeconds : config.walkSeconds;
      setSecondsLeft(dur);
      secondsLeftRef.current = dur;
    }
  }, [config, status, currentInterval]);

  const clearAllTimerLoops = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (timerWorkerRef.current) timerWorkerRef.current.stop();
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimerLoops();
      stopBackgroundAudio();
    };
  }, [clearAllTimerLoops]);

  // Interval completion transition
  const handleIntervalCompletion = useCallback(() => {
    playChime();

    const currInterval = currentIntervalRef.current;
    const currRound = currentRoundRef.current;
    const currConfig = configRef.current;

    if (currInterval === 'run') {
      // Transition Run -> Walk
      setCurrentInterval('walk');
      currentIntervalRef.current = 'walk';
      setSecondsLeft(currConfig.walkSeconds);
      secondsLeftRef.current = currConfig.walkSeconds;
      intervalEndTimeRef.current = Date.now() + currConfig.walkSeconds * 1000;

      updateMediaSessionMetadata({
        phase: 'walk',
        round: currRound,
        totalRounds: currConfig.rounds,
        isInfinite: currConfig.isInfinite,
      });
    } else {
      // Transition Walk -> Next Round or Completed
      const isLastRound = !currConfig.isInfinite && currRound >= currConfig.rounds;

      if (isLastRound) {
        setStatus('completed');
        statusRef.current = 'completed';
        setSecondsLeft(0);
        secondsLeftRef.current = 0;
        clearAllTimerLoops();
        stopBackgroundAudio();
      } else {
        const nextRound = currRound + 1;
        setCurrentRound(nextRound);
        currentRoundRef.current = nextRound;
        setCurrentInterval('run');
        currentIntervalRef.current = 'run';
        setSecondsLeft(currConfig.runSeconds);
        secondsLeftRef.current = currConfig.runSeconds;
        intervalEndTimeRef.current = Date.now() + currConfig.runSeconds * 1000;

        updateMediaSessionMetadata({
          phase: 'run',
          round: nextRound,
          totalRounds: currConfig.rounds,
          isInfinite: currConfig.isInfinite,
        });
      }
    }
  }, [clearAllTimerLoops]);

  // Primary loop manager (dual window interval + background Web Worker timer)
  const startTimerLoops = useCallback(() => {
    clearAllTimerLoops();

    const tick = () => {
      const now = Date.now();
      const remainingMs = intervalEndTimeRef.current - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsLeft(remainingSec);
      secondsLeftRef.current = remainingSec;

      if (remainingMs <= 0) {
        handleIntervalCompletion();
      }
    };

    // Main window timer
    timerIntervalRef.current = setInterval(tick, 200);

    // Resilient Web Worker timer for background thread ticks when phone is locked
    if (timerWorkerRef.current) {
      timerWorkerRef.current.start(250, tick);
    }

    elapsedIntervalRef.current = setInterval(() => {
      setTotalElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [clearAllTimerLoops, handleIntervalCompletion]);

  // Start workout
  const handleStart = useCallback(() => {
    initAudio();
    startBackgroundAudio();
    const currConfig = configRef.current;
    setCurrentInterval('run');
    currentIntervalRef.current = 'run';
    setCurrentRound(1);
    currentRoundRef.current = 1;
    setSecondsLeft(currConfig.runSeconds);
    secondsLeftRef.current = currConfig.runSeconds;
    setTotalElapsedSeconds(0);
    setStatus('running');
    statusRef.current = 'running';

    intervalEndTimeRef.current = Date.now() + currConfig.runSeconds * 1000;
    startTimerLoops();

    updateMediaSessionMetadata({
      phase: 'run',
      round: 1,
      totalRounds: currConfig.rounds,
      isInfinite: currConfig.isInfinite,
    });
  }, [startTimerLoops]);

  // Pause workout
  const handlePause = useCallback(() => {
    setStatus('paused');
    statusRef.current = 'paused';
    clearAllTimerLoops();
    stopBackgroundAudio();
  }, [clearAllTimerLoops]);

  // Resume workout
  const handleResume = useCallback(() => {
    initAudio();
    startBackgroundAudio();
    setStatus('running');
    statusRef.current = 'running';
    const remaining = secondsLeftRef.current;
    intervalEndTimeRef.current = Date.now() + remaining * 1000;
    startTimerLoops();

    updateMediaSessionMetadata({
      phase: currentIntervalRef.current,
      round: currentRoundRef.current,
      totalRounds: configRef.current.rounds,
      isInfinite: configRef.current.isInfinite,
    });
  }, [startTimerLoops]);

  // Reset workout
  const handleReset = useCallback(() => {
    clearAllTimerLoops();
    stopBackgroundAudio();

    const currConfig = configRef.current;
    setStatus('idle');
    statusRef.current = 'idle';
    setCurrentInterval('run');
    currentIntervalRef.current = 'run';
    setCurrentRound(1);
    currentRoundRef.current = 1;
    setSecondsLeft(currConfig.runSeconds);
    secondsLeftRef.current = currConfig.runSeconds;
    setTotalElapsedSeconds(0);
  }, [clearAllTimerLoops]);

  // Skip interval
  const handleSkip = useCallback(() => {
    initAudio();
    const currStatus = statusRef.current;
    if (currStatus === 'running' || currStatus === 'paused') {
      handleIntervalCompletion();
    }
  }, [handleIntervalCompletion]);

  // Setup lock-screen media session controls once
  useEffect(() => {
    setupMediaSession({
      onPlay: () => {
        if (statusRef.current === 'paused') handleResume();
        else if (statusRef.current === 'idle') handleStart();
      },
      onPause: () => {
        if (statusRef.current === 'running') handlePause();
      },
      onSkip: () => {
        if (statusRef.current === 'running' || statusRef.current === 'paused') handleSkip();
      },
    });
  }, [handleStart, handlePause, handleResume, handleSkip]);

  // Re-sync immediately on phone unlock / visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'running') {
        const now = Date.now();
        const remainingMs = intervalEndTimeRef.current - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        setSecondsLeft(remainingSec);
        secondsLeftRef.current = remainingSec;
        if (remainingMs <= 0) {
          handleIntervalCompletion();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [handleIntervalCompletion]);

  // Save new configuration to state and localStorage
  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    configRef.current = newConfig;
    saveStoredTimerConfig(newConfig);
    if (statusRef.current === 'idle') {
      const dur = currentIntervalRef.current === 'run' ? newConfig.runSeconds : newConfig.walkSeconds;
      setSecondsLeft(dur);
      secondsLeftRef.current = dur;
    }
  };

  // Keyboard shortcuts (Space, R, S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSettingsOpen) return; // Don't trigger shortcuts when modal is open

      if (e.code === 'Space') {
        e.preventDefault();
        const currStatus = statusRef.current;
        if (currStatus === 'idle' || currStatus === 'completed') handleStart();
        else if (currStatus === 'running') handlePause();
        else if (currStatus === 'paused') handleResume();
      } else if (e.code === 'KeyR') {
        if (statusRef.current !== 'idle') handleReset();
      } else if (e.code === 'KeyS') {
        if (statusRef.current === 'running' || statusRef.current === 'paused') handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, handleStart, handlePause, handleResume, handleReset, handleSkip]);

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
