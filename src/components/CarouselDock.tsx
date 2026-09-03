import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppId, SystemSettings, FSItem } from '../types';
import {
  HardDrive,
  Trash2,
  ListTodo,
  Paintbrush,
  Activity,
  Folder,
  Rocket,
  Terminal,
  Edit3,
  Cpu,
  Settings as SettingsIcon,
  Code2,
} from 'lucide-react';
import { TRANSLATIONS } from '../utils/localization';

export interface DockAppItem {
  id: string;
  appId: AppId;
  title: string;
  desc: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CarouselDockProps {
  settings: SystemSettings;
  onOpenApp: (appId: AppId, extraData?: Record<string, any>) => void;
  onOpenFile?: (file: FSItem) => void;
  onDeleteFile?: (item: FSItem) => void;
  trashCount: number;
}

export const CarouselDock: React.FC<CarouselDockProps> = ({
  settings,
  onOpenApp,
  onOpenFile,
  onDeleteFile,
  trashCount,
}) => {
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;

  // Complete list of premier default OS applications (no loose files)
  const dockApps: DockAppItem[] = [
    {
      id: 'thispc',
      appId: 'thispc',
      title: t.thisPc,
      desc: 'NVMe SSD, RAM Disk & System Specs',
      category: 'System',
      icon: <HardDrive className="w-11 h-11 text-sky-400" />,
      action: () => onOpenApp('explorer', { path: '/ThisPC' }),
    },
    {
      id: 'trash',
      appId: 'trash',
      title: t.recycleBin,
      desc: `${trashCount} items in bin • Restore manager`,
      category: 'System',
      icon: <Trash2 className="w-11 h-11 text-rose-400" />,
      action: () => onOpenApp('explorer', { path: '/Trash' }),
    },
    {
      id: 'notes',
      appId: 'notes',
      title: t.notes,
      desc: 'To-Do checklists & project notes',
      category: 'Productivity',
      icon: <ListTodo className="w-11 h-11 text-emerald-400" />,
      action: () => onOpenApp('notes'),
    },
    {
      id: 'paint',
      appId: 'paint',
      title: t.paint,
      desc: '2D drawing studio & canvas artwork',
      category: 'Creativity',
      icon: <Paintbrush className="w-11 h-11 text-amber-400" />,
      action: () => onOpenApp('paint'),
    },
    {
      id: 'taskmanager',
      appId: 'taskmanager',
      title: t.taskManager,
      desc: 'Live CPU, RAM & Process monitor',
      category: 'Diagnostics',
      icon: <Activity className="w-11 h-11 text-rose-400" />,
      action: () => onOpenApp('taskmanager'),
    },
    {
      id: 'explorer',
      appId: 'explorer',
      title: 'File Explorer',
      desc: 'Browse Desktop, Documents & Kernel',
      category: 'Files',
      icon: <Folder className="w-11 h-11 text-sky-400" />,
      action: () => onOpenApp('explorer', { path: '/Desktop' }),
    },
    {
      id: 'graphics',
      appId: 'graphics',
      title: t.graphicsEngine,
      desc: 'Interactive 2D orbital simulation',
      category: 'Engine',
      icon: <Rocket className="w-11 h-11 text-purple-400" />,
      action: () => onOpenApp('graphics'),
    },
    {
      id: 'terminal',
      appId: 'terminal',
      title: t.terminal,
      desc: 'rsh v2.0 CLI shell & environment',
      category: 'Developer',
      icon: <Terminal className="w-11 h-11 text-emerald-300" />,
      action: () => onOpenApp('terminal'),
    },
    {
      id: 'editor',
      appId: 'editor',
      title: 'Rocket Editor',
      desc: 'rEdit code studio with execution',
      category: 'Developer',
      icon: <Edit3 className="w-11 h-11 text-indigo-400" />,
      action: () => onOpenApp('editor'),
    },
    {
      id: 'rocket-studio',
      appId: 'rocket-studio',
      title: 'Rocket Studio',
      desc: 'IDE & compiler development suite',
      category: 'Developer',
      icon: <Code2 className="w-11 h-11 text-cyan-400" />,
      action: () => onOpenApp('rocket-studio'),
    },
    {
      id: 'monitor',
      appId: 'monitor',
      title: 'Hardware Monitor',
      desc: 'PML4 paging & register telemetry',
      category: 'Diagnostics',
      icon: <Cpu className="w-11 h-11 text-cyan-300" />,
      action: () => onOpenApp('monitor'),
    },
    {
      id: 'settings',
      appId: 'settings',
      title: t.settings,
      desc: 'Wallpapers, Clock & System options',
      category: 'Preferences',
      icon: <SettingsIcon className="w-11 h-11 text-slate-300" />,
      action: () => onOpenApp('settings'),
    },
  ];

  const totalApps = dockApps.length;

  // Continuous rotational index
  const [rotation, setRotation] = useState<number>(0);
  const targetRotationRef = useRef<number>(0);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouseXRef = useRef<number | null>(null);

  // Smooth physics animation loop with graceful dampening for slower, deliberate glide
  useEffect(() => {
    let animId: number;
    const updatePhysics = () => {
      setRotation((prev) => {
        const diff = targetRotationRef.current - prev;
        if (Math.abs(diff) < 0.001) {
          return targetRotationRef.current;
        }
        // Smooth dampening factor (deliberate, elegant slower rotation)
        return prev + diff * 0.085;
      });
      animId = requestAnimationFrame(updatePhysics);
    };
    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle cursor moving over the floating dock area
  // Rotates circular apps to follow cursor smoothly and at a controlled speed
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX;

      if (lastMouseXRef.current !== null) {
        const deltaX = currentX - lastMouseXRef.current;
        // Controlled, slower sensitivity
        const sensitivity = 0.0042;
        targetRotationRef.current += deltaX * sensitivity;
      }
      lastMouseXRef.current = currentX;

      // Determine which of the 5 arc slots is closest to cursor for magnification
      const relativeX = currentX - rect.left;
      const slotWidth = rect.width / 5;
      const slot = Math.floor(relativeX / slotWidth);
      const clampedSlot = Math.max(0, Math.min(4, slot));
      setHoveredSlotIndex(clampedSlot);
    },
    []
  );

  const handleMouseEnter = () => {
    lastMouseXRef.current = null;
  };

  const handleMouseLeave = () => {
    setHoveredSlotIndex(null);
    lastMouseXRef.current = null;
  };

  // Optional mouse wheel to scroll circle smoothly
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    targetRotationRef.current += delta * 0.0025;
  };

  // Compute the 5 visible slots relative to current rotation
  // Slots: 0 (left-most), 1 (mid-left), 2 (center), 3 (mid-right), 4 (right-most)
  const centerIntIndex = Math.round(rotation);

  const visibleSlots = [-2, -1, 0, 1, 2].map((offset, slotIdx) => {
    const rawIndex = centerIntIndex + offset;
    const appIndex = ((rawIndex % totalApps) + totalApps) % totalApps;
    const app = dockApps[appIndex];
    return {
      slotIdx, // 0 to 4
      offset, // -2 to +2
      appIndex,
      app,
    };
  });

  return (
    <div
      id="circular-apps-dock"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none"
    >
      {/* Completely Transparent Floating Area with Convex Arc Trajectory */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className="relative flex items-end justify-center gap-4 sm:gap-6 px-6 pt-10 pb-2 bg-transparent cursor-pointer"
        style={{ minWidth: '420px', minHeight: '120px' }}
      >
        {visibleSlots.map(({ slotIdx, offset, app }) => {
          const isThisHovered = hoveredSlotIndex === slotIdx;
          const distFromHovered =
            hoveredSlotIndex !== null ? Math.abs(hoveredSlotIndex - slotIdx) : null;

          // Arc shape mathematics:
          // Center slot (offset 0) is peak (raised highest)
          // Outer slots (offset ±1, ±2) curve gently downward along an arc
          const baseArcY = Math.pow(Math.abs(offset), 1.6) * 7; // 0px, 7px, 21px
          const baseArcRotate = offset * 3; // -6deg, -3deg, 0deg, 3deg, 6deg

          let scale = 1;
          let translateY = baseArcY;
          let rotate = baseArcRotate;
          let zIndex = 10 - Math.abs(offset);

          if (isThisHovered) {
            // Hovered item magnifies significantly, lifts higher above the arc
            scale = 1.35;
            translateY = baseArcY - 18;
            rotate = 0;
            zIndex = 40;
          } else if (distFromHovered === 1) {
            // Immediate neighbor scales slightly
            scale = 1.12;
            translateY = baseArcY - 6;
            rotate = baseArcRotate * 0.7;
            zIndex = 25;
          } else if (offset === 0) {
            scale = hoveredSlotIndex === null ? 1.08 : 0.96;
          } else {
            scale = 0.94;
          }

          return (
            <div
              key={`${app.id}-${slotIdx}`}
              className="relative flex flex-col items-center group/app transition-transform duration-200 ease-out cursor-pointer"
              style={{
                transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                zIndex,
              }}
              onClick={() => app.action()}
              onDragOver={(e) => {
                if (app.appId === 'trash' || app.appId === 'editor' || app.appId === 'paint') {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const rawData =
                    e.dataTransfer.getData('application/rocket-fs-item') ||
                    e.dataTransfer.getData('text/plain');
                  if (rawData) {
                    const item: FSItem = JSON.parse(rawData);
                    if (app.appId === 'trash' && onDeleteFile) {
                      onDeleteFile(item);
                    } else if (app.appId === 'editor' && onOpenFile) {
                      onOpenFile(item);
                    } else if (app.appId === 'paint') {
                      onOpenApp('paint');
                    }
                  }
                } catch {}
              }}
            >
              {/* Pure Floating Logo Button - No gray borders, no square background */}
              <button
                id={`arc-app-${app.id}`}
                className="relative p-1.5 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 bg-transparent border-none outline-none"
                title={`${app.title} - Click to launch`}
              >
                <div
                  className={`transition-all duration-200 filter ${
                    isThisHovered
                      ? 'drop-shadow-[0_12px_24px_rgba(56,189,248,0.7)] scale-110'
                      : 'drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)] group-hover/app:drop-shadow-[0_10px_20px_rgba(56,189,248,0.5)]'
                  }`}
                >
                  {app.icon}
                </div>
              </button>

              {/* Clean Title label beneath icon */}
              <span
                className={`text-[11px] font-semibold tracking-tight mt-1 truncate max-w-[80px] text-center transition-all duration-150 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${
                  isThisHovered
                    ? 'text-sky-300 font-bold scale-110'
                    : 'text-slate-200/90 group-hover/app:text-white'
                }`}
              >
                {app.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
