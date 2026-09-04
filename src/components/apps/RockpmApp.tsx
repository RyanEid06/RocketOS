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
  FileCode,
  Copy,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
  Lock,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { RocketFS } from '../../core/filesystem/RocketFS';

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
  dependencies: string[];
  sampleCode: string;
  exports: string[];
  license: string;
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
    dependencies: ['std.binary', 'rocket.motion'],
    sampleCode: `import rocket.raylib

fn main() -> Int:
    raylib.init_window(800, 600, "Raylib Window")
    while not raylib.window_should_close():
        raylib.begin_drawing()
        raylib.clear_background(0x0a0f1d)
        raylib.draw_text("Rocket 2.1 Raylib", 20, 20, 24, 0x38bdf8)
        raylib.end_drawing()
    return 0`,
    exports: ['init_window', 'begin_drawing', 'end_drawing', 'draw_text', 'clear_background', 'draw_circle'],
    license: 'zlib/libpng',
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
    dependencies: ['std.math'],
    sampleCode: `import rocket.motion

fn animate() -> Float:
    let eased = motion.ease_out_cubic(0.5)
    return eased`,
    exports: ['ease_in_cubic', 'ease_out_cubic', 'ease_in_out_cubic', 'spring_damping'],
    license: 'MIT',
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
    dependencies: ['rocket.crypto', 'std.task', 'std.string'],
    sampleCode: `import rocket.http
import std.task

async fn fetch_api() -> Result[String, String]:
    let client = http.client_new()
    let response = client.get("https://api.rocket-lang.org/v1/packages")?
    return Ok(response.body)`,
    exports: ['client_new', 'get', 'post', 'header_set', 'json_body'],
    license: 'Apache-2.0',
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
    dependencies: ['std.collections', 'std.string'],
    sampleCode: `import rocket.json

fn parse_config(raw: String) -> Result[json.Value, String]:
    let parsed = json.parse_simd(raw)?
    return Ok(parsed)`,
    exports: ['parse_simd', 'serialize', 'get_field', 'to_int', 'to_string'],
    license: 'MIT',
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
    dependencies: ['std.binary', 'std.file'],
    sampleCode: `import rocket.sqlite

fn init_db() -> Result[sqlite.Database, String]:
    let db = sqlite.open("/home/ryan/app.db")?
    db.execute("CREATE TABLE IF NOT EXISTS users (id INT, name TEXT)")?
    return Ok(db)`,
    exports: ['open', 'execute', 'query', 'prepare', 'transaction_begin'],
    license: 'Public Domain',
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
    dependencies: ['std.string'],
    sampleCode: `import rocket.tui

fn draw_box() -> Unit:
    tui.render_border(0, 0, 40, 10, tui.BORDER_DOUBLE)`,
    exports: ['render_border', 'draw_gauge', 'clear_screen', 'set_cursor'],
    license: 'MIT',
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
    dependencies: ['std.binary'],
    sampleCode: `import rocket.crypto

fn hash_token(data: String) -> String:
    return crypto.sha256_hex(data)`,
    exports: ['sha256_hex', 'aes_gcm_encrypt', 'aes_gcm_decrypt', 'ed25519_sign'],
    license: 'Apache-2.0',
  },
];

export const RockpmApp: React.FC = () => {
  const [packages, setPackages] = useState<RocketPackage[]>(INITIAL_PACKAGES);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'catalog' | 'installed' | 'manifest' | 'audit'>('catalog');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<RocketPackage | null>(null);

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
      }, 600);
    }
  };

  const installedCount = packages.filter((p) => p.isInstalled).length;

  // Generate dynamic rocket.toml based on currently installed packages
  const generatedToml = `[package]
name = "workspace_project"
version = "2.1.0"
edition = "2026"
abi = "v1"

[dependencies]
std = "2.1.0"
${packages
  .filter((p) => p.isInstalled)
  .map((p) => `"${p.name}" = "${p.version}"`)
  .join('\n')}

[build]
opt_level = 3
lto = true
`;

  const handleSaveManifestToFS = () => {
    const fs = RocketFS.getInstance();
    fs.writeFile('/home/ryan/Documents/rocket.toml', generatedToml);
    soundEngine.playSuccess();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Package className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">rockpm Package Manager & Ecosystem</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
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
            Catalog
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
          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manifest'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3 h-3" />
            <span>rocket.toml</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Security Audit</span>
          </button>
        </div>
      </div>

      {/* Sub-header: Search & Categories (only in catalog/installed) */}
      {(activeTab === 'catalog' || activeTab === 'installed') && (
        <div className="p-3.5 border-b border-white/10 bg-slate-900/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
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
      )}

      {/* Main Content Areas */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'catalog' || activeTab === 'installed' ? (
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3 shadow-md cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                          {pkg.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          v{pkg.version}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                          ABI v1
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstallToggle(pkg.id, pkg.isInstalled);
                      }}
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
                      <span>{pkg.downloads}</span>
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
        ) : activeTab === 'manifest' ? (
          /* Live rocket.toml Tab */
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Project Dependency Manifest (rocket.toml)</h2>
                <p className="text-xs text-slate-400">
                  Dynamic project configuration synchronized with rockpm installed dependencies.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedToml);
                    soundEngine.playSuccess();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-200 cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy TOML</span>
                </button>
                <button
                  onClick={handleSaveManifestToFS}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer shadow-md"
                >
                  Save to Documents/rocket.toml
                </button>
              </div>
            </div>

            <pre className="flex-1 p-4 rounded-2xl bg-slate-900 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
              {generatedToml}
            </pre>
          </div>
        ) : (
          /* Security & ABI Compliance Audit Tab */
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">rockpm Ecosystem Security & ABI Verification</h2>
              <p className="text-xs text-slate-400">
                Automated static analysis verifying deterministic ARC confinement, zero-panic invariants, and LLVM 22.1.6 ABI v1 compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  ABI v1 Verification
                </div>
                <div className="text-2xl font-mono font-bold text-white">100% Pass</div>
                <p className="text-[11px] text-slate-400">All packages conform to frozen 2.0 ABI calling conventions.</p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-1">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <Lock className="w-4 h-4" />
                  Thread Confinement
                </div>
                <div className="text-2xl font-mono font-bold text-white">0 Leaks</div>
                <p className="text-[11px] text-slate-400">ARC graphs are verified for local stack confinement without cycle traps.</p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-1">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <Cpu className="w-4 h-4" />
                  Cryptographic Signatures
                </div>
                <div className="text-2xl font-mono font-bold text-white">Verified</div>
                <p className="text-[11px] text-slate-400">Ed25519 signatures verified against rockpm registry root keys.</p>
              </div>
            </div>

            {/* Audit List of Installed Packages */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
              <h3 className="font-semibold text-xs text-white uppercase tracking-wider mb-2">
                Audit Status by Package
              </h3>
              {packages
                .filter((p) => p.isInstalled)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono font-bold text-white">{p.name}</span>
                      <span className="text-slate-500 font-mono">v{p.version}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                      <span className="text-emerald-300">✓ Safe ABI</span>
                      <span className="text-sky-300">✓ Zero Unsafe FFI</span>
                      <span>License: {p.license}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Package Detail Modal / Drawer */}
        {selectedPackage && (
          <div className="w-96 border-l border-white/10 bg-slate-900 p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar shrink-0">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-white font-mono">{selectedPackage.name}</h3>
                  <span className="text-xs text-sky-400 font-mono">v{selectedPackage.version} • {selectedPackage.license}</span>
                </div>
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedPackage.description}
              </p>

              {/* Sub-Dependencies */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Dependencies
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPackage.dependencies.map((dep) => (
                    <span key={dep} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>

              {/* Public Exports */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Exported API Symbols
                </span>
                <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-300 space-y-0.5">
                  {selectedPackage.exports.map((exp) => (
                    <div key={exp}>pub fn {exp}(...)</div>
                  ))}
                </div>
              </div>

              {/* Code Usage Example */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Usage in Rocket 2.1
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed border border-white/5">
                  {selectedPackage.sampleCode}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => handleInstallToggle(selectedPackage.id, selectedPackage.isInstalled)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md ${
                  selectedPackage.isInstalled
                    ? 'bg-rose-600/80 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {selectedPackage.isInstalled ? 'Uninstall Package' : 'Install into Project'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
