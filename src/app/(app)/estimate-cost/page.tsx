'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Loader2, Car, Wand2 } from 'lucide-react';
import type { Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { estimateMaintenanceCost, EstimateCostOutput } from '@/ai/flows/estimate-cost-flow';

export default function EstimateCostPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationResult, setEstimationResult] = useState<EstimateCostOutput | null>(null);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('brand'));
  }, [firestore, user]);

  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);

  const handleEstimate = async () => {
    if (!selectedVehicleId || !serviceDescription) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a vehicle and describe the service needed.',
      });
      return;
    }

    const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle) {
      toast({
        variant: 'destructive',
        title: 'Vehicle not found',
        description: 'Could not find the selected vehicle details.',
      });
      return;
    }

    setIsEstimating(true);
    setEstimationResult(null);
    try {
      const result = await estimateMaintenanceCost({
        vehicle: {
          brand: selectedVehicle.brand,
          model: selectedVehicle.model,
          year: selectedVehicle.year,
          fuelType: selectedVehicle.fuelType,
        },
        serviceDescription,
      });
      setEstimationResult(result);
    } catch (error) {
      console.error('Error estimating cost:', error);
      toast({
        variant: 'destructive',
        title: 'Estimation Failed',
        description: 'Could not get an estimate. Please ensure your Gemini API key is set in .env and try again.',
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const isLoading = isUserLoading || vehiclesLoading;

  return (
    <div className="max-w-3xl mx-auto grid gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Cost Estimator</CardTitle>
          <CardDescription>Get an AI-powered cost estimate for your vehicle's next service.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-32 mt-4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-48 mt-4" />
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="vehicle-select">Select a Vehicle</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger id="vehicle-select">
                    <SelectValue placeholder="Choose one of your vehicles..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model} ({vehicle.registrationNumber})
                      </SelectItem>
                    ))}
                    {vehicles?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No vehicles found. Add one on the Vehicles page.</p>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="service-description">Service or Repair Description</Label>
                <Textarea
                  id="service-description"
                  placeholder="e.g., 'The brakes are making a squeaking noise.' or 'Need a full service including oil change and filter replacement.'"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={handleEstimate} disabled={isEstimating || !selectedVehicleId || !serviceDescription}>
                {isEstimating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Estimating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Estimate Cost
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {isEstimating && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {estimationResult && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-6 w-6" />
              Estimation Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Cost</p>
              <p className="text-3xl font-bold">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(estimationResult.estimatedCost)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reasoning</p>
              <p className="text-foreground/90 whitespace-pre-wrap">{estimationResult.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
