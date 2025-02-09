'use client';

import { useState, useRef } from 'react';
import { signIn } from 'next-auth/react';
import FacialRecognition from '@/components/FacialRecognition';
import Clock from '@/components/Clock';
import TimeStats from '@/components/TimeStats';
import SafetyAnnouncements from '@/components/SafetyAnnouncements';
import WeeklyTimesheet from '@/components/WeeklyTimesheet';
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

export default function Login() {
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showFaceDetection, setShowFaceDetection] = useState(false);
  const [userState, setUserState] = useState<UserPunchState | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const stopCameraRef = useRef<(() => void) | undefined>();

  const handleFaceDetected = async (data: Float32Array | string) => {
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      setError('');

      console.log('Attempting facial authentication...');
      const result = await signIn('credentials', {
        faceDescriptor: JSON.stringify(Array.from(data as Float32Array)),
        redirect: false,
      });

      if (result?.error) {
        console.error('Authentication failed:', result.error);
        let errorMessage = 'Authentication failed. Please try again.';
        
        // Map specific error messages
        switch (result.error) {
          case 'Face descriptor is required':
            errorMessage = 'Face detection failed. Please try again.';
            break;
          case 'No registered users found':
            errorMessage = 'No registered users found. Please register first.';
            break;
          case 'Invalid face descriptor format':
            errorMessage = 'Invalid face data. Please try again.';
            break;
          case 'Face not recognized':
            errorMessage = 'Face not recognized. Please try again or register if you haven\'t already.';
            break;
          default:
            if (result.error.includes('database')) {
              errorMessage = 'Database error. Please try again later.';
            }
        }
        
        setError(errorMessage);
        return;
      }

      console.log('Authentication successful, fetching user data...');
      // Fetch user data and punch state
      const response = await fetch('/api/user/punch-state');
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      console.log('User data fetched successfully');

      setUserState({
        name: userData.name,
        email: userData.email,
        isPunchedIn: userData.isPunchedIn,
        isOnBreak: userData.isOnBreak,
        lastPunchIn: userData.lastPunchIn ? new Date(userData.lastPunchIn) : undefined,
        lastPunchOut: userData.lastPunchOut ? new Date(userData.lastPunchOut) : undefined,
        lastBreakStart: userData.lastBreakStart ? new Date(userData.lastBreakStart) : undefined,
        lastBreakEnd: userData.lastBreakEnd ? new Date(userData.lastBreakEnd) : undefined,
        hoursToday: userData.hoursToday || 0,
        hoursThisWeek: userData.hoursThisWeek || 0,
        breakTimeToday: userData.breakTimeToday || 0,
        weeklyTimesheet: userData.weeklyTimesheet || [],
      });

      setShowFaceDetection(false);
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again later.');
    } finally {
      setIsLoggingIn(false);
    }
  };

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
      setError('Failed to record break. Please try again.');
    }
  };

  const capturePhoto = async () => {
    if (!userState) return;
    setIsCapturingPhoto(true);
  };

  const handlePhotoTaken = async (data: Float32Array | string) => {
    try {
      await fetch('/api/user/punch-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          photoData: data as string,
          action: userState?.isPunchedIn ? 'out' : 'in',
          timestamp: new Date().toISOString()
        }),
      });
    } catch (err) {
      console.error('Failed to upload punch photo:', err);
    } finally {
      setIsCapturingPhoto(false);
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
      setUserState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          isPunchedIn: !prev.isPunchedIn,
          isOnBreak: false, // Reset break state on punch out
          lastPunchIn: action === 'in' ? new Date() : prev.lastPunchIn,
          lastPunchOut: action === 'out' ? new Date() : prev.lastPunchOut,
          hoursToday: data.hoursToday || prev.hoursToday,
          hoursThisWeek: data.hoursThisWeek || prev.hoursThisWeek,
          weeklyTimesheet: data.weeklyTimesheet || prev.weeklyTimesheet,
        };
      });
    } catch (err) {
      setError('Failed to record punch. Please try again.');
    }
  };

  const handleStartOver = () => {
    setUserState(null);
    setShowFaceDetection(false);
    setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          {!userState ? (
            <>
              <h2 className={styles.title}>
                Construction Site
              </h2>
              <p className={styles.subtitle}>
                Punch In/Out System
              </p>

              <Clock />
              <SafetyAnnouncements />

              {error && (
                <div className={styles.error}>
                  <p className={styles.errorText}>{error}</p>
                </div>
              )}

              {!showFaceDetection ? (
                <button
                  onClick={() => setShowFaceDetection(true)}
                  className={styles.primaryButton}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span>Start Face Detection</span>
                </button>
              ) : (
                <div className={styles.cameraContainer}>
                  <div className={styles.cameraWrapper}>
                    <FacialRecognition
                      onFaceDetected={handleFaceDetected}
                      mode="login"
                      stopRef={stopCameraRef}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (stopCameraRef.current) {
                        stopCameraRef.current();
                      }
                      setShowFaceDetection(false);
                      setError('');
                    }}
                    className={styles.secondaryButton}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={styles.cancelIcon} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <Clock />

              <div className={styles.userInfo}>
                <h2 className={styles.userName}>{userState.name}</h2>
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

              <SafetyAnnouncements />

              <button
                onClick={handleStartOver}
                className={styles.secondaryButton}
                style={{ marginTop: '2rem' }}
              >
                Start Over
              </button>
            </>
          )}

          <div className={styles.footer}>
            <span className={styles.footerText}>New worker?</span>
            {' '}
            <a 
              href="/register" 
              className={styles.link}
            >
              Register here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 