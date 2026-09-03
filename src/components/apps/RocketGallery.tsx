import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Paintbrush,
  Copy,
  Info,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  Download,
  Check,
  Eye,
  FileText
} from 'lucide-react';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { FSItem } from '../../types';

interface RocketGalleryProps {
  initialFilePath?: string;
  onOpenInPaint?: (path: string) => void;
}

export const RocketGallery: React.FC<RocketGalleryProps> = ({
  initialFilePath,
  onOpenInPaint,
}) => {
  const fs = useMemo(() => RocketFS.getInstance(), []);

  const [currentPath, setCurrentPath] = useState<string>(
    initialFilePath || '/home/ryan/Pictures/rocket_nebula.png'
  );
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  
  // Transform states
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [isPixelated, setIsPixelated] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState<boolean>(false);
  const [openDialogVisible, setOpenDialogVisible] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image from path in RocketFS
  useEffect(() => {
    if (!currentPath) return;

    try {
      const lookupRes = fs.lookup(currentPath);
      if (lookupRes.success && lookupRes.data && lookupRes.data.nodeType === 'file') {
        const inode = lookupRes.data;
        let content = inode.content || '';
        // If content is pure SVG without data URI header, format as data URI
        if (content.trim().startsWith('<svg')) {
          content = `data:image/svg+xml;utf8,${encodeURIComponent(content)}`;
        }
        setImageSrc(content);

        // Format file size
        const bytes = inode.sizeBytes || content.length;
        if (bytes < 1024) setFileSizeStr(`${bytes} B`);
        else if (bytes < 1024 * 1024) setFileSizeStr(`${(bytes / 1024).toFixed(1)} KB`);
        else setFileSizeStr(`${(bytes / (1024 * 1024)).toFixed(2)} MB`);
      } else {
        // Fallback placeholder
        setImageSrc('');
      }
    } catch {
      setImageSrc('');
    }

    // Reset view transforms on new image
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPanOffset({ x: 0, y: 0 });
  }, [currentPath, fs]);

  // Read actual image natural dimensions on load
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // Find other images in the same folder for thumbnail strip & Next/Prev navigation
  const siblingImages = useMemo(() => {
    try {
      const parentDir = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/home/ryan/Pictures';
      const listRes = fs.listDirectory(parentDir);
      if (!listRes.success || !listRes.data) return [];

      return listRes.data.filter((child) => {
        const lower = child.name.toLowerCase();
        return (
          child.nodeType === 'file' &&
          (lower.endsWith('.png') ||
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.webp') ||
            lower.endsWith('.rpaint'))
        );
      });
    } catch {
      return [];
    }
  }, [currentPath, fs]);

  const currentIndex = siblingImages.findIndex((img) => img.canonicalPath === currentPath);

  const handlePrev = () => {
    if (siblingImages.length <= 1) return;
    const prevIdx = (currentIndex - 1 + siblingImages.length) % siblingImages.length;
    setCurrentPath(siblingImages[prevIdx].canonicalPath);
  };

  const handleNext = () => {
    if (siblingImages.length <= 1) return;
    const nextIdx = (currentIndex + 1) % siblingImages.length;
    setCurrentPath(siblingImages[nextIdx].canonicalPath);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 10));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.1));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z * 1.15, 10));
    } else {
      setZoom((z) => Math.max(z / 1.15, 0.1));
    }
  };

  // Pan dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Copy Image / Path
  const handleCopyPath = () => {
    navigator.clipboard?.writeText(currentPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
      else if (e.key === '0') handleResetZoom();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const fileName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'No Image';
  const fileExt = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toUpperCase() : 'IMAGE';

  return (
    <div className="w-full h-full flex flex-col bg-[#070b14] text-slate-200 select-none overflow-hidden font-sans">
      {/* Top Glass Toolbar */}
      <div className="h-11 px-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 z-20 shrink-0">
        {/* Left: Navigation & File actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOpenDialogVisible(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            title="Open image from RocketFS"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Open</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={handlePrev}
            disabled={siblingImages.length <= 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-300"
            title="Previous image (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[11px] text-slate-400 font-mono px-1">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${siblingImages.length}` : '0 / 0'}
          </span>

          <button
            onClick={handleNext}
            disabled={siblingImages.length <= 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-300"
            title="Next image (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Current file title */}
        <div className="truncate max-w-[240px] md:max-w-xs text-center flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-100 truncate">{fileName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
            {fileExt}
          </span>
        </div>

        {/* Right: View controls & Edit in Paint */}
        <div className="flex items-center gap-1">
          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span
            onClick={handleResetZoom}
            className="text-[11px] font-mono text-slate-300 px-1 cursor-pointer hover:text-white"
            title="Click to reset zoom"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Rotations */}
          <button
            onClick={() => setRotation((r) => (r - 90) % 360)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hidden sm:block"
            title="Rotate Left 90°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hidden sm:block"
            title="Rotate Right 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFlipH((f) => !f)}
            className={`p-1.5 rounded-lg transition-colors hidden sm:block ${
              flipH ? 'bg-sky-500/20 text-sky-300' : 'hover:bg-white/10 text-slate-300'
            }`}
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Edit in Paint studio */}
          {onOpenInPaint && (
            <button
              onClick={() => onOpenInPaint(currentPath)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
              title="Edit this artwork in Paint Studio"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Edit in Paint</span>
            </button>
          )}

          {/* Sharp Pixel toggle */}
          <button
            onClick={() => setIsPixelated((p) => !p)}
            className={`p-1.5 rounded-lg transition-colors text-xs font-mono ${
              isPixelated
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'hover:bg-white/10 text-slate-400'
            }`}
            title="Toggle Pixelated / Smooth rendering"
          >
            PX
          </button>

          {/* Info toggle */}
          <button
            onClick={() => setShowInfo((i) => !i)}
            className={`p-1.5 rounded-lg transition-colors ${
              showInfo ? 'bg-sky-500/20 text-sky-300' : 'hover:bg-white/10 text-slate-300'
            }`}
            title="Image Details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Canvas viewport */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing bg-[#050811] ${
            isDragging ? 'select-none' : ''
          }`}
          style={{
            backgroundImage: `
              linear-gradient(45deg, #0b1120 25%, transparent 25%), 
              linear-gradient(-45deg, #0b1120 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #0b1120 75%), 
              linear-gradient(-45deg, transparent 75%, #0b1120 75%)
            `,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
          }}
        >
          {imageSrc ? (
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${
                  flipH ? -1 : 1
                })`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                transformOrigin: 'center center',
              }}
              className="max-w-full max-h-full flex items-center justify-center pointer-events-none"
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt={fileName}
                onLoad={handleImageLoaded}
                draggable={false}
                style={{
                  imageRendering: isPixelated ? 'pixelated' : 'auto',
                }}
                className="max-w-[85vw] max-h-[70vh] object-contain rounded-sm shadow-2xl drop-shadow-2xl border border-white/5"
              />
            </div>
          ) : (
            /* Empty / Fallback State */
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-sky-400">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-1">No Image Loaded</h3>
              <p className="text-xs text-slate-400 mb-6">
                Open an image from RocketFS or select a sample image below to view.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                <button
                  onClick={() => setCurrentPath('/home/ryan/Pictures/rocket_nebula.png')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-medium text-sky-300">Rocket Nebula</div>
                  <div className="text-[10px] text-slate-400">Space artwork</div>
                </button>
                <button
                  onClick={() => setCurrentPath('/home/ryan/Pictures/blueprint_core.png')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-medium text-cyan-300">System Blueprint</div>
                  <div className="text-[10px] text-slate-400">Core schematic</div>
                </button>
                <button
                  onClick={() => setCurrentPath('/home/ryan/Pictures/liquid_aurora.png')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-medium text-emerald-300">Liquid Aurora</div>
                  <div className="text-[10px] text-slate-400">Fluid wave study</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Info Flyout */}
        {showInfo && (
          <div className="w-64 bg-slate-900/90 backdrop-blur-xl border-l border-white/10 p-4 flex flex-col gap-4 text-xs z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-400" />
                Image Information
              </span>
              <button
                onClick={() => setShowInfo(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-slate-300 font-mono text-[11px]">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Name</div>
                <div className="text-slate-100 font-medium truncate">{fileName}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Path</div>
                <div className="text-slate-300 break-all text-[10px]">{currentPath}</div>
                <button
                  onClick={handleCopyPath}
                  className="mt-1 flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy full path'}
                </button>
              </div>

              {imageDimensions && (
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Dimensions</div>
                  <div className="text-slate-100 font-medium">
                    {imageDimensions.width} × {imageDimensions.height} px
                  </div>
                </div>
              )}

              {fileSizeStr && (
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">File Size</div>
                  <div className="text-slate-100 font-medium">{fileSizeStr}</div>
                </div>
              )}

              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Format</div>
                <div className="text-slate-100 font-medium">{fileExt} Image</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Zoom Level</div>
                <div className="text-slate-100 font-medium">{Math.round(zoom * 100)}%</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Rotation</div>
                <div className="text-slate-100 font-medium">{rotation}° {flipH ? '(Flipped)' : ''}</div>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-white/10">
              <button
                onClick={handleResetZoom}
                className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-center font-sans text-xs transition-colors cursor-pointer text-slate-300"
              >
                Reset View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {showThumbnails && siblingImages.length > 0 && (
        <div className="h-20 bg-slate-900/90 backdrop-blur-md border-t border-white/10 px-3 py-2 flex items-center gap-2 overflow-x-auto z-20 shrink-0 scrollbar-thin">
          {siblingImages.map((item) => {
            const isSelected = item.canonicalPath === currentPath;
            return (
              <button
                key={item.canonicalPath}
                onClick={() => setCurrentPath(item.canonicalPath)}
                className={`relative h-14 w-18 rounded-lg overflow-hidden shrink-0 border transition-all cursor-pointer flex items-center justify-center bg-black/40 ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-400/30 scale-105'
                    : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                }`}
                title={item.name}
              >
                <div className="text-[9px] font-mono text-slate-300 text-center px-1 truncate w-full">
                  {item.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* File Browser Modal Dialog */}
      {openDialogVisible && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-2xl p-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-semibold text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-sky-400" />
                Select Image from RocketFS
              </span>
              <button
                onClick={() => setOpenDialogVisible(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-3 max-h-60 overflow-y-auto space-y-1">
              {siblingImages.map((item) => (
                <button
                  key={item.canonicalPath}
                  onClick={() => {
                    setCurrentPath(item.canonicalPath);
                    setOpenDialogVisible(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer text-xs"
                >
                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                  <div className="truncate flex-1">
                    <div className="font-medium text-slate-200 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{item.canonicalPath}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setOpenDialogVisible(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
