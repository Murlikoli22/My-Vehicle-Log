import { VehicleManagement } from '@/components/vehicle-management';
import { vehicles, documents, maintenanceRecords } from '@/lib/data';

export default function VehiclesPage() {
  return (
    <VehicleManagement
      initialVehicles={vehicles}
      initialDocuments={documents}
      initialMaintenanceRecords={maintenanceRecords}
    />
  );
}
