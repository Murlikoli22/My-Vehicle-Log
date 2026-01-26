'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bell,
  Car,
  Wrench,
  ArrowUpRight,
  Fuel,
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Vehicle, Reminder, MaintenanceRecord, VehicleDocument } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';


// Helper function to get reminder icon
const getReminderIcon = (type: string) => {
  switch (type) {
    case 'service': return <Wrench className="h-4 w-4 text-muted-foreground" />;
    case 'insurance': return <Car className="h-4 w-4 text-muted-foreground" />;
    case 'puc': return <Fuel className="h-4 w-4 text-muted-foreground" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};


export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const vehiclesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('brand'));
    }, [firestore, user]);

    const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);

    const [documents, setDocuments] = useState<VehicleDocument[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [subCollectionsLoading, setSubCollectionsLoading] = useState(true);

    useEffect(() => {
        if (!vehicles || !user) {
            if (!vehiclesLoading && !isUserLoading) {
                setSubCollectionsLoading(false);
            }
            return;
        };

        setSubCollectionsLoading(true);
        const unsubscribes: (() => void)[] = [];
        let allDocuments: VehicleDocument[] = [];
        let allMaintenance: MaintenanceRecord[] = [];

        if (vehicles.length === 0) {
            setSubCollectionsLoading(false);
            return;
        }

        let pending = vehicles.length * 2;
        const onSubLoad = () => {
            pending--;
            if(pending === 0) {
                setSubCollectionsLoading(false);
            }
        }

        for (const vehicle of vehicles) {
            const docsRef = collection(firestore, 'users', user.uid, 'vehicles', vehicle.id, 'documents');
            const docsUnsub = onSnapshot(docsRef, (snapshot) => {
                const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleDocument));
                allDocuments = [...allDocuments.filter(d => d.vehicleId !== vehicle.id), ...newDocs];
                setDocuments([...allDocuments]);
                onSubLoad();
            }, () => onSubLoad());
            unsubscribes.push(docsUnsub);

            const maintRef = collection(firestore, 'users', user.uid, 'vehicles', vehicle.id, 'maintenanceLogs');
            const maintUnsub = onSnapshot(maintRef, (snapshot) => {
                const newMaint = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord));
                allMaintenance = [...allMaintenance.filter(m => m.vehicleId !== vehicle.id), ...newMaint];
                setMaintenanceRecords([...allMaintenance]);
                onSubLoad();
            }, () => onSubLoad());
            unsubscribes.push(maintUnsub);
        }

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [vehicles, user, firestore, vehiclesLoading, isUserLoading]);

    useEffect(() => {
        const newReminders: Reminder[] = [];
        documents.forEach(doc => {
            if (doc.expiryDate) {
                const expiry = new Date(doc.expiryDate);
                const now = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(now.getDate() + 30);

                if (expiry > now && expiry <= thirtyDaysFromNow) {
                    newReminders.push({
                        id: doc.id,
                        vehicleId: doc.vehicleId,
                        title: `${doc.documentType} Renewal`,
                        dueDate: doc.expiryDate,
                        type: doc.documentType.toLowerCase() as 'insurance' | 'puc' | 'service',
                    });
                }
            }
        });
        setReminders(newReminders.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    }, [documents]);

    const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
    const isLoading = isUserLoading || vehiclesLoading || subCollectionsLoading;

    if (isLoading) {
        return (
             <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                            <Car className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-8 w-1/4 mt-2" />
                           <Skeleton className="h-4 w-3/4 mt-2" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Maintenance Cost</CardTitle>
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-1/2 mt-2" />
                            <Skeleton className="h-4 w-1/2 mt-2" />
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle>My Vehicles</CardTitle>
                        <CardDescription>An overview of your registered vehicles.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-6">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-lg" />
                            <div className="grid gap-2 flex-1">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                         <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-lg" />
                            <div className="grid gap-2 flex-1">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                </div>
                 <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Upcoming Reminders</CardTitle>
                        <CardDescription>Important dates for your vehicles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vehicles?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Managed in your account</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Maintenance Cost</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMaintenanceCost)}
                </div>
                <p className="text-xs text-muted-foreground">Across all your vehicles</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center">
                 <div className="grid gap-2">
                    <CardTitle>My Vehicles</CardTitle>
                    <CardDescription>An overview of your registered vehicles.</CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                    <Link href="/vehicles">
                        View All
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </Button>
              </CardHeader>
              <CardContent className="grid gap-6">
                {(vehicles ?? []).slice(0, 2).map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden">
                        <Image
                            src={vehicle.imageUrl}
                            alt={`${vehicle.brand} ${vehicle.model}`}
                            fill
                            className="object-cover"
                            data-ai-hint={vehicle.imageHint}
                        />
                    </div>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium leading-none">
                        {vehicle.brand} {vehicle.model} ({vehicle.year})
                      </p>
                      <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
                    </div>
                    <div className="ml-auto font-medium text-right">
                        <p className="text-sm">{vehicle.odometerReading.toLocaleString()} km</p>
                        <Badge variant="outline" className="mt-1">{vehicle.fuelType}</Badge>
                    </div>
                  </div>
                ))}
                {vehicles?.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        <p>You haven't added any vehicles yet.</p>
                        <Button asChild variant="link" className="mt-2">
                            <Link href="/vehicles">Add one now</Link>
                        </Button>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
    
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Upcoming Reminders</CardTitle>
              <CardDescription>Important dates for your vehicles approaching in the next 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              {reminders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Reminder</TableHead>
                      <TableHead className="text-right">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminders.map((reminder) => {
                      const vehicle = vehicles?.find((v) => v.id === reminder.vehicleId);
                      return (
                        <TableRow key={reminder.id}>
                          <TableCell>
                            <div className="font-medium">{vehicle?.brand} {vehicle?.model}</div>
                            <div className="hidden text-sm text-muted-foreground md:inline">
                              {vehicle?.registrationNumber}
                            </div>
                          </TableCell>
                          <TableCell>
                              <div className="flex items-center gap-2">
                                  {getReminderIcon(reminder.type)}
                                  <span>{reminder.title}</span>
                              </div>
                          </TableCell>
                          <TableCell className="text-right">{new Date(reminder.dueDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <Bell className="mx-auto h-8 w-8 mb-2" />
                  <p>No upcoming reminders.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
}
