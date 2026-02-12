'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';
import { NotificationManager } from '@/components/NotificationManager';
import { Loader2 } from 'lucide-react';

function AppLoadingScreen() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-lg">Loading Application...</p>
            </div>
        </div>
    );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If auth state is resolved and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // While checking for user, show a loading screen
  if (isUserLoading) {
    return <AppLoadingScreen />;
  }

  // If there's no user, the redirect is in flight. Return null to prevent flicker.
  if (!user) {
    return null;
  }

  // If user is authenticated, render the app layout
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav />
      <NotificationManager />
    </div>
  );
}
