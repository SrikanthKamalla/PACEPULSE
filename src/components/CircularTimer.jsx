import React from 'react';
import { formatTime } from '../utils/format';

export function CircularTimer({
  status,
  currentInterval,
  secondsLeft,
  totalIntervalSeconds,
}) {
  const isRunningPhase = currentInterval === 'run';
  const isCompleted = status === 'completed';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle';

  // Calculate progress ratio (0 to 1)
  const progress = totalIntervalSeconds > 0
    ? Math.max(0, Math.min(1, (totalIntervalSeconds - secondsLeft) / totalIntervalSeconds))
    : 0;

  // Circular SVG geometry
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  let strokeColor = isRunningPhase ? '#10b981' : '#06b6d4';
  let badgeEmoji = isRunningPhase ? '🏃' : '🚶';
  let badgeText = isRunningPhase ? 'RUN' : 'WALK';
  let badgeBg = isRunningPhase ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)';
  let badgeColor = isRunningPhase ? '#10b981' : '#06b6d4';

  if (isCompleted) {
    strokeColor = '#eab308';
    badgeEmoji = '🏆';
    badgeText = 'COMPLETED';
    badgeBg = 'rgba(234, 179, 8, 0.2)';
    badgeColor = '#eab308';
  } else if (isIdle) {
    strokeColor = '#64748b';
    badgeEmoji = '⚡';
    badgeText = 'READY';
    badgeBg = 'rgba(100, 116, 139, 0.2)';
    badgeColor = '#94a3b8';
  }

  return (
    <div className="circular-timer-wrapper">
      <svg className="circular-svg" viewBox="0 0 280 280">
        {/* Background track circle */}
        <circle
          className="circle-bg"
          cx="140"
          cy="140"
          r={radius}
        />
        {/* Animated dynamic progress arc */}
        <circle
          className="circle-progress"
          cx="140"
          cy="140"
          r={radius}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>

      <div className="timer-center-content">
        <div
          className="phase-badge"
          style={{ backgroundColor: badgeBg, color: badgeColor }}
        >
          <span>{badgeEmoji}</span>
          <span>{isPaused ? 'PAUSED' : badgeText}</span>
        </div>

        <div className="countdown-digits">
          {formatTime(secondsLeft)}
        </div>

        <div className="seconds-left-subtext">
          {isCompleted ? 'Workout Finished' : `${Math.max(0, secondsLeft)}s remaining`}
        </div>
      </div>
    </div>
  );
}
