import React, { useState, useEffect } from 'react';
import { FSItem } from '../../types';
import { Save, Code, Check, FileText, Play, Terminal, Sparkles, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface TextEditorAppProps {
  file?: FSItem | null;
  onSaveFile: (path: string, newContent: string) => void;
}

export const TextEditorApp: React.FC<TextEditorAppProps> = ({ file, onSaveFile }) => {
  const [content, setContent] = useState<string>(
    file?.content || `fn main() -> i32 {
    println("Rocket 3.0 Bare-Metal Kernel Loaded");
    let mut speed: f32 = 42.0;
    println("Orbital velocity: {} km/s", speed);
    return 0;
}`
  );
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [compileOutput, setCompileOutput] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [showConsole, setShowConsole] = useState<boolean>(false);

  useEffect(() => {
    if (file) {
      setContent(file.content || '');
      setIsSaved(true);
      setCompileOutput(null);
      setShowConsole(false);
    }
  }, [file]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsSaved(false);
  };

  const handleSave = () => {
    if (file) {
      onSaveFile(file.path, content);
      setIsSaved(true);
    }
  };

  const handleRunCode = () => {
    setIsCompiling(true);
    setShowConsole(true);
    setCompileOutput('Compiling with rocketc 2.1 (LLVM 22.1.6 Backend)...\nChecking PML4 paging and borrow invariants...\n');

    setTimeout(() => {
      setIsCompiling(false);
      // Simulate compilation and execution
      const hasError = content.includes('syntax_error_test');
      if (hasError) {
        setCompileOutput((prev) => `${prev}error[E004]: Unexpected token at line 4\nBuild failed with exit code 1.`);
      } else {
        setCompileOutput((prev) => `${prev}Compilation successful! [Binary emitted: /bin/a.out (18.4 KB)]\n------------------------------------\n[Program Output]:\n${
          content.includes('println')
            ? 'Rocket 3.0 Bare-Metal Kernel Loaded\nOrbital velocity: 42 km/s\n[Process completed with exit code 0]'
            : 'Program finished with return code 0.'
        }`);
      }
    }, 600);
  };

  const insertSnippet = (snippet: string) => {
    setContent((prev) => `${prev}\n${snippet}`);
    setIsSaved(false);
  };

  const lines = content.split('\n');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const rawData =
        e.dataTransfer.getData('application/rocket-fs-item') ||
        e.dataTransfer.getData('text/plain');
      if (rawData) {
        if (rawData.startsWith('{') && rawData.includes('"content"')) {
          const item: FSItem = JSON.parse(rawData);
          setContent(item.content || '');
          setIsSaved(true);
        } else {
          setContent(rawData);
          setIsSaved(false);
        }
      }
    } catch {
      const text = e.dataTransfer.getData('text/plain');
      if (text) {
        setContent(text);
        setIsSaved(false);
      }
    }
  };

  return (
    <div
      id="text-editor-app"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none"
    >
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          {file?.name.endsWith('.rocket') || file?.name.endsWith('.rkt') ? (
            <Code className="w-4 h-4 text-emerald-400" />
          ) : (
            <FileText className="w-4 h-4 text-slate-400" />
          )}
          <span className="font-semibold text-slate-200">
            {file?.name || 'untitled.rocket'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
            Rocket 2.1
          </span>
          {!isSaved && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/80">
              Unsaved
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Snippets Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer border border-slate-700">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Snippets</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl p-1 z-50">
              <button
                onClick={() => insertSnippet('fn calc_thrust(mass: f32) -> f32 {\n    return mass * 9.81 * 1.4;\n}')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                + Function definition
              </button>
              <button
                onClick={() => insertSnippet('InitWindow(640, 360, "Raylib Window");\nDrawCircle(100, 100, 20, RED);')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                + Raylib 2D Canvas
              </button>
              <button
                onClick={() => insertSnippet('struct Satellite {\n    id: u32,\n    altitude: f64,\n    active: bool,\n}')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                + Struct definition
              </button>
            </div>
          </div>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isCompiling}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-sm shadow-emerald-950"
            title="Compile and run with rocketc"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isCompiling ? 'Compiling...' : 'Run'}</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs cursor-pointer transition-colors ${
              isSaved
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white font-medium'
            }`}
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Editor Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div className="w-10 bg-slate-950 text-slate-600 font-mono text-[11px] py-3 text-right pr-2 select-none border-r border-slate-900 leading-relaxed shrink-0">
          {lines.map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={handleChange}
          spellCheck={false}
          className="flex-1 bg-slate-950 text-slate-200 font-mono text-xs p-3 focus:outline-none resize-none leading-relaxed select-text"
        />
      </div>

      {/* Bottom Live Compiler Console */}
      {showConsole && (
        <div className="h-36 bg-slate-900/95 border-t border-slate-800 flex flex-col shrink-0 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/5 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Terminal className="w-3.5 h-3.5" />
              <span>rocketc compilation output</span>
            </div>
            <button
              onClick={() => setShowConsole(false)}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Close
            </button>
          </div>
          <pre className="flex-1 p-2.5 overflow-y-auto font-mono text-[11px] text-slate-200 leading-tight select-text whitespace-pre-wrap">
            {compileOutput}
          </pre>
        </div>
      )}

      {/* Status Bar */}
      <div className="px-3 py-1 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div>Path: {file?.path || '/Desktop/untitled.rocket'}</div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Syntax Valid
          </span>
          <span>Encoding: UTF-8</span>
          <span>Lines: {lines.length}</span>
        </div>
      </div>
    </div>
  );
};
