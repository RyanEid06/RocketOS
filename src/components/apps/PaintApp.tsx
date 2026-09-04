import React, { useRef, useState, useEffect } from 'react';
import {
  Paintbrush,
  Eraser,
  Square,
  Circle,
  Minus,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Check,
  Palette,
  Sparkles,
  Save,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Upload,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { CrashRecoveryService } from '../../core/recovery/CrashRecoveryService';
import { AppSecurityManager } from '../../core/apps/AppSecurityManager';
import { binaryBlobStore } from '../../platform/browser/BinaryBlobStore';

type Tool = 'brush' | 'eraser' | 'line' | 'rectangle' | 'circle';

interface CanvasSize {
  name: string;
  width: number;
  height: number;
}

interface PaintAppProps {
  initialFilePath?: string;
}

export const PaintApp: React.FC<PaintAppProps> = ({ initialFilePath }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState<string>('#38bdf8');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [savedImage, setSavedImage] = useState<ImageData | null>(null);

  // Undo & Redo stacks
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Document metadata & dirty state
  const [documentTitle, setDocumentTitle] = useState<string>('untitled_artwork');
  const [filePath, setFilePath] = useState<string>('/home/ryan/Pictures/artwork.rpaint');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Zoom & Dimensions
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 900,
    height: 560,
  });
  const [showResizeMenu, setShowResizeMenu] = useState<boolean>(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [saveAsInput, setSaveAsInput] = useState<string>('/home/ryan/Pictures/artwork.rpaint');

  const presets: CanvasSize[] = [
    { name: 'VGA Retro (640×480)', width: 640, height: 480 },
    { name: 'HD Compact (800×600)', width: 800, height: 600 },
    { name: 'Default Widescreen (900×560)', width: 900, height: 560 },
    { name: '720p HD (1280×720)', width: 1280, height: 720 },
    { name: 'Square Icon (512×512)', width: 512, height: 512 },
  ];

  const colors = [
    '#ffffff', '#000000', '#64748b', '#ef4444', '#f97316',
    '#f59e0b', '#10b981', '#06b6d4', '#38bdf8', '#6366f1',
    '#a855f7', '#ec4899', '#84cc16', '#e2e8f0',
  ];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill slate background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [initial];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, [canvasDimensions]);

  // Load from initialFilePath if passed
  useEffect(() => {
    if (initialFilePath) {
      try {
        const rfs = RocketFS.getInstance();
        const readRes = rfs.readFile(initialFilePath);
        if (readRes.success && readRes.data) {
          const content = readRes.data;
          if (initialFilePath.endsWith('.rpaint') && content.startsWith('{')) {
            const parsed = JSON.parse(content);
            if (parsed.width && parsed.height) {
              setCanvasDimensions({ width: parsed.width, height: parsed.height });
            }
            if (parsed.title) setDocumentTitle(parsed.title);
            setFilePath(initialFilePath);
            if (parsed.imageDataUrl) {
              const img = new Image();
              img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0);
                saveState();
                setIsDirty(false);
              };
              img.src = parsed.imageDataUrl;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load painting from RocketFS:', err);
      }
    }
  }, [initialFilePath]);

  // Autosave dirty draft to CrashRecoveryService
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const rpaintPayload = JSON.stringify({
        format: 'rocket-paint-v1',
        title: documentTitle,
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        imageDataUrl: dataUrl,
      });
      CrashRecoveryService.getInstance().recordDraftSnapshot(
        'paint',
        'rpaint',
        filePath,
        rpaintPayload
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [isDirty, documentTitle, filePath, canvasDimensions]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (newHistory.length > 25) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    setIsDirty(true);
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyIndexRef.current -= 1;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyIndexRef.current += 1;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    setIsDirty(true);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setSavedImage(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = tool === 'eraser' ? '#1e293b' : color;
      ctx.lineWidth = brushSize;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (savedImage) {
      ctx.putImageData(savedImage, 0, 0);
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;
      ctx.beginPath();

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (tool === 'rectangle') {
        const w = coords.x - startPos.x;
        const h = coords.y - startPos.y;
        ctx.strokeRect(startPos.x, startPos.y, w, h);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2)
        );
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setSavedImage(null);
    saveState();
  };

  // Save to RocketFS as .rpaint
  const handleSaveToRocketFS = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const secResult = AppSecurityManager.getInstance().validateFilesystem('paint', filePath, true);
    if (secResult.type !== 'GRANTED') {
      setNotification(`Access Denied: ${secResult.type}`);
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const rpaintPayload = JSON.stringify({
        format: 'rocket-paint-v1',
        title: documentTitle,
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        imageDataUrl: dataUrl,
      });

      RocketFS.getInstance().writeFile(filePath, rpaintPayload);
      binaryBlobStore.saveBlob(`paint-${filePath}`, filePath.split('/').pop() || 'drawing.png', 'image/png', dataUrl);
      CrashRecoveryService.getInstance().clearDraftSnapshot('paint', filePath);
      setIsDirty(false);
      setNotification('Saved to RocketFS!');
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      setNotification('Save failed: ' + String(err));
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Save As to RocketFS
  const handleSaveAsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !saveAsInput.trim()) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const rpaintPayload = JSON.stringify({
        format: 'rocket-paint-v1',
        title: documentTitle,
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        imageDataUrl: dataUrl,
      });

      RocketFS.getInstance().writeFile(saveAsInput.trim(), rpaintPayload);
      setFilePath(saveAsInput.trim());
      setIsDirty(false);
      setShowSaveAsModal(false);
      setNotification('Saved As: ' + saveAsInput.trim().split('/').pop());
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      setNotification('Save As failed: ' + String(err));
    }
  };

  // Browser External Download
  const handleBrowserDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${documentTitle}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setNotification('PNG Exported!');
    setTimeout(() => setNotification(null), 2500);
  };

  // Image Import from Disk / File
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveState();
        setNotification('Image Imported!');
        setTimeout(() => setNotification(null), 2000);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div id="paint-app" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Liquid Glass Paint Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md border-b border-white/10 gap-2 shrink-0">
        {/* Document Title & File Operations */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => {
              setDocumentTitle(e.target.value);
              setIsDirty(true);
            }}
            className="font-bold text-xs bg-transparent border-b border-transparent focus:border-sky-400 outline-none text-white w-28 truncate"
          />
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
          )}

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={handleSaveToRocketFS}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shadow-sm transition-all"
              title="Save to RocketFS"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              onClick={() => {
                setSaveAsInput(filePath);
                setShowSaveAsModal(true);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer border border-white/5"
              title="Save As..."
            >
              As...
            </button>
          </div>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setTool('brush')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'brush' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Paint Brush"
          >
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'eraser' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'line' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Line Tool"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'rectangle' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'circle' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
        </div>

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
          <span className="text-[10px] text-slate-400 font-mono">{brushSize}px</span>
          <input
            type="range"
            min="1"
            max="32"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-16 accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Colors Palette */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/10">
          <div className="grid grid-flow-col grid-rows-2 gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-3.5 h-3.5 rounded cursor-pointer transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 ml-1"
            title="Custom Palette"
          />
        </div>

        {/* History: Undo & Redo */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-all ${
              canUndo ? 'text-slate-200 hover:bg-white/10 cursor-pointer' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-all ${
              canRedo ? 'text-slate-200 hover:bg-white/10 cursor-pointer' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-all cursor-pointer"
            title="Clear Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & Canvas Options */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="text-slate-400 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[10px] text-slate-300 w-8 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
              className="text-slate-400 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Import Image */}
          <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer border border-white/10 transition-all" title="Import Image onto Canvas">
            <Upload className="w-3.5 h-3.5" />
            <span className="text-[11px]">Import</span>
            <input type="file" accept="image/*" onChange={handleImageImport} className="hidden" />
          </label>

          {/* Export PNG */}
          <button
            onClick={handleBrowserDownload}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shadow-md transition-all text-[11px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      {/* Canvas Workspace Area */}
      <div className="flex-1 overflow-auto bg-slate-900/60 p-6 flex items-center justify-center relative">
        <div
          className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#1e293b] transition-transform origin-center"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair block touch-none"
          />
        </div>

        {/* Status Notification Toast */}
        {notification && (
          <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs animate-bounce z-20">
            <Check className="w-3.5 h-3.5" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Footer Info & Presets */}
      <div className="px-4 py-1.5 bg-slate-900 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span>{canvasDimensions.width} × {canvasDimensions.height} px</span>
          <span>•</span>
          <div className="relative">
            <button
              onClick={() => setShowResizeMenu(!showResizeMenu)}
              className="text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Canvas Presets</span>
            </button>

            {showResizeMenu && (
              <div className="absolute bottom-6 left-0 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl w-56 space-y-1 z-30">
                <div className="font-bold text-[10px] text-slate-400 px-2 py-1 uppercase">Select Resolution</div>
                {presets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setCanvasDimensions({ width: p.width, height: p.height });
                      setShowResizeMenu(false);
                      setIsDirty(true);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 text-xs flex justify-between"
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span>•</span>
          <span className="font-mono text-slate-500 truncate max-w-xs">{filePath}</span>
        </div>

        <div className="flex items-center gap-1 text-sky-400 font-mono">
          <Sparkles className="w-3 h-3" />
          <span>RocketOS 2D Graphics Canvas</span>
        </div>
      </div>

      {/* Save As Modal */}
      {showSaveAsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">Save Painting to RocketFS</h3>
            <p className="text-slate-400 text-xs">Enter path (.rpaint working document):</p>
            <form onSubmit={handleSaveAsSubmit} className="space-y-4">
              <input
                type="text"
                value={saveAsInput}
                onChange={(e) => setSaveAsInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-400 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveAsModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
