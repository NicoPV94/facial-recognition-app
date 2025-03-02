'use client';

import { useState, useRef } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FacialRecognition from '@/components/FacialRecognition';
import AdminLoginForm from '@/components/AdminLoginForm';
import SafetyAnnouncements from '@/components/SafetyAnnouncements';
import styles from './page.module.css';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showFaceDetection, setShowFaceDetection] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
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

      // Successful login, redirect to worker dashboard
      router.push('/worker-dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again later.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Construction Site
          </h2>
          <p className={styles.subtitle}>
            Login System
          </p>
        </div>

        {error && (
          <div className={styles.error}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {!showFaceDetection && !isAdminLogin ? (
          <div className={styles.loginOptions}>
            <button
              onClick={() => setShowFaceDetection(true)}
              className={styles.primaryButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>Worker Login with Face ID</span>
            </button>
            <button
              onClick={() => setIsAdminLogin(true)}
              className={styles.secondaryButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>Admin Login</span>
            </button>
          </div>
        ) : showFaceDetection ? (
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
        ) : (
          <AdminLoginForm onCancel={() => setIsAdminLogin(false)} />
        )}

        <div className={styles.footer}>
          <span className={styles.footerText}>New worker?</span>
          {' '}
          <Link 
            href="/register" 
            className={styles.link}
          >
            Register here
          </Link>
        </div>
      </div>
      
      <div className={styles.sideContent}>
        <h2>Welcome to Construction Site</h2>
        <p>Use facial recognition to securely access your account.</p>
        <div className={styles.sideAnnouncements}>
          <SafetyAnnouncements />
        </div>
      </div>
    </div>
  );
} 