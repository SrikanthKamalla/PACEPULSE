/**
 * Screen Wake Lock API Manager.
 * Prevents screens from turning off or dimming while workouts are actively running.
 */

let wakeLockSentinel = null;

export async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch (err) {
      console.warn('Screen Wake Lock request failed:', err);
    }
  }
}

export async function releaseWakeLock() {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // Ignore
    }
    wakeLockSentinel = null;
  }
}
