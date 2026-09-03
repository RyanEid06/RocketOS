import React, { useState, useEffect, useRef } from 'react';
import { FSItem } from '../../types';
import {
  Save,
  Code,
  FileText,
  Play,
  Terminal,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Replace,
  FolderOpen,
  Plus,
  X,
  History,
  CornerDownRight,
  Maximize2,
  FileCode,
  Check,
  RotateCcw
} from 'lucide-react';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { RocketDiagnosticEngine, DiagnosticSummary } from '../../core/apps/RocketDiagnosticEngine';
import { CrashRecoveryService } from '../../core/recovery/CrashRecoveryService';
import { AppSecurityManager } from '../../core/apps/AppSecurityManager';

interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  isDirty: boolean;
}

interface TextEditorAppProps {
  file?: FSItem | null;
  onSaveFile?: (path: string, newContent: string) => void;
}

export const TextEditorApp: React.FC<TextEditorAppProps> = ({ file, onSaveFile }) => {
  const CANONICAL_SAMPLE = `# Canonical Rocket 2.1 Program
# Authoritative syntax conforming to RyanEid06/Rocket specification

import std.string
import std.collections

struct Coordinate:
    x: Int
    y: Int

pub fn add(left: Int, right: Int) -> Int:
    return left + right

fn main() -> Int:
    let origin = Coordinate(10, 20)
    let sum = add(origin.x, origin.y)
    print("RocketOS Core: result = " + string.from_int(sum))
    return 0
`;

  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: 'tab-default',
      name: file?.name || 'hello.rocket',
      path: file?.path || '/home/ryan/Documents/hello.rocket',
      content: file?.content || CANONICAL_SAMPLE,
      isDirty: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-default');

  // Diagnostics & Compiler states
  type BuildState = 'IDLE' | 'DIAGNOSTICS' | 'COMPILING' | 'SUCCESS' | 'FAILED';
  const [buildState, setBuildState] = useState<BuildState>('IDLE');
  const [diagnostics, setDiagnostics] = useState<DiagnosticSummary>({
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    isValid: true,
    diagnostics: [],
  });
  const [compilerOutput, setCompilerOutput] = useState<string | null>(null);
  const [showBottomDrawer, setShowBottomDrawer] = useState<boolean>(false);
  const [bottomTab, setBottomTab] = useState<'diagnostics' | 'terminal'>('diagnostics');

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [matchCount, setMatchCount] = useState<number>(0);

  // Go to Line state
  const [showGoToLine, setShowGoToLine] = useState<boolean>(false);
  const [goToLineInput, setGoToLineInput] = useState<string>('');

  // Save As Modal state
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [saveAsPath, setSaveAsPath] = useState<string>('/home/ryan/Documents/new_script.rocket');
  const [recentFiles, setRecentFiles] = useState<string[]>([
    '/home/ryan/Documents/hello.rocket',
    '/usr/share/rocket/examples/fibonacci.rocket',
    '/usr/share/rocket/examples/graphics.rocket',
  ]);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Handle prop file changes
  useEffect(() => {
    if (file) {
      const existingTab = tabs.find((t) => t.path === file.path);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: EditorTab = {
          id: `tab-${Date.now()}`,
          name: file.name,
          path: file.path,
          content: file.content || '',
          isDirty: false,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  }, [file]);

  // Live syntax analysis on active buffer
  useEffect(() => {
    if (!activeTab) return;
    const summary = RocketDiagnosticEngine.analyze(activeTab.content);
    setDiagnostics(summary);

    // Update match count if find bar active
    if (findQuery.trim()) {
      const matches = (activeTab.content.match(new RegExp(escapeRegExp(findQuery), 'g')) || []).length;
      setMatchCount(matches);
    } else {
      setMatchCount(0);
    }

    // Debounced draft snapshot to CrashRecoveryService
    if (activeTab.isDirty) {
      const timer = setTimeout(() => {
        CrashRecoveryService.getInstance().recordDraftSnapshot(
          'editor',
          'rocket',
          activeTab.path,
          activeTab.content
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeTab?.content, findQuery]);

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const updateActiveContent = (newContent: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, content: newContent, isDirty: true } : t))
    );
  };

  const handleSave = () => {
    if (!activeTab) return;

    // Security check
    const secResult = AppSecurityManager.getInstance().validateFilesystem('editor', activeTab.path, true);
    if (secResult.type !== 'GRANTED') {
      setSaveNotice(`Denied: ${secResult.type}`);
      setTimeout(() => setSaveNotice(null), 3000);
      return;
    }

    try {
      RocketFS.getInstance().writeFile(activeTab.path, activeTab.content);
      if (onSaveFile) {
        onSaveFile(activeTab.path, activeTab.content);
      }
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t))
      );

      CrashRecoveryService.getInstance().clearDraftSnapshot('editor', activeTab.path);

      if (!recentFiles.includes(activeTab.path)) {
        setRecentFiles([activeTab.path, ...recentFiles.slice(0, 4)]);
      }

      setSaveNotice('Saved to RocketFS!');
      setTimeout(() => setSaveNotice(null), 2500);
    } catch (err) {
      setSaveNotice('Save error: ' + String(err));
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  const handleSaveAsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab || !saveAsPath.trim()) return;
    const target = saveAsPath.trim();

    try {
      RocketFS.getInstance().writeFile(target, activeTab.content);
      const fileName = target.split('/').pop() || 'untitled.rocket';
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, path: target, name: fileName, isDirty: false } : t))
      );
      setShowSaveAsModal(false);
      setSaveNotice('Saved As: ' + fileName);
      setTimeout(() => setSaveNotice(null), 2500);
    } catch (err) {
      setSaveNotice('Save As error: ' + String(err));
    }
  };

  const handleCreateNewTab = () => {
    const newTab: EditorTab = {
      id: `tab-${Date.now()}`,
      name: `untitled_${tabs.length + 1}.rocket`,
      path: `/home/ryan/Documents/untitled_${tabs.length + 1}.rocket`,
      content: '# New Rocket file\n\nfn main() -> Int:\n    return 0\n',
      isDirty: true,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
    }
  };

  // Find and Replace operations
  const handleFindNext = () => {
    if (!findQuery || !textareaRef.current || !activeTab) return;
    const text = activeTab.content;
    const currentPos = textareaRef.current.selectionEnd || 0;
    const index = text.indexOf(findQuery, currentPos);
    if (index !== -1) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(index, index + findQuery.length);
    } else {
      // Loop from beginning
      const loopIndex = text.indexOf(findQuery, 0);
      if (loopIndex !== -1) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(loopIndex, loopIndex + findQuery.length);
      }
    }
  };

  const handleReplaceOne = () => {
    if (!findQuery || !activeTab) return;
    const text = activeTab.content;
    const index = text.indexOf(findQuery);
    if (index !== -1) {
      const updated = text.slice(0, index) + replaceQuery + text.slice(index + findQuery.length);
      updateActiveContent(updated);
    }
  };

  const handleReplaceAll = () => {
    if (!findQuery || !activeTab) return;
    const updated = activeTab.content.split(findQuery).join(replaceQuery);
    updateActiveContent(updated);
  };

  const handleGoToLine = (e: React.FormEvent) => {
    e.preventDefault();
    const lineNum = parseInt(goToLineInput, 10);
    if (isNaN(lineNum) || lineNum < 1 || !textareaRef.current || !activeTab) return;

    const lines = activeTab.content.split('\n');
    let charIndex = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      charIndex += lines[i].length + 1;
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charIndex, charIndex + (lines[lineNum - 1]?.length || 0));
    setShowGoToLine(false);
    setGoToLineInput('');
  };

  // rocketc Compiler Execution Simulation
  const handleCompileAndRun = () => {
    if (!activeTab) return;
    setShowBottomDrawer(true);
    setBottomTab('terminal');
    setBuildState('DIAGNOSTICS');
    setCompilerOutput(`[rocketc 2.1 - Build Pipeline]\nAnalyzing AST for '${activeTab.name}'...\n`);

    setTimeout(() => {
      const diag = RocketDiagnosticEngine.analyze(activeTab.content);
      if (diag.errorCount > 0) {
        setBuildState('FAILED');
        setCompilerOutput((prev) =>
          `${prev}[Diagnostics Failed] ${diag.errorCount} error(s) found in source:\n` +
          diag.diagnostics
            .filter((d) => d.severity === 'error')
            .map((d) => `  line ${d.lineNumber}:${d.column}: [${d.ruleId}] ${d.message}`)
            .join('\n') +
          `\n\nBuild aborted. Please resolve diagnostics before invoking LLVM backend.`
        );
        return;
      }

      setBuildState('COMPILING');
      setCompilerOutput((prev) =>
        `${prev}[Diagnostics Clean] Generating LLVM 22.1.6 Intermediate Representation (IR)...\n` +
        `Linking thread-confined ARC runtime and safe memory buffers...\n` +
        `Target: x86_64-unknown-rocket-elf (ABI v1)\n`
      );

      setTimeout(() => {
        setBuildState('SUCCESS');
        setCompilerOutput((prev) =>
          `${prev}[Compilation Succeeded] Emitted binary: /bin/${activeTab.name.replace(/\.[^/.]+$/, '')} (24.8 KB)\n` +
          `------------------------------------------------------------\n` +
          `[Process Output (PID ${100 + Math.floor(Math.random() * 800)})]:\n` +
          (activeTab.content.includes('print(')
            ? `RocketOS Core: result = 30\nExecution completed with exit code 0.`
            : `Program exited cleanly with status 0.`)
        );
      }, 700);
    }, 500);
  };

  const lines = (activeTab?.content || '').split('\n');

  return (
    <div id="text-editor-app" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Liquid Glass Navigation Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md border-b border-white/10 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-white text-xs mr-2">
            <FileCode className="w-4 h-4 text-sky-400" />
            <span>Rocket Code</span>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shadow-sm transition-all"
            title="Save file (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={() => {
              setSaveAsPath(activeTab?.path || '/home/ryan/Documents/new.rocket');
              setShowSaveAsModal(true);
            }}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer border border-white/5"
            title="Save As..."
          >
            Save As
          </button>

          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showFindReplace
                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                : 'bg-slate-800 hover:bg-slate-700 border-white/5 text-slate-300'
            }`}
            title="Find and Replace (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowGoToLine(!showGoToLine)}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 text-[11px] cursor-pointer"
            title="Go to Line"
          >
            Go to Line
          </button>
        </div>

        {/* Compiler controls */}
        <div className="flex items-center gap-2">
          {saveNotice && (
            <span className="text-emerald-400 text-[11px] font-mono animate-pulse flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {saveNotice}
            </span>
          )}

          <div
            onClick={() => {
              setShowBottomDrawer(true);
              setBottomTab('diagnostics');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer text-[11px] font-mono ${
              diagnostics.errorCount > 0
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : diagnostics.warningCount > 0
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {diagnostics.errorCount > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>
              {diagnostics.errorCount} Errors, {diagnostics.warningCount} Warnings
            </span>
          </div>

          <button
            onClick={handleCompileAndRun}
            disabled={buildState === 'COMPILING' || buildState === 'DIAGNOSTICS'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-md shadow-emerald-950/40 cursor-pointer transition-all"
            title="Compile with rocketc 2.1"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{buildState === 'COMPILING' ? 'Building...' : 'Build & Run'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center bg-slate-900/60 border-b border-white/5 overflow-x-auto px-2 shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 border-t-2 text-xs cursor-pointer transition-all shrink-0 max-w-[200px] ${
                isActive
                  ? 'bg-slate-950 border-sky-400 text-white font-medium'
                  : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">{tab.name}</span>
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
              )}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={handleCreateNewTab}
          className="p-1.5 ml-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          title="New buffer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="px-4 py-2 bg-slate-900 border-b border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="Find..."
              className="bg-transparent outline-none text-white text-xs w-36"
            />
            {findQuery && (
              <span className="text-[10px] text-slate-400 font-mono">
                {matchCount} match{matchCount === 1 ? '' : 'es'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
            <Replace className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace with..."
              className="bg-transparent outline-none text-white text-xs w-36"
            />
          </div>

          <button
            onClick={handleFindNext}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] cursor-pointer"
          >
            Find Next
          </button>
          <button
            onClick={handleReplaceOne}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] cursor-pointer"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] cursor-pointer"
          >
            Replace All
          </button>

          <button
            onClick={() => setShowFindReplace(false)}
            className="ml-auto p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Go to Line Bar */}
      {showGoToLine && (
        <form
          onSubmit={handleGoToLine}
          className="px-4 py-2 bg-slate-900 border-b border-white/10 flex items-center gap-2 text-xs"
        >
          <span className="text-slate-400">Go to Line (1 - {lines.length}):</span>
          <input
            type="number"
            min="1"
            max={lines.length}
            value={goToLineInput}
            onChange={(e) => setGoToLineInput(e.target.value)}
            className="w-20 px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 rounded-lg text-white text-xs font-semibold"
          >
            Jump
          </button>
          <button
            type="button"
            onClick={() => setShowGoToLine(false)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Editor Main Canvas: Gutter + Monospace Textarea */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers Gutter */}
        <div className="w-12 bg-slate-950 border-r border-white/5 select-none py-3 text-right pr-3 font-mono text-[11px] text-slate-600 shrink-0 leading-6">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea code editor */}
        <textarea
          ref={textareaRef}
          value={activeTab?.content || ''}
          onChange={(e) => updateActiveContent(e.target.value)}
          spellCheck={false}
          className="flex-1 p-3 bg-transparent text-slate-200 font-mono text-[12px] leading-6 resize-none outline-none overflow-auto whitespace-pre selection:bg-sky-600/40"
          placeholder="# Write Rocket 2.1 code here..."
        />
      </div>

      {/* Bottom Drawer: Diagnostics & Compiler Output */}
      {showBottomDrawer && (
        <div className="h-44 bg-slate-900/95 border-t border-white/10 flex flex-col shrink-0">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/5 text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBottomTab('diagnostics')}
                className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                  bottomTab === 'diagnostics' ? 'text-sky-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Diagnostics ({diagnostics.diagnostics.length})</span>
              </button>
              <button
                onClick={() => setBottomTab('terminal')}
                className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                  bottomTab === 'terminal' ? 'text-sky-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Compiler & Output</span>
              </button>
            </div>

            <button
              onClick={() => setShowBottomDrawer(false)}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px]">
            {bottomTab === 'diagnostics' ? (
              <div className="space-y-1">
                {diagnostics.diagnostics.length === 0 ? (
                  <div className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Zero diagnostics detected. Conforms to Rocket 2.1 specification.</span>
                  </div>
                ) : (
                  diagnostics.diagnostics.map((d, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        if (textareaRef.current && activeTab) {
                          const lines = activeTab.content.split('\n');
                          let pos = 0;
                          for (let j = 0; j < Math.min(d.lineNumber - 1, lines.length); j++) {
                            pos += lines[j].length + 1;
                          }
                          textareaRef.current.focus();
                          textareaRef.current.setSelectionRange(pos, pos + (lines[d.lineNumber - 1]?.length || 0));
                        }
                      }}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer text-slate-300"
                    >
                      {d.severity === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="font-semibold text-sky-400">[line {d.lineNumber}:{d.column}]</span>
                      <span className="text-slate-400">[{d.ruleId}]</span>
                      <span>{d.message}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                {compilerOutput || 'No compiler output available. Press "Build & Run" to invoke rocketc.'}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Editor Status Bar */}
      <div className="px-4 py-1.5 bg-slate-900 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-300">{activeTab?.path}</span>
          <span>•</span>
          <span>{lines.length} Lines</span>
          <span>•</span>
          <span>UTF-8</span>
          <span>•</span>
          <span>Spaces: 4</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowBottomDrawer(!showBottomDrawer);
              setBottomTab('diagnostics');
            }}
            className="hover:text-white cursor-pointer"
          >
            {diagnostics.errorCount} Errors, {diagnostics.warningCount} Warnings
          </button>
          <span>•</span>
          <span className="font-mono text-sky-400">Rocket 2.1 (rocketc ABI v1)</span>
        </div>
      </div>

      {/* Save As Modal */}
      {showSaveAsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">Save File to RocketFS</h3>
            <p className="text-slate-400 text-xs">Enter path (.rocket or text file):</p>
            <form onSubmit={handleSaveAsSubmit} className="space-y-4">
              <input
                type="text"
                value={saveAsPath}
                onChange={(e) => setSaveAsPath(e.target.value)}
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
