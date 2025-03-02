'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FacialRecognition from '@/components/FacialRecognition';
import AdminRegistrationForm from '@/components/AdminRegistrationForm';
import styles from './page.module.css';

interface RegisterResponse {
  error?: string;
}

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showFaceDetection, setShowFaceDetection] = useState(false);
  const [isAdminRegistration, setIsAdminRegistration] = useState(false);
  const stopCameraRef = useRef<(() => void) | undefined>();

  const handleFaceDetected = async (data: Float32Array | string) => {
    if (isRegistering) return;
    
    try {
      setIsRegistering(true);
      setError('');

      const response: Response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          faceDescriptor: Array.from(data as Float32Array),
          role: 'WORKER',
        }),
      });

      const responseData: RegisterResponse = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Registration failed');
      }

      // Registration successful
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <h2 className={styles.title}>
          {isAdminRegistration ? 'Admin Registration' : 'Register with Face ID'}
        </h2>

        {!isAdminRegistration && !showFaceDetection ? (
          <>
            <div className={styles.registrationOptions}>
              <button
                onClick={() => setIsAdminRegistration(false)}
                className={`${styles.optionButton} ${!isAdminRegistration ? styles.optionButtonActive : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Register as Worker
              </button>
              <button
                onClick={() => setIsAdminRegistration(true)}
                className={`${styles.optionButton} ${isAdminRegistration ? styles.optionButtonActive : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Register as Admin
              </button>
            </div>

            <form className={styles.form}>
              <div className={styles.inputGroup}>
                <div>
                  <label htmlFor="email" className={styles.srOnly}>
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={styles.input}
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="name" className={styles.srOnly}>
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className={styles.error}>{error}</div>
              )}

              {email && name && (
                <button
                  type="button"
                  onClick={() => setShowFaceDetection(true)}
                  className={styles.primaryButton}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span>Start Face Detection</span>
                </button>
              )}
            </form>
          </>
        ) : !isAdminRegistration && showFaceDetection ? (
          <div className={styles.cameraContainer}>
            <div className={styles.cameraWrapper}>
              <FacialRecognition
                onFaceDetected={handleFaceDetected}
                mode="register"
                stopRef={stopCameraRef}
              />
            </div>
            <button
              type="button"
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
          <AdminRegistrationForm onCancel={() => setIsAdminRegistration(false)} />
        )}

        <div className={styles.footer}>
          <span className={styles.footerText}>Already registered?</span>
          {' '}
          <Link 
            href="/login" 
            className={styles.link}
          >
            Login here
          </Link>
        </div>
      </div>

      <div className={styles.sideContent}>
        <h2>Welcome to Construction Site</h2>
        <p>Register with facial recognition for secure and easy access.</p>
      </div>
    </div>
  );
} 