import React from "react";

interface SeparatorProps {
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ className = "" }) => {
  return (
    <div
      className={`mx-4 h-px border-t-1 border-t-neutral-900 border-b-1 border-b-neutral-700/80 my-3 ${className}`}
    ></div>
  );
};
