import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-mojave-green text-caliche-white hover:bg-mojave-green-light disabled:bg-mojave-green/40 disabled:hover:bg-mojave-green/40",
  secondary:
    "border border-saguaro-black text-saguaro-black hover:bg-adobe disabled:opacity-40 disabled:hover:bg-transparent",
  ghost:
    "text-mojave-green hover:underline underline-offset-4 disabled:opacity-40 disabled:hover:no-underline",
  destructive:
    "bg-error-brick text-caliche-white hover:opacity-90 disabled:opacity-40",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium tracking-tight transition-colors",
        "disabled:cursor-not-allowed",
        variant !== "ghost" && "rounded-md",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    />
  );
});
