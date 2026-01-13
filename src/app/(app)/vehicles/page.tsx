'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, query, orderBy, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { VehicleManagement } from '@/components/vehicle-management';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Vehicle, VehicleDocument, MaintenanceRecord } from '@/types';

export default function VehiclesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [maintLoading, setMaintLoading] = useState(true);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('brand'));
  }, [firestore, user]);

  const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);

  useEffect(() => {
    if (!vehicles || !user) return;

    setDocsLoading(true);
    setMaintLoading(true);

    const unsubscribes: (() => void)[] = [];

    const fetchSubCollections = async () => {
      let allDocuments: VehicleDocument[] = [];
      let allMaintenance: MaintenanceRecord[] = [];

      for (const vehicle of vehicles) {
        // Documents
        const docsRef = collection(firestore, 'users', user.uid, 'vehicles', vehicle.id, 'documents');
        const docsUnsub = onSnapshot(docsRef, (snapshot) => {
          const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleDocument));
          allDocuments = [...allDocuments.filter(d => d.vehicleId !== vehicle.id), ...newDocs];
          setDocuments([...allDocuments]);
        });
        unsubscribes.push(docsUnsub);

        // Maintenance
        const maintRef = collection(firestore, 'users', user.uid, 'vehicles', vehicle.id, 'maintenanceLogs');
        const maintUnsub = onSnapshot(maintRef, (snapshot) => {
          const newMaint = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord));
          allMaintenance = [...allMaintenance.filter(m => m.vehicleId !== vehicle.id), ...newMaint];
          setMaintenanceRecords([...allMaintenance]);
        });
        unsubscribes.push(maintUnsub);
      }
      setDocsLoading(false);
      setMaintLoading(false);
    };

    fetchSubCollections();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [vehicles, user, firestore]);

  const isLoading = isUserLoading || vehiclesLoading || docsLoading || maintLoading;
  
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
