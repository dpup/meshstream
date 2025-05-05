import React, { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
}

/**
 * A consistent page wrapper component for all leaf routes
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <div className="bg-neutral-50/5 flex-1 h-[calc(100vh-6rem)] md:h-[calc(100vh-3rem)] overflow-y-auto md:rounded-tl-3xl md:rounded-bl-3xl p-4 shadow-md">
      {children}
    </div>
  );
};
