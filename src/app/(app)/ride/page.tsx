'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection } from 'firebase/firestore';
import { Play, Pause, Square, Redo, Timer, Gauge, Milestone, MapPin, Satellite, Star, Mountain, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import type { Ride, GeoPoint } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
  const [elevationGain, setElevationGain] = useState(0); // in meters

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
          const { latitude, longitude, altitude } = position.coords;
          setLastLocation({ latitude, longitude, altitude });
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
    
    resetRide();
    setStatus('tracking');
    setLocationError(null);
    startTimer();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, altitude } = position.coords;
        const newPoint: GeoPoint = { latitude, longitude, altitude };
        
        setCurrentSpeed(speed ? speed * 3.6 : 0); // m/s to km/h

        setRoute((prevRoute) => {
          if (prevRoute.length > 0) {
            const lastPoint = prevRoute[prevRoute.length - 1];
            setDistance((prevDist) => prevDist + haversineDistance(lastPoint, newPoint));
            
            // Elevation gain calculation
            if (lastPoint.altitude != null && altitude != null && altitude > lastPoint.altitude) {
              setElevationGain(prevGain => prevGain + (altitude - lastPoint.altitude));
            }
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
    // Re-initiates watchPosition to get fresh data
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, altitude } = position.coords;
        const newPoint: GeoPoint = { latitude, longitude, altitude };
        setCurrentSpeed(speed ? speed * 3.6 : 0);
        setRoute((prevRoute) => [...prevRoute, newPoint]);
        setLastLocation(newPoint);
      },
      (err) => {
        setLocationError(`Tracking error: ${err.message}. Ride paused.`);
        pauseTracking();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
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
      elevationGain: elevationGain,
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
  }, [elapsedTime, distance, route, user, firestore, toast, elevationGain]);

  const resetRide = () => {
    setStatus('idle');
    setElapsedTime(0);
    setDistance(0);
    setCurrentSpeed(0);
    setRoute([]);
    setFinishedRide(null);
    setElevationGain(0);
    startTimeRef.current = null;
  };
  
  // Formatters
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatPace = (seconds: number, km: number) => {
    if (km <= 0) return '00:00';
    const pace = seconds / km; // seconds per km
    const paceMinutes = Math.floor(pace / 60).toString().padStart(2, '0');
    const paceSeconds = Math.floor(pace % 60).toString().padStart(2, '0');
    return `${paceMinutes}:${paceSeconds}`;
  };

  return (
     <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-110px)]">
      {/* Map Area */}
      <div className="relative w-full h-1/2 md:h-2/5">
        {isLocationLoading ? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : lastLocation ? (
          <>
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={mapUrl}
              title="Location Map"
              className="rounded-t-lg"
            ></iframe>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button variant={mapType === 'street' ? 'secondary' : 'outline'} size="icon" onClick={() => setMapType('street')} className="h-8 w-8"><MapPin className="h-4 w-4" /></Button>
              <Button variant={mapType === 'satellite' ? 'secondary' : 'outline'} size="icon" onClick={() => setMapType('satellite')} className="h-8 w-8"><Satellite className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="h-full w-full rounded-lg bg-muted flex items-center justify-center flex-col text-center p-4">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Could not load map.</p>
            {locationError && <p className="text-sm text-destructive">{locationError}</p>}
          </div>
        )}
      </div>

      {/* Content Area */}
      <Card className="flex-1 flex flex-col rounded-t-none">
        <CardContent className="flex-1 flex flex-col p-4">
          {status === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold">Ready to Ride?</h2>
              <p className="text-muted-foreground mb-6">Press Start to begin tracking your activity.</p>
              <Button size="lg" className="rounded-full w-24 h-24" onClick={startTracking}>
                <Play className="h-8 w-8 fill-primary-foreground" />
              </Button>
            </div>
          )}

          {(status === 'tracking' || status === 'paused') && (
            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div><p className="text-sm text-muted-foreground">DISTANCE (KM)</p><p className="text-3xl font-bold">{distance.toFixed(2)}</p></div>
                <div><p className="text-sm text-muted-foreground">TIME</p><p className="text-3xl font-bold">{formatTime(elapsedTime)}</p></div>
                <div><p className="text-sm text-muted-foreground">AVG PACE</p><p className="text-3xl font-bold">{formatPace(elapsedTime, distance)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div><p className="text-sm text-muted-foreground">ELEV GAIN (M)</p><p className="text-xl font-semibold">{elevationGain.toFixed(0)}</p></div>
                <div><p className="text-sm text-muted-foreground">SPEED (KM/H)</p><p className="text-xl font-semibold">{currentSpeed.toFixed(1)}</p></div>
              </div>

              <div className="mt-auto flex justify-center gap-4">
                {status === 'tracking' ? (
                  <Button size="lg" variant="outline" className="rounded-full w-20 h-20" onClick={pauseTracking}><Pause className="h-6 w-6" /></Button>
                ) : (
                  <Button size="lg" variant="outline" className="rounded-full w-20 h-20" onClick={resumeTracking}><Play className="h-6 w-6" /></Button>
                )}
                <Button size="lg" variant="destructive" className="rounded-full w-20 h-20" onClick={endTracking}><Square className="h-6 w-6" /></Button>
              </div>
            </div>
          )}

          {status === 'finished' && finishedRide && (
            <div className="flex-1 flex flex-col">
              <h2 className="text-2xl font-bold mb-1">Ride Summary</h2>
              <p className="text-muted-foreground mb-4">Great work! Here's your activity from {new Date(finishedRide.startTime).toLocaleDateString()}.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
                <Card><CardHeader><CardDescription className="flex items-center gap-1"><Milestone /> Distance</CardDescription><CardTitle>{finishedRide.distance.toFixed(2)} <span className="text-base font-normal">km</span></CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription className="flex items-center gap-1"><Timer /> Moving Time</CardDescription><CardTitle>{formatTime(finishedRide.duration)}</CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription className="flex items-center gap-1"><Mountain /> Elev. Gain</CardDescription><CardTitle>{(finishedRide.elevationGain || 0).toFixed(0)} <span className="text-base font-normal">m</span></CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription className="flex items-center gap-1"><TrendingUp /> Avg. Pace</CardDescription><CardTitle>{formatPace(finishedRide.duration, finishedRide.distance)} <span className="text-base font-normal">/km</span></CardTitle></CardHeader></Card>
                <Card><CardHeader><CardDescription className="flex items-center gap-1"><Gauge /> Avg. Speed</CardDescription><CardTitle>{finishedRide.averageSpeed.toFixed(1)} <span className="text-base font-normal">km/h</span></CardTitle></CardHeader></Card>
              </div>

              <div className="mt-auto flex justify-center">
                <Button onClick={resetRide} size="lg"><Redo className="mr-2 h-4 w-4" /> Start New Ride</Button>
              </div>
            </div>
          )}

          {locationError && !isLocationLoading && <p className="text-center text-sm text-destructive p-2 mt-auto">{locationError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
