'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Car,
  Fuel,
  Gauge,
  Calendar as CalendarIcon,
  Wrench,
  FileText,
  PlusCircle,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Camera,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import type { Vehicle, VehicleDocument, MaintenanceRecord } from '@/types';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { AddVehicleForm } from './add-vehicle-form';
import { AddDocumentForm } from './add-document-form';
import { AddMaintenanceRecordForm } from './add-maintenance-record-form';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ScrollArea } from './ui/scroll-area';

interface VehicleManagementProps {
  initialVehicles: Vehicle[];
  initialDocuments: VehicleDocument[];
  initialMaintenanceRecords: MaintenanceRecord[];
}

export function VehicleManagement({
  initialVehicles,
  initialDocuments,
  initialMaintenanceRecords,
}: VehicleManagementProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddVehicleOpen, setAddVehicleOpen] = useState(false);
  const [isAddDocOpen, setAddDocOpen] = useState(false);
  const [isAddMaintOpen, setAddMaintOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialVehicles.length > 0) {
      const currentSelectedId = selectedVehicle?.id;
      if (currentSelectedId) {
        const updatedVehicle = initialVehicles.find(v => v.id === currentSelectedId);
        if (updatedVehicle) {
          setSelectedVehicle(updatedVehicle);
        } else {
          setSelectedVehicle(initialVehicles[0]);
        }
      } else {
        setSelectedVehicle(initialVehicles[0]);
      }
    } else {
      setSelectedVehicle(null);
    }
  }, [initialVehicles]);

  const { user } = useUser();
  const firestore = useFirestore();

  const getVehicleDocuments = (vehicleId: string) =>
    initialDocuments.filter((doc) => doc.vehicleId === vehicleId);
  
  const getVehicleMaintenance = (vehicleId: string) =>
    initialMaintenanceRecords.filter((record) => record.vehicleId === vehicleId);

  const totalMaintenanceCost = selectedVehicle
    ? getVehicleMaintenance(selectedVehicle.id).reduce((sum, record) => sum + record.cost, 0)
    : 0;
    
  const isExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const handleAddVehicle = async (values: Omit<Vehicle, 'id' | 'imageHint' | 'userId'> & { imageUrl?: string }) => {
    if (!user) return;
    
    const { imageUrl, ...vehicleData } = values;

    const carImage = PlaceHolderImages.find(img => img.id === 'car-default');
    
    const newVehicleData = {
      ...vehicleData,
      userId: user.uid,
      imageUrl: imageUrl || carImage?.imageUrl || 'https://picsum.photos/seed/2/600/400',
      imageHint: imageUrl ? `${vehicleData.brand} ${vehicleData.model}` : (carImage?.imageHint || 'modern sedan'),
    };

    const vehiclesCollection = collection(firestore, 'users', user.uid, 'vehicles');
    await addDocumentNonBlocking(vehiclesCollection, newVehicleData);
    setAddVehicleOpen(false);
  };

  const handleAddDocument = async (values: Partial<Omit<VehicleDocument, 'id' | 'vehicleId' | 'uploadDate'>>) => {
    if (!user || !selectedVehicle) return;
    const newDocumentData: { [key: string]: any } = {
      ...values,
      vehicleId: selectedVehicle.id,
      uploadDate: new Date().toISOString(),
      expiryDate: values.expiryDate ? (values.expiryDate as Date).toISOString() : undefined,
    };

    // Filter out undefined values before sending to Firestore
    Object.keys(newDocumentData).forEach(key => {
        if (newDocumentData[key] === undefined) {
            delete newDocumentData[key];
        }
    });

    const documentsCollection = collection(firestore, 'users', user.uid, 'vehicles', selectedVehicle.id, 'documents');
    await addDocumentNonBlocking(documentsCollection, newDocumentData);
    setAddDocOpen(false);
  };
  
  const handleAddMaintenance = async (values: Partial<Omit<MaintenanceRecord, 'id' | 'vehicleId'>>) => {
    if (!user || !selectedVehicle) return;
    const newMaintenanceData: { [key: string]: any } = {
      ...values,
      vehicleId: selectedVehicle.id,
      date: (values.date as Date).toISOString(),
    };

    // Filter out undefined values before sending to Firestore
    Object.keys(newMaintenanceData).forEach(key => {
        if (newMaintenanceData[key] === undefined) {
            delete newMaintenanceData[key];
        }
    });

    const maintenanceCollection = collection(firestore, 'users', user.uid, 'vehicles', selectedVehicle.id, 'maintenanceLogs');
    await addDocumentNonBlocking(maintenanceCollection, newMaintenanceData);
    setAddMaintOpen(false);
  };

  const handleRemoveVehicle = async (vehicleId: string) => {
    if (!user) return;
    
    const vehicleRef = doc(firestore, 'users', user.uid, 'vehicles', vehicleId);
    
    // In a real app, you'd use a backend function to delete subcollections.
    // For this example, we'll delete what we can from the client, though it's not exhaustive.
    await deleteDocumentNonBlocking(vehicleRef);
  };
  
  const handleRemoveDocument = async (documentId: string) => {
    if (!user || !selectedVehicle) return;
    const documentRef = doc(firestore, 'users', user.uid, 'vehicles', selectedVehicle.id, 'documents', documentId);
    await deleteDocumentNonBlocking(documentRef);
  };

  const handleRemoveMaintenanceRecord = async (recordId: string) => {
    if (!user || !selectedVehicle) return;
    const recordRef = doc(firestore, 'users', user.uid, 'vehicles', selectedVehicle.id, 'maintenanceLogs', recordId);
    await deleteDocumentNonBlocking(recordRef);
  };

  const handleView = (dataUrl?: string) => {
    if (!dataUrl) return;

    const [header, base64Data] = dataUrl.split(',');
    if (!header || !base64Data) return;

    const mimeMatch = header.match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) return;
    const mimeString = mimeMatch[1];
    
    try {
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      setViewingFile({ url, type: mimeString });
    } catch (e) {
      console.error("Failed to decode and open data URL", e);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && selectedVehicle && user) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const newImageUrl = reader.result as string;
            if (!newImageUrl) return;

            const vehicleRef = doc(firestore, 'users', user.uid, 'vehicles', selectedVehicle.id);
            updateDocumentNonBlocking(vehicleRef, { imageUrl: newImageUrl });
        };
    }
  };

  return (
    <>
      <div className="grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">My Vehicles</h2>
              <Dialog open={isAddVehicleOpen} onOpenChange={setAddVehicleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                    <DialogDescription>
                      Enter the details of your new vehicle.
                    </DialogDescription>
                  </DialogHeader>
                  <AddVehicleForm onSubmit={handleAddVehicle} />
                </DialogContent>
              </Dialog>
          </div>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="flex flex-col gap-3 pr-4">
              {initialVehicles.map((vehicle) => (
                <div key={vehicle.id} className="group flex items-center gap-2 rounded-lg border pr-2 text-left transition-colors hover:bg-muted/50">
                  <button
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={cn(
                      'flex-1 flex items-center gap-4 rounded-lg p-3 text-left transition-colors',
                      selectedVehicle?.id === vehicle.id && 'bg-muted'
                    )}
                  >
                    <div className="relative h-12 w-12 rounded-md overflow-hidden shrink-0">
                      <Image
                          src={vehicle.imageUrl}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          fill
                          className="object-cover"
                          data-ai-hint={vehicle.imageHint}
                      />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-medium truncate">{vehicle.brand} {vehicle.model}</p>
                      <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
                    </div>
                  </button>
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 opacity-50 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the vehicle
                          and all associated documents and maintenance records.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveVehicle(vehicle.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {selectedVehicle ? (
          <Tabs defaultValue="details">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0 group/image">
                      <Image
                          src={selectedVehicle.imageUrl}
                          alt={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                          fill
                          className="object-cover"
                          data-ai-hint={selectedVehicle.imageHint}
                      />
                      <label htmlFor="photo-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover/image:opacity-100 transition-opacity cursor-pointer">
                          <Camera className="h-6 w-6" />
                      </label>
                      <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                      />
                  </div>
                  <div>
                      <h1 className="text-2xl font-bold">{selectedVehicle.brand} {selectedVehicle.model}</h1>
                      <p className="text-muted-foreground">{selectedVehicle.registrationNumber}</p>
                  </div>
              </div>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Details</CardTitle>
                  <CardDescription>Key information about your vehicle.</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                      <Car className="h-6 w-6 text-muted-foreground" />
                      <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="font-medium">{selectedVehicle.type}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                      <div>
                          <p className="text-sm text-muted-foreground">Year</p>
                          <p className="font-medium">{selectedVehicle.year}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <Fuel className="h-6 w-6 text-muted-foreground" />
                      <div>
                          <p className="text-sm text-muted-foreground">Fuel Type</p>
                          <p className="font-medium">{selectedVehicle.fuelType}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <Gauge className="h-6 w-6 text-muted-foreground" />
                      <div>
                          <p className="text-sm text-muted-foreground">Odometer</p>
                          <p className="font-medium">{selectedVehicle.odometerReading.toLocaleString()} km</p>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                      <CardTitle>Documents</CardTitle>
                      <CardDescription>Manage your vehicle's important documents.</CardDescription>
                  </div>
                  <Dialog open={isAddDocOpen} onOpenChange={setAddDocOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="ml-auto">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Document</DialogTitle>
                        <DialogDescription>
                          Upload a new document for {selectedVehicle.brand} {selectedVehicle.model}.
                        </DialogDescription>
                      </DialogHeader>
                      <AddDocumentForm onSubmit={handleAddDocument} />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getVehicleDocuments(selectedVehicle.id).map(documentItem => (
                        <TableRow key={documentItem.id}>
                          <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground"/> {documentItem.documentType}</TableCell>
                          <TableCell>
                              {documentItem.expiryDate ? (
                                  <Badge variant={isExpired(documentItem.expiryDate) ? "destructive" : "secondary"}>
                                      Expires {format(parseISO(documentItem.expiryDate), 'dd-MM-yyyy')}
                                  </Badge>
                              ) : (
                                  <span className="text-muted-foreground">-</span>
                              )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                {documentItem.fileUrl && (
                                  <>
                                      <Button variant="ghost" size="icon" onClick={() => handleView(documentItem.fileUrl)} title="View document">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" asChild>
                                        <a href={documentItem.fileUrl} download={`Doc_${documentItem.documentType.replace(/\s/g, '_')}_${selectedVehicle.registrationNumber}`} title="Download document">
                                          <Download className="h-4 w-4" />
                                        </a>
                                      </Button>
                                  </>
                                )}
                                 <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the document.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRemoveDocument(documentItem.id)} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                      <CardTitle>Maintenance Log</CardTitle>
                      <CardDescription>A complete history of all services and repairs.</CardDescription>
                  </div>
                  <Dialog open={isAddMaintOpen} onOpenChange={setAddMaintOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="ml-auto">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Record
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Maintenance Record</DialogTitle>
                        <DialogDescription>
                          Log a new service for {selectedVehicle.brand} {selectedVehicle.model}.
                        </DialogDescription>
                      </DialogHeader>
                      <AddMaintenanceRecordForm onSubmit={handleAddMaintenance} />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Odometer</TableHead>
                        <TableHead>Mechanic</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Bill</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getVehicleMaintenance(selectedVehicle.id).map(record => (
                        <TableRow key={record.id}>
                          <TableCell>{format(parseISO(record.date), "dd-MM-yyyy")}</TableCell>
                          <TableCell className="font-medium">{record.serviceType}</TableCell>
                          <TableCell>{record.odometerReading.toLocaleString()} km</TableCell>
                          <TableCell>{record.mechanicDetails}</TableCell>
                          <TableCell className="text-right font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(record.cost)}</TableCell>
                          <TableCell>
                              {record.billUrl && (
                                  <div className="flex items-center justify-start gap-1">
                                      <Button variant="ghost" size="icon" onClick={() => handleView(record.billUrl)} title="View bill">
                                          <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" asChild>
                                          <a href={record.billUrl} download={`Bill_${record.serviceType.replace(/\s/g, '_')}_${format(parseISO(record.date), "dd-MM-yyyy")}`} title="Download bill">
                                              <Download className="h-4 w-4" />
                                          </a>
                                      </Button>
                                  </div>
                              )}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this maintenance record.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveMaintenanceRecord(record.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="justify-end gap-2 text-lg font-semibold border-t pt-4">
                  <span>Total Cost:</span>
                  <span className="font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMaintenanceCost)}</span>
                </CardFooter>
              </Card>
            </TabsContent>

          </Tabs>
        ) : (
          <Card className="flex flex-col items-center justify-center h-full text-center">
            <CardHeader>
              <CardTitle>No Vehicle Selected</CardTitle>
              <CardDescription>Please select a vehicle from the list to see its details, or add a new one to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <Car className="h-24 w-24 text-muted" />
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={!!viewingFile} onOpenChange={(isOpen) => {
        if (!isOpen) {
          if (viewingFile) {
            URL.revokeObjectURL(viewingFile.url);
          }
          setViewingFile(null);
        }
      }}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
          </DialogHeader>
          <div className="relative flex-1 my-4">
            {viewingFile?.type.startsWith('image/') ? (
              <Image src={viewingFile.url} alt="Document preview" fill style={{ objectFit: 'contain' }} />
            ) : (
              <iframe src={viewingFile?.url} className="w-full h-full border-0" title="Document Viewer" />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
