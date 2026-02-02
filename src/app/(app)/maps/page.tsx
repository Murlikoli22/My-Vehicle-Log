'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const InteractiveMap = dynamic(() => import('@/components/interactive-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export default function MapsPage() {
  return (
    <div className="flex-1 w-full relative">
       <InteractiveMap />
    </div>
  );
}
