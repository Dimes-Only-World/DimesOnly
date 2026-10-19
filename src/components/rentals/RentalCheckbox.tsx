import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

/**
 * Checkbox tuned for the black/red rental theme. The shared checkbox outline
 * follows the site's `primary` token, which resolves to near-black on these
 * pages and disappears against the dark showroom background.
 */
export const RentalCheckbox = React.forwardRef<
  React.ElementRef<typeof Checkbox>,
  React.ComponentPropsWithoutRef<typeof Checkbox>
>(({ className, ...props }, ref) => (
  <Checkbox
    ref={ref}
    className={cn(
      "h-5 w-5 border-rental-foreground/70 bg-rental-surface/80",
      "data-[state=checked]:border-rental-primary data-[state=checked]:bg-rental-primary data-[state=checked]:text-rental-primary-foreground",
      className
    )}
    {...props}
  />
))
RentalCheckbox.displayName = "RentalCheckbox"
