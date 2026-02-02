'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Play, Pause, Square, Redo, Timer, Gauge, Milestone, MapPin, Satellite, Mountain, TrendingUp, History, Bike, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import type { Ride, GeoPoint } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const RideRouteMap = dynamic(() => import('@/components/ride-route-map'), {
  loading: () => <Skeleton className="h-full w-full" />,
  ssr: false,
});


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

export default function RidePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [status, setStatus] = useState<RideStatus>('idle');
  const [mapType, setMapType] = useState<MapType>('street');
  const [mapUrl, setMapUrl] = useState('');
  
  // Past rides state
  const [selectedPastRide, setSelectedPastRide] = useState<Ride | null>(null);

  const pastRidesQuery = useMemoFirebase(() => (
    user ? query(collection(firestore, 'users', user.uid, 'rides'), orderBy('startTime', 'desc')) : null
  ), [user, firestore]);
  const { data: pastRides, isLoading: pastRidesLoading } = useCollection<Ride>(pastRidesQuery);

  useEffect(() => {
    if (!selectedPastRide && pastRides && pastRides.length > 0) {
      setSelectedPastRide(pastRides[0]);
    } else if (pastRides && pastRides.length === 0) {
      setSelectedPastRide(null);
    }
  }, [pastRides, selectedPastRide]);

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
    pauseTracking();
    setStatus('finished');

    const endTime = new Date();
    const rideData: Omit<Ride, 'id' | 'userId'> = {
      startTime: new Date(startTimeRef.current!).toISOString(),
      endTime: endTime.toISOString(),
      duration: elapsedTime,
      distance: distance,
      averageSpeed: elapsedTime > 0 ? (distance / (elapsedTime / 3600)) : 0,
      route: route,
      elevationGain: elevationGain,
    };
    setFinishedRide(rideData);

    if (user && firestore) {
      try {
        const ridesCollection = collection(firestore, 'users', user.uid, 'rides');
        await addDocumentNonBlocking(ridesCollection, { ...rideData, userId: user.uid });
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
  
  const handleDeleteRide = (rideId: string) => {
    if (!user || !firestore) return;
    const rideRef = doc(firestore, 'users', user.uid, 'rides', rideId);
    deleteDocumentNonBlocking(rideRef);

    if (selectedPastRide?.id === rideId) {
      setSelectedPastRide(null);
    }

    toast({
        title: "Ride Deleted",
        description: "The selected ride has been removed from your history.",
    });
  };

  const handleClearHistory = () => {
    if (!user || !firestore || !pastRides) return;

    pastRides.forEach(ride => {
        const rideRef = doc(firestore, 'users', user.uid, 'rides', ride.id);
        deleteDocumentNonBlocking(rideRef);
    });

    setSelectedPastRide(null);

    toast({
        title: "Ride History Cleared",
        description: `All ${pastRides.length} rides have been deleted.`,
    });
  };

  return (
    <Tabs defaultValue="history" className="flex flex-col h-full">
        <div className="flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>History</TabsTrigger>
                <TabsTrigger value="track"><Bike className="mr-2 h-4 w-4"/>Track</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="history" className="flex-grow mt-4">
          <div className="grid md:grid-cols-[320px_1fr] gap-6 h-full">
            <div className="flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Past Rides</h2>
                 {pastRides && pastRides.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Clear History
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete all {pastRides.length} of your saved rides.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">Delete All</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
              <ScrollArea className="flex-grow border rounded-lg">
                <div className="flex flex-col gap-2 p-2">
                {pastRidesLoading && Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                {!pastRidesLoading && pastRides?.map(ride => (
                  <div key={ride.id} className="group/ride-item flex items-center gap-2 rounded-lg pr-2 text-left transition-colors hover:bg-muted/50 w-full">
                    <button onClick={() => setSelectedPastRide(ride)} className={cn(
                      "flex-1 flex items-center gap-4 rounded-lg p-3",
                      selectedPastRide?.id === ride.id && 'bg-muted'
                    )}>
                      <div className="bg-muted rounded-md p-2"><Bike className="h-6 w-6 text-muted-foreground" /></div>
                      <div className="flex-1 truncate">
                        <p className="font-medium">{format(new Date(ride.startTime), 'MMMM dd, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{ride.distance.toFixed(2)} km in {formatTime(ride.duration)}</p>
                      </div>
                    </button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover/ride-item:opacity-100 text-destructive hover:text-destructive focus:opacity-100">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete this ride?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this ride record. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRide(ride.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                {!pastRidesLoading && pastRides?.length === 0 && (
                    <div className="text-center text-muted-foreground p-8">No rides recorded yet.</div>
                )}
                </div>
              </ScrollArea>
            </div>

            <Card className="flex flex-col h-full">
              {selectedPastRide ? (
                <>
                  <CardHeader>
                    <CardTitle>Ride on {format(new Date(selectedPastRide.startTime), 'MMMM dd, yyyy')}</CardTitle>
                    <CardDescription>At {format(new Date(selectedPastRide.startTime), 'p')}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow grid grid-rows-2 gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
                        <Card><CardHeader><CardDescription className="flex items-center gap-1"><Milestone /> Distance</CardDescription><CardTitle>{selectedPastRide.distance.toFixed(2)} <span className="text-base font-normal">km</span></CardTitle></CardHeader></Card>
                        <Card><CardHeader><CardDescription className="flex items-center gap-1"><Timer /> Time</CardDescription><CardTitle>{formatTime(selectedPastRide.duration)}</CardTitle></CardHeader></Card>
                        <Card><CardHeader><CardDescription className="flex items-center gap-1"><Mountain /> Elev. Gain</CardDescription><CardTitle>{(selectedPastRide.elevationGain || 0).toFixed(0)} <span className="text-base font-normal">m</span></CardTitle></CardHeader></Card>
                        <Card><CardHeader><CardDescription className="flex items-center gap-1"><TrendingUp /> Avg. Pace</CardDescription><CardTitle>{formatPace(selectedPastRide.duration, selectedPastRide.distance)} <span className="text-base font-normal">/km</span></CardTitle></CardHeader></Card>
                        <Card><CardHeader><CardDescription className="flex items-center gap-1"><Gauge /> Avg. Speed</CardDescription><CardTitle>{selectedPastRide.averageSpeed.toFixed(1)} <span className="text-base font-normal">km/h</span></CardTitle></CardHeader></Card>
                    </div>
                    <div className="h-full min-h-[200px]">
                      <RideRouteMap route={selectedPastRide.route} />
                    </div>
                  </CardContent>
                </>
              ) : pastRidesLoading ? (
                  <div className="p-6 space-y-4">
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="grid grid-cols-3 gap-4 mt-4">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                      </div>
                      <Skeleton className="h-48 w-full mt-4" />
                  </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <History className="h-16 w-16 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Select a ride to see the details.</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="track" className="flex-grow mt-2">
            <div className="flex flex-col h-full">
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
        </TabsContent>
    </Tabs>
  );
}
