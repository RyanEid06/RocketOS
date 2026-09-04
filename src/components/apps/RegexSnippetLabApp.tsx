import React, { useState, useMemo } from 'react';
import {
  Code,
  Sparkles,
  Copy,
  Check,
  Search,
  BookOpen,
  Zap,
  Terminal,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

type LabTab = 'regex' | 'snippets';

interface Snippet {
  id: string;
  title: string;
  language: string;
  category: 'Rocket 2.1' | 'Shell' | 'SQL' | 'Data';
  description: string;
  code: string;
}

export const RegexSnippetLabApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LabTab>('regex');

  // Regex State
  const [pattern, setPattern] = useState<string>('([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+)');
  const [flags, setFlags] = useState<{ g: boolean; i: boolean; m: boolean; s: boolean }>({
    g: true,
    i: true,
    m: false,
    s: false,
  });
  const [testString, setTestString] = useState<string>(
    'Developer contacts:\nadmin@rocket-os.org\nryan.eid@rocket.dev\nsupport@invalid-domain\ntest.user+tag@gmail.com'
  );
  const [replacePattern, setReplacePattern] = useState<string>('[$1 at $2]');
  const [copied, setCopied] = useState<boolean>(false);

  // Regex Evaluation
  const regexResult = useMemo(() => {
    try {
      let flagStr = '';
      if (flags.g) flagStr += 'g';
      if (flags.i) flagStr += 'i';
      if (flags.m) flagStr += 'm';
      if (flags.s) flagStr += 's';

      const re = new RegExp(pattern, flagStr);
      const matches: { match: string; index: number; groups: string[] }[] = [];

      let m: RegExpExecArray | null;
      if (flags.g) {
        let count = 0;
        while ((m = re.exec(testString)) !== null && count < 200) {
          matches.push({
            match: m[0],
            index: m.index,
            groups: m.slice(1),
          });
          count++;
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      } else {
        m = re.exec(testString);
        if (m) {
          matches.push({
            match: m[0],
            index: m.index,
            groups: m.slice(1),
          });
        }
      }

      const replaced = testString.replace(re, replacePattern);

      return {
        valid: true,
        matches,
        replaced,
        error: null,
      };
    } catch (err: any) {
      return {
        valid: false,
        matches: [],
        replaced: testString,
        error: err.message,
      };
    }
  }, [pattern, flags, testString, replacePattern]);

  // Snippets Library
  const snippets: Snippet[] = [
    {
      id: 'snip-1',
      title: 'Rocket 2.1 Struct & Trait Implementation',
      language: 'rocket',
      category: 'Rocket 2.1',
      description: 'Defines a 2D Point struct and implements Summary trait with string concatenation.',
      code: `struct Point:
    x: Int
    y: Int

trait Summary:
    fn summarize(self) -> String

impl Summary for Point:
    fn summarize(self) -> String:
        return "Point(" + string.from_int(self.x) + ", " + string.from_int(self.y) + ")"`,
    },
    {
      id: 'snip-2',
      title: 'Rocket 2.1 Async Task Join & Error Propagation',
      language: 'rocket',
      category: 'Rocket 2.1',
      description: 'Demonstrates async fn return, postfix ? error unpacking, and task.join.',
      code: `import std.task
import std.sync

async fn fetch_sensor(channel: String) -> Result[Int, String]:
    return Ok(1024)

fn main() -> Int:
    let pending = fetch_sensor("ch0")
    match task.join(pending):
        case Ok(reading):
            print(reading)
        case Err(msg):
            print("Failed: " + msg)
            return 1
    return 0`,
    },
    {
      id: 'snip-3',
      title: 'Rocket 2.1 Raylib 2D Easing & Drawing',
      language: 'rocket',
      category: 'Rocket 2.1',
      description: '2D graphics animation frame with cubic easing curve.',
      code: `import rocket.raylib
import rocket.motion

fn render_frame(t: Float) -> Unit:
    let smooth_x = motion.ease_in_out_cubic(t) * 800.0
    raylib.draw_rectangle(smooth_x, 300.0, 50.0, 50.0, 0x38bdf8)
    raylib.draw_circle(smooth_x + 25.0, 325.0, 10.0, 0xffffff)`,
    },
    {
      id: 'snip-4',
      title: 'Bash Kernel Diagnostics & Process Filter',
      language: 'bash',
      category: 'Shell',
      description: 'Filters live kernel processes using awk and sorts by RSS memory footprint.',
      code: `ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -n 15 | awk '{print $1, $3, $4"%", $5"%"}'`,
    },
    {
      id: 'snip-5',
      title: 'SQL Session Audit & Latency Aggregation',
      language: 'sql',
      category: 'SQL',
      description: 'Aggregates active user login sessions and average request latency.',
      code: `SELECT user_id, COUNT(*) AS active_conns, AVG(latency_ms) AS avg_lat
FROM session_audit_logs
WHERE status = 'ACTIVE'
GROUP BY user_id
ORDER BY avg_lat ASC;`,
    },
  ];

  const [snippetFilter, setSnippetFilter] = useState<string>('');
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>(snippets[0].id);

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(snippetFilter.toLowerCase()) ||
      s.category.toLowerCase().includes(snippetFilter.toLowerCase()) ||
      s.code.toLowerCase().includes(snippetFilter.toLowerCase())
  );

  const currentSnippet = snippets.find((s) => s.id === selectedSnippetId) || snippets[0];

  const handleCopySnippet = (code: string) => {
    soundEngine.play('snap');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('regex')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'regex' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Regex Laboratory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('snippets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'snippets' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Snippet Repository</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Engine:</span>
          <span className="font-mono text-sky-400 font-bold">ECMAScript / Rocket 2.1</span>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {/* REGEX TAB */}
        {activeTab === 'regex' && (
          <div className="h-full flex flex-col p-3 space-y-3 overflow-y-auto">
            {/* Pattern & Flags */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Regular Expression Pattern</span>
                {regexResult.valid ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid Pattern ({regexResult.matches.length} matches)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {regexResult.error}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-white/10">
                <span className="text-slate-500 font-mono text-sm">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Enter regex pattern..."
                  className="flex-1 bg-transparent font-mono text-xs text-sky-300 outline-none"
                />
                <span className="text-slate-500 font-mono text-sm">/</span>

                {/* Flags checkboxes */}
                <div className="flex items-center gap-1 pl-2 border-l border-white/10 text-[11px] font-mono">
                  {(['g', 'i', 'm', 's'] as const).map((flag) => (
                    <button
                      key={flag}
                      type="button"
                      onClick={() => setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))}
                      className={`px-1.5 py-0.5 rounded cursor-pointer font-bold ${
                        flags[flag] ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Test String and Match Decomposition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-60">
              {/* Test String */}
              <div className="flex flex-col bg-slate-900/80 rounded-xl border border-white/10 p-3 space-y-2">
                <div className="text-xs font-semibold text-white">Test String Input</div>
                <textarea
                  value={testString}
                  onChange={(e) => setTestString(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 font-mono text-xs text-slate-200 outline-none resize-none focus:border-sky-500"
                />

                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400">Replace Expression ($1, $2)</div>
                  <input
                    type="text"
                    value={replacePattern}
                    onChange={(e) => setReplacePattern(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-emerald-300 outline-none"
                  />
                  <div className="text-[10px] text-slate-400 font-mono pt-1 truncate">
                    Preview: <span className="text-white">{regexResult.replaced}</span>
                  </div>
                </div>
              </div>

              {/* Matches & Capture Groups */}
              <div className="flex flex-col bg-slate-900/80 rounded-xl border border-white/10 p-3 space-y-2 overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Capture Groups & Matches</span>
                  <span className="text-[10px] text-slate-400">{regexResult.matches.length} found</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {regexResult.matches.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      No matches found for current pattern.
                    </div>
                  ) : (
                    regexResult.matches.map((m, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-white/5 space-y-1 font-mono text-xs">
                        <div className="flex justify-between items-center text-sky-400 font-bold">
                          <span>Match #{idx + 1}: &quot;{m.match}&quot;</span>
                          <span className="text-[10px] text-slate-500 font-normal">Index: {m.index}</span>
                        </div>
                        {m.groups.length > 0 && (
                          <div className="pl-2 border-l border-sky-500/30 space-y-0.5 text-[11px]">
                            {m.groups.map((grp, gIdx) => (
                              <div key={gIdx} className="text-slate-300">
                                <span className="text-slate-500">${gIdx + 1}:</span> &quot;{grp}&quot;
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SNIPPETS TAB */}
        {activeTab === 'snippets' && (
          <div className="h-full flex overflow-hidden">
            {/* Sidebar list */}
            <div className="w-64 border-r border-white/10 bg-slate-900/50 p-2.5 flex flex-col space-y-2">
              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={snippetFilter}
                  onChange={(e) => setSnippetFilter(e.target.value)}
                  placeholder="Filter snippets..."
                  className="bg-transparent text-white outline-none w-full text-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredSnippets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      soundEngine.play('click');
                      setSelectedSnippetId(s.id);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      selectedSnippetId === s.id ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="truncate">{s.title}</div>
                    <div className={`text-[10px] ${selectedSnippetId === s.id ? 'text-sky-200' : 'text-slate-500'}`}>
                      {s.category}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Snippet Detail */}
            <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto bg-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">{currentSnippet.title}</h3>
                  <p className="text-xs text-slate-400">{currentSnippet.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopySnippet(currentSnippet.code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm shadow-sky-500/20"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-3 font-mono text-xs text-sky-200 overflow-auto">
                <pre className="whitespace-pre-wrap">{currentSnippet.code}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
