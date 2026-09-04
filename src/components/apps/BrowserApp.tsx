import React, { useState } from 'react';
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
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  isDocs: boolean;
  docSection?: string;
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

export const BrowserApp: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Rocket 2.1 Documentation',
      url: 'rocket://docs/overview',
      isDocs: true,
      docSection: 'overview',
    },
    {
      id: 'tab-2',
      title: 'RyanEid06/Rocket GitHub',
      url: 'https://github.com/RyanEid06/Rocket',
      isDocs: false,
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputUrl, setInputUrl] = useState<string>('rocket://docs/overview');
  const [isSecure, setIsSecure] = useState<boolean>(true);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleNavigate = (urlToLoad: string) => {
    let clean = urlToLoad.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('rocket://')) {
      if (clean.startsWith('docs/') || clean.startsWith('std.') || clean.startsWith('rocket.')) {
        clean = `rocket://docs/${clean}`;
      } else {
        clean = `https://${clean}`;
      }
    }

    setInputUrl(clean);
    const isDocs = clean.startsWith('rocket://docs');
    const docSec = isDocs ? clean.replace('rocket://docs/', '') : undefined;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              url: clean,
              title: isDocs ? `Docs: ${docSec || 'Overview'}` : clean.replace(/^https?:\/\//, ''),
              isDocs,
              docSection: docSec,
            }
          : t
      )
    );
    soundEngine.playClick();
  };

  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: 'Rocket 2.1 Docs',
      url: 'rocket://docs/overview',
      isDocs: true,
      docSection: 'overview',
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setInputUrl('rocket://docs/overview');
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

  const doc = ROCKET_DOCS_SECTIONS[activeTab?.docSection || 'overview'] || ROCKET_DOCS_SECTIONS['overview'];

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Browser Tab Bar */}
      <div className="h-10 px-2 bg-slate-950/90 border-b border-white/10 flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTabId(tab.id);
              setInputUrl(tab.url);
              soundEngine.playClick();
            }}
            className={`group h-8 max-w-[200px] min-w-[120px] px-3 rounded-t-xl flex items-center justify-between text-xs cursor-pointer transition-colors border-t border-x ${
              activeTabId === tab.id
                ? 'bg-slate-900 border-white/15 text-white shadow-sm'
                : 'bg-black/30 border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate pr-1">
              {tab.isDocs ? (
                <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
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
            onClick={() => soundEngine.playClick()}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => soundEngine.playClick()}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleNavigate(inputUrl)}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleNavigate('rocket://docs/overview')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="RocketOS Docs Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 relative flex items-center"
        >
          <div className="absolute left-3 text-slate-400">
            {activeTab.isDocs ? (
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 font-mono outline-none focus:border-sky-500/50"
            placeholder="Type a web address or rocket://docs..."
          />
        </form>
      </div>

      {/* Bookmarks Bar */}
      <div className="h-8 px-4 bg-slate-900/40 border-b border-white/5 flex items-center gap-2 text-xs overflow-x-auto custom-scrollbar shrink-0">
        <span className="text-[10px] text-slate-500 uppercase font-semibold">Docs:</span>
        {Object.keys(ROCKET_DOCS_SECTIONS).map((key) => (
          <button
            key={key}
            onClick={() => handleNavigate(`rocket://docs/${key}`)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab.docSection === key
                ? 'bg-sky-500/20 text-sky-300 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3 h-3 text-sky-400" />
            {key}
          </button>
        ))}
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab.isDocs ? (
          /* Rocket 2.1 Native Documentation Engine */
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-950 flex flex-col gap-5">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[11px] uppercase tracking-wider text-sky-400 font-mono font-bold">
                {doc.category}
              </span>
              <h1 className="text-xl font-bold text-white mt-1">{doc.title}</h1>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-3xl">
                {doc.description}
              </p>
            </div>

            <div className="space-y-2 max-w-4xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Language Reference & Sample
              </span>
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto custom-scrollbar">
                <pre>{doc.code}</pre>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">
                  Target Compiler: <strong>rocketc 2.1 (LLVM 22.1.6)</strong>
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
        ) : (
          /* Sandboxed Web View */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4 bg-slate-950">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Globe className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="font-bold text-base text-white">External Web Navigation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Navigating to: <span className="font-mono text-emerald-400">{activeTab.url}</span>.
                In this sandboxed container, you can browse verified online documentation and repositories.
              </p>
            </div>
            <a
              href={activeTab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <span>Open in Secure Browser Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
