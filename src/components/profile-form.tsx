
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Camera, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

import type { UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().optional(),
  address: z.string().optional(),
  image: z.instanceof(File).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relation: z.string().optional(),
  }),
  medicalInfo: z.object({
    bloodType: z.string().optional(),
    allergies: z.string().optional(),
    conditions: z.string().optional(),
  }),
});

type FormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  userProfile: UserProfile;
  onSubmit: (values: Partial<UserProfile>) => Promise<void>;
}

export function ProfileForm({ userProfile, onSubmit }: ProfileFormProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile.photoURL || null);
  const [licensePreviews, setLicensePreviews] = useState<string[]>(userProfile.drivingLicenseUrls || []);
  const [isGalleryVisible, setIsGalleryVisible] = useState(true);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: userProfile.name || '',
      phone: userProfile.phone || '',
      address: userProfile.address || '',
      emergencyContact: {
        name: userProfile.emergencyContact?.name || '',
        phone: userProfile.emergencyContact?.phone || '',
        relation: userProfile.emergencyContact?.relation || '',
      },
      medicalInfo: {
        bloodType: userProfile.medicalInfo?.bloodType || '',
        allergies: userProfile.medicalInfo?.allergies || '',
        conditions: userProfile.medicalInfo?.conditions || '',
      },
    },
  });

  const { isSubmitting } = form.formState;

  const handleFormSubmit = async (data: FormValues) => {
    const { image, ...rest } = data;
    const payload: Partial<UserProfile> = { 
      ...rest,
      drivingLicenseUrls: licensePreviews,
    };
  
    if (image) {
      try {
        const photoURL: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(image);
        });
        payload.photoURL = photoURL;
      } catch (error) {
        console.error("Error converting profile photo to data URL", error);
        form.setError('image', { type: 'manual', message: 'Could not upload photo.' });
        return;
      }
    }
  
    await onSubmit(payload);
  };
  
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('image', file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLicenseFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (licensePreviews.length + files.length > 10) {
      toast({
        variant: "destructive",
        title: "Upload Limit Exceeded",
        description: "You can upload a maximum of 10 images.",
      });
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLicensePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset the file input so the same file can be selected again if removed
    event.target.value = '';
  };

  const handleRemoveLicense = (indexToRemove: number) => {
    setLicensePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
          <Card>
              <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarPreview || undefined} alt={userProfile.name} />
                      <AvatarFallback>{userProfile.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          htmlFor="photo-upload"
                          className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Photo
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Driving License</CardTitle>
              <CardDescription>Upload one or more images of your driving license (max 10).</CardDescription>
            </CardHeader>
            <CardContent>
              <Collapsible open={isGalleryVisible} onOpenChange={setIsGalleryVisible} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{licensePreviews.length} image(s) uploaded</p>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-24">
                      {isGalleryVisible ? 'Hide' : 'Show'}
                      {isGalleryVisible ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  {licensePreviews.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {licensePreviews.map((src, index) => (
                        <div key={index} className="relative group aspect-video rounded-md border overflow-hidden">
                          <Image src={src} alt={`License image ${index + 1}`} fill sizes="(max-width: 768px) 33vw, 20vw" style={{ objectFit: 'cover' }} />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => setViewingImage(src)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveLicense(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                       <Camera className="h-8 w-8 mb-2" />
                       <p>No license images uploaded yet.</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
              <div className="mt-4">
                <FormLabel
                  htmlFor="license-upload"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Add Images
                </FormLabel>
                <Input
                  id="license-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleLicenseFilesChange}
                  disabled={licensePreviews.length >= 10}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                      <Input readOnly disabled value={userProfile.email} />
                  </FormControl>
                  <FormDescription>Your email address cannot be changed.</FormDescription>
              </FormItem>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Your mailing address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>This information will be shown in emergency mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="emergencyContact.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContact.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContact.relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relation</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Partner, Sibling" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
              <CardDescription>Critical information for first responders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="medicalInfo.bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., O+" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="medicalInfo.allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergies</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Peanuts, Penicillin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="medicalInfo.conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Conditions</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Asthma, Diabetes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </Form>
      <Dialog open={!!viewingImage} onOpenChange={(isOpen) => !isOpen && setViewingImage(null)}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>License Viewer</DialogTitle>
          </DialogHeader>
          <div className="relative flex-1 my-4">
            {viewingImage && (
                <Image src={viewingImage} alt="Driving license" fill style={{ objectFit: 'contain' }} />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
