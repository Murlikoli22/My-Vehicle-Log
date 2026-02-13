
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Vehicle } from '@/types';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  fuelQuantityLitres: z.coerce.number().min(0.1, 'Must be greater than 0.'),
  amountPaid: z.coerce.number().min(1, 'Must be greater than 0.'),
  odometerReading: z.coerce.number().min(1, 'Odometer reading is required.'),
  fuelType: z.enum(['Gasoline', 'Diesel', 'CNG', 'Electric']),
  stationName: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FuelEntryFormProps {
  vehicle: Vehicle | null;
  lastOdometer: number;
}

export function FuelEntryForm({ vehicle, lastOdometer }: FuelEntryFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fuelType: vehicle?.fuelType || 'Gasoline',
      odometerReading: lastOdometer > 0 ? undefined : 0,
      fuelQuantityLitres: undefined,
      amountPaid: undefined,
      stationName: '',
      notes: '',
    },
  });

  form.watch('odometerReading');

  const onSubmit = async (values: FormValues) => {
    if (!user || !vehicle) {
        toast({ variant: "destructive", title: "Error", description: "No user or vehicle selected." });
        return;
    }
    
    if (values.odometerReading <= lastOdometer) {
        form.setError("odometerReading", {
            type: "manual",
            message: `Must be greater than last reading (${lastOdometer} km).`
        });
        return;
    }

    const newEntry = {
        ...values,
        userId: user.uid,
        vehicleId: vehicle.id,
        dateTime: new Date().toISOString(),
    };

    const fuelCollectionRef = collection(firestore, 'users', user.uid, 'vehicles', vehicle.id, 'fuelEntries');
    await addDocumentNonBlocking(fuelCollectionRef, newEntry);

    // Also update the vehicle's main odometer reading
    const vehicleRef = doc(firestore, 'users', user.uid, 'vehicles', vehicle.id);
    await updateDocumentNonBlocking(vehicleRef, { odometerReading: values.odometerReading });

    toast({ title: "Success", description: "Fuel entry added." });
    form.reset({
        ...form.getValues(),
        odometerReading: values.odometerReading,
        fuelQuantityLitres: undefined,
        amountPaid: undefined,
        stationName: '',
        notes: '',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="fuelQuantityLitres"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Fuel Quantity (Litres)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 30.5" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount Paid (INR)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 3200" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="odometerReading"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Odometer (km)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 25450" {...field} />
                    </FormControl>
                     {lastOdometer > 0 && form.getValues("odometerReading") > lastOdometer && (
                        <FormDescription>
                            Distance: {(form.getValues("odometerReading") - lastOdometer).toFixed(1)} km
                        </FormDescription>
                     )}
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Fuel Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Gasoline">Gasoline</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="CNG">CNG</SelectItem>
                        <SelectItem value="Electric">Electric (kWh)</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="stationName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Station Name (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., City Fuel Stop" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Notes / Tags (Optional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="e.g., Highway run, city traffic" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Fuel Entry
        </Button>
      </form>
    </Form>
  );
}
