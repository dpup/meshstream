import React from "react";
import { Play, Pause } from "lucide-react";

interface StreamControlProps {
  isPaused: boolean;
  onToggle: () => void;
}

export const StreamControl: React.FC<StreamControlProps> = ({
  isPaused,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
        isPaused
          ? "bg-neutral-700 text-amber-400 hover:bg-neutral-600"
          : "bg-neutral-700 text-green-400 hover:bg-neutral-600"
      }`}
    >
      <span className="text-sm font-medium">
        {isPaused ? "Paused" : "Streaming"}
      </span>
      {isPaused ? (
        <Play className="h-4 w-4" />
      ) : (
        <Pause className="h-4 w-4" />
      )}
    </button>
  );
};