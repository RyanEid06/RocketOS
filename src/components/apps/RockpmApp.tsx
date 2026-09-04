import React, { useState } from 'react';
import {
  Package,
  Search,
  Download,
  Check,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Star,
  Layers,
  Sparkles,
  Cpu,
  Globe,
  Terminal,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface RocketPackage {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'Graphics' | 'Networking' | 'System' | 'Data' | 'UI';
  author: string;
  downloads: string;
  stars: number;
  isInstalled: boolean;
  size: string;
}

const INITIAL_PACKAGES: RocketPackage[] = [
  {
    id: 'rocket-raylib',
    name: 'rocket.raylib',
    version: '6.0.2',
    description: 'Hardware-accelerated 2D/3D graphics engine bindings for Rocket 2.1.',
    category: 'Graphics',
    author: 'RyanEid06',
    downloads: '14.2k',
    stars: 382,
    isInstalled: true,
    size: '1.8 MB',
  },
  {
    id: 'rocket-motion',
    name: 'rocket.motion',
    version: '2.1.0',
    description: 'Physics-based spring animation curves and smooth UI interpolation.',
    category: 'UI',
    author: 'Rocket Team',
    downloads: '9.8k',
    stars: 241,
    isInstalled: true,
    size: '420 KB',
  },
  {
    id: 'rocket-http',
    name: 'rocket.http',
    version: '1.4.1',
    description: 'Async non-blocking HTTP/1.1 and HTTP/2 client with connection pooling.',
    category: 'Networking',
    author: 'Rocket Community',
    downloads: '18.5k',
    stars: 512,
    isInstalled: false,
    size: '860 KB',
  },
  {
    id: 'rocket-json',
    name: 'rocket.json',
    version: '2.0.0',
    description: 'SIMD-accelerated zero-copy JSON parser and serializer.',
    category: 'Data',
    author: 'core-team',
    downloads: '22.1k',
    stars: 640,
    isInstalled: true,
    size: '290 KB',
  },
  {
    id: 'rocket-sqlite',
    name: 'rocket.sqlite',
    version: '3.42.0',
    description: 'Embedded transactional database engine with thread-confined handles.',
    category: 'Data',
    author: 'Rocket Community',
    downloads: '8.4k',
    stars: 195,
    isInstalled: false,
    size: '2.4 MB',
  },
  {
    id: 'rocket-tui',
    name: 'rocket.tui',
    version: '1.2.0',
    description: 'Terminal user interface layout engine and ANSI rendering widgets.',
    category: 'UI',
    author: 'terminal-devs',
    downloads: '5.1k',
    stars: 130,
    isInstalled: false,
    size: '510 KB',
  },
  {
    id: 'rocket-crypto',
    name: 'rocket.crypto',
    version: '2.1.1',
    description: 'Ed25519, AES-256-GCM, SHA-3, and authenticated encryption primitives.',
    category: 'System',
    author: 'security-sig',
    downloads: '11.3k',
    stars: 310,
    isInstalled: false,
    size: '1.1 MB',
  },
];

export const RockpmApp: React.FC = () => {
  const [packages, setPackages] = useState<RocketPackage[]>(INITIAL_PACKAGES);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'catalog' | 'installed'>('catalog');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const categories = ['All', 'Graphics', 'Networking', 'System', 'Data', 'UI'];

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch =
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || pkg.category === selectedCategory;
    const matchesTab = activeTab === 'catalog' || pkg.isInstalled;
    return matchesSearch && matchesCategory && matchesTab;
  });

  const handleInstallToggle = (id: string, currentlyInstalled: boolean) => {
    if (currentlyInstalled) {
      setPackages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isInstalled: false } : p))
      );
      soundEngine.playTrash();
    } else {
      setInstallingId(id);
      soundEngine.playClick();
      setTimeout(() => {
        setPackages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isInstalled: true } : p))
        );
        setInstallingId(null);
        soundEngine.playSuccess();
      }, 700);
    }
  };

  const installedCount = packages.filter((p) => p.isInstalled).length;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Package className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">rockpm Package Manager & Ecosystem</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            ABI v1 Compatible
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Package Catalog
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'installed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Installed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
              {installedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-header: Search & Categories */}
      <div className="p-4 border-b border-white/10 bg-slate-900/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rockpm packages..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Package Grid List */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm hover:text-emerald-300 transition-colors">
                      {pkg.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      v{pkg.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {pkg.description}
                  </p>
                </div>

                <button
                  onClick={() => handleInstallToggle(pkg.id, pkg.isInstalled)}
                  disabled={installingId === pkg.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    pkg.isInstalled
                      ? 'bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {installingId === pkg.id ? (
                    <span className="animate-spin text-white">⏳</span>
                  ) : pkg.isInstalled ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Install
                    </>
                  )}
                </button>
              </div>

              {/* Package Meta Info */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {pkg.stars}
                  </span>
                  <span>{pkg.downloads} downloads</span>
                  <span className="text-slate-500">by {pkg.author}</span>
                </div>
                <span>{pkg.size}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredPackages.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Package className="w-8 h-8 opacity-40" />
            <p className="text-xs">No packages match your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
