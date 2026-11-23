import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        /* Burnt orange / rust badge */
        default:
          "border-transparent bg-[#C2410C] text-white shadow-xs",
        /* Deep forest teal badge */
        secondary:
          "border-[#16433C]/20 bg-[#E6F0EE] text-[#16433C]",
        /* Mustard yellow highlight badge */
        mustard:
          "border-[#D97706]/30 bg-[#FEF3C7] text-[#92400E]",
        /* Coffee brown badge */
        coffee:
          "border-[#3D261D]/20 bg-[#EFEAE1] text-[#3D261D]",
        destructive:
          "border-red-200 bg-red-50 text-red-800",
        outline:
          "border-[#E6DFD3] text-[#2B1E16] bg-[#FFFDF9]",
        success:
          "border-[#16433C]/20 bg-[#E6F0EE] text-[#16433C]",
        warning:
          "border-[#D97706]/30 bg-[#FEF3C7] text-[#92400E]",
        warm:
          "border-[#C2410C]/25 bg-[#FFEDE3] text-[#9A3412]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
