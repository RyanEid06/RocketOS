// Button.tsx
// Standardized accessible button primitive honoring accent and design tokens

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg',
    md: 'px-3.5 py-1.5 text-sm gap-2 rounded-xl',
    lg: 'px-5 py-2.5 text-base gap-2.5 rounded-2xl',
  }[size];

  const variantClasses = {
    primary:
      'accent-bg text-slate-950 font-semibold shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50',
    secondary:
      'bg-white/10 hover:bg-white/15 text-slate-100 border border-white/10 active:scale-95 disabled:opacity-40',
    ghost:
      'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white active:scale-95 disabled:opacity-40',
    danger:
      'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 active:scale-95 disabled:opacity-40',
    outline:
      'bg-transparent border border-white/20 text-slate-200 hover:border-white/40 hover:bg-white/5 active:scale-95 disabled:opacity-40',
  }[variant];

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${sizeClasses} ${variantClasses} ${className}`}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
