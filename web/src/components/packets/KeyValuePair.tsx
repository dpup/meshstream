import React from "react";

interface KeyValuePairProps {
  label: string;
  value: React.ReactNode;
  large?: boolean;
}

export const KeyValuePair: React.FC<KeyValuePairProps> = ({ 
  label, 
  value,
  large = false
}) => {
  return (
    <div>
      <div className={`text-xs tracking-wide text-neutral-400 uppercase ${large ? 'mb-1' : ''}`}>
        {label}
      </div>
      <div className={`${large ? "text-base font-medium tracking-wide" : "tracking-tight"}`}>
        {value || "—"}
      </div>
    </div>
  );
};

interface KeyValueGridProps {
  children: React.ReactNode;
}

export const KeyValueGrid: React.FC<KeyValueGridProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 max-w-xl">
      {children}
    </div>
  );
};