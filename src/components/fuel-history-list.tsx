
'use client';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { FuelEntry } from '@/types';
import { Trash2 } from 'lucide-react';

interface FuelHistoryListProps {
  entries: FuelEntry[];
  vehicleId: string;
}

export function FuelHistoryList({ entries, vehicleId }: FuelHistoryListProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const handleDelete = (entryId: string) => {
    if (!user || !vehicleId) return;
    const entryRef = doc(firestore, 'users', user.uid, 'vehicles', vehicleId, 'fuelEntries', entryId);
    deleteDocumentNonBlocking(entryRef);
  };

  if (entries.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-10">
            <p>No fuel entries recorded for this vehicle yet.</p>
        </div>
    );
  }

  return (
    <ScrollArea className="h-[60vh] border rounded-md">
      <Table>
        <TableHeader className="sticky top-0 bg-muted">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Odometer</TableHead>
            <TableHead className="text-right">Litres</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Mileage</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{format(parseISO(entry.dateTime), 'dd MMM yyyy')}</TableCell>
              <TableCell>{entry.odometerReading.toLocaleString()} km</TableCell>
              <TableCell className="text-right">{entry.fuelQuantityLitres.toFixed(2)} L</TableCell>
              <TableCell className="text-right font-mono">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(entry.amountPaid)}
              </TableCell>
              <TableCell className="text-right">
                {entry.mileage ? (
                    <Badge variant="outline">{entry.mileage.toFixed(2)} km/L</Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will permanently delete this fuel entry. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(entry.id)}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
