'use server';

/**
 * @fileOverview Estimates the maintenance cost of a vehicle based on its data, historical data of similar vehicles, and the type of service.
 *
 * - estimateMaintenanceCost - A function that handles the maintenance cost estimation process.
 * - EstimateMaintenanceCostInput - The input type for the estimateMaintenanceCost function.
 * - EstimateMaintenanceCostOutput - The return type for the estimateMaintenanceCost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateMaintenanceCostInputSchema = z.object({
  vehicleType: z.string().describe('The type of vehicle (e.g., car, truck, motorcycle).'),
  vehicleBrand: z.string().describe('The brand of the vehicle (e.g., Toyota, Ford, Honda).'),
  vehicleModel: z.string().describe('The model of the vehicle (e.g., Camry, F-150, Civic).'),
  vehicleYear: z.number().describe('The year the vehicle was manufactured.'),
  fuelType: z.string().describe('The type of fuel the vehicle uses (e.g., gasoline, diesel, electric).'),
  odometerReading: z.number().describe('The current odometer reading of the vehicle in miles or kilometers.'),
  serviceType: z.string().describe('The type of service to be performed (e.g., oil change, tire rotation, brake replacement).'),
  historicalData: z.string().optional().describe('Historical maintenance data of similar vehicles, if available.'),
});
export type EstimateMaintenanceCostInput = z.infer<typeof EstimateMaintenanceCostInputSchema>;

const EstimateMaintenanceCostOutputSchema = z.object({
  estimatedCost: z.number().describe('The estimated maintenance cost for the specified service.'),
  costBreakdown: z.string().describe('A breakdown of the estimated cost, including parts and labor.'),
  confidenceLevel: z.string().describe('The confidence level of the estimate (e.g., high, medium, low).'),
  factorsConsidered: z.string().describe('Factors considered in the estimation, such as parts availability and labor rates.'),
});
export type EstimateMaintenanceCostOutput = z.infer<typeof EstimateMaintenanceCostOutputSchema>;

export async function estimateMaintenanceCost(input: EstimateMaintenanceCostInput): Promise<EstimateMaintenanceCostOutput> {
  return estimateMaintenanceCostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateMaintenanceCostPrompt',
  input: {schema: EstimateMaintenanceCostInputSchema},
  output: {schema: EstimateMaintenanceCostOutputSchema},
  prompt: `You are an expert mechanic providing cost estimates for vehicle maintenance.

  Based on the following information, estimate the maintenance cost for the specified service.  Provide a breakdown of the estimated cost, including parts and labor.

  Vehicle Type: {{{vehicleType}}}
  Vehicle Brand: {{{vehicleBrand}}}
  Vehicle Model: {{{vehicleModel}}}
  Vehicle Year: {{{vehicleYear}}}
  Fuel Type: {{{fuelType}}}
  Odometer Reading: {{{odometerReading}}}
  Service Type: {{{serviceType}}}
  Historical Data: {{{historicalData}}}

  Provide a confidence level for the estimate (high, medium, low) and factors considered in the estimation.
  Your estimate should include the estimated cost, cost breakdown, confidence level, and factors considered.
`,
});

const estimateMaintenanceCostFlow = ai.defineFlow(
  {
    name: 'estimateMaintenanceCostFlow',
    inputSchema: EstimateMaintenanceCostInputSchema,
    outputSchema: EstimateMaintenanceCostOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
