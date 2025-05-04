import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children?: React.ReactNode;
  /** Optional icon to display before the text */
  icon?: LucideIcon;
  /** Button variant */
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Full width button */
  fullWidth?: boolean;
  /** Optional class name to extend styles */
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      icon: Icon,
      variant = "secondary",
      size = "md",
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 border-blue-700/50",
      secondary: "text-neutral-400 hover:bg-neutral-700/50 border-neutral-950/90",
      danger: "bg-red-700/20 text-red-400 hover:bg-red-700/30 border-red-900/60",
      ghost: "text-neutral-400 hover:bg-neutral-700/30 border-transparent",
    };

    const sizeClasses = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1.5 text-sm",
      lg: "px-4 py-2 text-base",
    };

    const disabledClasses = disabled
      ? "opacity-50 cursor-not-allowed"
      : "transition-colors";

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center font-medium effect-outset rounded-md border",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          disabledClasses,
          className
        )}
        {...props}
      >
        {Icon && <Icon className={cn("w-4 h-4", children ? "mr-1.5" : "")} />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";