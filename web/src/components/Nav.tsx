import React from "react";
import { Link } from "@tanstack/react-router";
import { ConnectionStatus } from "./ConnectionStatus";
import { Separator } from "./Separator";
import { SITE_TITLE } from "../lib/config";

interface NavProps {
  connectionStatus: string;
}

export const Nav: React.FC<NavProps> = ({ connectionStatus }) => {
  return (
    <aside className="w-64 text-neutral-100 h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo section */}
      <div className="p-4 mb-2">
        <h1 className="text-xl font-bold">{SITE_TITLE}</h1>
      </div>

      <Separator />

      <nav className="flex-1 pt-4">
        <ul className="space-y-2">
          <li>
            <Link
              to="/"
              className="block px-4 py-2 hover:bg-neutral-800 transition-colors"
              activeProps={{
                className:
                  "block px-4 py-2 bg-neutral-800 border-l-4 border-neutral-500",
              }}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/packets"
              className="block px-4 py-2 hover:bg-neutral-800 transition-colors"
              activeProps={{
                className:
                  "block px-4 py-2 bg-neutral-800 border-l-4 border-neutral-500",
              }}
            >
              Packets
            </Link>
          </li>
        </ul>
      </nav>

      <Separator />

      <div className="px-4 py-2 pb-6">
        <ConnectionStatus status={connectionStatus} />
      </div>
    </aside>
  );
};
