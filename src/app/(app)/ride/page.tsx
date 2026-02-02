'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Square, Trash2, Map, List, X, History, ArrowRight, Bike, MapPin, Layers } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { useUser, useFirestore, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import type { Ride, GeoPoint } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';

const RideRouteMap = dynamic(() => import('@/components/ride-route-map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted flex items-center justify-center"><p>Loading map...</p></div>,
});

const AllRidesMap = dynamic(() => import('@/components/all-rides-map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted flex items-center justify-center"><p>Loading map...</p></div>,
});


// --- Helper Functions ---

function haversineDistance(coords1: GeoPoint, coords2: GeoPoint): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in km
}

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
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
const MIN_DISTANCE_DELTA = 0.003; // 3 meters in km
const MAX_ACCURACY = 20; // 20 meters
const MIN_ELEVATION_DELTA = 1; // 1 meter

export default function RideTrackingPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'track' | 'history' | 'map'>('history');
  const [status, setStatus] = useState<RideStatus>('idle');
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [route, setRoute] = useState<GeoPoint[]>([]);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const [ridesHistory, setRidesHistory] = useState<Ride[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // --- Permissions and History Loading ---
  useEffect(() => {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setHasPermission(result.state === 'granted');
      if (result.state === 'granted') {
        // Pre-fetch current position for the start screen map
        navigator.geolocation.getCurrentPosition(pos => {
          setRoute([{ latitude: pos.coords.latitude, longitude: pos.coords.longitude, altitude: pos.coords.altitude }]);
        });
      }
      result.onchange = () => setHasPermission(result.state === 'granted');
    });
  }, []);

  const ridesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'rides'), orderBy('startTime', 'desc'));
  }, [firestore, user]);

  useEffect(() => {
    if (!ridesQuery) {
        setHistoryLoading(false);
        return;
    }
    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
      setRidesHistory(rides);
      setHistoryLoading(false);
    }, () => setHistoryLoading(false));
    return () => unsubscribe();
  }, [ridesQuery]);


  // --- State Persistence ---
  useEffect(() => {
    const savedRide = localStorage.getItem('activeRide');
    if (savedRide) {
      try {
        const data = JSON.parse(savedRide);
        setElapsedTime(data.elapsedTime || 0);
        setDistance(data.distance || 0);
        setElevationGain(data.elevationGain || 0);
        setRoute(data.route || []);
        startTimeRef.current = Date.now() - (data.elapsedTime || 0) * 1000;
        setStatus('paused');
        setActiveTab('track');
        toast({ title: "Ride Resumed", description: "Your previous ride session was restored." });
      } catch (e) {
        localStorage.removeItem('activeRide');
      }
    }
  }, [toast]);

  useEffect(() => {
    if (status === 'tracking' || status === 'paused') {
      const activeRide = { elapsedTime, distance, elevationGain, route };
      localStorage.setItem('activeRide', JSON.stringify(activeRide));
    } else {
      localStorage.removeItem('activeRide');
    }
  }, [elapsedTime, distance, elevationGain, route, status]);


  // --- Screen Wake Lock ---
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch (err: any) { console.error(`Wake Lock Error: ${'\'\''}${err.name}, ${err.message}${'\'\''}`); }
      }
    };
    const releaseWakeLock = async () => {
      if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; }
    };
    if (status === 'tracking') { requestWakeLock(); } else { releaseWakeLock(); }
    const handleVisibilityChange = () => { if (wakeLockRef.current !== null && document.visibilityState === 'visible' && status === 'tracking') { requestWakeLock(); } };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { releaseWakeLock(); document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [status]);


  // --- Core Tracking Logic ---
  const stopTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }, []);
  const startTimer = useCallback(() => { stopTimer(); startTimeRef.current = Date.now() - elapsedTime * 1000; timerRef.current = setInterval(() => { setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000)); }, 1000); }, [elapsedTime, stopTimer]);
  const stopGeolocation = useCallback(() => { if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; } }, []);

  const startGeolocation = useCallback(() => {
    stopGeolocation();
    if (!navigator.geolocation) { toast({ variant: "destructive", title: "Geolocation Error", description: "Geolocation is not supported by your browser." }); return; }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, altitude, accuracy } = position.coords;
        if (accuracy > MAX_ACCURACY) return;

        setRoute((prevRoute) => {
          const newPoint: GeoPoint = { latitude, longitude, altitude };
          const lastPoint = prevRoute.length > 0 ? prevRoute[prevRoute.length - 1] : null;

          if (lastPoint) {
            const deltaDist = haversineDistance(lastPoint, newPoint);
            if (deltaDist > MIN_DISTANCE_DELTA) {
              setDistance((prevDist) => prevDist + deltaDist);
              if (lastPoint.altitude != null && altitude != null && altitude > lastPoint.altitude + MIN_ELEVATION_DELTA) {
                setElevationGain(prevGain => prevGain + (altitude - (lastPoint.altitude ?? altitude)));
              }
              return [...prevRoute, newPoint];
            }
          } else {
             return [newPoint]; // First point
          }
          return prevRoute;
        });

        setCurrentSpeed(speed ? speed * 3.6 : 0); // m/s to km/h
      },
      (err) => { toast({ variant: "destructive", title: "Geolocation Error", description: `Tracking failed: ${err.message}` }); setStatus('paused'); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
  }, [stopGeolocation, toast]);


  // --- Control Handlers ---
  const handleStart = () => {
    navigator.geolocation.getCurrentPosition(() => {
        setHasPermission(true);
        resetRide();
        setStatus('tracking');
        startTimer();
        startGeolocation();
    }, () => {
        setHasPermission(false);
        toast({ variant: "destructive", title: "Permission Denied", description: "Please enable location services to start tracking." });
    });
  };

  const resetRide = () => {
    setElapsedTime(0);
    setDistance(0);
    setCurrentSpeed(0);
    setElevationGain(0);
    setRoute([]);
    startTimeRef.current = Date.now();
  };
  
  const handlePause = () => { setStatus('paused'); stopTimer(); stopGeolocation(); };
  const handleResume = () => { setStatus('tracking'); startTimer(); startGeolocation(); };

  const handleStop = useCallback(async () => {
    const finalStatus = status;
    setStatus('idle');
    stopTimer();
    stopGeolocation();
    
    if ((finalStatus === 'tracking' || finalStatus === 'paused') && user && firestore && elapsedTime > 0) {
      const rideData: Omit<Ride, 'id'> = {
        userId: user.uid,
        startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedTime,
        distance: distance,
        avgPace: distance > 0 ? elapsedTime / distance : 0,
        averageSpeed: elapsedTime > 0 ? (distance / (elapsedTime / 3600)) : 0,
        elevationGain: elevationGain,
        route,
      };
      try {
        await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'rides'), rideData);
        toast({ title: "Ride Saved!", description: "Your activity has been successfully saved." });
        setActiveTab('history');
      } catch (error) {
        toast({ variant: "destructive", title: "Failed to save ride", description: "There was an error saving your ride." });
      }
    }
    resetRide();
  }, [status, stopTimer, stopGeolocation, elapsedTime, distance, elevationGain, route, user, firestore, toast]);

  const handleDeleteRide = async (rideId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(firestore, 'users', user.uid, 'rides', rideId));
      toast({ title: 'Ride Deleted', description: 'The selected ride has been removed.' });
      if (selectedRide?.id === rideId) {
        setSelectedRide(null);
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'Could not delete the ride.' });
    }
  };

  const handleClearHistory = async () => {
    if (!user || !ridesQuery) return;
    try {
      const batch = writeBatch(firestore);
      const snapshot = await getDocs(ridesQuery);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: 'History Cleared', description: 'All rides have been deleted.' });
      setSelectedRide(null);
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'Could not clear history.' });
    }
  };


  // --- Render ---
  const avgPace = useMemo(() => formatPace(elapsedTime, distance), [elapsedTime, distance]);

  const renderMap = () => (
    <div className="p-4 md:p-6 h-full flex flex-col">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4"><Layers /> All Routes</h2>
        <Card className="flex-1">
            <CardContent className="p-0 h-full">
                <AllRidesMap rides={ridesHistory} />
            </CardContent>
        </Card>
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {selectedRide ? (
        <>
          <Button variant="ghost" onClick={() => setSelectedRide(null)} className="mb-4 self-start">
            <List className="mr-2 h-4 w-4" /> Back to History
          </Button>
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">Ride on {format(new Date(selectedRide.startTime), 'PPP')}</CardTitle>
              <p className="text-sm text-muted-foreground">Duration: {formatTime(selectedRide.duration)}</p>
            </CardHeader>
            <CardContent className="flex-1 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Performance</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Distance</p><p className="font-medium">{selectedRide.distance.toFixed(2)} km</p></div>
                      <div><p className="text-muted-foreground">Avg Pace</p><p className="font-medium">{formatPace(selectedRide.duration, selectedRide.distance)} /km</p></div>
                      <div><p className="text-muted-foreground">Avg Speed</p><p className="font-medium">{selectedRide.averageSpeed.toFixed(1)} km/h</p></div>
                      <div><p className="text-muted-foreground">Elevation</p><p className="font-medium">{selectedRide.elevationGain?.toFixed(0) ?? 0} m</p></div>
                  </div>
                </div>
                <div className="h-64 md:h-full rounded-lg overflow-hidden">
                    <RideRouteMap route={selectedRide.route} showStartFinishMarkers={true} />
                </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><History /> Ride History</h2>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={ridesHistory.length === 0}>Clear History</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all your ride data. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearHistory}>Clear</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {historyLoading ? <Skeleton className="w-full h-32" /> : ridesHistory.length > 0 ? (
            <ScrollArea className="flex-1 -mr-4 pr-4">
              <div className="space-y-3">
                {ridesHistory.map(ride => (
                  <Card key={ride.id} className="group hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3 flex items-center justify-between gap-4">
                       <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setSelectedRide(ride)}>
                          <div className="h-16 w-16 rounded-md bg-muted overflow-hidden flex-shrink-0">
                            <RideRouteMap route={ride.route} isThumbnail />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{ride.distance.toFixed(2)} km Ride</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(ride.startTime), 'MMM d, yyyy')} &bull; {formatDistanceToNow(new Date(ride.startTime), { addSuffix: true })}</p>
                          </div>
                          <div className="hidden sm:block text-right">
                            <p className="font-mono">{formatTime(ride.duration)}</p>
                            <p className="text-sm text-muted-foreground">{formatPace(ride.duration, ride.distance)}/km</p>
                          </div>
                       </div>
                       <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete this ride?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRide(ride.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Bike className="h-16 w-16 mb-4" />
              <h3 className="text-xl font-semibold">No Rides Yet</h3>
              <p>Go to the "Track" tab to record your first activity.</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderTracker = () => (
    <div className="bg-[#050A0E] text-white min-h-full flex flex-col p-4 md:p-6">
      {status === 'idle' ? (
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 rounded-lg overflow-hidden mb-4 border-2 border-dashed border-gray-700">
             {hasPermission === null ? <div className="h-full w-full bg-gray-800 flex items-center justify-center text-gray-400">Checking permissions...</div>
              : hasPermission ? <RideRouteMap route={route} interactive={false}/> 
              : <div className="h-full w-full bg-gray-800 flex flex-col items-center justify-center text-center p-4">
                  <MapPin className="h-10 w-10 text-gray-500 mb-2"/>
                  <p className="text-gray-400 font-semibold">Location Access Needed</p>
                  <p className="text-gray-500 text-sm">Please grant location permissions to see the map and start tracking.</p>
                </div>
            }
          </div>
          <Button size="lg" className="w-full bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white" onClick={handleStart}>Start Ride</Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
            <div className="relative flex-[2] rounded-lg overflow-hidden mb-4 border border-gray-700">
                <RideRouteMap route={route} isLive={true} />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 text-center mb-4">
                <div><p className="text-sm text-gray-400">DISTANCE (KM)</p><p className="text-4xl font-bold font-mono tracking-tighter">{distance.toFixed(2)}</p></div>
                <div><p className="text-sm text-gray-400">TIME</p><p className="text-4xl font-bold font-mono tracking-tighter">{formatTime(elapsedTime)}</p></div>
                <div><p className="text-sm text-gray-400">AVG PACE (/KM)</p><p className="text-4xl font-bold font-mono tracking-tighter">{avgPace}</p></div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center gap-8 py-4">
                {status === 'tracking' && <Button variant="outline" className="w-24 h-24 rounded-full border-2 border-gray-400 text-gray-400 bg-transparent hover:bg-gray-800 hover:text-white" onClick={handlePause}><Pause className="h-10 w-10 fill-current" /></Button>}
                {status === 'paused' && <Button className="w-24 h-24 rounded-full bg-green-600 hover:bg-green-500 text-white" onClick={handleResume}><Play className="h-10 w-10 fill-current" /></Button>}
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-500 text-white"><Square className="h-8 w-8 fill-current" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Finish Ride?</AlertDialogTitle><AlertDialogDescription>Do you want to end and save this ride?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleStop}>Stop & Save</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
       <div className="flex-shrink-0 p-4 pb-0 md:p-6 md:pb-0">
         <div className="bg-muted p-1 rounded-lg flex max-w-min mx-auto">
            <Button onClick={() => setActiveTab('history')} variant={activeTab === 'history' ? 'default' : 'ghost'} size="sm" className="gap-2"><List />History</Button>
            <Button onClick={() => setActiveTab('track')} variant={activeTab === 'track' ? 'default' : 'ghost'} size="sm" className="gap-2"><Map />Track</Button>
            <Button onClick={() => setActiveTab('map')} variant={activeTab === 'map' ? 'default' : 'ghost'} size="sm" className="gap-2"><Layers />Map</Button>
         </div>
       </div>
        {activeTab === 'track' ? renderTracker() : activeTab === 'history' ? renderHistory() : renderMap()}
    </div>
  );
}
