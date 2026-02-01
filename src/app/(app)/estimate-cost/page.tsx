'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function EstimateCostPage() {
  return (
    <div className="max-w-2xl mx-auto">
        <Card>
            <CardHeader className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <CardTitle className="mt-4">Feature Unavailable</CardTitle>
                <CardDescription>
                    The AI-powered Maintenance Cost Estimator is temporarily unavailable due to a technical issue. We are working to resolve this.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-center text-muted-foreground">
                    We apologize for the inconvenience. Please check back later.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
