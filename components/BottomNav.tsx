'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Feed',
    href: '/feed',
    icon: Heart,
  },
  {
    label: 'Whispers',
    href: '/whispers',
    icon: MessageCircle,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 px-4 text-sm transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="mb-1 h-5 w-5" />
              <span className="text-[11px] font-medium tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
