'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import type { MaintenanceRecord } from '@/types';

const formSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  odometerReading: z.coerce.number().min(0, 'Odometer reading must be positive.'),
  serviceType: z.string().min(1, 'Service type is required.'),
  mechanicDetails: z.string().min(1, 'Mechanic details are required.'),
  cost: z.coerce.number().min(0, 'Cost must be a positive number.'),
  notes: z.string().optional(),
  bill: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddMaintenanceRecordFormProps {
  onSubmit: (values: Partial<Omit<MaintenanceRecord, 'id' | 'vehicleId'>>) => Promise<void>;
}

export function AddMaintenanceRecordForm({ onSubmit }: AddMaintenanceRecordFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      odometerReading: 0,
      serviceType: '',
      mechanicDetails: '',
      cost: 0,
      notes: '',
    },
  });

  const { isSubmitting } = form.formState;

  const handleFormSubmit = async (data: FormValues) => {
    const { bill, ...rest } = data;
    let billUrl: string | undefined = undefined;

    if (bill) {
      const fileToUpload = bill;
      try {
        billUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(fileToUpload);
        });
      } catch (error) {
        console.error("Error converting file to data URL", error);
        form.setError('bill', { type: 'manual', message: 'Could not upload file.' });
        return;
      }
    }

    await onSubmit({ ...rest, billUrl });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Service</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-between font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick a date</span>}
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date('1990-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="odometerReading"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Odometer Reading (km)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 25000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Oil Change, Brake Repair" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mechanicDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mechanic / Service Center</FormLabel>
              <FormControl>
                <Input placeholder="e.g., City Auto Works" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Cost (INR)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 4500" {...field} />
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
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Replaced air filter, checked tire pressure." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bill"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Bill Photo (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => field.onChange(e.target.files?.[0])}
                  className="pt-2 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Record...
            </>
          ) : (
            'Add Maintenance Record'
          )}
        </Button>
      </form>
    </Form>
  );
}
