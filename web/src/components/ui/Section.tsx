import React from "react";
import { cn } from "../../lib/cn";

interface SectionProps {
  /** Section title */
  title: string;
  /** Optional icon to display next to the title */
  icon?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Section component for consistent section styling
 */
export const Section: React.FC<SectionProps> = ({ 
  title, 
  icon, 
  children, 
  className = "" 
}) => {
  return (
    <div
      className={cn(
        "bg-neutral-800/50 p-4 rounded-lg effect-inset",
        className
      )}
    >
      <h2 className="font-semibold mb-4 text-neutral-300 border-b border-neutral-700 pb-2 flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
};