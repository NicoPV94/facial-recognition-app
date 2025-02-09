import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // If user is authenticated, redirect to dashboard
  redirect('/dashboard');
} 