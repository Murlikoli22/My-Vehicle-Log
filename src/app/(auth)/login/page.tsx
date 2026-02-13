'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';

import { useAuth, useUser, initiateEmailSignIn, initiateAnonymousSignIn } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/app-logo';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

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
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address to reset your password.',
      });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox for instructions.',
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password Reset Error:', error);
      let description = 'Failed to send password reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        description = 'No user found with this email address.';
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description,
      });
    } finally {
      setIsLoading(false);
    }
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

          <div className="flex items-center justify-end text-sm -mt-2">
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="link" className="p-0 h-auto font-normal">Forgot password?</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reset-email" className="text-right">Email</Label>
                            <Input
                                id="reset-email"
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="col-span-3"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handlePasswordReset} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
