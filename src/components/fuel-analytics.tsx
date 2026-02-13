
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Fuel, ArrowDown, ArrowUp } from 'lucide-react';
import type { FuelEntry, FuelAnalyticsData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateFuelAnalytics } from '@/lib/fuel-stats';
import { ChartTooltipContent } from '@/components/ui/chart';
import { format } from 'date-fns';

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  description?: string;
}

function StatCard({ title, value, unit, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function formatMileage(mileage?: number) {
    return mileage ? mileage.toFixed(2) : 'N/A';
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}

interface FuelAnalyticsProps {
  entries: FuelEntry[];
}

export function FuelAnalytics({ entries }: FuelAnalyticsProps) {
  const analyticsData: FuelAnalyticsData = useMemo(() => calculateFuelAnalytics(entries), [entries]);

  if (entries.length < 2) {
    return (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Not Enough Data</CardTitle>
                <CardDescription>
                    You need at least two fuel entries to calculate analytics and insights. Keep logging your fill-ups!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Fuel className="h-16 w-16 mx-auto text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  const { today, thisWeek, thisMonth, insights, monthlyChartData } = analyticsData;

  const trendColor = insights.weekOverWeekConsumptionTrend >= 0 ? 'text-destructive' : 'text-green-500';
  const TrendIcon = insights.weekOverWeekConsumptionTrend >= 0 ? ArrowUp : ArrowDown;

  return (
    <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Insights</CardTitle>
                    <CardDescription>Your fuel performance highlights.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2"><TrendingUp className="text-green-500" /> Best Mileage</span>
                        <span className="font-semibold">{formatMileage(insights.bestMileageDay?.mileage)} km/L</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2"><TrendingDown className="text-red-500"/> Worst Mileage</span>
                        <span className="font-semibold">{formatMileage(insights.worstMileageDay?.mileage)} km/L</span>
                    </div>
                     <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">WoW Consumption</span>
                        <div className={`flex items-center font-semibold ${trendColor}`}>
                            <TrendIcon className="h-4 w-4" />
                            {insights.weekOverWeekConsumptionTrend.toFixed(1)}%
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>This Month</CardTitle>
                    <CardDescription>Summary for the current month.</CardDescription>
                </CardHeader>
                 <CardContent className="grid gap-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Spend</span>
                        <span className="font-semibold">{formatCurrency(thisMonth.totalSpend)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Avg. Mileage</span>
                        <span className="font-semibold">{formatMileage(thisMonth.avgMileage)} km/L</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Avg. Cost/km</span>
                        <span className="font-semibold">{formatCurrency(thisMonth.avgCostPerKm)}</span>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Consumption</CardTitle>
                    <CardDescription>Fuel added each day this month.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="h-[120px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}L`} />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent
                                    formatter={(value, name) => (
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold">{name}</span>
                                            <span className="text-muted-foreground">{`${value} Litres`}</span>
                                        </div>
                                    )}
                                />}
                            />
                            <Bar dataKey="litres" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                   </div>
                </CardContent>
            </Card>
        </div>

        <div>
            <h3 className="text-lg font-semibold mb-4">Period Overview</h3>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <StatCard title="Today's Litres" value={today.totalLitres.toFixed(1)} unit="L" description={formatCurrency(today.totalSpend)} />
                <StatCard title="Today's Mileage" value={formatMileage(today.avgMileage)} unit="km/L" description={`${today.totalDistance.toFixed(0)} km driven`}/>
                <StatCard title="Week's Litres" value={thisWeek.totalLitres.toFixed(1)} unit="L" description={formatCurrency(thisWeek.totalSpend)}/>
                <StatCard title="Week's Mileage" value={formatMileage(thisWeek.avgMileage)} unit="km/L" description={`${thisWeek.totalDistance.toFixed(0)} km driven`}/>
            </div>
        </div>
    </div>
  );
}
