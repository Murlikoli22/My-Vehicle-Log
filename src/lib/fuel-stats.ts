
import {
  isToday,
  isThisWeek,
  isThisMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
  parseISO,
  eachDayOfInterval,
  format,
} from 'date-fns';
import type { FuelEntry, FuelAnalyticsData, PeriodStats } from '@/types';

/**
 * Processes a list of raw fuel entries to calculate distance, mileage, and cost per km for each entry.
 * It sorts the entries by odometer reading to correctly calculate the distance between fill-ups.
 * @param rawEntries - An array of FuelEntry objects from Firestore.
 * @returns A new array of FuelEntry objects with calculated `distanceTravelled`, `mileage`, and `costPerKm`.
 */
export function processFuelEntries(rawEntries: FuelEntry[]): FuelEntry[] {
  if (!rawEntries || rawEntries.length < 2) {
    return rawEntries;
  }

  // Sort by odometer reading to ensure correct sequential calculation
  const sortedEntries = [...rawEntries].sort((a, b) => a.odometerReading - b.odometerReading);

  const processed = sortedEntries.map((currentEntry, index) => {
    if (index === 0) {
      // Cannot calculate distance/mileage for the very first entry
      return { ...currentEntry };
    }

    const prevEntry = sortedEntries[index - 1];

    const distanceTravelled = currentEntry.odometerReading - prevEntry.odometerReading;
    
    // Mileage is based on the fuel added in the *previous* fill-up
    const fuelUsed = prevEntry.fuelQuantityLitres;
    
    const mileage = distanceTravelled > 0 && fuelUsed > 0
      ? distanceTravelled / fuelUsed
      : undefined;

    const costPerKm = distanceTravelled > 0
      ? currentEntry.amountPaid / distanceTravelled
      : undefined;

    return {
      ...currentEntry,
      distanceTravelled,
      mileage,
      costPerKm,
    };
  });

  // Return in reverse chronological order for display
  return processed.sort((a,b) => parseISO(b.dateTime).getTime() - parseISO(a.dateTime).getTime());
}

const getEmptyPeriodStats = (): PeriodStats => ({
    totalLitres: 0,
    totalSpend: 0,
    totalDistance: 0,
    avgMileage: 0,
    avgCostPerKm: 0,
    entries: [],
});


/**
 * Calculates fuel consumption statistics for various time periods (today, this week, this month).
 * @param processedEntries - An array of processed FuelEntry objects, sorted reverse chronologically.
 * @returns A FuelAnalyticsData object containing all calculated stats and insights.
 */
export function calculateFuelAnalytics(processedEntries: FuelEntry[]): FuelAnalyticsData {
  const today = getEmptyPeriodStats();
  const thisWeek = getEmptyPeriodStats();
  const thisMonth = getEmptyPeriodStats();
  const lastWeek = getEmptyPeriodStats();

  const now = new Date();
  const startOfLastWeek = startOfWeek(subWeeks(now, 1));
  const endOfLastWeek = endOfWeek(subWeeks(now, 1));

  for (const entry of processedEntries) {
    const entryDate = parseISO(entry.dateTime);

    if (isToday(entryDate)) {
      today.entries.push(entry);
    }
    if (isThisWeek(entryDate, { weekStartsOn: 1 })) {
      thisWeek.entries.push(entry);
    }
    if (isThisMonth(entryDate)) {
      thisMonth.entries.push(entry);
    }
    if (entryDate >= startOfLastWeek && entryDate <= endOfLastWeek) {
      lastWeek.entries.push(entry);
    }
  }

  const periods = [today, thisWeek, thisMonth, lastWeek];
  periods.forEach(period => {
    period.totalLitres = period.entries.reduce((sum, e) => sum + e.fuelQuantityLitres, 0);
    period.totalSpend = period.entries.reduce((sum, e) => sum + e.amountPaid, 0);
    period.totalDistance = period.entries.reduce((sum, e) => sum + (e.distanceTravelled || 0), 0);
    
    const entriesWithMileage = period.entries.filter(e => e.mileage !== undefined && e.mileage > 0);
    if (entriesWithMileage.length > 0) {
        period.avgMileage = entriesWithMileage.reduce((sum, e) => sum + e.mileage!, 0) / entriesWithMileage.length;
    }

    if (period.totalDistance > 0) {
        period.avgCostPerKm = period.totalSpend / period.totalDistance;
    }
  });
  
  // Insights Calculation
  const thisMonthMileageEntries = thisMonth.entries.filter(e => e.mileage && e.mileage > 0);
  const bestMileageDay = thisMonthMileageEntries.length > 0 
    ? thisMonthMileageEntries.reduce((best, current) => (current.mileage! > best.mileage! ? current : best))
    : null;

  const worstMileageDay = thisMonthMileageEntries.length > 0
    ? thisMonthMileageEntries.reduce((worst, current) => (current.mileage! < worst.mileage! ? current : worst))
    : null;

  let weekOverWeekConsumptionTrend = 0;
  if (lastWeek.totalLitres > 0) {
    weekOverWeekConsumptionTrend = ((thisWeek.totalLitres - lastWeek.totalLitres) / lastWeek.totalLitres) * 100;
  } else if (thisWeek.totalLitres > 0) {
    weekOverWeekConsumptionTrend = 100; // From 0 to something is a 100% increase
  }

  // Monthly Chart Data
  const monthlyChartDataMap = new Map<string, number>();
  if (thisMonth.entries.length > 0) {
    const firstDay = parseISO(thisMonth.entries[thisMonth.entries.length - 1].dateTime);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: new Date() });
    daysInMonth.forEach(day => {
        monthlyChartDataMap.set(format(day, 'MMM d'), 0);
    });

    thisMonth.entries.forEach(entry => {
        const dayKey = format(parseISO(entry.dateTime), 'MMM d');
        monthlyChartDataMap.set(dayKey, (monthlyChartDataMap.get(dayKey) || 0) + entry.fuelQuantityLitres);
    });
  }

  const monthlyChartData = Array.from(monthlyChartDataMap.entries()).map(([name, litres]) => ({ name, litres }));


  return {
    today,
    thisWeek,
    thisMonth,
    lastWeek, // needed for WoW trend
    insights: {
        bestMileageDay,
        worstMileageDay,
        weekOverWeekConsumptionTrend,
    },
    monthlyChartData,
  };
}
