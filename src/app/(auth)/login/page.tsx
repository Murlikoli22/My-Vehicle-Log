'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuth, useUser, initiateEmailSignIn, initiateAnonymousSignIn } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/app-logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    // If there is a user and they are not anonymous, then we redirect.
    // But if the user is anonymous, we allow them to stay.
    if (user && !user.isAnonymous) {
      router.push('/dashboard');
    }
  }, [user, router]);


  // If there is a user and they are not anonymous, we are about to redirect, so return null.
  if (user && !user.isAnonymous) {
    return null;
  }

  const handleEmailLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // Non-blocking, will be handled by onAuthStateChanged
    initiateEmailSignIn(auth, email, password);
  };

  const handleAnonymousSignIn = () => {
    initiateAnonymousSignIn(auth);
  };


  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <AppLogo />
        </div>
        <CardTitle className="text-2xl">Welcome Back!</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailLogin} className="grid gap-4" suppressHydrationWarning>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading} suppressHydrationWarning>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="underline text-primary">
            Sign up
          </Link>
        </div>
        <div className="mt-2 text-center text-sm">
          <Button variant="link" className="text-muted-foreground" onClick={handleAnonymousSignIn} suppressHydrationWarning>
            Continue without logging in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
