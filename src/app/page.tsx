import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { placeholderImages } from '@/lib/placeholder-images.json';

export default function LandingPage() {
  const heroImage = placeholderImages.find((img) => img.id === 'hero-background');

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center text-center text-white p-4">
        <div className="mb-6 flex items-center gap-4">
          <AppLogo className="h-16 w-16 text-primary" />
        </div>
        <h1 className="font-headline text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          MY Vehicle Log
        </h1>
        <p className="mt-4 max-w-xl text-lg text-neutral-300">
          Your digital glovebox for smart vehicle management. Track maintenance, store documents, and stay ahead of
          reminders with ease.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/login">Get Started</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
