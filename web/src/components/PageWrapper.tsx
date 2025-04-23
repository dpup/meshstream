import React, { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
}

/**
 * A consistent page wrapper component for all leaf routes
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  title,
}) => {
  return (
    <div className="p-4 md:p-6">
      {title && (
        <h1 className="text-2xl font-medium text-neutral-100 mb-6">{title}</h1>
      )}
      <div className="bg-neutral-700  border-outset rounded-lg shadow-inner p-6">
        {children}
      </div>
    </div>
  );
};
