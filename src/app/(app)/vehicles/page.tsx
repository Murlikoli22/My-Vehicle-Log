'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { VehicleManagement } from '@/components/vehicle-management';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Vehicle, VehicleDocument, MaintenanceRecord } from '@/types';

export default function VehiclesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const vehiclesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('brand'));
  }, [firestore, user]);

  const documentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    // This is a collection group query. Make sure you have the correct index in Firestore.
    // The path is users/{userId}/vehicles/{vehicleId}/documents
    // We are querying all documents for the user.
    return query(collection(firestore, `users/${user.uid}/vehicles`));
  }, [firestore, user]);

  const maintenanceQuery = useMemoFirebase(() => {
    if (!user) return null;
    // This is a collection group query for maintenance records.
    return query(collection(firestore, `users/${user.uid}/vehicles`));
  }, [firestore, user]);


  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);
  const { data: documents, isLoading: documentsLoading } = useCollection<VehicleDocument>(
    useMemoFirebase(() => (vehicles ? collection(firestore, `users/${user!.uid}/vehicles/${vehicles[0]?.id}/documents`) : null), [firestore, user, vehicles])
  );
  const { data: maintenanceRecords, isLoading: maintenanceLoading } = useCollection<MaintenanceRecord>(
     useMemoFirebase(() => (vehicles ? collection(firestore, `users/${user!.uid}/vehicles/${vehicles[0]?.id}/maintenanceLogs`) : null), [firestore, user, vehicles])
  );


  const isLoading = isUserLoading || vehiclesLoading || documentsLoading || maintenanceLoading;
  
  if (isLoading) {
    return (
        <div className="grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-9 w-28" />
                </div>
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <VehicleManagement
      initialVehicles={vehicles || []}
      initialDocuments={documents || []}
      initialMaintenanceRecords={maintenanceRecords || []}
    />
  );
}
