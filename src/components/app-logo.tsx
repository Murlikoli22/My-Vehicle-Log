import { Milestone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      <Milestone className="h-6 w-6 text-primary" />
    </div>
  );
}
