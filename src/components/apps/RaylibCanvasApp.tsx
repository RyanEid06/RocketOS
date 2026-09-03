import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Sparkles, Rocket, Cpu, Eye, Code, Layers, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { RocketDiagnosticEngine } from '../../core/apps/RocketDiagnosticEngine';

export type GraphicsBuildState =
  | 'SOURCE_LOADED'
  | 'BUILD_REQUESTED'
  | 'COMPILER_AVAILABLE'
  | 'BUILD_SUCCEEDED'
  | 'RUNTIME_ACTIVE';

type DemoMode = 'rocket-flight' | 'particle-vortex' | 'boids-swarm' | 'custom-script';

interface RaylibCanvasAppProps {
  initialFilePath?: string;
}

export const RaylibCanvasApp: React.FC<RaylibCanvasAppProps> = ({ initialFilePath }) => {
  const [activeMode, setActiveMode] = useState<DemoMode>(initialFilePath ? 'custom-script' : 'rocket-flight');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const [buildState, setBuildState] = useState<GraphicsBuildState>('RUNTIME_ACTIVE');
  const [buildLogs, setBuildLogs] = useState<string[]>(['[kernel] raylib 6.0 context initialized', '[runtime] swapchain buffer ready']);
  const [currentFilePath, setCurrentFilePath] = useState<string>(initialFilePath || '/usr/share/rocket/examples/graphics.rocket');

  // Script editor state for 'custom-script' with canonical Rocket 2.1 syntax
  const [scriptCode, setScriptCode] = useState<string>(() => {
    if (initialFilePath) {
      const readRes = RocketFS.getInstance().readFile(initialFilePath);
      if (readRes.success && readRes.data) return readRes.data;
    }
    return `# Rocket Raylib 2D Graphics Demo (Rocket 2.1 ABI v1)
import rocket.raylib
import rocket.motion
import std.string

struct Particle:
    x: Float
    y: Float
    vx: Float
    vy: Float

fn main() -> Int:
    raylib.init_window(640, 360, "Rocket Bare-Metal Graphics")
    raylib.set_target_fps(60)

    let mouse_x = raylib.get_mouse_x()
    let mouse_y = raylib.get_mouse_y()

    while not raylib.window_should_close():
        raylib.begin_drawing()
        raylib.clear_background(raylib.COLOR_RAYWHITE)
        raylib.draw_circle(mouse_x, mouse_y, 24, raylib.COLOR_SKYBLUE)
        raylib.draw_text("Rocket 2.1 Raylib Engine Active", 20, 20, 18, raylib.COLOR_DARKBLUE)
        raylib.end_drawing()
    return 0
`;
  });

  const handleBuildAndRun = () => {
    setBuildState('BUILD_REQUESTED');
    setBuildLogs((prev) => [...prev, `[build] rocketc --target x86_64-pc-windows-msvc -O3 ${currentFilePath}`]);

    setTimeout(() => {
      setBuildState('COMPILER_AVAILABLE');
      setBuildLogs((prev) => [...prev, '[llvm] LLVM 22.1.6 code generation in progress...']);

      setTimeout(() => {
        const summary = RocketDiagnosticEngine.analyze(scriptCode);
        const hasErrors = summary.errorCount > 0;
        if (hasErrors) {
          setBuildState('SOURCE_LOADED');
          setBuildLogs((prev) => [...prev, `[error] Compilation halted with ${summary.errorCount} diagnostic error(s)`]);
          return;
        }

        setBuildState('BUILD_SUCCEEDED');
        setBuildLogs((prev) => [...prev, '[linker] Linking with raylib.lib, kernel32.lib -> graphics.exe']);

        setTimeout(() => {
          setBuildState('RUNTIME_ACTIVE');
          setIsRunning(true);
          setBuildLogs((prev) => [...prev, '[process] Spawning PID graphics (WS 1) -> active render loop']);
        }, 300);
      }, 400);
    }, 300);
  };

  const handleSaveToRocketFS = () => {
    const fs = RocketFS.getInstance();
    const savePath = currentFilePath.startsWith('/usr') ? '/home/ryan/Documents/raylib_demo.rocket' : currentFilePath;
    fs.writeFile(savePath, scriptCode);
    setCurrentFilePath(savePath);
    setBuildLogs((prev) => [...prev, `[vfs] Saved script to ${savePath}`]);
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // State for rocket simulation
  const rocketSimRef = useRef({
    x: 320,
    y: 260,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    thrust: false,
    fuel: 100,
    trail: [] as { x: number; y: number; alpha: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
  });

  // Mouse coords for canvas
  const mouseRef = useRef({ x: 320, y: 180, isDown: false });

  // Handle keyboard inputs for rocket flight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeMode !== 'rocket-flight') return;
      if (e.key === 'ArrowUp' || e.key === 'w') rocketSimRef.current.thrust = true;
      if (e.key === 'ArrowLeft' || e.key === 'a') rocketSimRef.current.angle -= 0.08;
      if (e.key === 'ArrowRight' || e.key === 'd') rocketSimRef.current.angle += 0.08;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (activeMode !== 'rocket-flight') return;
      if (e.key === 'ArrowUp' || e.key === 'w') rocketSimRef.current.thrust = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeMode]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = 0;

    // Boids initialization
    const boids: { x: number; y: number; vx: number; vy: number }[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
    }));

    // Vortex particles initialization
    const vortexParticles: { x: number; y: number; angle: number; radius: number; speed: number; hue: number }[] =
      Array.from({ length: 180 }, () => ({
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: Math.random() * Math.PI * 2,
        radius: 30 + Math.random() * 140,
        speed: 0.02 + Math.random() * 0.03,
        hue: 180 + Math.random() * 80,
      }));

    const render = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // FPS calculation
      frameCounter++;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        setFps(Math.round(frameCounter / fpsTimer));
        frameCounter = 0;
        fpsTimer = 0;
      }

      if (isRunning) {
        // Clear canvas
        ctx.fillStyle = '#050a14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Raylib Grid Guide
        ctx.strokeStyle = '#0e1e38';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Mode 1: Orbital Rocket Flight
        if (activeMode === 'rocket-flight') {
          const sim = rocketSimRef.current;

          // Physics update
          if (sim.thrust && sim.fuel > 0) {
            sim.vx += Math.cos(sim.angle) * 0.18;
            sim.vy += Math.sin(sim.angle) * 0.18;
            sim.fuel = Math.max(0, sim.fuel - 0.1);

            // Spawn exhaust fire
            for (let i = 0; i < 3; i++) {
              sim.particles.push({
                x: sim.x - Math.cos(sim.angle) * 16 + (Math.random() - 0.5) * 4,
                y: sim.y - Math.sin(sim.angle) * 16 + (Math.random() - 0.5) * 4,
                vx: -Math.cos(sim.angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2,
                vy: -Math.sin(sim.angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2,
                life: 1.0,
                color: Math.random() > 0.4 ? '#f97316' : '#38bdf8',
              });
            }
          }

          // Gravity towards central planetoid
          const planetX = canvas.width / 2;
          const planetY = canvas.height / 2;
          const dx = planetX - sim.x;
          const dy = planetY - sim.y;
          const dist = Math.max(40, Math.sqrt(dx * dx + dy * dy));
          const gravityForce = 120 / (dist * dist);
          sim.vx += (dx / dist) * gravityForce;
          sim.vy += (dy / dist) * gravityForce;

          // Air resistance
          sim.vx *= 0.992;
          sim.vy *= 0.992;
          sim.x += sim.vx;
          sim.y += sim.vy;

          // Wrap edges
          if (sim.x < 0) sim.x = canvas.width;
          if (sim.x > canvas.width) sim.x = 0;
          if (sim.y < 0) sim.y = canvas.height;
          if (sim.y > canvas.height) sim.y = 0;

          // Record trail
          sim.trail.push({ x: sim.x, y: sim.y, alpha: 1.0 });
          if (sim.trail.length > 50) sim.trail.shift();

          // Draw Central Celestial Body
          const grad = ctx.createRadialGradient(planetX, planetY, 10, planetX, planetY, 35);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.7, '#0284c7');
          grad.addColorStop(1, '#0369a1');
          ctx.beginPath();
          ctx.arc(planetX, planetY, 28, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 20;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Atmosphere ring
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(planetX, planetY, 44, 0, Math.PI * 2);
          ctx.stroke();

          // Draw Flight Path Trail
          ctx.lineWidth = 2;
          for (let i = 1; i < sim.trail.length; i++) {
            const p1 = sim.trail[i - 1];
            const p2 = sim.trail[i];
            ctx.strokeStyle = `rgba(56, 189, 248, ${(i / sim.trail.length) * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }

          // Draw Particles
          for (let i = sim.particles.length - 1; i >= 0; i--) {
            const p = sim.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.035;
            if (p.life <= 0) {
              sim.particles.splice(i, 1);
            } else {
              ctx.fillStyle = p.color;
              ctx.globalAlpha = p.life;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1.0;
            }
          }

          // Draw Rocket Ship
          ctx.save();
          ctx.translate(sim.x, sim.y);
          ctx.rotate(sim.angle);

          // Ship body
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(-12, -8);
          ctx.lineTo(-8, 0);
          ctx.lineTo(-12, 8);
          ctx.closePath();
          ctx.fill();

          // Cockpit glass
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(2, 0, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // Mode 2: Particle Vortex Attractor
        else if (activeMode === 'particle-vortex') {
          const targetX = mouseRef.current.x;
          const targetY = mouseRef.current.y;

          vortexParticles.forEach((p) => {
            p.angle += p.speed;
            const px = targetX + Math.cos(p.angle) * p.radius;
            const py = targetY + Math.sin(p.angle) * p.radius;

            ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
            ctx.shadowColor = `hsl(${p.hue}, 90%, 65%)`;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.shadowBlur = 0;

          // Center vortex glow
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Mode 3: Flocking Boids
        else if (activeMode === 'boids-swarm') {
          boids.forEach((b) => {
            // Mouse attraction
            const mdx = mouseRef.current.x - b.x;
            const mdy = mouseRef.current.y - b.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 200) {
              b.vx += (mdx / mdist) * 0.15;
              b.vy += (mdy / mdist) * 0.15;
            }

            // Speed limit
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (speed > 4) {
              b.vx = (b.vx / speed) * 4;
              b.vy = (b.vy / speed) * 4;
            }

            b.x += b.vx;
            b.y += b.vy;

            if (b.x < 0) b.x = canvas.width;
            if (b.x > canvas.width) b.x = 0;
            if (b.y < 0) b.y = canvas.height;
            if (b.y > canvas.height) b.y = 0;

            const angle = Math.atan2(b.vy, b.vx);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(angle);
            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-6, 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          });
        }

        // Mode 4: Custom Script Visualizer
        else if (activeMode === 'custom-script') {
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;

          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(mx, my, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('Raylib 6.0 Hardware Canvas', 24, 40);

          ctx.font = '12px monospace';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`Mouse: (${Math.round(mx)}, ${Math.round(my)})`, 24, 65);
          ctx.fillText('Target FPS: 60 • Backend: HTML5 / WebGL Canvas', 24, 85);
        }

        // Watermark in bottom corner
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#334155';
        ctx.fillText('ROCKET 3.0 RAYLIB DRIVER • BUFFER 640x360', 16, canvas.height - 12);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeMode, isRunning]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseRef.current.x = (e.clientX - rect.x) * scaleX;
    mouseRef.current.y = (e.clientY - rect.y) * scaleY;
  };

  const handleResetSim = () => {
    rocketSimRef.current = {
      x: 320,
      y: 260,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      thrust: false,
      fuel: 100,
      trail: [],
      particles: [],
    };
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 select-none overflow-hidden font-sans">
      {/* Top Header & Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <span>Rocket Raylib 2D Engine</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-950 text-sky-300 border border-sky-800">
                v3.0.4
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Hardware graphics primitives & orbital simulation
            </div>
          </div>
        </div>

        {/* Action Controls & Build Pipeline States */}
        <div className="flex items-center gap-3">
          {/* Explicit Build/Run States Indicator */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 text-[10px] font-mono">
            <span className={buildState === 'SOURCE_LOADED' ? 'text-sky-400 font-bold' : 'text-slate-500'}>
              Source
            </span>
            <span className="text-slate-600">→</span>
            <span className={buildState === 'BUILD_REQUESTED' ? 'text-amber-400 font-bold' : 'text-slate-500'}>
              Build
            </span>
            <span className="text-slate-600">→</span>
            <span className={buildState === 'COMPILER_AVAILABLE' ? 'text-purple-400 font-bold' : 'text-slate-500'}>
              LLVM
            </span>
            <span className="text-slate-600">→</span>
            <span className={buildState === 'BUILD_SUCCEEDED' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              Binary
            </span>
            <span className="text-slate-600">→</span>
            <span className={buildState === 'RUNTIME_ACTIVE' ? 'text-emerald-300 font-bold flex items-center gap-1' : 'text-slate-500'}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Active
            </span>
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={handleResetSim}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Telemetry Badge */}
          <div className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-sky-400 flex items-center gap-2">
            <span>{fps} FPS</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">640x360</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Demo Modes */}
        <div className="w-full md:w-56 bg-slate-900/60 border-r border-white/10 p-3 flex flex-col gap-2 shrink-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
            Raylib Shaders & Modes
          </div>

          <button
            onClick={() => setActiveMode('rocket-flight')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
              activeMode === 'rocket-flight'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                : 'hover:bg-white/5 text-slate-300'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <div>
              <div>Orbital Flight</div>
              <div className="text-[9px] opacity-75 font-normal">Gravity & Thrust</div>
            </div>
          </button>

          <button
            onClick={() => setActiveMode('particle-vortex')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
              activeMode === 'particle-vortex'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                : 'hover:bg-white/5 text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <div>
              <div>Particle Vortex</div>
              <div className="text-[9px] opacity-75 font-normal">180 Swirl Inodes</div>
            </div>
          </button>

          <button
            onClick={() => setActiveMode('boids-swarm')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
              activeMode === 'boids-swarm'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                : 'hover:bg-white/5 text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <div>
              <div>Boids Flocking</div>
              <div className="text-[9px] opacity-75 font-normal">Swarm AI Vector</div>
            </div>
          </button>

          <button
            onClick={() => setActiveMode('custom-script')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
              activeMode === 'custom-script'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                : 'hover:bg-white/5 text-slate-300'
            }`}
          >
            <Code className="w-4 h-4" />
            <div>
              <div>Rocket Script</div>
              <div className="text-[9px] opacity-75 font-normal">Live raylib API</div>
            </div>
          </button>

          {/* Controls hint */}
          <div className="mt-auto p-2.5 rounded-xl bg-slate-950/80 border border-white/5 text-[10px] space-y-1 text-slate-400">
            <div className="font-bold text-sky-400 uppercase tracking-wide">Flight Controls</div>
            <div>• <kbd className="px-1 py-0.5 rounded bg-slate-800 text-white">Up</kbd> / <kbd className="px-1 py-0.5 rounded bg-slate-800 text-white">W</kbd>: Thrust</div>
            <div>• <kbd className="px-1 py-0.5 rounded bg-slate-800 text-white">Left</kbd>/<kbd className="px-1 py-0.5 rounded bg-slate-800 text-white">Right</kbd>: Steer</div>
            <div>• Mouse: Attractor target</div>
          </div>
        </div>

        {/* Custom Script Editor Pane (when active) */}
        {activeMode === 'custom-script' && (
          <div className="w-80 lg:w-96 bg-slate-950 border-r border-white/10 flex flex-col shrink-0">
            <div className="px-3 py-2 bg-slate-900/80 border-b border-white/10 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-sky-300 truncate max-w-[180px]">{currentFilePath}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveToRocketFS}
                  className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Save to RocketFS"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleBuildAndRun}
                  className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                >
                  Build & Run
                </button>
              </div>
            </div>
            <textarea
              value={scriptCode}
              onChange={(e) => setScriptCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-3 bg-slate-950 text-sky-200 font-mono text-xs resize-none focus:outline-none leading-relaxed select-text"
            />
            {/* Build Log Terminal Output */}
            <div className="h-28 bg-black/90 border-t border-white/10 p-2 overflow-y-auto font-mono text-[10px] space-y-0.5 text-slate-400 select-text">
              <div className="text-slate-500 font-bold uppercase text-[9px]">rocketc Build Terminal:</div>
              {buildLogs.map((log, idx) => (
                <div key={idx} className={log.includes('[error]') ? 'text-rose-400 font-bold' : log.includes('[process]') ? 'text-emerald-400' : 'text-slate-300'}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas Display Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black/40 overflow-hidden">
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl shadow-sky-950/50 bg-[#050a14]">
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onMouseMove={handleMouseMove}
              className="max-w-full h-auto cursor-crosshair block"
            />
          </div>

          {/* Under-canvas stats bar */}
          <div className="mt-3 flex items-center justify-between w-full max-w-[640px] px-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Direct Framebuffer Sync
            </span>
            <span>Driver: OpenGL / Raylib 6.0 Core</span>
          </div>
        </div>
      </div>
    </div>
  );
};
