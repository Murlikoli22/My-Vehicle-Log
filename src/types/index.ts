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
  type: 'RC Book' | 'Insurance' | 'PUC' | 'Other';
  name: string;
  expiryDate?: string;
  fileUrl?: string;
};

export type MaintenanceRecord = {
  id: string;
  vehicleId: string;
  date: string;
  odometerReading: number;
  serviceType: string;
  mechanic: string;
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
