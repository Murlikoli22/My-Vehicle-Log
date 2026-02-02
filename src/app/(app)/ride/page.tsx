'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection } from 'firebase/firestore';
import { Play, Pause, Square, Redo, Timer, Gauge, Milestone, MapPin, Satellite, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import type { Ride, GeoPoint } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

// Haversine distance calculation
function haversineDistance(coords1: GeoPoint, coords2: GeoPoint): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in km
}

type RideStatus = 'idle' | 'tracking' | 'paused' | 'finished';
type MapType = 'street' | 'satellite';

export default function RidePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [status, setStatus] = useState<RideStatus>('idle');
  const [mapType, setMapType] = useState<MapType>('street');
  const [mapUrl, setMapUrl] = useState('');

  // Live tracking data
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [distance, setDistance] = useState(0); // in km
  const [currentSpeed, setCurrentSpeed] = useState(0); // in km/h
  const [route, setRoute] = useState<GeoPoint[]>([]);
  const [lastLocation, setLastLocation] = useState<GeoPoint | null>(null);

  // Final summary data
  const [finishedRide, setFinishedRide] = useState<Omit<Ride, 'id' | 'userId'> | null>(null);

  // Refs for intervals and watch IDs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Location error handling
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  // Get initial location to show map
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLastLocation({ latitude, longitude });
          setIsLocationLoading(false);
          setLocationError(null);
        },
        (err) => {
          setLocationError(`Error retrieving location: ${err.message}`);
          setIsLocationLoading(false);
        }
      );
    } else {
        setLocationError('Geolocation is not supported by this browser.');
        setIsLocationLoading(false);
    }
  }, []);

  // Update map URL when location or map type changes
  useEffect(() => {
    if (!lastLocation) return;
    const { latitude, longitude } = lastLocation;
    const mapTypeCode = mapType === 'street' ? 'm' : 'k';
    const googleMapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&t=${mapTypeCode}&z=15&ie=UTF8&iwloc=&output=embed`;
    setMapUrl(googleMapUrl);
  }, [lastLocation, mapType]);

  const startTimer = () => {
    startTimeRef.current = Date.now() - elapsedTime * 1000;
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported. Cannot start tracking.");
      return;
    }
    
    setStatus('tracking');
    setLocationError(null);
    setRoute([]);
    setDistance(0);
    setElapsedTime(0);
    startTimer();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const newPoint: GeoPoint = { latitude, longitude };
        
        setCurrentSpeed(speed ? speed * 3.6 : 0); // m/s to km/h

        setRoute((prevRoute) => {
          if (prevRoute.length > 0) {
            const lastPoint = prevRoute[prevRoute.length - 1];
            setDistance((prevDist) => prevDist + haversineDistance(lastPoint, newPoint));
          }
          return [...prevRoute, newPoint];
        });
        setLastLocation(newPoint);
      },
      (err) => {
        setLocationError(`Tracking error: ${err.message}. Ride paused.`);
        pauseTracking();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  };

  const pauseTracking = () => {
    setStatus('paused');
    stopTimer();
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const resumeTracking = () => {
    startTracking(); // Re-initiates watchPosition
    setStatus('tracking');
    startTimer();
  };

  const endTracking = useCallback(async () => {
    pauseTracking(); // Stop timers and watchers
    setStatus('finished');

    const endTime = new Date();
    const rideData: Omit<Ride, 'id' | 'userId'> = {
      startTime: new Date(startTimeRef.current!).toISOString(),
      endTime: endTime.toISOString(),
      duration: elapsedTime,
      distance: distance,
      averageSpeed: elapsedTime > 0 ? (distance / (elapsedTime / 3600)) : 0, // km/h
      route: route,
    };
    setFinishedRide(rideData);

    if (user && firestore) {
      try {
        const ridesCollection = collection(firestore, 'users', user.uid, 'rides');
        await addDocumentNonBlocking(ridesCollection, {
            ...rideData,
            userId: user.uid,
        });
        toast({
            title: "Ride Saved!",
            description: "Your activity has been successfully saved to your log."
        });
      } catch (error) {
        toast({
            variant: "destructive",
            title: "Failed to save ride",
            description: "There was an error saving your ride. Please try again."
        });
      }
    }
  }, [elapsedTime, distance, route, user, firestore, toast]);

  const resetRide = () => {
    setStatus('idle');
    setElapsedTime(0);
    setDistance(0);
    setCurrentSpeed(0);
    setRoute([]);
    setFinishedRide(null);
    startTimeRef.current = null;
  };
  
  // Formatters
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const renderMetrics = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground"><Timer /> Duration</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground"><Milestone /> Distance</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{distance.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">km</span></p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground"><Gauge /> Speed</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{currentSpeed.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km/h</span></p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground"><Gauge /> Avg. Speed</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-2xl font-bold">{(elapsedTime > 0 ? (distance / (elapsedTime / 3600)) : 0).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km/h</span></p>
            </CardContent>
        </Card>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Tracking</CardTitle>
        <CardDescription>Track your bike rides and other activities in real-time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">Ready to start your next adventure?</p>
            <Button size="lg" onClick={startTracking}>
              <Play className="mr-2 h-5 w-5" /> Start Ride
            </Button>
          </div>
        )}
        
        {(status === 'tracking' || status === 'paused') && (
          <div className="space-y-6">
            {renderMetrics()}
            <div className="flex justify-center gap-4">
              {status === 'tracking' ? (
                <Button size="lg" variant="outline" onClick={pauseTracking}>
                  <Pause className="mr-2 h-5 w-5" /> Pause
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={resumeTracking}>
                  <Play className="mr-2 h-5 w-5" /> Resume
                </Button>
              )}
              <Button size="lg" variant="destructive" onClick={endTracking}>
                <Square className="mr-2 h-5 w-5" /> End Ride
              </Button>
            </div>
          </div>
        )}

        {status === 'finished' && finishedRide && (
            <div className="space-y-6">
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Star /> Ride Summary</CardTitle>
                        <CardDescription>
                            Great work! Here's a summary of your activity on {new Date(finishedRide.startTime).toLocaleDateString()}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Duration</p>
                            <p className="text-xl font-bold">{formatTime(finishedRide.duration)}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Distance</p>
                            <p className="text-xl font-bold">{finishedRide.distance.toFixed(2)} km</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Avg. Speed</p>
                            <p className="text-xl font-bold">{finishedRide.averageSpeed.toFixed(1)} km/h</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Route Points</p>
                            <p className="text-xl font-bold">{finishedRide.route.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex justify-center">
                    <Button onClick={resetRide}>
                        <Redo className="mr-2 h-4 w-4"/> Start New Ride
                    </Button>
                </div>
            </div>
        )}

        {locationError && <p className="text-center text-destructive">{locationError}</p>}
        
        <div className="space-y-2">
            <Label>Live Map</Label>
            <div className="flex items-center gap-2">
                <Button 
                    variant={mapType === 'street' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setMapType('street')}
                >
                    <MapPin className="mr-2 h-4 w-4" /> Street
                </Button>
                <Button 
                    variant={mapType === 'satellite' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setMapType('satellite')}
                >
                    <Satellite className="mr-2 h-4 w-4" /> Satellite
                </Button>
            </div>
        </div>
        
        {isLocationLoading && (
          <Skeleton className="h-[400px] w-full rounded-lg" />
        )}
        {!isLocationLoading && lastLocation && (
          <div className="aspect-video w-full rounded-md overflow-hidden border">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={mapUrl}
              title="Location Map"
              allowFullScreen
            ></iframe>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
