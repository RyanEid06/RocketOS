// Input.tsx
// Stylized input field honoring token system and accent focus ring

import React from 'react';
import { X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  onClear?: () => void;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  icon,
  onClear,
  error,
  className = '',
  value,
  disabled,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div
        className={`relative flex items-center w-full bg-slate-900/70 border rounded-xl transition-all ${
          error
            ? 'border-rose-500/50 focus-within:ring-2 focus-within:ring-rose-500/40'
            : 'border-white/15 focus-within:border-[var(--rkt-accent)] focus-within:ring-2 focus-within:ring-[var(--rkt-accent)]/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {icon && <div className="pl-3 pr-1 text-slate-400 flex items-center">{icon}</div>}
        <input
          value={value}
          disabled={disabled}
          {...props}
          className={`w-full bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed ${className}`}
        />
        {onClear && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="pr-3 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && <span className="text-[11px] text-rose-400 pl-1">{error}</span>}
    </div>
  );
};
