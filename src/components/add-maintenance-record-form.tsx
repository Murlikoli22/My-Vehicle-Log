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

const formSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  odometerReading: z.coerce.number().min(0, 'Odometer reading must be positive.'),
  serviceType: z.string().min(1, 'Service type is required.'),
  mechanicDetails: z.string().min(1, 'Mechanic details are required.'),
  cost: z.coerce.number().min(0, 'Cost must be a positive number.'),
  notes: z.string().optional(),
  billUrl: z.string().url('Please enter a valid URL.').optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddMaintenanceRecordFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
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
      billUrl: '',
    },
  });

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
          name="billUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/bill.pdf" {...field} />
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
