
export type Vehicle = {
  id: string;
  userId: string;
  registrationNumber: string;
  type: 'Car' | 'Motorcycle' | 'Truck' | 'Other';
  brand: string;
  model: string;
  year: number;
  fuelType: 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid';
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
  id: string;
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

export type GeoPoint = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
};

export type Ride = {
  id: string;
  userId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in seconds
  distance: number; // in km
  averageSpeed: number; // in km/h
  route: GeoPoint[];
  elevationGain?: number;
};
