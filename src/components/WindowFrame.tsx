import React, { useState, useRef, useEffect } from 'react';
import { WindowState, WindowSnapState, WindowBounds } from '../types';
import { Minus, Square, Copy, X, Pin, Layers } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { SHELL_Z_LAYERS } from '../core/theme/tokens';

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
    snapState?: WindowSnapState
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
  const [snapPreview, setSnapPreview] = useState<WindowSnapState | null>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState<boolean>(false);
  const [showSnapFlyout, setShowSnapFlyout] = useState<boolean>(false);
  const snapFlyoutTimerRef = useRef<number | null>(null);

  const snapTo = (snapType: WindowSnapState) => {
    const halfWidth = Math.floor(window.innerWidth / 2);
    const screenHeight = Math.max(300, window.innerHeight - 64);
    const halfHeight = Math.floor(screenHeight / 2);
    soundEngine.playSnap();

    if (snapType === 'none') {
      onToggleMaximize();
    } else if (snapType === 'left' && onUpdateBounds) {
      onUpdateBounds(halfWidth, screenHeight, 0, 0, 'left');
    } else if (snapType === 'right' && onUpdateBounds) {
      onUpdateBounds(halfWidth, screenHeight, halfWidth, 0, 'right');
    } else if (snapType === 'top-left' && onUpdateBounds) {
      onUpdateBounds(halfWidth, halfHeight, 0, 0, 'top-left');
    } else if (snapType === 'top-right' && onUpdateBounds) {
      onUpdateBounds(halfWidth, halfHeight, halfWidth, 0, 'top-right');
    } else if (snapType === 'bottom-left' && onUpdateBounds) {
      onUpdateBounds(halfWidth, halfHeight, 0, halfHeight, 'bottom-left');
    } else if (snapType === 'bottom-right' && onUpdateBounds) {
      onUpdateBounds(halfWidth, halfHeight, halfWidth, halfHeight, 'bottom-right');
    }
    setShowSnapFlyout(false);
  };

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
    if (e.button !== 0) return;

    setIsDragging(true);

    // If window is currently maximized or snapped, dragging it should unsnap and center under cursor
    let initX = win.position.x;
    let initY = win.position.y;
    let initW = win.size.width;
    let initH = win.size.height;

    if (win.isMaximized || (win.snapState && win.snapState !== 'none')) {
      const restoredWidth = win.restoreBounds?.width || Math.min(800, window.innerWidth * 0.7);
      const restoredHeight = win.restoreBounds?.height || Math.min(500, window.innerHeight * 0.65);
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

        // Detect Aero Snap Zones (Edges and 4 Corners)
        const isLeft = e.clientX <= 30;
        const isRight = e.clientX >= window.innerWidth - 30;
        const isTop = e.clientY <= 30;
        const isBottom = e.clientY >= window.innerHeight - 90;

        if (isTop && isLeft) {
          setSnapPreview('top-left');
        } else if (isTop && isRight) {
          setSnapPreview('top-right');
        } else if (isBottom && isLeft) {
          setSnapPreview('bottom-left');
        } else if (isBottom && isRight) {
          setSnapPreview('bottom-right');
        } else if (isTop) {
          setSnapPreview('top');
        } else if (isLeft) {
          setSnapPreview('left');
        } else if (isRight) {
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
        const halfWidth = Math.floor(window.innerWidth / 2);
        const screenHeight = Math.max(300, window.innerHeight - 64);
        const halfHeight = Math.floor(screenHeight / 2);

        if (snapPreview === 'top') {
          soundEngine.playSnap();
          onToggleMaximize();
        } else if (snapPreview === 'left' && onUpdateBounds) {
          soundEngine.playSnap();
          onUpdateBounds(halfWidth, screenHeight, 0, 0, 'left');
        } else if (snapPreview === 'right' && onUpdateBounds) {
          soundEngine.playSnap();
          onUpdateBounds(halfWidth, screenHeight, halfWidth, 0, 'right');
        } else if (snapPreview === 'top-left' && onUpdateBounds) {
          soundEngine.playSnap();
          onUpdateBounds(halfWidth, halfHeight, 0, 0, 'top-left');
        } else if (snapPreview === 'top-right' && onUpdateBounds) {
          soundEngine.playSnap();
          onUpdateBounds(halfWidth, halfHeight, halfWidth, 0, 'top-right');
        } else if (snapPreview === 'bottom-left' && onUpdateBounds) {
          soundEngine.playSnap();
          onUpdateBounds(halfWidth, halfHeight, 0, halfHeight, 'bottom-left');
        } else if (snapPreview === 'bottom-right' && onUpdateBounds) {
          soundEngine.playSnap();
          onUpdateBounds(halfWidth, halfHeight, halfWidth, halfHeight, 'bottom-right');
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
  const isSnappedTopLeft = win.snapState === 'top-left';
  const isSnappedTopRight = win.snapState === 'top-right';
  const isSnappedBottomLeft = win.snapState === 'bottom-left';
  const isSnappedBottomRight = win.snapState === 'bottom-right';

  const effectiveZIndex = SHELL_Z_LAYERS.WINDOW_BASE + win.zIndex;

  const style: React.CSSProperties = isMax
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: 'calc(100vh - 64px)',
        zIndex: effectiveZIndex,
      }
    : isSnappedLeft
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '50vw',
        height: 'calc(100vh - 64px)',
        zIndex: effectiveZIndex,
      }
    : isSnappedRight
    ? {
        position: 'fixed',
        left: '50vw',
        top: 0,
        width: '50vw',
        height: 'calc(100vh - 64px)',
        zIndex: effectiveZIndex,
      }
    : isSnappedTopLeft
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '50vw',
        height: 'calc((100vh - 64px) / 2)',
        zIndex: effectiveZIndex,
      }
    : isSnappedTopRight
    ? {
        position: 'fixed',
        left: '50vw',
        top: 0,
        width: '50vw',
        height: 'calc((100vh - 64px) / 2)',
        zIndex: effectiveZIndex,
      }
    : isSnappedBottomLeft
    ? {
        position: 'fixed',
        left: 0,
        top: 'calc((100vh - 64px) / 2)',
        width: '50vw',
        height: 'calc((100vh - 64px) / 2)',
        zIndex: effectiveZIndex,
      }
    : isSnappedBottomRight
    ? {
        position: 'fixed',
        left: '50vw',
        top: 'calc((100vh - 64px) / 2)',
        width: '50vw',
        height: 'calc((100vh - 64px) / 2)',
        zIndex: effectiveZIndex,
      }
    : {
        position: 'absolute',
        left: `${win.position.x}px`,
        top: `${win.position.y}px`,
        width: `${win.size.width}px`,
        height: `${win.size.height}px`,
        zIndex: effectiveZIndex,
      };

  return (
    <>
      {/* Aero Snap Ghost Previews */}
      {snapPreview === 'top' && (
        <div className="fixed top-2 left-2 right-2 h-[calc(100vh-76px)] z-40 bg-[var(--rkt-accent)]/20 border-2 border-[var(--rkt-accent)] rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl" />
      )}
      {snapPreview === 'left' && (
        <div className="fixed top-2 left-2 w-[calc(50vw-12px)] h-[calc(100vh-76px)] z-40 bg-[var(--rkt-accent)]/20 border-2 border-[var(--rkt-accent)] rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl" />
      )}
      {snapPreview === 'right' && (
        <div className="fixed top-2 left-[calc(50vw+4px)] right-2 h-[calc(100vh-76px)] z-40 bg-[var(--rkt-accent)]/20 border-2 border-[var(--rkt-accent)] rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl" />
      )}
      {snapPreview === 'top-left' && (
        <div className="fixed top-2 left-2 w-[calc(50vw-12px)] h-[calc((100vh-88px)/2)] z-40 bg-[var(--rkt-accent)]/20 border-2 border-[var(--rkt-accent)] rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl" />
      )}
      {snapPreview === 'top-right' && (
        <div className="fixed top-2 left-[calc(50vw+4px)] right-2 h-[calc((100vh-88px)/2)] z-40 bg-[var(--rkt-accent)]/20 border-2 border-[var(--rkt-accent)] rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl" />
      )}
      {snapPreview === 'bottom-left' && (
        <div className="fixed top-[calc((100vh-64px)/2+4px)] left-2 w-[calc(50vw-12px)] h-[calc((100vh-88px)/2)] z-40 bg-[var(--rkt-accent)]/20 border-2 border-[var(--rkt-accent)] rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl" />
      )}
      {snapPreview === 'bottom-right' && (
        <div className="fixed top-[calc((100vh-64px)/2+4px)] left-[calc(50vw+4px)] right-2 h-[calc((100vh-88px)/2)] z-40 bg-[var(--rkt-accent)]/20 border-2 border-[var(--rkt-accent)] rounded-2xl backdrop-blur-sm pointer-events-none transition-all duration-150 animate-pulse shadow-2xl" />
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
              <div
                className="relative"
                onMouseEnter={() => {
                  if (snapFlyoutTimerRef.current) clearTimeout(snapFlyoutTimerRef.current);
                  setShowSnapFlyout(true);
                }}
                onMouseLeave={() => {
                  snapFlyoutTimerRef.current = window.setTimeout(() => {
                    setShowSnapFlyout(false);
                  }, 300);
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playSnap();
                    onToggleMaximize();
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-300/70 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                  title={isMax || isSnappedLeft || isSnappedRight ? 'Restore' : 'Maximize / Snap Assist'}
                >
                  {isMax || isSnappedLeft || isSnappedRight ? (
                    <Copy className="w-3 h-3" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                </button>

                {/* Snap Layouts Assist Popover */}
                {showSnapFlyout && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-8 right-0 z-50 w-44 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-2.5 text-slate-200 text-xs space-y-2 select-none animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Snap Layouts
                    </div>

                    {/* Split 50/50 */}
                    <div className="grid grid-cols-2 gap-1.5 h-12">
                      <button
                        onClick={() => snapTo('left')}
                        className="bg-white/10 hover:bg-sky-500/30 border border-white/20 hover:border-sky-400 rounded-lg flex items-center justify-center transition-all cursor-pointer group"
                        title="Snap to Left Half"
                      >
                        <span className="text-[10px] text-slate-400 group-hover:text-white font-mono">50% L</span>
                      </button>
                      <button
                        onClick={() => snapTo('right')}
                        className="bg-white/10 hover:bg-sky-500/30 border border-white/20 hover:border-sky-400 rounded-lg flex items-center justify-center transition-all cursor-pointer group"
                        title="Snap to Right Half"
                      >
                        <span className="text-[10px] text-slate-400 group-hover:text-white font-mono">50% R</span>
                      </button>
                    </div>

                    {/* 4 Corner Quadrants */}
                    <div className="grid grid-cols-2 gap-1.5 h-14">
                      <button
                        onClick={() => snapTo('top-left')}
                        className="bg-white/10 hover:bg-sky-500/30 border border-white/20 hover:border-sky-400 rounded-lg flex items-center justify-center transition-all cursor-pointer group"
                        title="Top Left Quarter"
                      >
                        <span className="text-[9px] text-slate-400 group-hover:text-white font-mono">TL</span>
                      </button>
                      <button
                        onClick={() => snapTo('top-right')}
                        className="bg-white/10 hover:bg-sky-500/30 border border-white/20 hover:border-sky-400 rounded-lg flex items-center justify-center transition-all cursor-pointer group"
                        title="Top Right Quarter"
                      >
                        <span className="text-[9px] text-slate-400 group-hover:text-white font-mono">TR</span>
                      </button>
                      <button
                        onClick={() => snapTo('bottom-left')}
                        className="bg-white/10 hover:bg-sky-500/30 border border-white/20 hover:border-sky-400 rounded-lg flex items-center justify-center transition-all cursor-pointer group"
                        title="Bottom Left Quarter"
                      >
                        <span className="text-[9px] text-slate-400 group-hover:text-white font-mono">BL</span>
                      </button>
                      <button
                        onClick={() => snapTo('bottom-right')}
                        className="bg-white/10 hover:bg-sky-500/30 border border-white/20 hover:border-sky-400 rounded-lg flex items-center justify-center transition-all cursor-pointer group"
                        title="Bottom Right Quarter"
                      >
                        <span className="text-[9px] text-slate-400 group-hover:text-white font-mono">BR</span>
                      </button>
                    </div>

                    {/* Maximize / Restore */}
                    <button
                      onClick={() => snapTo('none')}
                      className="w-full py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      {isMax ? 'Restore Window' : 'Full Screen'}
                    </button>
                  </div>
                )}
              </div>
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
