import React, { useState } from 'react';
import {
  Package,
  Search,
  Download,
  CheckCircle2,
  Star,
  ShieldCheck,
  Tag,
  RefreshCw,
  ExternalLink,
  Trash2,
  Sparkles,
  Layers,
  Code2,
  Terminal,
  Cpu,
  Sliders,
  Filter,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { notificationService } from '../../core/notifications/NotificationService';
import { AppId } from '../../types';

export interface SoftwarePackage {
  id: string;
  name: string;
  category: 'developer' | 'system' | 'media' | 'utility';
  version: string;
  size: string;
  author: string;
  rating: number;
  downloads: string;
  description: string;
  iconBg: string;
  iconGlyph: string;
  isInstalled: boolean;
  features: string[];
  associatedAppId?: AppId;
}

const INITIAL_PACKAGES: SoftwarePackage[] = [
  {
    id: 'pkg-rocket-studio',
    name: 'Rocket Studio IDE',
    category: 'developer',
    version: '2.1.4',
    size: '18.4 MB',
    author: 'Rocket Core Team',
    rating: 4.9,
    downloads: '142k',
    description: 'Comprehensive IDE with LLVM 22.1.6 compiler backend, AST inspector, and memory graph visualizer.',
    iconBg: '#0284c7',
    iconGlyph: '🚀',
    isInstalled: true,
    associatedAppId: 'rocket-studio',
    features: ['Syntax highlighting & indent checks', 'Native binary compilation', 'Integrated debugger & REPL'],
  },
  {
    id: 'pkg-raylib-2d',
    name: 'Raylib 2D Graphics Engine',
    category: 'media',
    version: '5.0.1',
    size: '8.2 MB',
    author: 'Ramon Santamaria / Rocket Port',
    rating: 4.8,
    downloads: '89k',
    description: 'Hardware accelerated 2D graphics primitive library with bezier curves, textures, and canvas drawing.',
    iconBg: '#10b981',
    iconGlyph: '🎨',
    isInstalled: true,
    associatedAppId: 'graphics',
    features: ['Double buffering', 'Bezier math engine', 'Native window swapchain'],
  },
  {
    id: 'pkg-sqlite-studio',
    name: 'Rocket Database Studio',
    category: 'developer',
    version: '1.4.0',
    size: '4.7 MB',
    author: 'Database WG',
    rating: 4.7,
    downloads: '64k',
    description: 'Visual relational database manager with query optimizer, SQL console, and schema migration visualizer.',
    iconBg: '#8b5cf6',
    iconGlyph: '🗄️',
    isInstalled: true,
    associatedAppId: 'db-studio',
    features: ['Instant SQL queries', 'Schema inspection', 'Data table export'],
  },
  {
    id: 'pkg-audio-synth',
    name: 'Ambient Focus Synthesizer',
    category: 'media',
    version: '2.0.0',
    size: '3.1 MB',
    author: 'Acoustics Lab',
    rating: 4.9,
    downloads: '112k',
    description: 'Procedural sound synthesis engine generating white noise, rain loops, and binaural alpha waves.',
    iconBg: '#f59e0b',
    iconGlyph: '🎵',
    isInstalled: true,
    associatedAppId: 'synth',
    features: ['WebAudio oscillator graph', 'Zero CPU overhead', 'Multi-layer mixer'],
  },
  {
    id: 'pkg-network-firewall',
    name: 'RocketOS Guard Firewall',
    category: 'system',
    version: '2.1.0',
    size: '2.9 MB',
    author: 'Security WG',
    rating: 4.9,
    downloads: '95k',
    description: 'Kernel-level socket filter, port monitor, and network packet telemetry inspector.',
    iconBg: '#ef4444',
    iconGlyph: '🛡️',
    isInstalled: false,
    associatedAppId: 'firewall',
    features: ['Port blocking rules', 'Live socket inspector', 'DDoS protection heuristics'],
  },
  {
    id: 'pkg-sound-recorder',
    name: 'Voice Memo & Audio Studio',
    category: 'media',
    version: '1.3.2',
    size: '3.8 MB',
    author: 'Rocket Core Team',
    rating: 4.6,
    downloads: '41k',
    description: 'Studio grade microphone recorder with waveform visualizer and direct export to RocketFS.',
    iconBg: '#ec4899',
    iconGlyph: '🎙️',
    isInstalled: false,
    associatedAppId: 'recorder',
    features: ['Live oscilloscope', 'WAV/OGG encoder', 'File system sync'],
  },
  {
    id: 'pkg-system-benchmark',
    name: 'Rocket Benchmark Suite',
    category: 'system',
    version: '2.1.0',
    size: '5.2 MB',
    author: 'Ryan Eid',
    rating: 4.8,
    downloads: '53k',
    description: 'Measure ARC promotion throughput, LLVM vectorization cycles, and VFS file operations.',
    iconBg: '#06b6d4',
    iconGlyph: '⚡',
    isInstalled: false,
    associatedAppId: 'benchmark',
    features: ['CPU & Memory benchmarks', 'VFS IOPS test', 'Hardware score export'],
  },
  {
    id: 'pkg-git-client',
    name: 'Rocket Git Workstation',
    category: 'developer',
    version: '2.40.1',
    size: '9.5 MB',
    author: 'Version Control Guild',
    rating: 4.7,
    downloads: '78k',
    description: 'Visual Git commit graph, diff inspector, branch management, and remote sync.',
    iconBg: '#f97316',
    iconGlyph: '🌿',
    isInstalled: true,
    associatedAppId: 'git',
    features: ['Visual commit tree', 'Three-way merge tool', 'Stash & Rebase'],
  },
];

interface SoftwareCenterAppProps {
  onOpenApp?: (appId: AppId) => void;
}

export const SoftwareCenterApp: React.FC<SoftwareCenterAppProps> = ({ onOpenApp }) => {
  const [packages, setPackages] = useState<SoftwarePackage[]>(INITIAL_PACKAGES);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pkg-rocket-studio');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || packages[0];

  const filteredPackages = packages.filter((pkg) => {
    if (categoryFilter !== 'all' && pkg.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pkg.name.toLowerCase().includes(q) ||
      pkg.description.toLowerCase().includes(q) ||
      pkg.author.toLowerCase().includes(q)
    );
  });

  const handleInstallToggle = (pkg: SoftwarePackage) => {
    setInstallingId(pkg.id);
    soundEngine.play('click');

    setTimeout(() => {
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, isInstalled: !p.isInstalled } : p))
      );
      setInstallingId(null);
      soundEngine.play('success');

      notificationService.notify({
        title: pkg.isInstalled ? 'Package Uninstalled' : 'Package Installed',
        message: `${pkg.name} ${pkg.isInstalled ? 'was removed from' : 'is now available on'} RocketOS.`,
        type: 'info',
        appId: 'software-center',
      });
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Software Center
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                rockpm GUI
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Curated applications & native libraries</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search software packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              notificationService.notify({
                title: 'Software Repositories',
                message: 'All package mirrors verified up to date.',
                type: 'info',
                appId: 'software-center',
              });
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Update Repositories"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Filters */}
        <div className="w-56 border-r border-white/10 bg-slate-900/40 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1 flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              <span>Categories</span>
            </div>
            {[
              { id: 'all', label: 'All Packages', icon: Layers },
              { id: 'developer', label: 'Development', icon: Code2 },
              { id: 'system', label: 'System & Tools', icon: Cpu },
              { id: 'media', label: 'Graphics & Audio', icon: Sparkles },
              { id: 'utility', label: 'Utilities', icon: Sliders },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    soundEngine.play('click');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] opacity-60">
                    {cat.id === 'all'
                      ? packages.length
                      : packages.filter((p) => p.category === cat.id).length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Repositories</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Every package is cryptographically signed and tested against Rocket 2.1 ABI v1.
            </p>
          </div>
        </div>

        {/* Center Grid of Packages */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPackages.map((pkg) => {
              const isSelected = selectedPkgId === pkg.id;
              const isBusy = installingId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-purple-600/10 border-purple-400/70 shadow-lg shadow-purple-500/5'
                      : 'bg-slate-900/50 border-white/5 hover:bg-slate-800/50 hover:border-white/15'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0"
                        style={{ backgroundColor: pkg.iconBg }}
                      >
                        {pkg.iconGlyph}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                          v{pkg.version}
                        </span>
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold justify-end mt-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{pkg.rating}</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                      {pkg.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {pkg.size} • {pkg.downloads} dl
                    </span>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstallToggle(pkg);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                        pkg.isInstalled
                          ? 'bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/5'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                      }`}
                    >
                      {isBusy ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : pkg.isInstalled ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Installed</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Install</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane */}
        {selectedPkg && (
          <div className="w-80 border-l border-white/10 bg-slate-900/60 p-5 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0"
                  style={{ backgroundColor: selectedPkg.iconBg }}
                >
                  {selectedPkg.iconGlyph}
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">{selectedPkg.name}</h2>
                  <span className="text-xs text-slate-400">By {selectedPkg.author}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Version</span>
                  <span className="font-mono text-white font-semibold">
                    v{selectedPkg.version}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Package Size</span>
                  <span className="font-mono text-white font-semibold">{selectedPkg.size}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Total Downloads</span>
                  <span className="font-mono text-white font-semibold">
                    {selectedPkg.downloads}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Community Rating</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {selectedPkg.rating} / 5.0
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  {selectedPkg.description}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Key Capabilities
                </span>
                <div className="space-y-1.5">
                  {selectedPkg.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                type="button"
                disabled={installingId === selectedPkg.id}
                onClick={() => handleInstallToggle(selectedPkg)}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                  selectedPkg.isInstalled
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {installingId === selectedPkg.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : selectedPkg.isInstalled ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Uninstall Application</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Install to RocketOS</span>
                  </>
                )}
              </button>

              {selectedPkg.isInstalled && selectedPkg.associatedAppId && onOpenApp && (
                <button
                  type="button"
                  onClick={() => onOpenApp(selectedPkg.associatedAppId!)}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Application</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
