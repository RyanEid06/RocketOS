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
  Sparkles
} from 'lucide-react';

type Tool = 'brush' | 'eraser' | 'line' | 'rectangle' | 'circle';

export const PaintApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState<string>('#38bdf8');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [savedImage, setSavedImage] = useState<ImageData | null>(null);

  // History stack for Undo
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  const colors = [
    '#ffffff', '#000000', '#64748b', '#ef4444', '#f97316',
    '#f59e0b', '#10b981', '#06b6d4', '#38bdf8', '#6366f1',
    '#a855f7', '#ec4899', '#84cc16', '#e2e8f0'
  ];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background initially
    ctx.fillStyle = '#1e293b'; // dark slate background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial blank state
    const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [initial];
    historyIndexRef.current = 0;
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (newHistory.length > 20) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(true);
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

    // Cache current canvas for shape previews
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
      // Shape previewing
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

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `rocket_painting_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  return (
    <div id="paint-app" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Liquid Glass Paint Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md border-b border-white/10 gap-2 shrink-0">
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
          <span className="text-[10px] text-slate-400 font-mono">Size: {brushSize}px</span>
          <input
            type="range"
            min="1"
            max="32"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
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
                className={`w-4 h-4 rounded-md cursor-pointer transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
          {/* Custom Color Input */}
          <div className="relative pl-1 border-l border-white/10">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded-md cursor-pointer bg-transparent border-0"
              title="Custom Color"
            />
          </div>
        </div>

        {/* Actions: Undo, Clear, Save */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              canUndo
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10'
                : 'bg-slate-900 text-slate-600 border-transparent cursor-not-allowed'
            }`}
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-white/10 transition-all cursor-pointer"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shadow-lg shadow-sky-950 transition-all"
          >
            {savedNotification ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{savedNotification ? 'Saved PNG!' : 'Export Image'}</span>
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="flex-1 overflow-auto bg-slate-900/50 p-4 flex items-center justify-center">
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#1e293b]">
          <canvas
            ref={canvasRef}
            width={900}
            height={560}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair block touch-none"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-1.5 bg-slate-900 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <span>Canvas: 900 × 560 px</span>
          <span>•</span>
          <span className="capitalize">Active Tool: {tool}</span>
        </div>
        <div className="flex items-center gap-1 text-sky-400 font-mono">
          <Sparkles className="w-3 h-3" />
          <span>Hardware Accelerated 2D Canvas</span>
        </div>
      </div>
    </div>
  );
};
