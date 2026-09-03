import React, { useState, useRef, useEffect } from 'react';
import { WindowState } from '../types';
import { Minus, Square, Copy, X, Pin, Layers } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface WindowFrameProps {
  window: WindowState;
  isActive: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onUpdatePosition: (x: number, y: number) => void;
  onUpdateBounds?: (
    width: number,
    height: number,
    x: number,
    y: number,
    snapState?: 'left' | 'right' | 'none'
  ) => void;
  onMoveToWorkspace?: (workspaceId: number) => void;
  children: React.ReactNode;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const WindowFrame: React.FC<WindowFrameProps> = ({
  window: win,
  isActive,
  isPinned = false,
  onTogglePin,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onUpdatePosition,
  onUpdateBounds,
  onMoveToWorkspace,
  children,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [resizingDir, setResizingDir] = useState<ResizeDirection | null>(null);
  const [snapPreview, setSnapPreview] = useState<'top' | 'left' | 'right' | null>(null);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initWidth: number;
    initHeight: number;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initWidth: 0,
    initHeight: 0,
  });

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    onFocus();
    // If double click was triggered, don't start drag immediately
    if (e.button !== 0) return;

    setIsDragging(true);

    // If window is currently maximized or snapped, dragging it should unsnap and center under cursor
    let initX = win.position.x;
    let initY = win.position.y;
    let initW = win.size.width;
    let initH = win.size.height;

    if (win.isMaximized || win.snapState) {
      // Un-maximize/unsnap smoothly
      const restoredWidth = Math.min(800, window.innerWidth * 0.7);
      const restoredHeight = Math.min(500, window.innerHeight * 0.65);
      initX = Math.max(0, e.clientX - restoredWidth / 2);
      initY = Math.max(0, e.clientY - 20);
      initW = restoredWidth;
      initH = restoredHeight;
      if (onUpdateBounds) {
        onUpdateBounds(restoredWidth, restoredHeight, initX, initY, 'none');
      }
    }

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      initWidth: initW,
      initHeight: initH,
    };
  };

  const handleResizeStart = (e: React.MouseEvent, dir: ResizeDirection) => {
    e.stopPropagation();
    e.preventDefault();
    onFocus();
    if (win.isMaximized || win.snapState) return;

    setResizingDir(dir);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: win.position.x,
      initY: win.position.y,
      initWidth: win.size.width,
      initHeight: win.size.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.startX;
        const dy = e.clientY - dragStartRef.current.startY;
        const newX = Math.max(-win.size.width + 100, Math.min(window.innerWidth - 100, dragStartRef.current.initX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.initY + dy));
        onUpdatePosition(newX, newY);

        // Detect Aero Snap Zones (Responsive 25px edge zones)
        if (e.clientY <= 25) {
          setSnapPreview('top');
        } else if (e.clientX <= 25) {
          setSnapPreview('left');
        } else if (e.clientX >= window.innerWidth - 25) {
          setSnapPreview('right');
        } else {
          setSnapPreview(null);
        }
      } else if (resizingDir && onUpdateBounds) {
        const dx = e.clientX - dragStartRef.current.startX;
        const dy = e.clientY - dragStartRef.current.startY;
        const minW = 340;
        const minH = 220;
        const maxW = window.innerWidth;
        const maxH = window.innerHeight - 64;

        let newW = dragStartRef.current.initWidth;
        let newH = dragStartRef.current.initHeight;
        let newX = dragStartRef.current.initX;
        let newY = dragStartRef.current.initY;

        // East / West
        if (resizingDir.includes('e')) {
          newW = Math.min(maxW, Math.max(minW, dragStartRef.current.initWidth + dx));
        }
        if (resizingDir.includes('w')) {
          const calculatedW = Math.min(maxW, Math.max(minW, dragStartRef.current.initWidth - dx));
          newX = dragStartRef.current.initX + (dragStartRef.current.initWidth - calculatedW);
          newW = calculatedW;
        }

        // South / North
        if (resizingDir.includes('s')) {
          newH = Math.min(maxH, Math.max(minH, dragStartRef.current.initHeight + dy));
        }
        if (resizingDir.includes('n')) {
          const calculatedH = Math.min(maxH, Math.max(minH, dragStartRef.current.initHeight - dy));
          newY = dragStartRef.current.initY + (dragStartRef.current.initHeight - calculatedH);
          newH = calculatedH;
        }

        onUpdateBounds(newW, newH, newX, newY, 'none');
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (snapPreview === 'top') {
          soundEngine.playSnap();
          onToggleMaximize();
        } else if (snapPreview === 'left' && onUpdateBounds) {
          soundEngine.playSnap();
          const halfWidth = Math.floor(window.innerWidth / 2);
          const screenHeight = Math.max(300, window.innerHeight - 64);
          onUpdateBounds(halfWidth, screenHeight, 0, 0, 'left');
        } else if (snapPreview === 'right' && onUpdateBounds) {
          soundEngine.playSnap();
          const halfWidth = Math.floor(window.innerWidth / 2);
          const screenHeight = Math.max(300, window.innerHeight - 64);
          onUpdateBounds(halfWidth, screenHeight, halfWidth, 0, 'right');
        }
        setSnapPreview(null);
      }

      if (resizingDir) {
        setResizingDir(null);
      }
    };

    if (isDragging || resizingDir) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizingDir, snapPreview, win, onUpdatePosition, onUpdateBounds, onToggleMaximize]);

  if (win.isMinimized) {
    return null;
  }

  const isMax = win.isMaximized;
  const isSnappedLeft = win.snapState === 'left';
  const isSnappedRight = win.snapState === 'right';

  const style: React.CSSProperties = isMax
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: 'calc(100vh - 64px)',
        zIndex: win.zIndex,
      }
    : isSnappedLeft
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '50vw',
        height: 'calc(100vh - 64px)',
        zIndex: win.zIndex,
      }
    : isSnappedRight
    ? {
        position: 'fixed',
        left: '50vw',
        top: 0,
        width: '50vw',
        height: 'calc(100vh - 64px)',
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: `${win.position.x}px`,
        top: `${win.position.y}px`,
        width: `${win.size.width}px`,
        height: `${win.size.height}px`,
        zIndex: win.zIndex,
      };

  return (
    <>
      {/* Aero Snap Ghost Preview */}
      {snapPreview === 'top' && (
        <div className="fixed top-2 left-2 right-2 h-[calc(100vh-76px)] z-40 bg-sky-500/20 border-2 border-sky-400 rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl shadow-sky-500/30" />
      )}
      {snapPreview === 'left' && (
        <div className="fixed top-2 left-2 w-[calc(50vw-12px)] h-[calc(100vh-76px)] z-40 bg-sky-500/20 border-2 border-sky-400 rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl shadow-sky-500/30" />
      )}
      {snapPreview === 'right' && (
        <div className="fixed top-2 left-[calc(50vw+4px)] right-2 h-[calc(100vh-76px)] z-40 bg-sky-500/20 border-2 border-sky-400 rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl shadow-sky-500/30" />
      )}

      <div
        id={`window-${win.id}`}
        style={style}
        onClick={onFocus}
        className={`flex flex-col rounded-xl overflow-hidden shadow-2xl transition-all ${
          isActive
            ? 'ring-2 ring-sky-500/60 shadow-2xl shadow-sky-950/50'
            : 'ring-1 ring-slate-300/60 shadow-xl opacity-98'
        } bg-slate-50 border border-slate-300 select-none`}
      >
        {/* Resize Handles (Active only when not maximized and not snapped) */}
        {!isMax && !isSnappedLeft && !isSnappedRight && (
          <>
            {/* Edge handles */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'n')}
              className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-30"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 's')}
              className="absolute bottom-0 left-3 right-3 h-2 cursor-ns-resize z-30"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'w')}
              className="absolute left-0 top-3 bottom-3 w-2 cursor-ew-resize z-30"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'e')}
              className="absolute right-0 top-3 bottom-3 w-2 cursor-ew-resize z-30"
            />
            {/* Corner handles */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
              className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nwse-resize z-40"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
              className="absolute top-0 right-0 w-3.5 h-3.5 cursor-nesw-resize z-40"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
              className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize z-40"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'se')}
              className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize z-40"
            />
          </>
        )}

        {/* Titlebar - Bold Typography Style */}
        <div
          onMouseDown={handleTitleMouseDown}
          onDoubleClick={onToggleMaximize}
          className={`h-12 px-4 flex items-center justify-between select-none cursor-move border-b border-slate-300/90 ${
            isActive
              ? 'bg-slate-200/90 backdrop-blur-md text-slate-800'
              : 'bg-slate-100/90 backdrop-blur-sm text-slate-600'
          }`}
        >
          <div className="flex items-center gap-4 truncate">
            {/* Traffic light control dots */}
            <div
              className="flex items-center gap-2"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                id={`btn-close-${win.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 transition-colors flex items-center justify-center group cursor-pointer"
                title="Close"
              >
                <X className="w-2.5 h-2.5 text-red-950 opacity-0 group-hover:opacity-100" />
              </button>
              <button
                id={`btn-min-${win.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }}
                className="w-3.5 h-3.5 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors flex items-center justify-center group cursor-pointer"
                title="Minimize"
              >
                <Minus className="w-2.5 h-2.5 text-amber-950 opacity-0 group-hover:opacity-100" />
              </button>
              <button
                id={`btn-max-${win.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMaximize();
                }}
                className="w-3.5 h-3.5 rounded-full bg-emerald-400 hover:bg-emerald-500 transition-colors flex items-center justify-center group cursor-pointer"
                title={isMax ? 'Restore' : 'Maximize'}
              >
                <Square className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">{win.icon}</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-600 truncate">
                {win.title}
              </span>
            </div>
          </div>

          {/* Window path / status info badge */}
          <div
            className="flex items-center gap-2 shrink-0 ml-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="hidden sm:block text-[10px] font-bold text-slate-500 px-2 py-1 border border-slate-300 rounded bg-white/70 tracking-wider uppercase">
              {win.appId === 'explorer'
                ? `PATH: ${win.extraData?.currentPath || '/Desktop'}`
                : `APP: ${win.appId}`}
            </div>

            {/* Icon controls for desktop users */}
            <div className="flex items-center gap-0.5">
              {onMoveToWorkspace && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextWs = ((win.workspaceId || 1) % 3) + 1;
                      onMoveToWorkspace(nextWs);
                      soundEngine.playPin();
                    }}
                    className="h-7 px-1.5 flex items-center gap-1 rounded-lg hover:bg-slate-300/70 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors text-[10px] font-bold"
                    title={`Current: Desktop ${win.workspaceId || 1}. Click to send to next desktop`}
                  >
                    <Layers className="w-3 h-3 text-sky-500" />
                    <span>D{win.workspaceId || 1}</span>
                  </button>
                </div>
              )}
              {onTogglePin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playPin();
                    onTogglePin();
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isPinned
                      ? 'bg-sky-500/20 text-sky-600 hover:bg-sky-500/30'
                      : 'hover:bg-slate-300/70 text-slate-500 hover:text-slate-800'
                  }`}
                  title={isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
                >
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-sky-500 text-sky-600' : ''}`} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playMinimize();
                  onMinimize();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-300/70 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                title="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playSnap();
                  onToggleMaximize();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-300/70 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                title={isMax || isSnappedLeft || isSnappedRight ? 'Restore' : 'Maximize'}
              >
                {isMax || isSnappedLeft || isSnappedRight ? (
                  <Copy className="w-3 h-3" />
                ) : (
                  <Square className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playTrash();
                  onClose();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500 hover:text-white text-slate-500 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Window Body */}
        <div className="flex-1 overflow-hidden relative bg-slate-50 text-slate-800 select-text">
          {children}
        </div>
      </div>
    </>
  );
};
