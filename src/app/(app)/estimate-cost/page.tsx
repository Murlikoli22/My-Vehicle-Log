import { CostEstimatorForm } from '@/components/cost-estimator-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Bot } from 'lucide-react';

export default function EstimateCostPage() {
  return (
    <div className="max-w-3xl mx-auto">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Maintenance Cost Estimator</CardTitle>
                        <CardDescription>
                            Leverage AI to estimate costs for your next vehicle service based on make, model, and service type.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <CostEstimatorForm />
            </CardContent>
        </Card>
    </div>
  );
}
