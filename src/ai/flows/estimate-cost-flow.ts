'use server';
/**
 * @fileOverview A maintenance cost estimation AI agent.
 *
 * - estimateMaintenanceCost - A function that handles the cost estimation.
 * - EstimateCostInput - The input type for the estimateMaintenanceCost function.
 * - EstimateCostOutput - The return type for the estimateMaintenanceCost function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Vehicle } from '@/types';

const EstimateCostInputSchema = z.object({
  vehicle: z.object({
    brand: z.string(),
    model: z.string(),
    year: z.number(),
    fuelType: z.string(),
  }),
  serviceDescription: z.string().describe('A detailed description of the service or repair needed.'),
});
export type EstimateCostInput = z.infer<typeof EstimateCostInputSchema>;

const EstimateCostOutputSchema = z.object({
  estimatedCost: z.number().describe('The estimated cost for the service in INR.'),
  reasoning: z.string().describe('A brief explanation of how the cost was estimated, including potential parts and labor.'),
});
export type EstimateCostOutput = z.infer<typeof EstimateCostOutputSchema>;


export async function estimateMaintenanceCost(input: EstimateCostInput): Promise<EstimateCostOutput> {
  return estimateCostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateCostPrompt',
  input: { schema: EstimateCostInputSchema },
  output: { schema: EstimateCostOutputSchema },
  prompt: `You are an expert car mechanic in India. Your task is to provide a cost estimate for a vehicle maintenance job.

Vehicle Details:
- Brand: {{{vehicle.brand}}}
- Model: {{{vehicle.model}}}
- Year: {{{vehicle.year}}}
- Fuel Type: {{{vehicle.fuelType}}}

Service Description:
"{{{serviceDescription}}}"

Based on the information provided, estimate the total cost in Indian Rupees (INR).
Provide a breakdown of your reasoning, considering parts, labor, and any other relevant factors for the Indian market.
Return only the JSON object with the estimatedCost and reasoning.`,
});

const estimateCostFlow = ai.defineFlow(
  {
    name: 'estimateCostFlow',
    inputSchema: EstimateCostInputSchema,
    outputSchema: EstimateCostOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
