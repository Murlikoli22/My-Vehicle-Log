'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bell,
  Car,
  Wrench,
  Fuel,
  PlusCircle,
  Gauge,
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Vehicle, Reminder, MaintenanceRecord, VehicleDocument, UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';


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

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const vehiclesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('brand'), limit(1));
    }, [firestore, user]);
    const { data: vehicles, isLoading: vehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);
    
    const activeVehicle = vehicles?.[0];

    const documentsQuery = useMemoFirebase(() => {
        if (!user || !activeVehicle) return null;
        return query(collection(firestore, 'users', user.uid, 'vehicles', activeVehicle.id, 'documents'));
    }, [firestore, user, activeVehicle]);
    const { data: documents, isLoading: documentsLoading } = useCollection<VehicleDocument>(documentsQuery);

    const maintenanceQuery = useMemoFirebase(() => {
        if (!user || !activeVehicle) return null;
        return query(collection(firestore, 'users', user.uid, 'vehicles', activeVehicle.id, 'maintenanceLogs'), orderBy('date', 'desc'), limit(3));
    }, [firestore, user, activeVehicle]);
    const { data: maintenanceRecords, isLoading: maintenanceLoading } = useCollection<MaintenanceRecord>(maintenanceQuery);

    const reminders = (documents || [])
        .map(doc => {
            if (doc.expiryDate) {
                const expiry = new Date(doc.expiryDate);
                const now = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(now.getDate() + 30);
                if (expiry > now && expiry <= thirtyDaysFromNow) {
                    return {
                        id: doc.id,
                        vehicleId: doc.vehicleId,
                        title: `${doc.documentType} Renewal`,
                        dueDate: doc.expiryDate,
                        type: doc.documentType.toLowerCase() as 'insurance' | 'puc' | 'service',
                    };
                }
            }
            return null;
        })
        .filter((r): r is Reminder => r !== null)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());


    const isLoading = isUserLoading || isProfileLoading || vehiclesLoading;
    const isSubDataLoading = documentsLoading || maintenanceLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    const WelcomeCard = () => (
      <Card>
        <CardHeader>
          <CardTitle>Welcome back, {userProfile?.name?.split(' ')[0] || 'User'}!</CardTitle>
          <CardDescription>Here's a quick overview of your vehicle.</CardDescription>
        </CardHeader>
      </Card>
    );

    const NoVehicleCard = () => (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>No Vehicles Found</CardTitle>
                <CardDescription>Get started by adding your first vehicle to your digital garage.</CardDescription>
            </CardHeader>
            <CardContent>
                <Car className="h-16 w-16 mx-auto text-muted-foreground" />
                 <Button asChild className="mt-4">
                    <Link href="/vehicles">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Vehicle
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col gap-6">
            <WelcomeCard />

            {!activeVehicle && !vehiclesLoading && <NoVehicleCard />}
            
            {activeVehicle && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Vehicle</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                               <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image
                                        src={activeVehicle.imageUrl}
                                        alt={`${activeVehicle.brand} ${activeVehicle.model}`}
                                        fill
                                        className="object-cover"
                                        data-ai-hint={activeVehicle.imageHint}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{activeVehicle.brand} {activeVehicle.model}</h3>
                                    <p className="text-sm text-muted-foreground">{activeVehicle.registrationNumber}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Gauge className="h-4 w-4 text-muted-foreground" />
                                    <span>{activeVehicle.odometerReading.toLocaleString()} km</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Fuel className="h-4 w-4 text-muted-foreground" />
                                    <span>{activeVehicle.fuelType}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Reminders</CardTitle>
                             <CardDescription>Important dates approaching in the next 30 days.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {isSubDataLoading ? ( <Skeleton className="h-20 w-full" />) :
                            reminders.length > 0 ? (
                                <ul className="space-y-3">
                                    {reminders.map(reminder => (
                                        <li key={reminder.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                {getReminderIcon(reminder.type)}
                                                <span>{reminder.title}</span>
                                            </div>
                                            <span className="font-medium">{format(parseISO(reminder.dueDate), 'dd MMM, yyyy')}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center text-muted-foreground py-4">
                                    <Bell className="mx-auto h-8 w-8 mb-2" />
                                    <p>No upcoming reminders.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader>
                            <CardTitle>Recent Maintenance</CardTitle>
                            <CardDescription>Latest service records for your {activeVehicle.brand}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isSubDataLoading ? (<Skeleton className="h-24 w-full" />) :
                            maintenanceRecords && maintenanceRecords.length > 0 ? (
                                <ul className="space-y-3">
                                    {maintenanceRecords.map(record => (
                                        <li key={record.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">{record.serviceType}</p>
                                                    <p className="text-xs text-muted-foreground">{format(parseISO(record.date), 'dd MMM, yyyy')}</p>
                                                </div>
                                            </div>
                                            <span className="font-mono text-sm">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(record.cost)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                 <div className="text-center text-muted-foreground py-4">
                                    <Wrench className="mx-auto h-8 w-8 mb-2" />
                                    <p>No maintenance records yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
      );
}
