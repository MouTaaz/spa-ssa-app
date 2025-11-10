import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        booked: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        confirmed:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        completed:
          "border-transparent bg-gray-500 text-white hover:bg-gray-600",
        cancelled: "border-transparent bg-red-500 text-white hover:bg-red-600",
        cancelled_reschedule:
          "border-transparent bg-orange-500 text-white hover:bg-orange-600 border-orange-300",
        cancelled_final:
          "border-transparent bg-red-500 text-white hover:bg-red-600 border-red-300",
        rescheduled:
          "border-transparent bg-orange-500 text-white hover:bg-orange-600",
        reschedule_group:
          "border-transparent bg-gradient-to-r from-orange-500 to-blue-500 text-white hover:from-orange-600 hover:to-blue-600",
        edited:
          "border-transparent bg-purple-500 text-white hover:bg-purple-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    React.ComponentPropsWithoutRef<"div"> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "booked"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "rescheduled"
    | "reschedule_group"
    | "edited";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
