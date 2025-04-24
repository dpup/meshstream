import React from "react";

interface CounterProps {
  value: number;
  label: string;
  valueColor?: string;
  className?: string;
}

export const Counter: React.FC<CounterProps> = ({
  value,
  label,
  valueColor = "text-amber-500",
  className = "",
}) => {
  return (
    <div
      className={`text-xs bg-neutral-600/30 rounded px-1.5 py-0.5 text-neutral-400 flex items-center shrink-0 ${className}`}
    >
      <span className={`${valueColor} font-medium mr-0.5`}>{value}</span>
      <span className="sm:inline">{label}</span>
    </div>
  );
};
