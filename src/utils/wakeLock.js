/**
 * Screen Wake Lock API Manager.
 * Prevents screens from turning off or dimming while workouts are actively running,
 * and automatically re-acquires the lock when the user unlocks or returns to the page.
 */

let wakeLockSentinel = null;
let isWorkoutActive = false;

export async function requestWakeLock() {
  isWorkoutActive = true;
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
  isWorkoutActive = false;
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // Ignore
    }
    wakeLockSentinel = null;
  }
}

// Auto-reacquire wake lock when phone is unlocked or user returns to tab
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isWorkoutActive) {
      requestWakeLock();
    }
  });
}
