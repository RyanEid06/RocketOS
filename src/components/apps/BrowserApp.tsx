import React, { useState, useEffect } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Plus,
  X,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  Search,
  BookOpen,
  Code2,
  Terminal,
  Layers,
  Sparkles,
  Lock,
  FileText,
  Star,
  Activity,
  ChevronRight,
  TrendingUp,
  Cpu,
  Github,
  Maximize2,
  Minimize2,
  Eye,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  engine: 'docs' | 'search' | 'wikipedia' | 'hackernews' | 'github' | 'sandbox';
  docSection?: string;
  wikiTopic?: string;
  searchQuery?: string;
}

const ROCKET_DOCS_SECTIONS: Record<
  string,
  { title: string; category: string; description: string; code: string }
> = {
  overview: {
    title: 'Rocket 2.1 Language Specification',
    category: 'Core Language',
    description:
      'Rocket 2.1 (Frozen 2.0 ABI v1) features strict 4-space indentation, colon-based block delimiters, thread-confined ARC memory management, copy-on-write collections, and no nulls (Option[T]) or exceptions (Result[T, E]).',
    code: `# Basic Rocket 2.1 Program\npub fn add(left: Int, right: Int) -> Int:\n    return left + right\n\nfn main() -> Int:\n    let result = add(20, 22)\n    print("Calculated sum: " + string.from_int(result))\n    return 0\n`,
  },
  'std.string': {
    title: 'std.string Module Reference',
    category: 'Standard Library',
    description:
      'Owned, immutable sequence of valid UTF-8 bytes with explicit length tracking. Embedded null bytes allowed.',
    code: `import std.string\n\nfn test_strings() -> Unit:\n    let s = "Hello, RocketOS!"\n    let len = string.byte_length(s)\n    let upper = string.trim(s)\n    let parts = string.split(s, ", ")\n    print("Split result length: " + string.from_int(parts.length()))\n`,
  },
  'std.collections': {
    title: 'std.collections (Array, Slice, Map, Set)',
    category: 'Standard Library',
    description:
      'Copy-on-write value semantics. Mutable var bindings support indexed assignment. Dot notation supported for convenience.',
    code: `import std.collections\n\nfn run_collections() -> Unit:\n    var scores: Array[Int] = [95, 88, 92]\n    scores = scores.append(100)\n    scores[1] = 99\n\n    let slice_view = scores[1..3]\n    for score in scores:\n        print(score)\n`,
  },
  'std.task': {
    title: 'std.task & Concurrency Model',
    category: 'Async & Concurrency',
    description:
      'Structured concurrency with thread-confined async tasks and atomic graph promotion.',
    code: `import std.task\nimport std.sync\n\nasync fn fetch_count(source: String) -> Result[Int, String]:\n    return Ok(42)\n\nfn main() -> Int:\n    let pending = fetch_count("db")\n    match task.join(pending):\n        case Ok(count):\n            print("Received count: " + string.from_int(count))\n        case Err(err):\n            print("Error: " + err)\n            return 1\n    return 0\n`,
  },
  'rocket.raylib': {
    title: 'rocket.raylib 2D/3D Graphics API',
    category: 'Hardware Graphics',
    description:
      'Safe 2D hardware-accelerated drawing primitives wrapping Raylib 6.0.',
    code: `import rocket.raylib\nimport rocket.motion\n\nfn render_frame(t: Float) -> Unit:\n    raylib.clear_background(0x0a0f1d)\n    let radius = motion.ease_in_out_cubic(t) * 80.0\n    raylib.draw_circle(400, 300, radius, 0x38bdf8)\n`,
  },
};

const WIKIPEDIA_ARTICLES: Record<
  string,
  { title: string; subtitle: string; body: string; related: string[] }
> = {
  rocket: {
    title: 'Rocket (programming language)',
    subtitle: 'High-performance compiled systems language created by Ryan Eid',
    body: `Rocket is an open-source, compiled programming language designed by Ryan Eid (specification 2.1, frozen ABI v1). It blends the ergonomic, indentation-sensitive syntax of modern languages with deterministic memory safety without a garbage collector.\n\nThe compiler toolchain, rocketc, is self-hosted in Rocket and emits LLVM 22.1.6 intermediate representation (IR) targeted for modern x86_64 and AArch64 architectures. The runtime enforces thread-confined Automatic Reference Counting (ARC) alongside copy-on-write collections (Array, Map, Set) and algebraic data types (Option[T], Result[T, E]). Null pointers and unwrapped exceptions are forbidden by design.`,
    related: ['llvm', 'linux', 'wifi7'],
  },
  llvm: {
    title: 'LLVM Compiler Infrastructure',
    subtitle: 'Collection of modular and reusable compiler and toolchain technologies',
    body: `LLVM is a comprehensive collection of modular and reusable compiler and toolchain technologies used to develop front-ends for any programming language and back-ends for any instruction set architecture. Originally developed by Chris Lattner and Vikram Adve at the University of Illinois in 2000, LLVM provides code generation, optimization, Link-Time Optimization (LTO), and Just-In-Time (JIT) compilation.\n\nRocketc targets LLVM IR directly, unlocking state-of-the-art vectorization, loop unrolling, dead code elimination, and target-specific machine instructions.`,
    related: ['rocket', 'linux'],
  },
  wifi7: {
    title: 'IEEE 802.11be (Wi-Fi 7)',
    subtitle: 'Extremely High Throughput (EHT) wireless standard',
    body: `IEEE 802.11be, marketed as Wi-Fi 7, is the next major generation of Wi-Fi technology following Wi-Fi 6/6E (802.11ax). Key innovations include 320 MHz channel bandwidths in the 6 GHz band, 4096-QAM modulation, and Multi-Link Operation (MLO), which allows a client to transmit and receive data concurrently across multiple frequency bands (2.4 GHz, 5 GHz, and 6 GHz).\n\nRocketOS features native Wi-Fi 7 connection telemetry and MLO packet scheduling in its hardware network stack.`,
    related: ['bluetooth', 'linux'],
  },
  bluetooth: {
    title: 'Bluetooth 5.4 & Bluetooth LE',
    subtitle: 'Short-range wireless personal area network standard',
    body: `Bluetooth is a short-range wireless technology standard that is used for exchanging data between fixed and mobile devices over short distances using UHF radio waves in the ISM bands, from 2.402 GHz to 2.480 GHz.\n\nBluetooth 5.4 introduces Periodic Advertising with Responses (PAwR) and Encrypted Advertising Data (EAD), specifically optimizing battery longevity for IoT peripherals, health monitors, and wireless keyboards.`,
    related: ['wifi7', 'rocket'],
  },
  linux: {
    title: 'Operating System Architecture',
    subtitle: 'Unix-like kernel and userland system design',
    body: `An operating system (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs. Key components include process scheduling, virtual memory management, virtual file systems (VFS), device drivers, and graphical user interface shell environments.\n\nRocketOS combines an ultra-fast desktop shell with built-in development tooling and language execution environments.`,
    related: ['rocket', 'llvm'],
  },
};

const HACKER_NEWS_STORIES = [
  {
    id: 1,
    title: 'Rocket 2.1 Language Specification and LLVM 22 Compiler Released',
    points: 428,
    author: 'ryaneid',
    time: '2 hours ago',
    comments: 112,
    url: 'rocket://docs/overview',
  },
  {
    id: 2,
    title: 'Wi-Fi 7 Multi-Link Operation (MLO) Benchmarks in Production',
    points: 315,
    author: 'wireless_guru',
    time: '4 hours ago',
    comments: 87,
    url: 'rocket://wiki/wifi7',
  },
  {
    id: 3,
    title: 'Deterministic ARC vs. Garbage Collection in Real-Time Systems',
    points: 260,
    author: 'systems_fan',
    time: '6 hours ago',
    comments: 94,
    url: 'rocket://wiki/rocket',
  },
  {
    id: 4,
    title: 'LLVM 22 Backend Optimization Pipelines for WebAssembly and x86',
    points: 198,
    author: 'clang_dev',
    time: '8 hours ago',
    comments: 45,
    url: 'rocket://wiki/llvm',
  },
  {
    id: 5,
    title: 'Bluetooth 5.4 PAwR: Transforming Battery Lifespans on Peripherals',
    points: 172,
    author: 'embedded_rf',
    time: '11 hours ago',
    comments: 38,
    url: 'rocket://wiki/bluetooth',
  },
];

export const BrowserApp: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'DuckDuckGo Search',
      url: 'https://duckduckgo.com',
      engine: 'search',
      searchQuery: 'Rocket programming language',
    },
    {
      id: 'tab-2',
      title: 'Rocket 2.1 Documentation',
      url: 'rocket://docs/overview',
      engine: 'docs',
      docSection: 'overview',
    },
    {
      id: 'tab-3',
      title: 'Hacker News Tech Feed',
      url: 'https://news.ycombinator.com',
      engine: 'hackernews',
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputUrl, setInputUrl] = useState<string>('https://duckduckgo.com');
  const [history, setHistory] = useState<string[]>(['https://duckduckgo.com']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Modals & Panels
  const [certModalOpen, setCertModalOpen] = useState<boolean>(false);
  const [devToolsOpen, setDevToolsOpen] = useState<boolean>(false);
  const [devToolsTab, setDevToolsTab] = useState<'elements' | 'network' | 'console'>('network');
  const [readerMode, setReaderMode] = useState<boolean>(false);

  // Search input on the DuckDuckGo page
  const [searchPageQuery, setSearchPageQuery] = useState<string>('Rocket programming language');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleNavigate = (urlToLoad: string) => {
    let clean = urlToLoad.trim();
    let engine: BrowserTab['engine'] = 'sandbox';
    let docSection: string | undefined = undefined;
    let wikiTopic: string | undefined = undefined;
    let title = clean;

    if (clean.startsWith('rocket://docs')) {
      engine = 'docs';
      docSection = clean.replace('rocket://docs/', '') || 'overview';
      title = `Docs: ${docSection}`;
    } else if (clean.startsWith('rocket://wiki')) {
      engine = 'wikipedia';
      wikiTopic = clean.replace('rocket://wiki/', '') || 'rocket';
      title = `Wiki: ${WIKIPEDIA_ARTICLES[wikiTopic]?.title || wikiTopic}`;
    } else if (clean.includes('duckduckgo.com') || clean.includes('google.com') || !clean.includes('.')) {
      engine = 'search';
      title = 'Web Search';
      if (!clean.includes('.')) {
        setSearchPageQuery(clean);
        clean = `https://duckduckgo.com/?q=${encodeURIComponent(clean)}`;
      }
    } else if (clean.includes('news.ycombinator.com') || clean.includes('hackernews')) {
      engine = 'hackernews';
      title = 'Hacker News';
    } else if (clean.includes('github.com')) {
      engine = 'github';
      title = 'GitHub: RyanEid06/Rocket';
    } else {
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      engine = 'sandbox';
      title = clean.replace(/^https?:\/\//, '');
    }

    setInputUrl(clean);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              url: clean,
              title,
              engine,
              docSection,
              wikiTopic,
            }
          : t
      )
    );
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), clean]);
    setHistoryIndex((prev) => prev + 1);
    soundEngine.playClick();
  };

  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: 'New Tab',
      url: 'https://duckduckgo.com',
      engine: 'search',
      searchQuery: '',
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setInputUrl('https://duckduckgo.com');
    soundEngine.playOpen();
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
      setInputUrl(remaining[0].url);
    }
    soundEngine.playClick();
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      handleNavigate(target);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      handleNavigate(target);
    }
  };

  const doc = ROCKET_DOCS_SECTIONS[activeTab.docSection || 'overview'] || ROCKET_DOCS_SECTIONS['overview'];
  const wiki = WIKIPEDIA_ARTICLES[activeTab.wikiTopic || 'rocket'] || WIKIPEDIA_ARTICLES['rocket'];

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Browser Tab Bar */}
      <div className="h-10 px-2 bg-slate-950/90 border-b border-white/10 flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTabId(tab.id);
              setInputUrl(tab.url);
              soundEngine.playClick();
            }}
            className={`group h-8 max-w-[210px] min-w-[130px] px-3 rounded-t-xl flex items-center justify-between text-xs cursor-pointer transition-colors border-t border-x ${
              activeTabId === tab.id
                ? 'bg-slate-900 border-white/15 text-white shadow-sm font-medium'
                : 'bg-black/30 border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate pr-1">
              {tab.engine === 'docs' ? (
                <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              ) : tab.engine === 'wikipedia' ? (
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : tab.engine === 'hackernews' ? (
                <TrendingUp className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              ) : tab.engine === 'github' ? (
                <Github className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{tab.title}</span>
            </div>
            {tabs.length > 1 && (
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="w-4 h-4 rounded-full hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center text-[10px] shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          onClick={handleNewTab}
          className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
          title="New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation & Address Bar */}
      <div className="h-11 px-3 bg-slate-900/70 border-b border-white/10 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleNavigate(inputUrl)}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Reload Page"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleNavigate('https://duckduckgo.com')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Web Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address & Omnibox */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 relative flex items-center"
        >
          <button
            type="button"
            onClick={() => setCertModalOpen(true)}
            className="absolute left-2.5 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer p-0.5"
            title="View TLS 1.3 Security Certificate"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full pl-8 pr-12 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 font-mono outline-none focus:border-sky-500/50"
            placeholder="Search the web or enter a URL..."
          />

          <button
            type="button"
            onClick={() => setReaderMode(!readerMode)}
            className={`absolute right-2.5 p-1 rounded-lg transition-colors cursor-pointer ${
              readerMode ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white'
            }`}
            title="Reader Mode"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* DevTools Toggle */}
        <button
          onClick={() => setDevToolsOpen(!devToolsOpen)}
          className={`px-2 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            devToolsOpen ? 'bg-sky-600 text-white font-medium' : 'bg-white/5 hover:bg-white/10 text-slate-400'
          }`}
          title="Toggle Web Inspector & DevTools (F12)"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">DevTools</span>
        </button>
      </div>

      {/* Bookmarks Shelf */}
      <div className="h-8 px-4 bg-slate-900/40 border-b border-white/5 flex items-center gap-2 text-xs overflow-x-auto custom-scrollbar shrink-0">
        <span className="text-[10px] text-slate-500 uppercase font-semibold">Bookmarks:</span>
        <button
          onClick={() => handleNavigate('https://duckduckgo.com')}
          className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1 cursor-pointer"
        >
          <Search className="w-3 h-3 text-emerald-400" />
          DuckDuckGo
        </button>
        <button
          onClick={() => handleNavigate('https://news.ycombinator.com')}
          className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1 cursor-pointer"
        >
          <TrendingUp className="w-3 h-3 text-orange-400" />
          Hacker News
        </button>
        <button
          onClick={() => handleNavigate('rocket://wiki/rocket')}
          className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1 cursor-pointer"
        >
          <FileText className="w-3 h-3 text-amber-400" />
          Wikipedia
        </button>
        <button
          onClick={() => handleNavigate('https://github.com/RyanEid06/Rocket')}
          className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1 cursor-pointer"
        >
          <Github className="w-3 h-3 text-purple-400" />
          GitHub (Rocket)
        </button>
        <button
          onClick={() => handleNavigate('rocket://docs/overview')}
          className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1 cursor-pointer"
        >
          <BookOpen className="w-3 h-3 text-sky-400" />
          Rocket 2.1 Docs
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
          {/* 1. DuckDuckGo Search Engine View */}
          {activeTab.engine === 'search' && (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {/* Search Header */}
              <div className="text-center py-6 space-y-3">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <span>Rocket Web Search</span>
                </div>
                <p className="text-xs text-slate-400">
                  Privacy-first web search engine connected via RocketOS Network Socket
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    soundEngine.playClick();
                  }}
                  className="relative max-w-xl mx-auto pt-2"
                >
                  <input
                    type="text"
                    value={searchPageQuery}
                    onChange={(e) => setSearchPageQuery(e.target.value)}
                    className="w-full pl-10 pr-24 py-3 rounded-2xl bg-slate-900 border border-white/20 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 shadow-xl"
                    placeholder="Search documents, repositories, or topics..."
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-5.5" />
                  <button
                    type="submit"
                    className="absolute right-2 top-3.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Instant Answer Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Instant Knowledge Card
                </span>
                <h3 className="text-base font-bold text-white">Rocket 2.1 (Frozen 2.0 ABI v1)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Rocket is a high-performance compiled programming language designed by Ryan Eid with an LLVM backend, deterministic ARC memory safety, and native hardware graphics support.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleNavigate('rocket://docs/overview')}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Read Language Specification</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Search Results List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Top Results for "{searchPageQuery}"
                </h4>

                {/* Result 1 */}
                <div className="space-y-1 p-3.5 rounded-2xl hover:bg-white/5 transition-colors">
                  <div className="text-[11px] font-mono text-emerald-400">https://github.com/RyanEid06/Rocket</div>
                  <button
                    onClick={() => handleNavigate('https://github.com/RyanEid06/Rocket')}
                    className="text-sm font-bold text-sky-400 hover:underline text-left block"
                  >
                    RyanEid06/Rocket: The Rocket Programming Language
                  </button>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Official compiler and standard library repository for Rocket 2.1. Contains the self-hosted rocketc compiler, LLVM 22 codegen pipeline, test suite, and standard modules.
                  </p>
                </div>

                {/* Result 2 */}
                <div className="space-y-1 p-3.5 rounded-2xl hover:bg-white/5 transition-colors">
                  <div className="text-[11px] font-mono text-emerald-400">rocket://wiki/rocket</div>
                  <button
                    onClick={() => handleNavigate('rocket://wiki/rocket')}
                    className="text-sm font-bold text-sky-400 hover:underline text-left block"
                  >
                    Rocket (programming language) - Encyclopedia
                  </button>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    An in-depth article on language semantics, thread-confined ARC memory models, copy-on-write arrays, and algebraic Option/Result types.
                  </p>
                </div>

                {/* Result 3 */}
                <div className="space-y-1 p-3.5 rounded-2xl hover:bg-white/5 transition-colors">
                  <div className="text-[11px] font-mono text-emerald-400">rocket://docs/std.task</div>
                  <button
                    onClick={() => handleNavigate('rocket://docs/std.task')}
                    className="text-sm font-bold text-sky-400 hover:underline text-left block"
                  >
                    std.task Concurrency Model & Async Architecture
                  </button>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Documentation of async fn and task.join semantics with atomic graph promotion and structured message passing channels.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Wikipedia Reader View */}
          {activeTab.engine === 'wikipedia' && (
            <div className="max-w-3xl mx-auto p-8 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono font-bold">
                  Wikipedia Quick-Reader
                </span>
                <h1 className="text-2xl font-bold text-white mt-1">{wiki.title}</h1>
                <p className="text-xs text-slate-400 mt-1">{wiki.subtitle}</p>
              </div>

              <div className="prose prose-invert max-w-none text-xs text-slate-200 leading-relaxed space-y-4">
                {wiki.body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Related Articles */}
              <div className="border-t border-white/10 pt-4 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Related Topics
                </span>
                <div className="flex flex-wrap gap-2">
                  {wiki.related.map((rel) => (
                    <button
                      key={rel}
                      onClick={() => handleNavigate(`rocket://wiki/${rel}`)}
                      className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-xs text-sky-300 capitalize cursor-pointer transition-colors"
                    >
                      {WIKIPEDIA_ARTICLES[rel]?.title || rel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Hacker News Feed View */}
          {activeTab.engine === 'hackernews' && (
            <div className="max-w-3xl mx-auto p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    Y
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Hacker News Live Feed</h3>
                    <span className="text-[11px] text-slate-400">Top Technology & Systems Stories</span>
                  </div>
                </div>
                <button
                  onClick={() => soundEngine.playClick()}
                  className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-2">
                {HACKER_NEWS_STORIES.map((story, i) => (
                  <div
                    key={story.id}
                    className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/15 transition-all flex items-start gap-3"
                  >
                    <span className="text-slate-500 font-mono text-xs w-5 text-right mt-0.5">
                      {i + 1}.
                    </span>
                    <div className="flex-1 space-y-1">
                      <button
                        onClick={() => handleNavigate(story.url)}
                        className="text-xs font-semibold text-white hover:text-orange-400 text-left transition-colors"
                      >
                        {story.title}
                      </button>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{story.points} points</span>
                        <span>•</span>
                        <span>by {story.author}</span>
                        <span>•</span>
                        <span>{story.time}</span>
                        <span>•</span>
                        <span>{story.comments} comments</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. GitHub Repository Explorer View */}
          {activeTab.engine === 'github' && (
            <div className="max-w-4xl mx-auto p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-mono">RyanEid06 / Rocket</div>
                    <h2 className="text-base font-bold text-white">The Rocket Programming Language</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://github.com/RyanEid06/Rocket"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <span>Open on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Repo Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400">Specification</span>
                  <div className="font-bold text-white mt-0.5">2.1 (ABI v1)</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400">Backend</span>
                  <div className="font-bold text-sky-400 mt-0.5">LLVM 22.1.6</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400">Bootstrap</span>
                  <div className="font-bold text-emerald-400 mt-0.5">Stage0 C++</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400">License</span>
                  <div className="font-bold text-amber-400 mt-0.5">MIT Open Source</div>
                </div>
              </div>

              {/* README preview */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-xs">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  README.md
                </div>
                <div className="prose prose-invert max-w-none text-slate-300 text-xs space-y-2">
                  <p>
                    <strong>Rocket</strong> is a high-performance, statically typed programming language with clean 4-space indentation and colon-based block structure.
                  </p>
                  <pre className="p-3 rounded-xl bg-black/60 font-mono text-[11px] text-slate-200">
                    {`pub fn add(left: Int, right: Int) -> Int:\n    return left + right\n\nfn main() -> Int:\n    print(add(20, 22))\n    return 0`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 5. Rocket 2.1 Documentation Engine */}
          {activeTab.engine === 'docs' && (
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5 max-w-4xl mx-auto">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[11px] uppercase tracking-wider text-sky-400 font-mono font-bold">
                  {doc.category}
                </span>
                <h1 className="text-xl font-bold text-white mt-1">{doc.title}</h1>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {doc.description}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Language Reference & Sample Code
                </span>
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto custom-scrollbar">
                  <pre>{doc.code}</pre>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">
                    Target: <strong>rocketc 2.1 (LLVM 22.1.6 Backend)</strong>
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(doc.code);
                    soundEngine.playSuccess();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer transition-colors shadow-sm"
                >
                  Copy Sample Code
                </button>
              </div>
            </div>
          )}

          {/* 6. External Web Sandbox Frame */}
          {activeTab.engine === 'sandbox' && (
            <div className="flex-1 h-full flex flex-col">
              <div className="flex-1 relative bg-white">
                <iframe
                  src={activeTab.url}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title="Web Sandbox"
                />
              </div>
            </div>
          )}
        </div>

        {/* Developer Tools Bottom Panel */}
        {devToolsOpen && (
          <div className="h-48 border-t border-white/10 bg-slate-900/95 flex flex-col shrink-0 text-xs font-mono">
            <div className="h-8 px-4 bg-slate-950 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDevToolsTab('network')}
                  className={`px-2.5 py-0.5 rounded text-[11px] ${
                    devToolsTab === 'network' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Network
                </button>
                <button
                  onClick={() => setDevToolsTab('elements')}
                  className={`px-2.5 py-0.5 rounded text-[11px] ${
                    devToolsTab === 'elements' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Elements
                </button>
                <button
                  onClick={() => setDevToolsTab('console')}
                  className={`px-2.5 py-0.5 rounded text-[11px] ${
                    devToolsTab === 'console' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Console
                </button>
              </div>
              <button
                onClick={() => setDevToolsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar text-[11px] text-slate-300">
              {devToolsTab === 'network' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-500 border-b border-white/5 pb-1">
                    <span className="w-1/3">Name</span>
                    <span className="w-16">Status</span>
                    <span className="w-20">Type</span>
                    <span className="w-16">Size</span>
                    <span className="w-16">Time</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="w-1/3 truncate">{activeTab.url}</span>
                    <span className="w-16">200 OK</span>
                    <span className="w-20">document</span>
                    <span className="w-16">24.5 KB</span>
                    <span className="w-16">42 ms</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="w-1/3 truncate">bundle.esm.js</span>
                    <span className="w-16 text-emerald-400">304</span>
                    <span className="w-20">script</span>
                    <span className="w-16">182 KB</span>
                    <span className="w-16">18 ms</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="w-1/3 truncate">font-inter.woff2</span>
                    <span className="w-16 text-emerald-400">200 OK</span>
                    <span className="w-20">font</span>
                    <span className="w-16">38.2 KB</span>
                    <span className="w-16">12 ms</span>
                  </div>
                </div>
              )}

              {devToolsTab === 'elements' && (
                <div className="text-slate-400 space-y-0.5">
                  <div>&lt;!DOCTYPE html&gt;</div>
                  <div>&lt;html lang="en"&gt;</div>
                  <div className="pl-4">&lt;head&gt;...&lt;/head&gt;</div>
                  <div className="pl-4">&lt;body class="bg-slate-950 text-white"&gt;</div>
                  <div className="pl-8">&lt;div id="root"&gt;...&lt;/div&gt;</div>
                  <div className="pl-4">&lt;/body&gt;</div>
                  <div>&lt;/html&gt;</div>
                </div>
              )}

              {devToolsTab === 'console' && (
                <div className="space-y-1">
                  <div className="text-emerald-400">[RocketOS Web Engine] HTTP/3 QUIC connection established.</div>
                  <div className="text-slate-400">[V8 / SpiderMonkey] JIT compilation active.</div>
                  <div className="text-sky-400">&gt; navigator.userAgent</div>
                  <div className="text-white">"Mozilla/5.0 (X11; Linux x86_64; RocketOS 2.1)"</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TLS 1.3 Security Certificate Inspector Modal */}
      {certModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Connection is Secure</h3>
                  <span className="text-[11px] text-emerald-400 font-medium">Valid TLS 1.3 Certificate</span>
                </div>
              </div>
              <button
                onClick={() => setCertModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Common Name (CN):</span>
                <span className="text-white">{activeTab.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Certificate Authority:</span>
                <span className="text-emerald-400">Let's Encrypt / Rocket Trust Root</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cipher Suite:</span>
                <span className="text-sky-400">TLS_AES_256_GCM_SHA384</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Key Exchange:</span>
                <span className="text-slate-300">X25519 (253 bits)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Protocol:</span>
                <span className="text-violet-400 font-semibold">HTTP/3 (QUIC over UDP)</span>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Your information (e.g. passwords, encryption keys, tokens) is strictly private when sent to this site.
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCertModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
