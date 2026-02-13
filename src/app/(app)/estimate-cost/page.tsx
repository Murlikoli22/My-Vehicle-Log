
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, Fuel, Route, Gauge } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Vehicle } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EstimateCostPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // State for Trip Cost Estimator
  const [distance, setDistance] = useState('');
  const [fuelEfficiency, setFuelEfficiency] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [estimatedFuel, setEstimatedFuel] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  // State for Fuel Efficiency Calculator
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [previousOdometer, setPreviousOdometer] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [calculatedEfficiency, setCalculatedEfficiency] = useState<number | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);


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
      const fuel = dist / eff;
      const cost = fuel * price;
      setEstimatedFuel(fuel);
      setEstimatedCost(cost);
    } else {
      setEstimatedFuel(null);
      setEstimatedCost(null);
    }
  };

  const calculateFuelEfficiency = () => {
    const current = parseFloat(currentOdometer);
    const previous = parseFloat(previousOdometer);
    const consumed = parseFloat(fuelConsumed);

    if (current > previous) {
      const distance = current - previous;
      setCalculatedDistance(distance);

      if (consumed > 0) {
        const efficiency = distance / consumed;
        setCalculatedEfficiency(efficiency);
      } else {
        setCalculatedEfficiency(null);
      }
    } else {
      setCalculatedDistance(null);
      setCalculatedEfficiency(null);
    }
  };


  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Estimators
        </CardTitle>
        <CardDescription>
          Calculate your trip's fuel cost or your vehicle's fuel efficiency.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cost" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cost">Trip Cost</TabsTrigger>
            <TabsTrigger value="efficiency">Fuel Efficiency</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cost" className="mt-6">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Estimate the fuel cost for your next trip. You can select one of your vehicles or enter the fuel efficiency manually.
              </p>
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

              {estimatedCost !== null && estimatedFuel !== null && (
                <div className="bg-muted/50 p-6 rounded-lg">
                  <div className="flex justify-around text-center w-full items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Fuel</p>
                      <p className="text-3xl font-bold">
                        {estimatedFuel.toFixed(2)}
                        <span className="text-xl font-medium text-muted-foreground"> L</span>
                      </p>
                    </div>
                    <div className="h-16 w-px bg-border mx-4" />
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Cost</p>
                      <p className="text-3xl font-bold">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(estimatedCost)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="efficiency" className="mt-6">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Calculate your vehicle's fuel efficiency by entering odometer readings from two fill-ups.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-odometer" className="flex items-center gap-1.5">
                    <Gauge className="h-4 w-4" /> Current Odometer (km)
                  </Label>
                  <Input
                    id="current-odometer"
                    type="number"
                    placeholder="e.g., 25450"
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="previous-odometer" className="flex items-center gap-1.5">
                    <Gauge className="h-4 w-4" /> Previous Odometer (km)
                  </Label>
                  <Input
                    id="previous-odometer"
                    type="number"
                    placeholder="e.g., 25000"
                    value={previousOdometer}
                    onChange={(e) => setPreviousOdometer(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fuel-consumed" className="flex items-center gap-1.5">
                  <Fuel className="h-4 w-4" /> Fuel Consumed (L, Optional)
                </Label>
                <Input
                  id="fuel-consumed"
                  type="number"
                  placeholder="e.g., 30"
                  value={fuelConsumed}
                  onChange={(e) => setFuelConsumed(e.target.value)}
                />
              </div>
              <Button onClick={calculateFuelEfficiency} className="w-full">
                <Calculator className="mr-2 h-4 w-4" /> Calculate
              </Button>
              
              {calculatedDistance !== null && (
                <div className="bg-muted/50 p-6 rounded-lg">
                  <div className="flex justify-around text-center w-full items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Distance Traveled</p>
                      <p className="text-3xl font-bold">
                        {calculatedDistance.toFixed(1)}
                        <span className="text-xl font-medium text-muted-foreground"> km</span>
                      </p>
                    </div>
                    {calculatedEfficiency !== null && (
                        <>
                            <div className="h-16 w-px bg-border mx-4" />
                            <div>
                                <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
                                <p className="text-3xl font-bold">
                                    {calculatedEfficiency.toFixed(2)}
                                    <span className="text-xl font-medium text-muted-foreground"> km/L</span>
                                </p>
                            </div>
                        </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
