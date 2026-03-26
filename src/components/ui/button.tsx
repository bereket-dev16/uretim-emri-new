import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-blue-600 bg-blue-600 text-white',
        destructive: 'border-red-600 bg-red-600 text-white',
        outline: 'border-slate-300 bg-white text-slate-800',
        secondary: 'border-slate-300 bg-slate-100 text-slate-800',
        ghost: 'border-transparent bg-transparent text-slate-700',
        link: 'border-transparent bg-transparent px-0 text-blue-700'
      },
      size: {
        default: 'min-h-10 px-4 py-2',
        sm: 'min-h-9 px-3 py-2 text-sm',
        lg: 'min-h-11 px-5 py-2.5 text-base',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
