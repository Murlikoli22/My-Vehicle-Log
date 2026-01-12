import Link from 'next/link';
import Image from 'next/image';
import {
  Bell,
  Car,
  Fuel,
  Gauge,
  Calendar as CalendarIcon,
  Wrench,
  ArrowUpRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
import { vehicles, reminders, maintenanceRecords } from '@/lib/data';

const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);

const getReminderIcon = (type: string) => {
  switch (type) {
    case 'service': return <Wrench className="h-4 w-4 text-muted-foreground" />;
    case 'insurance': return <Car className="h-4 w-4 text-muted-foreground" />;
    case 'puc': return <Fuel className="h-4 w-4 text-muted-foreground" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
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
            {vehicles.slice(0, 2).map((vehicle) => (
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
          </CardContent>
        </Card>
      </div>

      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle>Upcoming Reminders</CardTitle>
          <CardDescription>Important dates for your vehicles.</CardDescription>
        </CardHeader>
        <CardContent>
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
                const vehicle = vehicles.find((v) => v.id === reminder.vehicleId);
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
        </CardContent>
      </Card>
    </div>
  );
}
