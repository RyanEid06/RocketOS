// Separator.tsx
// Subtle horizontal or vertical divider

import React from 'react';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className = '',
}) => {
  return (
    <div
      role="separator"
      className={
        orientation === 'horizontal'
          ? `h-[1px] w-full bg-white/10 my-2 ${className}`
          : `w-[1px] h-full bg-white/10 mx-2 ${className}`
      }
    />
  );
};
