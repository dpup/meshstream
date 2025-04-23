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
      <div className={`text-xs text-neutral-400 ${large ? 'mb-1' : ''}`}>
        {label}
      </div>
      <div className={large ? "font-medium text-base" : ""}>
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
    <div className="grid grid-cols-2 gap-3 max-w-md">
      {children}
    </div>
  );
};