'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Car, ShieldAlert, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vehicles', label: 'Vehicles', icon: Car },
  { href: '/estimate-cost', label: 'Estimate', icon: Calculator },
  { href: '/emergency', label: 'Emergency', icon: ShieldAlert },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 border-t bg-card text-card-foreground md:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex flex-col items-center justify-center px-2 hover:bg-muted/50 group transition-colors',
              pathname === item.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
