import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Copy,
  Check,
  Code,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Terminal,
  Cpu,
  FileCode,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface DocSection {
  id: string;
  category: string;
  title: string;
  description: string;
  syntax: string;
  example: string;
  notes?: string;
}

const SECTIONS: DocSection[] = [
  {
    id: 'variables',
    category: 'Grammar & Syntax',
    title: 'Variables & Mutability',
    description: 'Immutable binding with let, mutable binding with var. No null exists in Rocket.',
    syntax: `let name = value
var counter: Int = 0`,
    example: `let pi: Float = 3.14159
var score: Int = 100
score = score + 50`,
    notes: 'Tabs are strictly forbidden; strict 4-space indentation required.',
  },
  {
    id: 'functions',
    category: 'Functions & Control Flow',
    title: 'Functions & Error Propagation (?)',
    description: 'Functions begin with fn or pub fn. Blocks begin after colon with 4 spaces. Postfix ? propagates errors.',
    syntax: `pub fn name(arg: Type) -> ReturnType:
    return val`,
    example: `fn parse_and_increment(text: String) -> Result[Int, String]:
    let value = string.parse_int(text)?
    return Ok(value + 1)

fn main() -> Int:
    let res = parse_and_increment("41")
    match res:
        case Ok(n):
            print(n)
        case Err(msg):
            print(msg)
    return 0`,
  },
  {
    id: 'enums-match',
    category: 'Types & Structs',
    title: 'Enums & Pattern Matching',
    description: 'Algebraic data types with exhaustive pattern matching.',
    syntax: `enum Name:
    Variant(Type)
    Empty`,
    example: `enum Message:
    Number(Int)
    Text(String)
    Empty

fn handle(msg: Message) -> Unit:
    match msg:
        case Number(n):
            print(n)
        case Text(s):
            print(s)
        case Empty:
            print("empty")`,
  },
  {
    id: 'structs-generics',
    category: 'Types & Structs',
    title: 'Structs & Generic Types',
    description: 'Typed records and parametric polymorphism.',
    syntax: `struct Point:
    x: Int
    y: Int

struct Pair[T]:
    first: T
    second: T`,
    example: `let p = Point(10, 20)
let pair = Pair("key", 100)`,
  },
  {
    id: 'loops',
    category: 'Functions & Control Flow',
    title: 'Loops: Range & Collection',
    description: 'Half-open ranges 0..10 (excludes upper bound) and collection iteration.',
    syntax: `for i in 0..10:
for item in collection:
while condition:`,
    example: `for index in 0..10:
    if index == 5:
        continue
    if index == 8:
        break
    print(index)

for item in items:
    print(item)`,
  },
  {
    id: 'std-string',
    category: 'Standard Library',
    title: 'std.string',
    description: 'Owned, immutable sequence of UTF-8 bytes with explicit length tracking.',
    syntax: `import std.string`,
    example: `let s = string.concat("Rocket ", "2.1")
let num = string.parse_int("1337")?
let has = string.contains(s, "2.1")
let parts = string.split("a,b,c", ",")
let b = string.builder()
string.builder_append(b, "hello")
let final = string.builder_finish(b)`,
  },
  {
    id: 'std-collections',
    category: 'Standard Library',
    title: 'std.collections',
    description: 'Safe collections with copy-on-write value semantics (Array, Slice, Map, Set).',
    syntax: `import std.collections`,
    example: `var arr = [1, 2, 3]
arr = collections.append(arr, 4)
let len = arr.length()
let view = arr[1..3] # Slice[T]

let map = collections.map_from_arrays(["a", "b"], [1, 2])
let val = map.get("a") # Option[Int]`,
  },
  {
    id: 'rocket-raylib-motion',
    category: 'Graphics & Audio',
    title: 'rocket.raylib & rocket.motion',
    description: 'Hardware 2D/3D graphics and physics spring easing curves.',
    syntax: `import rocket.raylib
import rocket.motion`,
    example: `fn render() -> Unit:
    let t = motion.ease_in_out_cubic(0.5)
    raylib.begin_drawing()
    raylib.clear_background(0x0a0f1d)
    raylib.draw_circle(320, 180, 30, 0x38bdf8)
    raylib.end_drawing()`,
  },
  {
    id: 'async-task',
    category: 'Concurrency & Systems',
    title: 'std.task & Concurrency',
    description: 'Asynchronous task handles and thread-confined ARC promotes.',
    syntax: `import std.task
import std.sync`,
    example: `async fn fetch_count(source: String) -> Result[Int, String]:
    return Ok(42)

fn run_worker() -> Int:
    let pending = fetch_count("db")
    match task.join(pending):
        case Ok(count):
            print(count)
        case Err(err):
            return 1
    return 0`,
  },
];

interface RocketCheatsheetAppProps {
  onOpenStudioWithCode?: (code: string) => void;
}

export const RocketCheatsheetApp: React.FC<RocketCheatsheetAppProps> = ({
  onOpenStudioWithCode,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Grammar & Syntax', 'Types & Structs', 'Functions & Control Flow', 'Standard Library', 'Graphics & Audio', 'Concurrency & Systems'];

  const filteredSections = SECTIONS.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.example.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    soundEngine.playSuccess();
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">Rocket 2.1 Language Manual & Cheatsheet</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30 font-mono">
            Frozen ABI v1
          </span>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">Authoritative Spec (RyanEid06/Rocket)</span>
      </div>

      {/* Sub-header: Search & Categories */}
      <div className="p-3.5 border-b border-white/10 bg-slate-900/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search language syntax, std modules, keywords..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-orange-500/50 font-mono"
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
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
        {filteredSections.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-orange-500/30 transition-all flex flex-col gap-3 shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{item.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {item.description}
                </p>
                {item.notes && (
                  <p className="text-[11px] text-amber-400/90 mt-0.5 font-mono">
                    ⚠️ {item.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(item.id, item.example)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 cursor-pointer flex items-center gap-1 transition-all"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Example</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Block */}
            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed border border-white/5 selection:bg-orange-500/30">
                {item.example}
              </pre>
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
            <BookOpen className="w-8 h-8 opacity-40" />
            <p className="text-xs">No language references match your query.</p>
          </div>
        )}
      </div>
    </div>
  );
};
