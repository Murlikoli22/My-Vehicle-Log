import { Milestone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLogo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Milestone className="h-6 w-6 text-primary" />
      <span className={cn('font-headline text-xl font-bold', textClassName)}>MY Vehicle Log</span>
    </div>
  );
}
