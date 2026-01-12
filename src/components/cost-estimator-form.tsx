'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Wand2, BarChart, CheckCircle } from 'lucide-react';

import { estimateMaintenanceCost, type EstimateMaintenanceCostOutput } from '@/ai/flows/estimate-maintenance-cost';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

const formSchema = z.object({
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  vehicleBrand: z.string().min(1, 'Brand is required'),
  vehicleModel: z.string().min(1, 'Model is required'),
  vehicleYear: z.coerce.number().min(1980, 'Year must be after 1980').max(new Date().getFullYear() + 1),
  fuelType: z.string().min(1, 'Fuel type is required'),
  odometerReading: z.coerce.number().min(0, 'Odometer reading must be positive'),
  serviceType: z.string().min(1, 'Service type is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function CostEstimatorForm() {
  const [result, setResult] = useState<EstimateMaintenanceCostOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleType: 'Car',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleYear: 2021,
      fuelType: 'Gasoline',
      odometerReading: 25000,
      serviceType: 'Oil Change',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    try {
      const estimation = await estimateMaintenanceCost(values);
      setResult(estimation);
    } catch (e) {
      setError('Failed to get estimation. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Car">Car</SelectItem>
                      <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="Truck">Truck</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Gasoline">Gasoline</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleBrand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl><Input placeholder="e.g., Honda" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl><Input placeholder="e.g., Civic" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="vehicleYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 2022" {...field} /></FormControl>
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
                  <FormControl><Input type="number" placeholder="e.g., 30000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <FormControl><Input placeholder="e.g., Brake Pad Replacement" {...field} /></FormControl>
                <FormDescription>What maintenance service do you need?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Estimating...</>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" /> Estimate Cost</>
            )}
          </Button>
        </form>
      </Form>
      {result && (
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
                <BarChart /> AI-Generated Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-4xl font-bold text-primary">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(result.estimatedCost)}
                </p>
                <p className="text-sm font-medium capitalize">Confidence: {result.confidenceLevel}</p>
            </div>
            <Separator />
            <div className="space-y-2">
                <h4 className="font-semibold">Cost Breakdown</h4>
                <p className="text-sm text-muted-foreground">{result.costBreakdown}</p>
            </div>
            <div className="space-y-2">
                <h4 className="font-semibold">Factors Considered</h4>
                <p className="text-sm text-muted-foreground">{result.factorsConsidered}</p>
            </div>
          </CardContent>
        </Card>
      )}
       {error && (
        <div className="mt-8 text-destructive">{error}</div>
      )}
    </>
  );
}
