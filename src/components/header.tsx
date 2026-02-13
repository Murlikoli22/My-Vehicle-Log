'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  User,
  Wrench,
  ShieldAlert
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLogo } from './app-logo';
import type { UserProfile } from '@/types';

export function Header() {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  const displayName = userProfile?.name || user?.displayName || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <AppLogo />
        </Link>
      </div>

      <div className="flex w-full items-center justify-end gap-2">
        <Button asChild variant="ghost" size="icon" className="text-accent-foreground/80 hover:text-accent-foreground hover:bg-accent/10">
          <Link href="/emergency">
            <ShieldAlert className="h-5 w-5 text-accent" />
            <span className="sr-only">Emergency</span>
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.photoURL || undefined} alt={displayName} />
                <AvatarFallback>{displayInitial}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/settings')}>
              <Wrench className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
