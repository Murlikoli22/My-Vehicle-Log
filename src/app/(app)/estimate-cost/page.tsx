'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function EstimateCostPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle className="mt-4">Feature Unavailable</CardTitle>
          <CardDescription>
            The Maintenance Cost Estimator is temporarily unavailable due to technical issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            We are working to resolve this. Please check back later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
