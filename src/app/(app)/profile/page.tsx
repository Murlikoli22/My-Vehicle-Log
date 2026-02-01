
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/profile-form';
import type { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';

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

    setDocumentNonBlocking(userDocRef, values, { merge: true });
    toast({
      title: 'Profile Updated',
      description: 'Your changes have been saved successfully.',
    });
    router.push('/dashboard');
  };

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal information, emergency contacts, and medical details.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/2" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          ) : userProfile ? (
            <ProfileForm userProfile={userProfile} onSubmit={handleProfileUpdate} />
          ) : (
            <p>Could not load profile data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
