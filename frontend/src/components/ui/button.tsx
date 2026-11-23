import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-semibold ring-offset-background transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#C2410C] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        /* Burnt orange / rust primary action */
        default: "bg-[#C2410C] text-white shadow-xs hover:bg-[#9A3412]",
        /* Deep teal / forest green grounding action */
        secondary: "bg-[#16433C] text-[#FAF6F0] shadow-xs hover:bg-[#0F312B]",
        /* Coffee brown action */
        coffee: "bg-[#3D261D] text-white shadow-xs hover:bg-[#2A1A13]",
        destructive: "bg-red-700 text-white shadow-xs hover:bg-red-800",
        outline: "border border-[#E6DFD3] bg-[#FFFDF9] hover:bg-[#FAF6F0] text-[#2B1E16]",
        ghost: "hover:bg-[#EFEAE1]/70 text-[#2B1E16] hover:text-[#16433C]",
        link: "text-[#C2410C] underline-offset-4 hover:underline",
        warm: "bg-gradient-to-r from-[#C2410C] to-[#B45309] text-white shadow-xs hover:from-[#A83709] hover:to-[#92400E]",
        dark: "bg-[#2B1E16] text-white hover:bg-[#1A120D] shadow-xs",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-[11px]",
        lg: "h-11 rounded-xl px-6 text-sm font-bold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
