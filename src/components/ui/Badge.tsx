// Badge.tsx
// Status badge component supporting neutral, accent, and semantic variants

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] rounded-md',
    md: 'px-2 py-0.5 text-xs rounded-lg',
  }[size];

  const variantClasses = {
    default: 'bg-white/10 text-slate-300 border border-white/10',
    accent: 'accent-subtle-bg accent-text accent-border border',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    outline: 'bg-transparent text-slate-400 border border-white/20',
  }[variant];

  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1 font-medium select-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};
