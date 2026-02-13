
'use client';

import { useState, useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fuel, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { FuelEntryForm } from '@/components/fuel-entry-form';
import { FuelHistoryList } from '@/components/fuel-history-list';
import { FuelAnalytics } from '@/components/fuel-analytics';
import type { Vehicle, FuelEntry } from '@/types';
import { processFuelEntries } from '@/lib/fuel-stats';

function FuelPageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-10 w-full" />
            <div className="pt-4">
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
}

function NoVehicleCard() {
    return (
        <Card className="mt-6 text-center">
            <CardHeader>
                <CardTitle>No Vehicles Found</CardTitle>
                <CardDescription>You need to add a vehicle before you can track fuel consumption.</CardDescription>
            </CardHeader>
            <CardContent>
                <Fuel className="h-16 w-16 mx-auto text-muted-foreground" />
            </CardContent>
        </Card>
    );
}


export default function FuelPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

    const vehiclesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('brand'));
    }, [firestore, user]);
    const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);

    const fuelEntriesQuery = useMemoFirebase(() => {
        if (!user || !selectedVehicleId) return null;
        return query(
            collection(firestore, 'users', user.uid, 'vehicles', selectedVehicleId, 'fuelEntries'),
            orderBy('dateTime', 'desc')
        );
    }, [firestore, user, selectedVehicleId]);
    const { data: fuelEntries, isLoading: fuelEntriesLoading } = useCollection<FuelEntry>(fuelEntriesQuery);

    // Set initial selected vehicle
    useMemo(() => {
        if (vehicles && vehicles.length > 0 && !selectedVehicleId) {
            setSelectedVehicleId(vehicles[0].id);
        }
    }, [vehicles, selectedVehicleId]);

    const selectedVehicle = useMemo(() => {
        return vehicles?.find(v => v.id === selectedVehicleId) || null;
    }, [vehicles, selectedVehicleId]);

    const processedFuelEntries = useMemo(() => {
        return processFuelEntries(fuelEntries || []);
    }, [fuelEntries]);
    
    const isLoading = isUserLoading || vehiclesLoading;
    const isDataLoading = fuelEntriesLoading && !!selectedVehicleId;

    if (isLoading) {
        return <FuelPageSkeleton />;
    }
    
    if (!vehicles || vehicles.length === 0) {
        return <NoVehicleCard />;
    }

    return (
        <div className="space-y-6">
            <div>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger className="w-full max-w-sm">
                        <SelectValue placeholder="Select a vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                        {vehicles.map(vehicle => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.brand} {vehicle.model} ({vehicle.registrationNumber})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="log">Log</TabsTrigger>
                    <TabsTrigger value="add">Add Entry</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="mt-6">
                    {isDataLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <FuelAnalytics entries={processedFuelEntries} />
                    )}
                </TabsContent>
                <TabsContent value="log" className="mt-6">
                    {isDataLoading ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <FuelHistoryList entries={processedFuelEntries} vehicleId={selectedVehicleId} />
                    )}
                </TabsContent>
                <TabsContent value="add" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>New Fuel Entry</CardTitle>
                            <CardDescription>
                                Add a new fuel record for your {selectedVehicle?.brand} {selectedVehicle?.model}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FuelEntryForm 
                                vehicle={selectedVehicle} 
                                lastOdometer={fuelEntries?.[0]?.odometerReading ?? selectedVehicle?.odometerReading ?? 0}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
