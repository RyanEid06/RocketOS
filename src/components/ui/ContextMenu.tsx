// ContextMenu.tsx
// Standardized context menu primitive with keyboard accessibility

import React, { useEffect, useRef } from 'react';
import { GlassPanel } from './GlassPanel';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  action?: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates so menu stays inside viewport
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 700;
  const clampedX = Math.max(10, Math.min(x, screenW - 220));
  const clampedY = Math.max(10, Math.min(y, screenH - (items.length * 34 + 30)));

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      className="fixed z-[1000] animate-in fade-in zoom-in-95 duration-100"
    >
      <GlassPanel
        elevation="floating"
        blur="md"
        className="w-52 p-1.5 border border-white/20 shadow-2xl flex flex-col gap-0.5 select-none"
      >
        {items.map((item, idx) => {
          if (item.divider) {
            return <div key={`div-${idx}`} className="h-[1px] bg-white/10 my-1 mx-1" />;
          }

          return (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.action?.();
                  onClose();
                }
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                item.disabled
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : item.danger
                  ? 'text-rose-400 hover:bg-rose-500/20 hover:text-rose-300'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-slate-400 w-4 h-4 flex items-center">{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="text-[10px] font-mono text-slate-400 pl-2">{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </GlassPanel>
    </div>
  );
};
