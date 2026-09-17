/**
 * Resilient Web Worker Timer.
 * Web Workers run on background threads and are not throttled to once-per-minute
 * like window.setInterval when mobile screens are locked.
 */

export function createTimerWorker() {
  const workerCode = `
    let timerId = null;

    self.onmessage = function (e) {
      const data = e.data;
      if (data && data.type === 'START') {
        const intervalMs = data.intervalMs || 250;
        if (timerId) clearInterval(timerId);
        timerId = setInterval(function () {
          self.postMessage({ type: 'TICK' });
        }, intervalMs);
      } else if (data && data.type === 'STOP') {
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
      }
    };
  `;

  let worker = null;
  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    worker = new Worker(blobUrl);
    // Revoke object URL after initialization to free memory
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Web Worker creation failed, falling back to window interval:', err);
  }

  return {
    start(intervalMs, onTick) {
      if (worker) {
        worker.onmessage = (e) => {
          if (e.data && e.data.type === 'TICK') {
            onTick();
          }
        };
        worker.postMessage({ type: 'START', intervalMs: intervalMs || 250 });
      }
    },
    stop() {
      if (worker) {
        worker.postMessage({ type: 'STOP' });
      }
    },
    terminate() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },
  };
}
