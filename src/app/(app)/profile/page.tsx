
'use client';

import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/profile-form';
import type { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const handleProfileUpdate = (values: Partial<UserProfile>) => {
    if (!userDocRef) return;
    
    const updateData: { [key: string]: any } = { ...values };

    // If a new photoURL isn't provided as a data URL, we don't want to overwrite the existing one.
    // The form passes an empty string or the existing URL if no new file is selected.
    // We only update if it's a new data URL.
    if (updateData.photoURL && !updateData.photoURL.startsWith('data:image')) {
      delete updateData.photoURL;
    }

    setDocumentNonBlocking(userDocRef, updateData, { merge: true });
    toast({
      title: 'Profile Updated',
      description: 'Your changes have been saved successfully.',
    });
    router.push('/dashboard');
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your personal information, emergency contacts, and medical details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/2" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Join Us</CardTitle>
            <CardDescription>Create an account or log in to manage your profile and unlock all features.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 pt-6">
            <Button asChild size="lg" className="w-full">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/register">Sign Up</Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Creating an account lets you save your vehicles, documents, and preferences.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal information, emergency contacts, and medical details.</CardDescription>
        </CardHeader>
        <CardContent>
          {userProfile ? (
            <ProfileForm userProfile={userProfile} onSubmit={handleProfileUpdate} />
          ) : (
            <p>Could not load profile data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
