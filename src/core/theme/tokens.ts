// tokens.ts
// Authoritative design token system for RocketOS shell and applications

import { AccentColor, SystemSettings } from '../../types';

export interface AccentDefinition {
  name: AccentColor;
  label: string;
  primary: string;
  light: string;
  dark: string;
  subtle: string;
  border: string;
  ring: string;
  glow: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
}

export const ACCENT_PALETTES: Record<AccentColor, AccentDefinition> = {
  sky: {
    name: 'sky',
    label: 'Sky Cyan',
    primary: '#38bdf8',
    light: '#7dd3fc',
    dark: '#0284c7',
    subtle: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    ring: 'rgba(56, 189, 248, 0.5)',
    glow: 'rgba(56, 189, 248, 0.25)',
    textClass: 'text-sky-400',
    bgClass: 'bg-sky-500',
    borderClass: 'border-sky-400/40',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
  emerald: {
    name: 'emerald',
    label: 'Emerald Green',
    primary: '#34d399',
    light: '#6ee7b7',
    dark: '#059669',
    subtle: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.35)',
    ring: 'rgba(52, 211, 153, 0.5)',
    glow: 'rgba(52, 211, 153, 0.25)',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-400/40',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  indigo: {
    name: 'indigo',
    label: 'Indigo Violet',
    primary: '#818cf8',
    light: '#a5b4fc',
    dark: '#4f46e5',
    subtle: 'rgba(129, 140, 248, 0.12)',
    border: 'rgba(129, 140, 248, 0.35)',
    ring: 'rgba(129, 140, 248, 0.5)',
    glow: 'rgba(129, 140, 248, 0.25)',
    textClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500',
    borderClass: 'border-indigo-400/40',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  },
  amber: {
    name: 'amber',
    label: 'Amber Gold',
    primary: '#fbbf24',
    light: '#fcd34d',
    dark: '#d97706',
    subtle: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.35)',
    ring: 'rgba(251, 191, 36, 0.5)',
    glow: 'rgba(251, 191, 36, 0.25)',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-400/40',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  rose: {
    name: 'rose',
    label: 'Rose Coral',
    primary: '#fb7185',
    light: '#fda4af',
    dark: '#e11d48',
    subtle: 'rgba(251, 113, 133, 0.12)',
    border: 'rgba(251, 113, 133, 0.35)',
    ring: 'rgba(251, 113, 133, 0.5)',
    glow: 'rgba(251, 113, 133, 0.25)',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-400/40',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  },
};

export const DESIGN_TOKENS = {
  colors: {
    background: '#090d16',
    surface: 'rgba(15, 23, 42, 0.78)',
    surfaceRaised: 'rgba(30, 41, 59, 0.88)',
    surfaceGlass: 'rgba(15, 23, 42, 0.65)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 8px 24px rgba(0, 0, 0, 0.45)',
    lg: '0 16px 36px rgba(0, 0, 0, 0.55)',
    xl: '0 24px 60px rgba(0, 0, 0, 0.65)',
  },
  blur: {
    sm: 'blur(8px)',
    md: 'blur(16px)',
    lg: 'blur(24px)',
    xl: 'blur(40px)',
  },
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '220ms',
    deliberate: '320ms',
  },
  zIndex: {
    desktop: 1,
    dock: 20,
    taskbar: 30,
    flyout: 40,
    windowBase: 100,
    snapPreview: 200,
    altTab: 500,
    dialog: 600,
    contextMenu: 1000,
  },
};

/**
 * Propagates theme tokens directly to CSS custom properties on document root
 */
export function applyThemeTokens(settings: SystemSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const accent = ACCENT_PALETTES[settings.accentColor] || ACCENT_PALETTES.sky;

  root.style.setProperty('--rkt-accent', accent.primary);
  root.style.setProperty('--rkt-accent-light', accent.light);
  root.style.setProperty('--rkt-accent-dark', accent.dark);
  root.style.setProperty('--rkt-accent-subtle', accent.subtle);
  root.style.setProperty('--rkt-accent-border', accent.border);
  root.style.setProperty('--rkt-accent-ring', accent.ring);
  root.style.setProperty('--rkt-accent-glow', accent.glow);

  // Scalings
  const uiScale = (settings.uiScale || 100) / 100;
  const textScale = (settings.textScale || 100) / 100;
  root.style.setProperty('--rkt-ui-scale', `${uiScale}`);
  root.style.setProperty('--rkt-text-scale', `${textScale}`);

  // Accessibility & Motion
  if (settings.reduceMotion) {
    root.setAttribute('data-reduce-motion', 'true');
    root.style.setProperty('--rkt-transition-duration', '0ms');
  } else {
    root.removeAttribute('data-reduce-motion');
    root.style.setProperty('--rkt-transition-duration', '200ms');
  }

  if (settings.highContrast) {
    root.setAttribute('data-high-contrast', 'true');
  } else {
    root.removeAttribute('data-high-contrast');
  }

  root.setAttribute('data-accent', settings.accentColor);
}
