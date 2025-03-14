'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './page.module.css';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Welcome, {session.user?.name || session.user?.email}!
          </h1>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Log Out
          </button>
        </div>

        <p className={styles.welcomeText}>
          You have successfully logged in using facial recognition.
        </p>

        <div className={styles.userInfo}>
          <div className={styles.userLabel}>
            Email: {session.user?.email}
          </div>
        </div>
      </div>

      <div className={styles.sideContent}>
        <h2>Welcome to Construction Site</h2>
        <p>View your account information and manage your settings.</p>
      </div>
    </div>
  );
} 