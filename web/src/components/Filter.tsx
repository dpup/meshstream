import React from "react";

interface FilterProps {
  onChange: (filter: string) => void;
  value: string;
}

export const Filter: React.FC<FilterProps> = ({ onChange, value }) => {
  return (
    <div className="mb-4">
      <label
        htmlFor="filter"
        className="block text-sm font-medium text-neutral-700 mb-1"
      >
        Filter Packets
      </label>
      <input
        type="text"
        id="filter"
        className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        placeholder="Filter by type, sender, etc."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
