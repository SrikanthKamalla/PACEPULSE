/**
 * High-performance Audio Manager for PacePulse.
 * Provides dual-mode audio support:
 * 1. Pre-warmed HTML5 Audio element for background & lock-screen chime playback.
 * 2. Web Audio API synthesized 3-stage chime (E5 -> G5 -> C6) for foreground clarity.
 * 3. Silent audio keep-alive & Media Session API integration to keep iOS/Android
 *    audio sessions active when the phone screen is locked.
 */

let audioCtx = null;
let chimeAudio = null;
let silentAudio = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getChimeAudio() {
  if (!chimeAudio && typeof Audio !== 'undefined') {
    chimeAudio = new Audio('/beep.wav');
    chimeAudio.preload = 'auto';
  }
  return chimeAudio;
}

function getSilentAudio() {
  if (!silentAudio && typeof Audio !== 'undefined') {
    silentAudio = new Audio('/silence.wav');
    silentAudio.loop = true;
    silentAudio.volume = 0.01; // Non-zero volume so mobile OS registers active audio session
  }
  return silentAudio;
}

/**
 * Initializes and unlocks audio elements and AudioContext upon user gesture.
 */
export function initAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (error) {
    console.warn('initAudio AudioContext error:', error);
  }

  try {
    const chime = getChimeAudio();
    if (chime) {
      chime.load();
    }
  } catch (error) {
    console.warn('initAudio chime error:', error);
  }

  try {
    const silent = getSilentAudio();
    if (silent) {
      silent.load();
    }
  } catch (error) {
    console.warn('initAudio silent error:', error);
  }
}

/**
 * Starts background silent audio loop to prevent mobile OS from suspending
 * the browser tab or killing audio when the screen is locked.
 */
export function startBackgroundAudio() {
  try {
    const silent = getSilentAudio();
    if (silent) {
      silent.play().catch((err) => {
        console.warn('Background audio keep-alive play warning:', err);
      });
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  } catch (e) {
    console.warn('startBackgroundAudio error:', e);
  }
}

/**
 * Pauses background silent audio loop.
 */
export function stopBackgroundAudio() {
  try {
    if (silentAudio) {
      silentAudio.pause();
      silentAudio.currentTime = 0;
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  } catch {
    // Ignore
  }
}

/**
 * Configures lock-screen Media Session controls (Play, Pause, Skip).
 */
export function setupMediaSession({ onPlay, onPause, onSkip }) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.setActionHandler('play', () => {
      if (onPlay) onPlay();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (onPause) onPause();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (onSkip) onSkip();
    });
  } catch (err) {
    console.warn('MediaSession setActionHandler error:', err);
  }
}

/**
 * Updates metadata shown on the mobile lock screen.
 */
export function updateMediaSessionMetadata({ phase, round, totalRounds, isInfinite }) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    const phaseName = phase === 'run' ? '🏃 RUN' : '🚶 WALK';
    const roundText = isInfinite ? `Round ${round} (Endless)` : `Round ${round} / ${totalRounds}`;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${phaseName} • ${roundText}`,
      artist: 'PacePulse Run/Walk Timer',
      album: 'Workout Active',
    });
  } catch {
    // Ignore
  }
}

/**
 * Synthesizes a resonant bell tone with harmonic overtones and exponential decay.
 */
function playBellTone(ctx, freq, startTime, duration, decayRate, gainLevel = 1.0) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Fundamental + Octave + 3rd harmonic
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, startTime);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime);

  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq * 3, startTime);

  // Gain envelope: fast 4ms attack, smooth exponential decay
  gainNode.gain.setValueAtTime(0.001, startTime);
  gainNode.gain.linearRampToValueAtTime(0.7 * gainLevel, startTime + 0.004);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  // Connect
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  osc3.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Trigger
  osc1.start(startTime);
  osc2.start(startTime);
  osc3.start(startTime);

  osc1.stop(startTime + duration);
  osc2.stop(startTime + duration);
  osc3.stop(startTime + duration);
}

/**
 * Plays the interval transition chime.
 * Uses both HTML5 audio (for lock-screen reliability) and Web Audio API (for foreground fidelity).
 */
export function playChime() {
  // 1. Play HTML5 Audio element (succeeds in lock screen / background audio sessions)
  try {
    const chime = getChimeAudio();
    if (chime) {
      chime.currentTime = 0;
      chime.play().catch((err) => {
        console.warn('HTML5 chime play error:', err);
      });
    }
  } catch (err) {
    console.warn('HTML5 chime error:', err);
  }

  // 2. Play Web Audio synthesizer if active in foreground
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'running') {
      const now = ctx.currentTime;
      playBellTone(ctx, 659.25, now + 0.0, 0.3, 8.0, 0.85);
      playBellTone(ctx, 783.99, now + 0.32, 0.3, 7.5, 0.90);
      playBellTone(ctx, 1046.50, now + 0.64, 0.8, 3.8, 1.0);
    }
  } catch {
    // Ignore
  }
}
