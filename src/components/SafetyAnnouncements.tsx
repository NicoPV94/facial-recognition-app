'use client';

import { useState, useEffect } from 'react';
import styles from './SafetyAnnouncements.module.css';

interface Announcement {
  id: string;
  type: 'warning' | 'info' | 'alert';
  message: string;
  timestamp: string;
}

export default function SafetyAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/safety-announcements');
        if (!response.ok) throw new Error('Failed to fetch announcements');
        
        const data = await response.json();
        setAnnouncements(data);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
    // Refresh announcements every 5 minutes
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading || announcements.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Safety Announcements</h3>
      <div className={styles.list}>
        {announcements.map((announcement) => (
          <div 
            key={announcement.id}
            className={`${styles.announcement} ${styles[announcement.type]}`}
          >
            <div className={styles.message}>{announcement.message}</div>
            <div className={styles.timestamp}>
              {new Date(announcement.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 