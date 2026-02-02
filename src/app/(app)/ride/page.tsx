'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import type { Ride, GeoPoint } from '@/types';
import { useToast } from '@/hooks/use-toast';

// --- Helper Functions ---

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

// Formatters
const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.round(totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const formatPace = (seconds: number, km: number) => {
    if (km <= 0) return '00:00';
    const pace = seconds / km; // seconds per km
    const paceMinutes = Math.floor(pace / 60).toString().padStart(2, '0');
    const paceSeconds = Math.floor(pace % 60).toString().padStart(2, '0');
    return `${paceMinutes}:${paceSeconds}`;
};

// --- Main Component ---

type RideStatus = 'idle' | 'tracking' | 'paused';
const MIN_DISTANCE_DELTA = 0.002; // 2 meters in km
const MAX_ACCURACY = 30; // 30 meters
const MIN_ELEVATION_DELTA = 1; // 1 meter

export default function RideTrackingPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [status, setStatus] = useState<RideStatus>('idle');
  
  // Live tracking data
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [distance, setDistance] = useState(0); // in km
  const [currentSpeed, setCurrentSpeed] = useState(0); // in km/h
  const [elevationGain, setElevationGain] = useState(0); // in meters
  
  const [lastPosition, setLastPosition] = useState<GeolocationPosition | null>(null);

  // Refs for intervals, IDs, and API objects
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // --- State Persistence ---
  useEffect(() => {
    // On mount, check localStorage for a saved ride
    const savedRide = localStorage.getItem('activeRide');
    if (savedRide) {
      try {
        const data = JSON.parse(savedRide);
        setElapsedTime(data.elapsedTime || 0);
        setDistance(data.distance || 0);
        setElevationGain(data.elevationGain || 0);
        startTimeRef.current = Date.now() - (data.elapsedTime || 0) * 1000;
        setLastPosition(data.lastPosition || null);
        setStatus('paused'); // Assume paused state on refresh
        toast({ title: "Ride Resumed", description: "Your previous ride session was restored." });
      } catch (e) {
        localStorage.removeItem('activeRide');
      }
    }
  }, [toast]);

  useEffect(() => {
    // On state change, save to localStorage
    if (status === 'tracking' || status === 'paused') {
      const activeRide = { elapsedTime, distance, elevationGain, lastPosition };
      localStorage.setItem('activeRide', JSON.stringify(activeRide));
    } else {
      localStorage.removeItem('activeRide');
    }
  }, [elapsedTime, distance, elevationGain, lastPosition, status]);

  // --- Screen Wake Lock ---
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err: any) {
          console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (status === 'tracking') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && status === 'tracking') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status]);

  // --- Core Tracking Logic ---

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer(); // Ensure no multiple timers
    startTimeRef.current = Date.now() - elapsedTime * 1000;
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [elapsedTime, stopTimer]);
  
  const stopGeolocation = useCallback(() => {
      if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
      }
  }, []);

  const startGeolocation = useCallback(() => {
    stopGeolocation(); // Ensure no multiple watchers
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation Error", description: "Geolocation is not supported by your browser." });
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, altitude, accuracy } = position.coords;
        const newPoint: GeoPoint = { latitude, longitude, altitude };

        if (accuracy > MAX_ACCURACY) {
            return; // Ignore inaccurate data
        }

        setLastPosition((prevPosition) => {
            if (prevPosition) {
                const prevPoint: GeoPoint = { 
                    latitude: prevPosition.coords.latitude, 
                    longitude: prevPosition.coords.longitude,
                    altitude: prevPosition.coords.altitude,
                };
                const deltaDist = haversineDistance(prevPoint, newPoint);
                
                if (deltaDist > MIN_DISTANCE_DELTA) {
                    setDistance((prevDist) => prevDist + deltaDist);
                    
                    if (prevPoint.altitude != null && altitude != null && altitude > prevPoint.altitude + MIN_ELEVATION_DELTA) {
                        setElevationGain(prevGain => prevGain + (altitude - prevPoint.altitude));
                    }
                }
            }
            return position;
        });

        setCurrentSpeed(speed ? speed * 3.6 : 0); // m/s to km/h
      },
      (err) => {
        toast({ variant: "destructive", title: "Geolocation Error", description: `Tracking failed: ${err.message}` });
        setStatus('paused');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, [stopGeolocation, toast]);

  // --- Control Handlers ---

  const handleStart = () => {
    resetRide();
    setStatus('tracking');
    startTimer();
    startGeolocation();
  };

  const handlePause = () => {
    setStatus('paused');
    stopTimer();
    stopGeolocation();
  };
  
  const handleResume = () => {
    setStatus('tracking');
    startTimer();
    startGeolocation();
  };

  const handleStop = useCallback(async () => {
    const finalStatus = status;
    setStatus('idle');
    stopTimer();
    stopGeolocation();
    
    // Only save if the ride was actually running
    if (finalStatus === 'tracking' || finalStatus === 'paused') {
        const endTime = new Date().toISOString();
        const rideData: Omit<Ride, 'id' | 'userId' | 'route'> = {
            startTime: new Date(startTimeRef.current).toISOString(),
            endTime,
            duration: elapsedTime,
            distance: distance,
            avgPace: distance > 0 ? elapsedTime / distance : 0,
            averageSpeed: elapsedTime > 0 ? (distance / (elapsedTime / 3600)) : 0,
            elevationGain: elevationGain,
        };

        if (user && firestore && rideData.duration > 0) {
            try {
                const ridesCollection = collection(firestore, 'users', user.uid, 'rides');
                // Saving without route for simplicity as per prompt, but route could be added here
                await addDocumentNonBlocking(ridesCollection, { ...rideData, userId: user.uid, route: [] });
                toast({
                    title: "Ride Saved!",
                    description: "Your activity has been successfully saved."
                });
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Failed to save ride",
                    description: "There was an error saving your ride."
                });
            }
        }
    }

    resetRide();
  }, [status, stopTimer, stopGeolocation, elapsedTime, distance, elevationGain, user, firestore, toast]);

  const resetRide = () => {
    setElapsedTime(0);
    setDistance(0);
    setCurrentSpeed(0);
    setElevationGain(0);
    setLastPosition(null);
    startTimeRef.current = 0;
  };
  
  // --- Render ---

  const avgPace = formatPace(elapsedTime, distance);

  return (
    <div className="bg-[#050A0E] text-white min-h-full flex flex-col p-4 md:p-8">
      <div className="flex-grow grid grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2 gap-4 items-center justify-center text-center">
        {/* Distance */}
        <div className="md:col-span-1">
          <p className="text-sm text-gray-400">DISTANCE (KM)</p>
          <p className="text-5xl md:text-6xl font-bold font-mono tracking-tighter">{distance.toFixed(2)}</p>
        </div>
        
        {/* Time */}
        <div className="col-span-2 md:col-span-1 md:row-start-1">
          <p className="text-sm text-gray-400">TIME</p>
          <p className="text-6xl md:text-7xl font-bold font-mono tracking-tighter">{formatTime(elapsedTime)}</p>
        </div>
        
        {/* Avg Pace */}
        <div className="md:col-span-1">
          <p className="text-sm text-gray-400">AVG PACE</p>
          <p className="text-5xl md:text-6xl font-bold font-mono tracking-tighter">{avgPace}</p>
        </div>
        
        {/* Elev Gain */}
        <div className="md:col-span-1">
          <p className="text-sm text-gray-400">ELEV GAIN (M)</p>
          <p className="text-4xl md:text-5xl font-bold font-mono tracking-tighter">{elevationGain.toFixed(0)}</p>
        </div>
        
        {/* Speed */}
        <div className="md:col-start-3 md:row-start-2">
          <p className="text-sm text-gray-400">SPEED (KM/H)</p>
          <p className="text-4xl md:text-5xl font-bold font-mono tracking-tighter">{currentSpeed.toFixed(1)}</p>
        </div>
      </div>
      
      <div className="flex-shrink-0 flex items-center justify-center gap-8 py-8">
        {status === 'idle' && (
          <Button 
            className="w-32 h-32 rounded-full bg-green-600 hover:bg-green-500 text-white text-2xl"
            onClick={handleStart}
          >
            Start
          </Button>
        )}
        
        {status === 'tracking' && (
          <Button
            variant="outline"
            className="w-24 h-24 rounded-full border-2 border-gray-400 text-gray-400 hover:bg-gray-700 hover:text-white"
            onClick={handlePause}
          >
            <Pause className="h-10 w-10 fill-current" />
          </Button>
        )}

        {status === 'paused' && (
          <Button
            variant="outline"
            className="w-24 h-24 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-900 hover:text-white"
            onClick={handleResume}
          >
            <Play className="h-10 w-10 fill-current" />
          </Button>
        )}

        {(status === 'tracking' || status === 'paused') && (
          <Button
            className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-500 text-white"
            onClick={handleStop}
          >
            <Square className="h-8 w-8 fill-current" />
          </Button>
        )}
      </div>
    </div>
  );
}
