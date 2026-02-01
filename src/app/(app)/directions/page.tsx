'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Map, MapPin, Route, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  source: z.string().min(1, 'Source is required.'),
  destination: z.string().min(1, 'Destination is required.'),
});
type FormValues = z.infer<typeof formSchema>;

const DirectionsMap = dynamic(() => import('@/components/directions-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-md" />,
});

export default function DirectionsPage() {
  const [route, setRoute] = useState(null);
  const [summary, setSummary] = useState<{distance: number, time: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  useEffect(() => {
      setIsMounted(true);
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: '',
      destination: '',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!apiKey) {
      setError("API Key is missing. Please configure it in your .env file.");
      return;
    }
    setError(null);
    setRoute(null);
    setSummary(null);

    try {
      const [sourceRes, destRes] = await Promise.all([
        fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(values.source)}&apiKey=${apiKey}`),
        fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(values.destination)}&apiKey=${apiKey}`)
      ]);

      if (!sourceRes.ok || !destRes.ok) {
        throw new Error('Failed to connect to geocoding service.');
      }

      const [sourceData, destData] = await Promise.all([sourceRes.json(), destRes.json()]);

      if (!sourceData.features.length) {
        throw new Error(`Could not find location: ${values.source}`);
      }
      if (!destData.features.length) {
        throw new Error(`Could not find location: ${values.destination}`);
      }
      
      const sourceCoords = sourceData.features[0].geometry.coordinates;
      const destCoords = destData.features[0].geometry.coordinates;

      const routeRes = await fetch(`https://api.geoapify.com/v1/routing?waypoints=${sourceCoords[1]},${sourceCoords[0]}|${destCoords[1]},${destCoords[0]}&mode=drive&apiKey=${apiKey}`);

      if (!routeRes.ok) {
        throw new Error('Failed to connect to routing service.');
      }
      
      const routeData = await routeRes.json();
      
      if (!routeData.features || !routeData.features.length) {
          throw new Error('Could not calculate a route between these locations.');
      }

      setRoute(routeData);
      setSummary({
          distance: routeData.features[0].properties.distance,
          time: routeData.features[0].properties.time
      })

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  }

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h > 0 ? `${h}h ` : ''}${m}min`;
  }
  
  if (!isMounted) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Map className="h-6 w-6" />
            Plan Your Route
          </CardTitle>
          <CardDescription>Enter a starting point and destination to get directions using Geoapify.</CardDescription>
        </CardHeader>
        <CardContent>
          {!apiKey ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>
                The Geoapify API key is missing. Please add your key to the
                <code className="mx-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">
                  .env
                </code> file as <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_GEOAPIFY_API_KEY</code> and restart the server.
              </AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Starting Point
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mumbai, India" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Route className="h-4 w-4" /> Destination
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Delhi, India" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Get Directions'
                  )}
                </Button>
              </form>
            </Form>
          )}
          
          {error && (
             <Alert variant="destructive" className="mt-8">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {summary && (
              <Card className="mt-6 border-dashed">
                  <CardContent className="flex items-center justify-around p-4">
                      <div className="text-center">
                          <p className="text-sm text-muted-foreground flex items-center gap-2"><Route className="h-4 w-4" /> Distance</p>
                          <p className="text-2xl font-bold">{(summary.distance / 1000).toFixed(1)} km</p>
                      </div>
                      <div className="text-center">
                          <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Est. Time</p>
                          <p className="text-2xl font-bold">{formatTime(summary.time)}</p>
                      </div>
                  </CardContent>
              </Card>
          )}
          
          <div className="mt-8 rounded-lg overflow-hidden border">
            {route ? <DirectionsMap route={route} /> : (isMounted && apiKey && <div className="h-96 w-full flex items-center justify-center bg-muted/50"><p className="text-muted-foreground">Enter locations to see the route</p></div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
