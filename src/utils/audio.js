/**
 * High-performance Web Audio API Sound Synthesizer.
 * Generates the identical 1.45-second 3-stage athletic chime (E5 -> G5 -> C6)
 * with zero file loading lag and zero CORS issues across all modern browsers.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
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
 * Plays the 3-stage ascending athletic chime (1.45s).
 * Note 1: E5 (659Hz) at 0.0s
 * Note 2: G5 (784Hz) at 0.32s
 * Note 3: High C6 (1046.5Hz) at 0.64s to 1.45s with long sustained ring
 */
export function playChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      // Fallback to HTML5 audio element if Web Audio is unsupported
      const audio = new Audio('/beep.wav');
      audio.play().catch(() => {});
      return;
    }

    const now = ctx.currentTime;
    // Stage 1: E5
    playBellTone(ctx, 659.25, now + 0.0, 0.3, 8.0, 0.85);
    // Stage 2: G5
    playBellTone(ctx, 783.99, now + 0.32, 0.3, 7.5, 0.90);
    // Stage 3: C6 finish chime
    playBellTone(ctx, 1046.50, now + 0.64, 0.8, 3.8, 1.0);
  } catch (error) {
    console.warn('Audio playback error:', error);
    try {
      const audio = new Audio('/beep.wav');
      audio.play().catch(() => {});
    } catch {
      // Ignore
    }
  }
}
