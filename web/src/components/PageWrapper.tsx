import React, { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
}

/**
 * A consistent page wrapper component for all leaf routes
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <div className="bg-neutral-50/5 rounded-tl-3xl rounded-bl-3xl p-4 shadow-md">
      {children}
    </div>
  );
};
