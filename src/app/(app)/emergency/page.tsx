
'use client';

import { Phone, User, HeartPulse, MapPin, Maximize } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import type { UserProfile } from '@/types';


export default function EmergencyPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="border-2 border-accent bg-accent/5">
          <CardHeader className="text-center">
            <HeartPulse className="mx-auto h-12 w-12 text-accent" />
            <CardTitle className="text-3xl font-bold text-accent mt-2">Emergency Mode</CardTitle>
            <p className="text-muted-foreground">
              This screen contains critical information. Share it with first responders.
            </p>
          </CardHeader>
          <CardContent className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="text-center p-8">
          <CardTitle>No Profile Data</CardTitle>
          <CardDescription>Could not load user profile information. Please complete your profile.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="border-2 border-accent bg-accent/5">
        <CardHeader className="text-center">
          <HeartPulse className="mx-auto h-12 w-12 text-accent" />
          <CardTitle className="text-3xl font-bold text-accent mt-2">Emergency Mode</CardTitle>
          <p className="text-muted-foreground">
            This screen contains critical information. Share it with first responders.
          </p>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <Phone className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-lg">
              <p>
                <strong>Name:</strong> {userProfile.emergencyContact?.name || 'N/A'}
              </p>
              <p>
                <strong>Phone:</strong> <a href={`tel:${userProfile.emergencyContact?.phone}`} className="text-primary underline">{userProfile.emergencyContact?.phone || 'N/A'}</a>
              </p>
              <p>
                <strong>Relation:</strong> {userProfile.emergencyContact?.relation || 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <User className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-lg">
              <p>
                <strong>Blood Type:</strong> <span className="font-bold text-destructive">{userProfile.medicalInfo?.bloodType || 'N/A'}</span>
              </p>
              <p>
                <strong>Allergies:</strong> {userProfile.medicalInfo?.allergies || 'N/A'}
              </p>
              <p>
                <strong>Conditions:</strong> {userProfile.medicalInfo?.conditions || 'N/A'}
              </p>
            </CardContent>
          </Card>
        </CardContent>
        <Separator className="my-6" />
        <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <MapPin className="mr-2 h-5 w-5" />
            Share Live Location
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            <Maximize className="mr-2 h-5 w-5" />
            Display Fullscreen Info
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
