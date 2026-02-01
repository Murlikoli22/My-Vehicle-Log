'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EstimateCostPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Cost Estimator</CardTitle>
          <CardDescription>
            Get an AI-powered cost estimate for your vehicle's maintenance.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Feature Temporarily Unavailable</AlertTitle>
                <AlertDescription>
                    <p>The AI-powered cost estimator is currently offline due to a technical issue. We are working to resolve this and apologize for the inconvenience.</p>
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
