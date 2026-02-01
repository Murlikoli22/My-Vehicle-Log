
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Map, Loader2, Navigation, Terminal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  source: z.string().min(1, 'Source is required.'),
  destination: z.string().min(1, 'Destination is required.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function DirectionsPage() {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: '',
      destination: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    if (apiKeyMissing) return;

    setIsLoading(true);
    const googleMapsUrl = `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(values.source)}&destination=${encodeURIComponent(values.destination)}`;
    setMapUrl(googleMapsUrl);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Map className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Get Directions</CardTitle>
              <CardDescription>
                Enter your starting point and destination to get real-time directions from Google Maps.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeyMissing ? (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                  The Google Maps API key is missing. Please add your key to the <code>.env</code> file as <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> and restart the development server.
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
                        <FormLabel>Starting Point</FormLabel>
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
                        <FormLabel>Destination</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Your destination" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-4 w-4" /> Get Directions
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}

          {mapUrl && !apiKeyMissing && (
            <div className="mt-8 rounded-lg overflow-hidden border aspect-video">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapUrl}
                onLoad={() => setIsLoading(false)}
              ></iframe>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
