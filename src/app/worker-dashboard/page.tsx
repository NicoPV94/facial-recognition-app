'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Clock from '@/components/Clock';
import TimeStats from '@/components/TimeStats';
import WeeklyTimesheet from '@/components/WeeklyTimesheet';
import Snackbar from '@/components/Snackbar';
import styles from './page.module.css';

interface UserPunchState {
  name: string;
  email: string;
  isPunchedIn: boolean;
  isOnBreak: boolean;
  lastPunchIn?: Date;
  lastPunchOut?: Date;
  lastBreakStart?: Date;
  lastBreakEnd?: Date;
  hoursToday: number;
  hoursThisWeek: number;
  breakTimeToday: number;
  weeklyTimesheet: {
    date: string;
    hoursWorked: number;
    breakTime: number;
  }[];
}

export default function WorkerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userState, setUserState] = useState<UserPunchState | null>(null);
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserState = async () => {
      try {
        const response = await fetch('/api/user/punch-state');
        if (!response.ok) {
          throw new Error('Failed to fetch user state');
        }
        const data = await response.json();
        setUserState({
          name: data.name,
          email: data.email,
          isPunchedIn: data.isPunchedIn,
          isOnBreak: data.isOnBreak,
          lastPunchIn: data.lastPunchIn ? new Date(data.lastPunchIn) : undefined,
          lastPunchOut: data.lastPunchOut ? new Date(data.lastPunchOut) : undefined,
          lastBreakStart: data.lastBreakStart ? new Date(data.lastBreakStart) : undefined,
          lastBreakEnd: data.lastBreakEnd ? new Date(data.lastBreakEnd) : undefined,
          hoursToday: data.hoursToday || 0,
          hoursThisWeek: data.hoursThisWeek || 0,
          breakTimeToday: data.breakTimeToday || 0,
          weeklyTimesheet: data.weeklyTimesheet || [],
        });
      } catch (error) {
        console.error('Error fetching user state:', error);
      }
    };

    if (session?.user) {
      fetchUserState();
    }
  }, [session]);

  const handleBreak = async () => {
    if (!userState) return;

    try {
      const action = userState.isOnBreak ? 'end' : 'start';
      const response = await fetch('/api/user/break', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to record break');
      }

      const data = await response.json();
      setUserState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          isOnBreak: !prev.isOnBreak,
          lastBreakStart: action === 'start' ? new Date() : prev.lastBreakStart,
          lastBreakEnd: action === 'end' ? new Date() : prev.lastBreakEnd,
          breakTimeToday: data.breakTimeToday || prev.breakTimeToday,
        };
      });
    } catch (err) {
      setSnackbar({
        show: true,
        message: 'Failed to record break. Please try again.',
        type: 'error'
      });
    }
  };

  const handlePunch = async () => {
    if (!userState) return;

    try {
      const action = userState.isPunchedIn ? 'out' : 'in';
      
      const response = await fetch('/api/user/punch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to record punch');
      }

      const data = await response.json();
      
      setSnackbar({
        show: true,
        message: `Successfully punched ${action}!`,
        type: 'success'
      });

      // Sign out after a short delay to show the success message for both punch in and out
      setTimeout(() => {
        signOut({ redirect: true, callbackUrl: '/login' });
      }, 1500);

    } catch (err) {
      setSnackbar({
        show: true,
        message: 'Failed to record punch. Please try again.',
        type: 'error'
      });
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  if (status === 'loading' || !userState) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Welcome, {userState.name}!
          </h1>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Log Out
          </button>
        </div>

        <Clock />

        <div className={styles.userInfo}>
          <p className={styles.userEmail}>{userState.email}</p>
        </div>

        <div className={styles.buttonGroup}>
          <button
            onClick={handlePunch}
            className={userState.isPunchedIn ? styles.punchOutButton : styles.punchInButton}
            disabled={userState.isOnBreak}
          >
            {userState.isPunchedIn ? 'Punch Out' : 'Punch In'}
          </button>

          {userState.isPunchedIn && (
            <button
              onClick={handleBreak}
              className={userState.isOnBreak ? styles.breakEndButton : styles.breakStartButton}
            >
              {userState.isOnBreak ? 'End Break' : 'Start Break'}
            </button>
          )}
        </div>

        <TimeStats
          lastPunchIn={userState.lastPunchIn}
          lastPunchOut={userState.lastPunchOut}
          lastBreakStart={userState.lastBreakStart}
          lastBreakEnd={userState.lastBreakEnd}
          hoursToday={userState.hoursToday}
          hoursThisWeek={userState.hoursThisWeek}
          breakTimeToday={userState.breakTimeToday}
        />

        <WeeklyTimesheet timesheet={userState.weeklyTimesheet} />
      </div>

      <div className={styles.sideContent}>
        <h2>Welcome to Construction Site</h2>
        <p>Track your work hours and breaks efficiently.</p>
      </div>

      <Snackbar
        show={snackbar.show}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
} 