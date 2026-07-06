import { cn } from "@/lib/utils";
import Link from "next/link";
import { forwardRef } from "react";

const VARIANTS = {
  primary: "bg-graphite-900 text-white hover:bg-graphite-800 border border-transparent",
  brand: "bg-brand-600 text-white hover:bg-brand-700 border border-transparent",
  secondary: "bg-white text-graphite-900 border border-border hover:bg-gray-50",
  ghost: "bg-transparent text-graphite-700 hover:bg-gray-100 border border-transparent",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  dangerFilled: "bg-red-600 text-white hover:bg-red-700 border border-transparent",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-10 px-5 text-sm gap-2",
};

interface ButtonOwnProps {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

type LinkButtonProps = ButtonOwnProps &
  React.ComponentProps<typeof Link> & { className?: string };

export function LinkButton({ className, variant = "secondary", size = "md", ...props }: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
