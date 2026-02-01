'use client';
import { useState, useEffect } from 'react';
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

export default function DirectionsPage() {
  const [mapSrc, setMapSrc] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: '',
      destination: '',
    },
  });

  function onSubmit(values: FormValues) {
    if (!apiKey) {
      return;
    }
    const { source, destination } = values;
    const url = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(
      source
    )}&destination=${encodeURIComponent(destination)}`;
    setMapSrc(url);
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
          <CardDescription>Enter a starting point and destination to get directions and an estimated travel time.</CardDescription>
        </CardHeader>
        <CardContent>
          {!apiKey ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>
                The Google Maps API key is missing. Please add your key to the
                <code className="mx-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">
                  .env
                </code> file as <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> and restart the server.
              </AlertDescription>
            </Alert>
          ) : (
            <FormProvider {...form}>
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
                          <Input placeholder="e.g., Your current location" {...field} />
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
                          <Input placeholder="e.g., Your destination" {...field} />
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
            </FormProvider>
          )}

          {mapSrc && (
            <div className="mt-8">
              <div className="aspect-video w-full">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={mapSrc}
                ></iframe>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
