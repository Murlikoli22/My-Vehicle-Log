'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const InteractiveMap = dynamic(() => import('@/components/interactive-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export default function MapsPage() {
  return (
    <div className="h-full w-full relative pt-0 md:pt-0 p-0 md:p-0">
       <InteractiveMap />
    </div>
  );
}
