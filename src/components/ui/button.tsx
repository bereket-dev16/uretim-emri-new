import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border-[3px] border-foreground text-sm font-black tracking-[-0.02em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:-translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_hsl(var(--foreground))]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:-translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_hsl(var(--foreground))]",
        outline:
          "bg-card text-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:-translate-y-[2px] hover:translate-x-[2px] hover:bg-accent hover:text-accent-foreground hover:shadow-[2px_2px_0_hsl(var(--foreground))]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:-translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_hsl(var(--foreground))]",
        ghost:
          "bg-transparent text-foreground shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "border-0 bg-transparent px-0 py-0 text-primary shadow-none hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-10 rounded-[16px] px-3.5 text-sm",
        lg: "min-h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
