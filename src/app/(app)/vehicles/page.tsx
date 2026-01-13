'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore';
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
    return query(collectionGroup(firestore, 'documents'));
  }, [firestore, user]);

  const maintenanceQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collectionGroup(firestore, 'maintenanceLogs'));
  }, [firestore, user]);


  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);
  const { data: documentsData, isLoading: documentsLoading } = useCollection<VehicleDocument>(documentsQuery);
  const { data: maintenanceData, isLoading: maintenanceLoading } = useCollection<MaintenanceRecord>(maintenanceQuery);

  const documents = useMemo(() => {
    if (!documentsData || !vehicles) return [];
    const vehicleIds = new Set(vehicles.map(v => v.id));
    return documentsData.filter(doc => vehicleIds.has(doc.vehicleId));
  }, [documentsData, vehicles]);

  const maintenanceRecords = useMemo(() => {
    if (!maintenanceData || !vehicles) return [];
    const vehicleIds = new Set(vehicles.map(v => v.id));
    return maintenanceData.filter(rec => vehicleIds.has(rec.vehicleId));
  }, [maintenanceData, vehicles]);


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
