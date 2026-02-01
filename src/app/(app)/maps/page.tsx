'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

export default function MapsPage() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      // Using a timeout to prevent the location request from hanging indefinitely
      const timeoutId = setTimeout(() => {
        if (isLoading && isMounted) {
          setError("Location request timed out. Please try again.");
          setIsLoading(false);
        }
      }, 10000); // 10-second timeout

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isMounted) {
            clearTimeout(timeoutId);
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setIsLoading(false);
          }
        },
        (err) => {
           if (isMounted) {
            clearTimeout(timeoutId);
            setError(`Error retrieving location: ${err.message}`);
            setIsLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      if (isMounted) {
        setError('Geolocation is not supported by this browser.');
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
    }
  }, [isLoading]);

  const getMapUrl = () => {
    if (!location) return "";
    const { latitude, longitude } = location;
    // Bounding box for the map view
    const delta = 0.01;
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map</CardTitle>
        <CardDescription>Your current location is shown on the map below.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[500px] w-full rounded-lg" />
            <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-48" />
            </div>
          </div>
        )}
        {!isLoading && error && (
            <div className="flex flex-col items-center justify-center h-[500px] text-center text-destructive bg-muted/50 rounded-lg p-4">
                <MapPin className="h-12 w-12 mb-4"/>
                <p className="font-semibold">Could not retrieve your location.</p>
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-4 text-muted-foreground">Please ensure you have granted location permissions for this site.</p>
            </div>
        )}
        {!isLoading && !error && location && (
          <div className="aspect-video w-full rounded-md overflow-hidden border">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={getMapUrl()}
              title="Current Location Map"
            ></iframe>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
