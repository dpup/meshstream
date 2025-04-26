import React from "react";
import { Link } from "@tanstack/react-router";
import { ConnectionStatus } from "./ConnectionStatus";
import { Separator } from "./Separator";
import { SITE_TITLE } from "../lib/config";
import {
  Info,
  Layers,
  LayoutDashboard,
  Radio,
  MessageSquare,
  LucideIcon,
} from "lucide-react";

// Define navigation item structure
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

// Define props for the component
interface NavProps {
  connectionStatus: string;
}

// Navigation items data
const navigationItems: NavItem[] = [
  {
    to: "/home",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/packets",
    label: "Stream",
    icon: Radio,
    exact: true,
  },
  {
    to: "/channels",
    label: "Messages",
    icon: MessageSquare,
  },
  {
    to: "/info",
    label: "Information",
    icon: Info,
    exact: true,
  },
];

export const Nav: React.FC<NavProps> = ({ connectionStatus }) => {
  return (
    <aside className="w-64 text-neutral-100 h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo and title section */}
      <div className="p-4 flex items-center">
        <div className="bg-pink-400 rounded-md mr-3 p-1.5 flex items-center justify-center">
          <Layers className="h-5 w-5 text-neutral-800" />
        </div>
        <h1 className="text-xl font-thin tracking-wide">{SITE_TITLE}</h1>
      </div>

      <Separator className="mt-1" />

      <nav className="flex-1">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center px-4 py-2.5 transition-colors"
                inactiveProps={{
                  className:
                    "text-neutral-400 hover:text-neutral-200 font-thin",
                }}
                activeProps={{
                  className: "text-neutral-200 font-normal",
                }}
                activeOptions={{
                  exact: item.exact,
                }}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 py-2 pb-6">
        <ConnectionStatus status={connectionStatus} />
      </div>
    </aside>
  );
};
