import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ShieldCheck, FileText, BellRing } from 'lucide-react';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-background');

  const features = [
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: 'Digital Logbook',
      description: 'Track every service, repair, and expense in one place. Never lose a receipt again.',
    },
    {
      icon: <BellRing className="h-8 w-8 text-primary" />,
      title: 'Smart Reminders',
      description: 'Get timely notifications for insurance renewals, PUC expiry, and scheduled maintenance.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Emergency Ready',
      description: 'Access critical medical info and emergency contacts with a single tap when you need it most.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="absolute top-0 left-0 w-full z-20 p-4">
        <AppLogo textClassName='text-white'/>
      </header>
      <main className="flex-1">
        <section className="relative flex h-[60vh] flex-col items-center justify-center text-center text-white">
           {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-black/30" />
          <div className="relative z-10 flex flex-col items-center p-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Smart Vehicle Management
            </h1>
            <p className="mt-4 max-w-xl text-lg text-neutral-200">
              Your digital glovebox is here. Track maintenance, store documents, and drive with peace of mind.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/login">Get Started for Free</Link>
            </Button>
             <p className="mt-2 text-sm text-neutral-400">No credit card required.</p>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Everything Your Vehicle Needs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col items-center text-center p-6 border rounded-lg bg-card">
                  {feature.icon}
                  <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} MY Vehicle Log. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
