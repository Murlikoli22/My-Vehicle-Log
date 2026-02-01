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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { VehicleDocument } from '@/types';

const formSchema = z.object({
  documentType: z.enum(['RC Book', 'Insurance', 'PUC', 'Other']),
  expiryDate: z.date().optional(),
  file: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddDocumentFormProps {
  onSubmit: (values: Partial<Omit<VehicleDocument, 'id' | 'vehicleId' | 'uploadDate'>>) => Promise<void>;
}

export function AddDocumentForm({ onSubmit }: AddDocumentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: 'Insurance',
      file: undefined,
    },
  });

  const { isSubmitting } = form.formState;

  const handleFormSubmit = async (data: FormValues) => {
    const { file, ...rest } = data;
    let fileUrl: string | undefined = undefined;

    if (file && file.length > 0) {
      const fileToUpload = file[0];
      try {
        fileUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(fileToUpload);
        });
      } catch (error) {
        console.error("Error converting file to data URL", error);
        form.setError('file', { type: 'manual', message: 'Could not upload file.' });
        return;
      }
    }

    await onSubmit({ ...rest, fileUrl });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="documentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="PUC">PUC</SelectItem>
                  <SelectItem value="RC Book">RC Book</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expiry Date (Optional)</FormLabel>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date('1990-01-01')}
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
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Document (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  onChange={(e) => field.onChange(e.target.files)}
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
            </>
          ) : (
            'Add Document'
          )}
        </Button>
      </form>
    </Form>
  );
}
