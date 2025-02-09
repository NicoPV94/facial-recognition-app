'use client';

import { useEffect } from 'react';
import styles from './Snackbar.module.css';

interface SnackbarProps {
  message: string;
  type: 'success' | 'error';
  show: boolean;
  onClose: () => void;
}

export default function Snackbar({ message, type, show, onClose }: SnackbarProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={`${styles.snackbar} ${styles[type]}`}>
      <div className={styles.message}>{message}</div>
    </div>
  );
} 