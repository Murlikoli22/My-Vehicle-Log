
export type Vehicle = {
  id: string;
  userId: string;
  registrationNumber: string;
  type: 'Car' | 'Motorcycle' | 'Truck' | 'Other';
  brand: string;
  model: string;
  year: number;
  fuelType: 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid' | 'CNG';
  odometerReading: number;
  imageUrl: string;
  imageHint: string;
};

export type VehicleDocument = {
  id: string;
  vehicleId: string;
  documentType: 'RC Book' | 'Insurance' | 'PUC' | 'Other';
  uploadDate: string;
  expiryDate?: string;
  fileUrl?: string;
};

export type MaintenanceRecord = {
  id:string;
  vehicleId: string;
  date: string;
  odometerReading: number;
  serviceType: string;
  mechanicDetails: string;
  cost: number;
  notes?: string;
  billUrl?: string;
};

export type Reminder = {
  id: string;
  vehicleId: string;
  title: string;
  dueDate: string;
  type: 'service' | 'insurance' | 'puc';
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  drivingLicenseUrls?: string[];
  fcmTokens?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  medicalInfo?: {
    bloodType: string;
    allergies: string;
    conditions: string;
  };
};

export type FuelEntry = {
  id: string;
  vehicleId: string;
  userId: string;
  dateTime: string;
  fuelQuantityLitres: number;
  amountPaid: number;
  fuelType: 'Gasoline' | 'Diesel' | 'CNG' | 'Electric';
  odometerReading: number;
  stationName?: string;
  notes?: string;
  // Calculated fields, added on the fly during processing
  distanceTravelled?: number;
  mileage?: number;
  costPerKm?: number;
};

export type PeriodStats = {
  totalLitres: number;
  totalSpend: number;
  totalDistance: number;
  avgMileage: number;
  avgCostPerKm: number;
  entries: FuelEntry[];
};

export type FuelAnalyticsData = {
  today: PeriodStats;
  thisWeek: PeriodStats;
  thisMonth: PeriodStats;
  lastWeek: PeriodStats;
  insights: {
    bestMileageDay: FuelEntry | null;
    worstMileageDay: FuelEntry | null;
    weekOverWeekConsumptionTrend: number; // percentage change
  };
  monthlyChartData: { name: string; litres: number }[];
};
