'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          setUser(data.user as SessionUser);
        } else {
          router.push('/login');
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar user={user} />
      <main className="flex-1">{children}</main>
    </>
  );
}
