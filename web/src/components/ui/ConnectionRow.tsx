import React from "react";
import { Link } from "@tanstack/react-router";

interface ConnectionListProps {
  count: number;
  label?: string;
  children: React.ReactNode;
}

export const ConnectionList: React.FC<ConnectionListProps> = ({ count, label = "connection", children }) => (
  <div>
    <div className="divide-y divide-neutral-700/50">{children}</div>
    <p className="text-xs text-neutral-500 mt-2 px-1">
      {count} {label}{count !== 1 ? "s" : ""}
    </p>
  </div>
);

export interface SnrValue {
  label: string; // e.g. "↑" or "↓" or ""
  value: number;
}

export interface ConnectionBadge {
  label: string;
  className: string;
}

interface ConnectionRowProps {
  name: string;
  /** If provided, the name becomes a link */
  nameHref?: string;
  snrValues?: SnrValue[];
  badges?: ConnectionBadge[];
  time?: string;
}

function snrColor(snr: number): string {
  if (snr >= 5) return "text-green-400";
  if (snr >= 0) return "text-yellow-400";
  return "text-red-400";
}

export const ConnectionRow: React.FC<ConnectionRowProps> = ({
  name,
  nameHref,
  snrValues,
  badges,
  time,
}) => {
  return (
    <div className="flex items-center gap-3 px-1 py-1.5 text-xs">
      {/* Name */}
      <span className="font-mono text-xs text-white font-medium w-24 shrink-0 truncate">
        {nameHref ? (
          <Link to={nameHref} className="cursor-pointer hover:text-blue-300 transition-colors">
            {name}
          </Link>
        ) : (
          name
        )}
      </span>

      {/* SNR values */}
      <span className="font-mono w-28 shrink-0 text-neutral-400">
        {snrValues?.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-neutral-600 mx-1">·</span>}
            <span className={snrColor(s.value)}>
              {s.label}{s.value.toFixed(1)}
            </span>
          </React.Fragment>
        ))}
      </span>

      {/* Badges */}
      <div className="flex gap-1 flex-1 min-w-0">
        {badges?.map((b, i) => (
          <span key={i} className={`px-1.5 py-0.5 rounded font-medium ${b.className}`}>
            {b.label}
          </span>
        ))}
      </div>

      {/* Time */}
      {time && <span className="text-neutral-500 shrink-0">{time}</span>}
    </div>
  );
};
