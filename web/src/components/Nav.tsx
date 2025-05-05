import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ConnectionStatus } from "./ConnectionStatus";
import { Separator } from "./Separator";
import { Button } from "./ui/Button";
import { SITE_TITLE } from "../lib/config";
import {
  Info,
  Layers,
  LayoutDashboard,
  Radio,
  MessageSquare,
  Map,
  LucideIcon,
  Menu,
  X,
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
    to: "/map",
    label: "Network Map",
    icon: Map,
    exact: true,
  },
  {
    to: "/stream",
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Handle window resize to determine if we're in mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Navigation links component to avoid duplication across desktop and mobile
  const NavLinks = () => (
    <ul className="space-y-1">
      {navigationItems.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            className="flex items-center px-4 py-2.5 transition-colors"
            onClick={() => isMobileView && setIsMobileMenuOpen(false)}
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
  );

  return (
    <>
      {/* Mobile header (always visible on mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20  border-neutral-700 border-b shadow-inner bg-neutral-800/40">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center">
            <div className="bg-pink-400 rounded-md mr-3 p-1.5 flex items-center justify-center">
              <Layers className="h-5 w-5 text-neutral-800" />
            </div>
            <h1 className="text-xl font-thin tracking-wide text-neutral-100">{SITE_TITLE}</h1>
          </div>
          <Button 
            variant="ghost" 
            icon={isMobileMenuOpen ? X : Menu} 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          />
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <aside 
        className={`
          fixed top-0 right-0 h-screen bg-neutral-800 z-40 w-64 transform transition-transform duration-300 ease-in-out md:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full pt-16">
          <nav className="flex-1 overflow-y-auto">
            <NavLinks />
          </nav>
          <div className="px-4 py-2 pb-6">
            <ConnectionStatus status={connectionStatus} />
          </div>
        </div>
      </aside>

      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 text-neutral-100 h-screen fixed left-0 top-0 flex-col">
        {/* Logo and title section */}
        <div className="p-4 flex items-center">
          <div className="bg-pink-400 rounded-md mr-3 p-1.5 flex items-center justify-center">
            <Layers className="h-5 w-5 text-neutral-800" />
          </div>
          <h1 className="text-xl font-thin tracking-wide">{SITE_TITLE}</h1>
        </div>

        <Separator className="mt-1" />

        <nav className="flex-1 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="px-4 py-2 pb-6">
          <ConnectionStatus status={connectionStatus} />
        </div>
      </aside>

      {/* Content padding spacer for mobile view - this will be positioned outside the main content area */}
      <div className="md:hidden h-16"></div>
    </>
  );
};
