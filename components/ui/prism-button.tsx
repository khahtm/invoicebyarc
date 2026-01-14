'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface PrismButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

/**
 * Animated prismatic gradient button with hover effects
 */
export const PrismButton = forwardRef<HTMLButtonElement, PrismButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'group relative inline-flex items-center justify-center overflow-hidden rounded px-6 py-3 font-medium text-white transition-all duration-300',
          'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500',
          'hover:scale-[1.02] active:scale-[0.98]',
          className
        )}
        {...props}
      >
        {/* Animated gradient overlay */}
        <span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
        />

        {/* Prismatic shimmer effect */}
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(45deg, rgba(255,0,128,0.3) 0%, rgba(128,0,255,0.3) 50%, rgba(0,128,255,0.3) 100%)',
            filter: 'blur(8px)',
          }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

PrismButton.displayName = 'PrismButton';
