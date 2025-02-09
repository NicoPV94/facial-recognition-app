'use client';

import { useState } from 'react';
import styles from './WeeklyTimesheet.module.css';

interface TimesheetEntry {
  date: string;
  hoursWorked: number;
  breakTime: number;
}

interface WeeklyTimesheetProps {
  timesheet: TimesheetEntry[];
}

export default function WeeklyTimesheet({ timesheet }: WeeklyTimesheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const totalHours = timesheet.reduce((sum, entry) => sum + entry.hoursWorked, 0);
  const totalBreakTime = timesheet.reduce((sum, entry) => sum + entry.breakTime, 0);

  return (
    <div className={styles.container}>
      <div 
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className={styles.title}>Weekly Timesheet</h3>
        <div className={styles.summary}>
          <span className={styles.totalHours}>
            Total: {formatHours(totalHours)}
          </span>
          <button className={styles.toggleButton}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.content}>
          <div className={styles.tableHeader}>
            <span>Date</span>
            <span>Work Hours</span>
            <span>Break Time</span>
          </div>
          {timesheet.map((entry) => (
            <div key={entry.date} className={styles.row}>
              <span className={styles.date}>{formatDate(entry.date)}</span>
              <span className={styles.hours}>{formatHours(entry.hoursWorked)}</span>
              <span className={styles.break}>{formatHours(entry.breakTime)}</span>
            </div>
          ))}
          <div className={styles.totals}>
            <span>Week Total</span>
            <span>{formatHours(totalHours)}</span>
            <span>{formatHours(totalBreakTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
} 