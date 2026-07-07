import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionButton({ className, size = "default", ...props }: ButtonProps) {
  return <Button className={cn("min-h-[44px]", className)} size={size} {...props} />;
}
