import React from "react";
import { cn } from "../../lib/cn";

interface KeyValuePairProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  monospace?: boolean;
  highlight?: boolean;
  large?: boolean;
  vertical?: boolean;
  inset?: boolean;
}

/**
 * KeyValuePair component displays a label-value pair with consistent styling
 *
 * @param label - The label or key
 * @param value - The value (can be any React node)
 * @param icon - Optional icon to display next to the label
 * @param monospace - Whether to use monospace font for the value
 * @param highlight - Whether to highlight the value with a distinctive color
 * @param large - Whether to use larger text sizing
 * @param vertical - Whether to stack label and value vertically instead of side by side
 * @param inset - Whether to use inset effect styling for the container
 */
export const KeyValuePair: React.FC<KeyValuePairProps> = ({
  label,
  value,
  icon,
  monospace = true,
  highlight = false,
  large = false,
  vertical = false,
  inset = false,
}) => {
  if (vertical) {
    return (
      <div>
        <div
          className={cn(
            "text-xs tracking-wide text-neutral-400 uppercase",
            { "mb-1": large },
            { "flex items-center": icon }
          )}
        >
          {icon && <span className="mr-1.5 text-neutral-300">{icon}</span>}
          {label}
        </div>
        <div
          className={cn(
            {
              "text-base font-medium tracking-wide": large,
              "tracking-tight": !large,
            },
            { "font-mono text-sm": monospace },
            { "text-blue-400": highlight, "text-neutral-200": !highlight }
          )}
        >
          {value || "—"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-between", {
        "bg-neutral-700/50 p-2 rounded effect-inset": inset,
      })}
    >
      <span className="text-neutral-400 flex items-center text-sm">
        {icon && <span className="mr-2 text-neutral-300">{icon}</span>}
        {label}
      </span>
      <span
        className={cn(
          { "text-blue-400": highlight, "text-neutral-200": !highlight },
          { "font-mono text-sm": monospace },
          { "font-medium": large }
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
};

/**
 * KeyValueGrid provides a consistent grid layout for KeyValuePair components
 */
export const KeyValueGrid: React.FC<{
  children: React.ReactNode;
  columns?: number;
  className?: string;
}> = ({ children, columns = 2, className }) => {
  return (
    <div className={cn(`grid grid-cols-${columns} gap-x-6 gap-y-3`, className)}>
      {children}
    </div>
  );
};
