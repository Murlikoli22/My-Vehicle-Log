'use client';

import { useState, useRef, useEffect } from 'react';
import { Phone, User, HeartPulse, MapPin, Maximize, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';


export default function EmergencyPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;
  
  const handleShareLocation = () => {
    if (isSharingLocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharingLocation(false);
      setLocation(null);
      setLocationError(null);
    } else {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser.');
        setIsSharingLocation(false);
        return;
      }

      setLocationError(null);
      setIsSharingLocation(true);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError('Location access was denied. Please enable it in your browser settings.');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError('Location information is unavailable.');
              break;
            case error.TIMEOUT:
              setLocationError('The request to get user location timed out.');
              break;
            default:
              setLocationError('An unknown error occurred while getting location.');
              break;
          }
          setIsSharingLocation(false);
          setLocation(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="relative border-2 border-accent bg-accent/5">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4" disabled>
            <X className="h-6 w-6" />
          </Button>
          <CardHeader className="text-center pt-12">
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
        <Card className="relative text-center p-8">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/dashboard')}
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </Button>
          <CardTitle>No Profile Data</CardTitle>
          <CardDescription>Could not load user profile information. Please complete your profile.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="relative border-2 border-accent bg-accent/5">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/dashboard')}
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </Button>
        <CardHeader className="text-center pt-12">
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
          <Button 
            size="lg" 
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleShareLocation}
          >
            <MapPin className="mr-2 h-5 w-5" />
            {isSharingLocation ? 'Stop Sharing Location' : 'Share Live Location'}
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            <Maximize className="mr-2 h-5 w-5" />
            Display Fullscreen Info
          </Button>
        </CardContent>
        {isSharingLocation && (
          <CardContent className="pt-0 pb-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
                <CardDescription>Your location is being shared. Copy the link below and send it to your contacts.</CardDescription>
              </CardHeader>
              <CardContent>
                {locationError && (
                  <p className="text-destructive font-medium">{locationError}</p>
                )}
                {location && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm">
                        <strong>Latitude:</strong> {location.latitude.toFixed(6)}
                      </p>
                      <p className="text-sm">
                        <strong>Longitude:</strong> {location.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 break-all">
                       <a
                          href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          https://www.google.com/maps?q={location.latitude},{location.longitude}
                        </a>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full sm:w-auto shrink-0"
                          onClick={() => navigator.clipboard.writeText(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`)}>
                          Copy Link
                        </Button>
                    </div>
                  </div>
                )}
                {!location && !locationError && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 animate-pulse" />
                    <span>Acquiring location... Please grant permission if prompted.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
