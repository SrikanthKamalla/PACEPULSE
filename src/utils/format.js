/**
 * Formats seconds into MM:SS format.
 * E.g., 65 -> "01:05", 120 -> "02:00"
 */
export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const padMin = String(minutes).padStart(2, '0');
  const padSec = String(seconds).padStart(2, '0');
  return `${padMin}:${padSec}`;
}

/**
 * Formats seconds into "2m 30s" or "45s".
 */
export function formatHumanTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
