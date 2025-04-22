import React from 'react';

interface InfoMessageProps {
  message: string;
  type?: 'info' | 'warning' | 'error';
}

export const InfoMessage: React.FC<InfoMessageProps> = ({ 
  message, 
  type = 'info' 
}) => {
  const getBgColor = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  return (
    <div className={`p-3 mb-4 rounded border ${getBgColor()}`}>
      <p className={`text-sm ${getTextColor()}`}>{message}</p>
    </div>
  );
};