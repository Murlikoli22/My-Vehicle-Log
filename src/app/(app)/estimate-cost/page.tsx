'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, Fuel, Route } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Vehicle } from '@/types';

export default function EstimateCostPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [distance, setDistance] = useState('');
  const [fuelEfficiency, setFuelEfficiency] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const vehiclesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('brand'));
  }, [firestore, user]);

  const { data: vehicles } = useCollection<Vehicle>(vehiclesQuery);

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  };

  const calculateCost = () => {
    const dist = parseFloat(distance);
    const eff = parseFloat(fuelEfficiency);
    const price = parseFloat(fuelPrice);

    if (dist > 0 && eff > 0 && price > 0) {
      const cost = (dist / eff) * price;
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(null);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Trip Cost Estimator
        </CardTitle>
        <CardDescription>
          Estimate the fuel cost for your next trip. You can select one of your vehicles or enter the fuel efficiency manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {vehicles && vehicles.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="vehicle-select">Select a Vehicle (Optional)</Label>
            <Select onValueChange={handleVehicleSelect}>
              <SelectTrigger id="vehicle-select">
                <SelectValue placeholder="Choose from your garage" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.brand} {vehicle.model} ({vehicle.registrationNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
             <p className="text-xs text-muted-foreground">
              Note: Fuel efficiency must still be entered manually.
            </p>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="distance" className="flex items-center gap-1.5">
              <Route className="h-4 w-4" /> Distance (km)
            </Label>
            <Input
              id="distance"
              type="number"
              placeholder="e.g., 300"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fuel-efficiency" className="flex items-center gap-1.5">
                <Fuel className="h-4 w-4" /> Fuel Efficiency (km/L)
            </Label>
            <Input
              id="fuel-efficiency"
              type="number"
              placeholder="e.g., 15"
              value={fuelEfficiency}
              onChange={(e) => setFuelEfficiency(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
             <Label htmlFor="fuel-price" className="flex items-center gap-1.5">
              <span className="text-lg font-bold">₹</span> Price per Litre (INR)
            </Label>
            <Input
              id="fuel-price"
              type="number"
              placeholder="e.g., 105.5"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={calculateCost} className="w-full">
          <Calculator className="mr-2 h-4 w-4" /> Calculate Estimated Cost
        </Button>
      </CardContent>
      {estimatedCost !== null && (
        <CardFooter className="bg-muted/50 p-6 rounded-b-lg">
          <div className="text-center w-full">
            <p className="text-muted-foreground">Estimated Fuel Cost</p>
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(estimatedCost)}
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
