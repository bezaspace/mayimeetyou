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
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16">
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
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
