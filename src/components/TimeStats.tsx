'use client';

import styles from './TimeStats.module.css';

interface TimeStatsProps {
  lastPunchIn?: Date;
  lastPunchOut?: Date;
  lastBreakStart?: Date;
  lastBreakEnd?: Date;
  hoursToday: number;
  hoursThisWeek: number;
  breakTimeToday: number;
}

export default function TimeStats({
  lastPunchIn,
  lastPunchOut,
  lastBreakStart,
  lastBreakEnd,
  hoursToday,
  hoursThisWeek,
  breakTimeToday
}: TimeStatsProps) {
  const formatTime = (date?: Date) => {
    if (!date) return 'Not available';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.timeInfo}>
        <div className={styles.timeRow}>
          <span className={styles.timeLabel}>Last Punch In:</span>
          <span className={styles.timeValue}>{formatTime(lastPunchIn)}</span>
        </div>
        <div className={styles.timeRow}>
          <span className={styles.timeLabel}>Last Punch Out:</span>
          <span className={styles.timeValue}>{formatTime(lastPunchOut)}</span>
        </div>
        {(lastBreakStart || lastBreakEnd) && (
          <>
            <div className={styles.timeRow}>
              <span className={styles.timeLabel}>Last Break Start:</span>
              <span className={styles.timeValue}>{formatTime(lastBreakStart)}</span>
            </div>
            <div className={styles.timeRow}>
              <span className={styles.timeLabel}>Last Break End:</span>
              <span className={styles.timeValue}>{formatTime(lastBreakEnd)}</span>
            </div>
          </>
        )}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Today</span>
          <span className={styles.statValue}>{formatHours(hoursToday)}</span>
          {breakTimeToday > 0 && (
            <span className={styles.breakTime}>
              Break: {formatHours(breakTimeToday)}
            </span>
          )}
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>This Week</span>
          <span className={styles.statValue}>{formatHours(hoursThisWeek)}</span>
        </div>
      </div>
    </div>
  );
} 