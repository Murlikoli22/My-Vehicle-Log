'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Navigation, Satellite, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MapType = 'street' | 'satellite';

export default function MapsPage() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapType, setMapType] = useState<MapType>('street');
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [isShowingDirections, setIsShowingDirections] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      const timeoutId = setTimeout(() => {
        if (isLoading && isMounted) {
          setError("Location request timed out. Please try again.");
          setIsLoading(false);
        }
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isMounted) {
            clearTimeout(timeoutId);
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            setStart(`${latitude}, ${longitude}`); // Set current location as default start
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

  useEffect(() => {
    if (isShowingDirections) return;
    if (!location) return;

    const { latitude, longitude } = location;

    if (mapType === 'street') {
      const delta = 0.01;
      const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
      setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`);
    } else { // satellite
      setMapUrl(`https://www.bing.com/maps/embed?cp=${latitude}~${longitude}&lvl=16&sty=h&sp=point.${latitude}_${longitude}_Your%20Location`);
    }

  }, [location, mapType, isShowingDirections]);

  const handleGetDirections = () => {
    if (!destination) {
      alert("Please enter a destination.");
      return;
    }
    const origin = start || (location ? `${location.latitude},${location.longitude}` : '');
    const bingDirectionsUrl = `https://www.bing.com/maps/embed?rtp=adr.${encodeURIComponent(origin)}~adr.${encodeURIComponent(destination)}`;
    setMapUrl(bingDirectionsUrl);
    setIsShowingDirections(true);
  };

  const handleMapTypeChange = (newMapType: MapType) => {
    setMapType(newMapType);
    setIsShowingDirections(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map</CardTitle>
        <CardDescription>View your location, switch map styles, and get directions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="grid gap-2">
                <Label htmlFor="start">Start Location</Label>
                <Input 
                    id="start" 
                    placeholder="Your current location" 
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="destination">Destination</Label>
                <Input 
                    id="destination" 
                    placeholder="Enter a destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                />
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
                <Button onClick={handleGetDirections} className="w-full">
                    <Navigation className="mr-2 h-4 w-4" />
                    Get Directions
                </Button>
                {isShowingDirections && (
                    <Button onClick={() => setIsShowingDirections(false)} variant="secondary" className="w-full">
                        <X className="mr-2 h-4 w-4" />
                        Clear Route
                    </Button>
                )}
            </div>
        </div>

        <div className="space-y-2">
            <Label>Map Type</Label>
            <div className="flex items-center gap-2">
                <Button 
                    variant={mapType === 'street' && !isShowingDirections ? 'default' : 'outline'}
                    onClick={() => handleMapTypeChange('street')}
                >
                    <MapPin className="mr-2 h-4 w-4" />
                    Street
                </Button>
                <Button 
                    variant={mapType === 'satellite' && !isShowingDirections ? 'default' : 'outline'}
                    onClick={() => handleMapTypeChange('satellite')}
                >
                    <Satellite className="mr-2 h-4 w-4" />
                    Satellite
                </Button>
            </div>
        </div>
        
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
