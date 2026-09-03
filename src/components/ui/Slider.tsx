// Slider.tsx
// Accent-aware styled range slider with label and value readout

import React from 'react';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  icon?: React.ReactNode;
  valueFormatter?: (val: number) => string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  icon,
  valueFormatter,
  disabled = false,
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={`flex flex-col gap-1.5 w-full ${disabled ? 'opacity-50' : ''}`}>
      {(label || valueFormatter || icon) && (
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-medium">
            {icon}
            {label}
          </span>
          {valueFormatter && <span className="font-mono text-slate-400">{valueFormatter(value)}</span>}
        </div>
      )}
      <div className="relative flex items-center w-full h-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer focus:outline-none accent-[var(--rkt-accent)] disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, var(--rkt-accent) 0%, var(--rkt-accent) ${percentage}%, rgba(255, 255, 255, 0.15) ${percentage}%, rgba(255, 255, 255, 0.15) 100%)`,
          }}
        />
      </div>
    </div>
  );
};
