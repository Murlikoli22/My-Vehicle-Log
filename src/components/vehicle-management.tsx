'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Car,
  Fuel,
  Gauge,
  Calendar as CalendarIcon,
  Wrench,
  FileText,
  PlusCircle,
  MoreVertical,
  Download,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import type { Vehicle, VehicleDocument, MaintenanceRecord } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VehicleManagementProps {
  initialVehicles: Vehicle[];
  initialDocuments: VehicleDocument[];
  initialMaintenanceRecords: MaintenanceRecord[];
}

export function VehicleManagement({
  initialVehicles,
  initialDocuments,
  initialMaintenanceRecords,
}: VehicleManagementProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(initialVehicles[0] || null);

  const getVehicleDocuments = (vehicleId: string) =>
    initialDocuments.filter((doc) => doc.vehicleId === vehicleId);
  
  const getVehicleMaintenance = (vehicleId: string) =>
    initialMaintenanceRecords.filter((record) => record.vehicleId === vehicleId);

  const totalMaintenanceCost = selectedVehicle
    ? getVehicleMaintenance(selectedVehicle.id).reduce((sum, record) => sum + record.cost, 0)
    : 0;
    
  const isExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };


  return (
    <div className="grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">My Vehicles</h2>
            <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Vehicle
            </Button>
        </div>
        <div className="flex flex-col gap-3">
          {initialVehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              onClick={() => setSelectedVehicle(vehicle)}
              className={cn(
                'flex items-center gap-4 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
                selectedVehicle?.id === vehicle.id && 'bg-muted'
              )}
            >
              <div className="relative h-12 w-12 rounded-md overflow-hidden shrink-0">
                <Image
                    src={vehicle.imageUrl}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    data-ai-hint={vehicle.imageHint}
                />
              </div>
              <div className="flex-1 truncate">
                <p className="font-medium truncate">{vehicle.brand} {vehicle.model}</p>
                <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedVehicle ? (
        <Tabs defaultValue="details">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
                 <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0">
                    <Image
                        src={selectedVehicle.imageUrl}
                        alt={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                        fill
                        className="object-cover"
                        data-ai-hint={selectedVehicle.imageHint}
                    />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{selectedVehicle.brand} {selectedVehicle.model}</h1>
                    <p className="text-muted-foreground">{selectedVehicle.registrationNumber}</p>
                </div>
            </div>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Details</CardTitle>
                <CardDescription>Key information about your vehicle.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                    <Car className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{selectedVehicle.type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Year</p>
                        <p className="font-medium">{selectedVehicle.year}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Fuel className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Fuel Type</p>
                        <p className="font-medium">{selectedVehicle.fuelType}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Gauge className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Odometer</p>
                        <p className="font-medium">{selectedVehicle.odometerReading.toLocaleString()} km</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>Manage your vehicle's important documents.</CardDescription>
                </div>
                <Button size="sm" className="ml-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getVehicleDocuments(selectedVehicle.id).map(doc => (
                       <TableRow key={doc.id}>
                         <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground"/> {doc.type}</TableCell>
                         <TableCell>{doc.name}</TableCell>
                         <TableCell>
                            {doc.expiryDate ? (
                                <Badge variant={isExpired(doc.expiryDate) ? "destructive" : "secondary"}>
                                    Expires {format(parseISO(doc.expiryDate), "dd MMM yyyy")}
                                </Badge>
                            ) : (
                                <span className="text-muted-foreground">-</span>
                            )}
                         </TableCell>
                         <TableCell className="text-right">
                           <Button variant="ghost" size="icon">
                             <Download className="h-4 w-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-6">
             <Card>
              <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Maintenance Log</CardTitle>
                    <CardDescription>A complete history of all services and repairs.</CardDescription>
                </div>
                <Button size="sm" className="ml-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Record
                </Button>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead>Mechanic</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getVehicleMaintenance(selectedVehicle.id).map(record => (
                       <TableRow key={record.id}>
                         <TableCell>{format(parseISO(record.date), "dd MMM yyyy")}</TableCell>
                         <TableCell className="font-medium">{record.serviceType}</TableCell>
                         <TableCell>{record.odometerReading.toLocaleString()} km</TableCell>
                         <TableCell>{record.mechanic}</TableCell>
                         <TableCell className="text-right font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(record.cost)}</TableCell>
                       </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="justify-end gap-2 text-lg font-semibold border-t pt-4">
                <span>Total Cost:</span>
                <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMaintenanceCost)}</span>
              </CardFooter>
            </Card>
          </TabsContent>

        </Tabs>
      ) : (
        <Card className="flex flex-col items-center justify-center h-full text-center">
          <CardHeader>
            <CardTitle>No Vehicle Selected</CardTitle>
            <CardDescription>Please select a vehicle from the list to see its details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Car className="h-24 w-24 text-muted" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
