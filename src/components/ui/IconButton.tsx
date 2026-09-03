// IconButton.tsx
// Compact icon-only button with tooltip and accessible label

import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  variant?: 'ghost' | 'glass' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  label,
  size = 'md',
  active = false,
  variant = 'ghost',
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-8 h-8 rounded-xl text-sm',
    lg: 'w-10 h-10 rounded-2xl text-base',
  }[size];

  const variantClasses = {
    ghost: active
      ? 'accent-subtle-bg accent-text accent-border border'
      : 'text-slate-300 hover:text-white hover:bg-white/10 active:scale-95',
    glass: active
      ? 'accent-bg text-slate-950 font-bold shadow-md'
      : 'bg-white/10 text-slate-200 hover:bg-white/15 border border-white/10 active:scale-95',
    danger: 'text-slate-300 hover:text-rose-400 hover:bg-rose-500/20 active:scale-95',
  }[variant];

  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
};
