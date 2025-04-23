import { cn } from "@/lib/cn";
import React from "react";

interface SeparatorProps {
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ className = "" }) => {
  return (
    <div
      className={cn(
        "mx-4 h-px border-t-1 border-t-neutral-950/80 border-b-1 border-b-[rgba(255,255,255,0.15)] my-3",
        className
      )}
    ></div>
  );
};
