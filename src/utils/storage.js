import { DEFAULT_CONFIG } from '../constants';

export const TIMER_STORAGE_KEY = 'pacepulse_preferred_timer';
export const LEGACY_RUN_KEY = 'pacepulse_run_seconds';
export const LEGACY_WALK_KEY = 'pacepulse_walk_seconds';

/**
 * Validates a number, ensuring it is a positive integer at or above the minimum.
 */
function sanitizeSeconds(val, defaultVal, minVal = 5) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < minVal) {
    return defaultVal;
  }
  return Math.round(num);
}

/**
 * Load preferred timer config from localStorage.
 * Falls back safely to DEFAULT_CONFIG if unavailable or corrupt.
 */
export function getStoredTimerConfig() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          runSeconds: sanitizeSeconds(parsed.runSeconds, DEFAULT_CONFIG.runSeconds),
          walkSeconds: sanitizeSeconds(parsed.walkSeconds, DEFAULT_CONFIG.walkSeconds),
          rounds: sanitizeSeconds(parsed.rounds, DEFAULT_CONFIG.rounds, 1),
          isInfinite: typeof parsed.isInfinite === 'boolean' ? parsed.isInfinite : DEFAULT_CONFIG.isInfinite,
        };
      }
    }

    // Fallback: check individual keys if present
    const rawRun = window.localStorage.getItem(LEGACY_RUN_KEY) || window.localStorage.getItem('runSeconds');
    const rawWalk = window.localStorage.getItem(LEGACY_WALK_KEY) || window.localStorage.getItem('walkSeconds');

    if (rawRun || rawWalk) {
      return {
        ...DEFAULT_CONFIG,
        runSeconds: rawRun ? sanitizeSeconds(rawRun, DEFAULT_CONFIG.runSeconds) : DEFAULT_CONFIG.runSeconds,
        walkSeconds: rawWalk ? sanitizeSeconds(rawWalk, DEFAULT_CONFIG.walkSeconds) : DEFAULT_CONFIG.walkSeconds,
      };
    }
  } catch (err) {
    console.warn('Failed to load preferred timer from localStorage:', err);
  }

  return { ...DEFAULT_CONFIG };
}

/**
 * Save preferred running and walking timer config to localStorage.
 */
export function saveStoredTimerConfig(config) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const cleanConfig = {
      runSeconds: sanitizeSeconds(config.runSeconds, DEFAULT_CONFIG.runSeconds),
      walkSeconds: sanitizeSeconds(config.walkSeconds, DEFAULT_CONFIG.walkSeconds),
      rounds: sanitizeSeconds(config.rounds, DEFAULT_CONFIG.rounds, 1),
      isInfinite: Boolean(config.isInfinite),
    };

    // Store the complete preferred config object
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(cleanConfig));

    // Also persist individual timer values for direct key accessibility
    window.localStorage.setItem(LEGACY_RUN_KEY, String(cleanConfig.runSeconds));
    window.localStorage.setItem(LEGACY_WALK_KEY, String(cleanConfig.walkSeconds));
    window.localStorage.setItem('runSeconds', String(cleanConfig.runSeconds));
    window.localStorage.setItem('walkSeconds', String(cleanConfig.walkSeconds));
  } catch (err) {
    console.warn('Failed to save preferred timer to localStorage:', err);
  }
}

/**
 * Clear stored preferred timer from localStorage.
 */
export function clearStoredTimerConfig() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(TIMER_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_RUN_KEY);
    window.localStorage.removeItem(LEGACY_WALK_KEY);
    window.localStorage.removeItem('runSeconds');
    window.localStorage.removeItem('walkSeconds');
  } catch (err) {
    console.warn('Failed to clear timer config from localStorage:', err);
  }
}
