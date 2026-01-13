import type { Vehicle, VehicleDocument, MaintenanceRecord, Reminder } from '@/types';
import { placeholderImages } from './placeholder-images.json';

const carImage = placeholderImages.find(img => img.id === 'car-default');
const motorcycleImage = placeholderImages.find(img => img.id === 'motorcycle-default');
const truckImage = placeholderImages.find(img => img.id === 'truck-default');

export const vehicles: Vehicle[] = [
  {
    id: '1',
    userId: 'anonymous',
    registrationNumber: 'MH12AB1234',
    type: 'Car',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2021,
    fuelType: 'Gasoline',
    odometerReading: 25000,
    imageUrl: carImage?.imageUrl ?? 'https://picsum.photos/seed/2/600/400',
    imageHint: carImage?.imageHint ?? 'modern sedan'
  },
  {
    id: '2',
    userId: 'anonymous',
    registrationNumber: 'KA01CD5678',
    type: 'Motorcycle',
    brand: 'Honda',
    model: 'CB350',
    year: 2022,
    fuelType: 'Gasoline',
    odometerReading: 8000,
    imageUrl: motorcycleImage?.imageUrl ?? 'https://picsum.photos/seed/3/600/400',
    imageHint: motorcycleImage?.imageHint ?? 'cruiser motorcycle'
  },
  {
    id: '3',
    userId: 'anonymous',
    registrationNumber: 'DL05EF9012',
    type: 'Truck',
    brand: 'Ford',
    model: 'Ranger',
    year: 2020,
    fuelType: 'Diesel',
    odometerReading: 75000,
    imageUrl: truckImage?.imageUrl ?? 'https://picsum.photos/seed/4/600/400',
    imageHint: truckImage?.imageHint ?? 'pickup truck'
  }
];

export const documents: VehicleDocument[] = [
  { id: 'doc1', vehicleId: '1', documentType: 'Insurance', uploadDate: '2023-08-16T00:00:00.000Z', expiryDate: '2025-08-15' },
  { id: 'doc2', vehicleId: '1', documentType: 'PUC', uploadDate: '2023-11-21T00:00:00.000Z', expiryDate: '2024-11-20' },
  { id: 'doc3', vehicleId: '1', documentType: 'RC Book', uploadDate: '2021-01-01T00:00:00.000Z' },
  { id: 'doc4', vehicleId: '2', documentType: 'Insurance', uploadDate: '2024-01-31T00:00:00.000Z', expiryDate: '2025-01-30' },
  { id: 'doc5', vehicleId: '2', documentType: 'PUC', uploadDate: '2023-09-02T00:00:00.000Z', expiryDate: '2024-09-01' },
];

export const maintenanceRecords: MaintenanceRecord[] = [
  { id: 'maint1', vehicleId: '1', date: '2024-05-10', odometerReading: 22000, serviceType: 'Regular Service', mechanicDetails: 'City Auto Works', cost: 4500, notes: 'Oil change, air filter clean, general checkup.' },
  { id: 'maint2', vehicleId: '1', date: '2023-11-02', odometerReading: 15000, serviceType: 'Tire Rotation', mechanicDetails: 'Quick-Fit Tires', cost: 800 },
  { id: 'maint3', vehicleId: '2', date: '2024-03-20', odometerReading: 6500, serviceType: 'First Service', mechanicDetails: 'Honda Authorized Center', cost: 1200, notes: 'Oil change and chain lubrication.' },
];

export const reminders: Reminder[] = [
  { id: 'rem1', vehicleId: '1', title: 'PUC Renewal', dueDate: '2024-11-20', type: 'puc' },
  { id: 'rem2', vehicleId: '1', title: 'Next Service Due', dueDate: '2024-12-01', type: 'service' },
  { id: 'rem3', vehicleId: '2', title: 'Insurance Renewal', dueDate: '2025-01-30', type: 'insurance' },
];

export const userProfile = {
  name: "Alex Doe",
  email: "alex.doe@example.com",
  emergencyContact: {
    name: "Jane Doe",
    phone: "123-456-7890",
    relation: "Spouse"
  },
  medicalInfo: {
    bloodType: "O+",
    allergies: "None",
    conditions: "None"
  }
}
