// GlassPanel.tsx
// Consistent frosted translucent panel backing with token border and backdrop blur

import React from 'react';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'raised' | 'floating';
  blur?: 'sm' | 'md' | 'lg';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  elevation = 'raised',
  blur = 'md',
  className = '',
  ...props
}) => {
  const elevationClasses = {
    flat: 'bg-slate-900/60 border border-white/10 shadow-sm',
    raised: 'bg-slate-900/80 border border-white/15 shadow-xl',
    floating: 'bg-slate-900/90 border border-white/20 shadow-2xl',
  }[elevation];

  const blurClasses = {
    sm: 'backdrop-blur-md',
    md: 'backdrop-blur-xl',
    lg: 'backdrop-blur-2xl',
  }[blur];

  return (
    <div
      {...props}
      className={`rounded-2xl ${elevationClasses} ${blurClasses} text-slate-100 ${className}`}
    >
      {children}
    </div>
  );
};
