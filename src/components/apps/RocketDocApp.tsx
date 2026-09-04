import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Save,
  Download,
  Printer,
  Columns,
  Eye,
  Edit3,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Code,
  CheckSquare,
  Table as TableIcon,
  Link as LinkIcon,
  Minus,
  Sparkles,
  Clock,
  FileCode,
  Check,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { FSItem } from '../../types';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { notificationService } from '../../core/notifications/NotificationService';
import { soundEngine } from '../../utils/audio';
import { CrashRecoveryService } from '../../core/recovery/CrashRecoveryService';

interface RocketDocAppProps {
  initialFile?: FSItem | null;
  onSave?: (path: string, content: string) => void;
  onOpenFilePicker?: () => void;
}

type ViewMode = 'split' | 'edit' | 'preview';

export const RocketDocApp: React.FC<RocketDocAppProps> = ({
  initialFile,
  onSave,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(
    initialFile?.path || '/Documents/RocketOS_Design_Spec.md'
  );
  const [docTitle, setDocTitle] = useState<string>(
    initialFile?.name || 'RocketOS_Design_Spec.md'
  );
  const [content, setContent] = useState<string>(() => {
    if (initialFile && initialFile.content) return initialFile.content;
    const rfs = RocketFS.getInstance();
    const existing = rfs.findItemByPath(currentPath);
    if (existing && existing.content) return existing.content;

    return `# RocketOS 2.1 — Specification & Architecture Guide

Welcome to **Rocket Docs & Markdown**, the native document authoring engine for RocketOS.

## Executive Summary
RocketOS is a high-performance operating system platform combining deterministic **Rocket language** domain services with a responsive, glassmorphic workstation environment.

### Core Architectural Pillars
1. **Thread-Confined ARC**: Zero-pause deterministic memory management.
2. **Virtual File System (RocketFS)**: Unix-standard hierarchical virtual volume with permissions and atomic snapshots.
3. **Dual Execution Engine**: High-speed native bytecode runtime with sandboxed browser bridges.

---

## Interactive Feature Matrix
| Capability | Layer | Status | Spec Ref |
| :--- | :--- | :--- | :--- |
| Global Search | Shell / Antigravity | Production | Super+Space |
| Window Tiling | Window Manager | Active | Alt+Arrows |
| Office Suite | Productivity Core | Built-in | .rcsv / .md |
| Quick Look | File Peek | Responsive | Spacebar |

---

## Code Example: Rocket 2.1 Concurrency
\`\`\`rocket
import std.task
import std.sync

async fn fetch_telemetry(channel: String) -> Result[Int, String]:
    let result = task.compute(42)
    return Ok(result)

fn main() -> Int:
    let handle = fetch_telemetry("kernel-ring")
    match task.join(handle):
        case Ok(value):
            print("System Metric: " + string.from_int(value))
        case Err(msg):
            print("Fault: " + msg)
    return 0
\`\`\`

### Pre-Flight Checklist
- [x] Verified Rocket ABI v1 memory layout
- [x] Initialized RocketFS storage mountpoints
- [x] Wired unified Command Palette
- [ ] Finalize native QEMU ISO boot pipeline

> **Design Principle**: "Simplicity, zero-bloat architecture, and immediate responsiveness are the core values of RocketOS."
`;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Compute live analytics (words, characters, reading time)
  const stats = useMemo(() => {
    const raw = content.trim();
    const chars = content.length;
    const lines = content.split('\n').length;
    const words = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
    const readMins = Math.max(1, Math.ceil(words / 200));
    return { words, chars, lines, readMins };
  }, [content]);

  // Sync with initialFile when opening from Explorer
  useEffect(() => {
    if (initialFile) {
      setCurrentPath(initialFile.path);
      setDocTitle(initialFile.name);
      if (initialFile.content !== undefined) {
        setContent(initialFile.content);
        setIsDirty(false);
      }
    }
  }, [initialFile]);

  // Periodic draft snapshot with CrashRecoveryService
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        CrashRecoveryService.getInstance().recordDraftSnapshot(
          'docs',
          'markdown',
          currentPath,
          content
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [content, isDirty, currentPath]);

  // Save handler
  const handleSave = () => {
    const rfs = RocketFS.getInstance();
    rfs.writeFile(currentPath, content);
    if (onSave) {
      onSave(currentPath, content);
    }
    setIsDirty(false);
    setSaveStatus('saved');
    soundEngine.play('pin');
    notificationService.sendNotification({
      title: 'Document Saved',
      message: `Saved "${docTitle}" (${stats.words} words)`,
      type: 'success',
    });
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // Keyboard shortcut Ctrl+S, Ctrl+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, content, docTitle, stats.words]);

  // Text insertion / wrapping helper for formatting buttons
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const replacement = prefix + selected + suffix;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setIsDirty(true);

    soundEngine.play('hover');
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  // Print to PDF using styled print dialog
  const handlePrint = () => {
    soundEngine.play('click');
    window.print();
  };

  // Export handlers
  const handleExport = (format: 'md' | 'rmd' | 'html' | 'txt') => {
    setExportMenuOpen(false);
    let mime = 'text/markdown';
    let ext = format;
    let exportData = content;

    if (format === 'html') {
      mime = 'text/html';
      exportData = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; background: #ffffff; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: bold; }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <article>
    <h1>${docTitle}</h1>
    <div style="color: #64748b; font-size: 0.85em; margin-bottom: 24px;">${stats.words} words • ${stats.readMins} min read</div>
    <pre style="white-space: pre-wrap; font-family: inherit; background: transparent; color: inherit; padding: 0;">${content}</pre>
  </article>
</body>
</html>`;
    }

    const blob = new Blob([exportData], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = docTitle.replace(/\.[^/.]+$/, '');
    link.download = `${baseName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    soundEngine.play('click');
    notificationService.sendNotification({
      title: 'Document Exported',
      message: `Exported ${baseName}.${ext}`,
      type: 'info',
    });
  };

  // Custom Markdown AST rendering without external heavyweight dependencies
  const renderedPreview = useMemo(() => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0];
      const bodyRows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[:\-\s]+$/)));

      elements.push(
        <div key={key} className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-semibold">
                {headers.map((h, i) => (
                  <th key={i} className="py-2 px-3 border-r border-white/5 last:border-0 font-medium">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 border-r border-white/5 last:border-0 text-slate-300">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, idx) => {
      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          if (inTable) flushTable(`table-${idx}`);
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
          codeLines = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <div
              key={`code-${idx}`}
              className="my-3 rounded-xl border border-white/10 bg-slate-950 font-mono text-xs overflow-hidden shadow-inner"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-white/10 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{codeLanguage || 'text'}</span>
                </span>
                <span className="text-[10px] text-slate-500">{codeLines.length} lines</span>
              </div>
              <pre className="p-3.5 text-slate-200 overflow-x-auto leading-relaxed">
                <code>
                  {codeLines.map((cLine, cIdx) => {
                    const isRocketHighlight = codeLanguage.toLowerCase() === 'rocket';
                    return (
                      <div key={cIdx} className="flex">
                        <span className="w-8 select-none text-right pr-3 text-slate-600 font-mono text-[10px]">
                          {cIdx + 1}
                        </span>
                        <span
                          className={
                            isRocketHighlight && cLine.trim().startsWith('#')
                              ? 'text-slate-500 italic'
                              : isRocketHighlight && cLine.match(/\b(fn|pub|struct|enum|let|var|match|case|return|async)\b/)
                              ? 'text-purple-300 font-medium'
                              : isRocketHighlight && cLine.match(/\b(Int|Float|Bool|String|Array|Option|Result|Unit)\b/)
                              ? 'text-sky-300'
                              : 'text-slate-200'
                          }
                        >
                          {cLine || ' '}
                        </span>
                      </div>
                    );
                  })}
                </code>
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // Table line
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        const cols = line
          .trim()
          .slice(1, -1)
          .split('|');
        tableRows.push(cols);
        return;
      } else if (inTable) {
        flushTable(`table-${idx}`);
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={idx}
            className="text-2xl font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10 tracking-tight"
          >
            {line.slice(2)}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-xl font-semibold text-white mt-5 mb-2 tracking-tight">
            {line.slice(3)}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-base font-semibold text-slate-200 mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
        return;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={idx} className="my-5 border-t border-white/10" />);
        return;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={idx}
            className="my-3 pl-3.5 border-l-2 border-indigo-400/80 bg-indigo-500/5 py-1.5 rounded-r-lg text-slate-300 text-xs italic"
          >
            {line.slice(2)}
          </blockquote>
        );
        return;
      }

      // Interactive Checklist
      if (line.match(/^-\s+\[([ xX])\]\s+/)) {
        const checked = line.includes('[x]') || line.includes('[X]');
        const text = line.replace(/^-\s+\[([ xX])\]\s+/, '');
        elements.push(
          <div key={idx} className="flex items-center gap-2 my-1 text-xs text-slate-300">
            <span
              className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                checked
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'border-white/20 bg-white/5'
              }`}
            >
              {checked && <Check className="w-2.5 h-2.5" />}
            </span>
            <span className={checked ? 'line-through text-slate-500' : 'text-slate-200'}>
              {text}
            </span>
          </div>
        );
        return;
      }

      // Unordered list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1 text-xs text-slate-300 pl-2">
            <span className="text-indigo-400 select-none">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        return;
      }

      // Ordered list
      const olMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (olMatch) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1 text-xs text-slate-300 pl-2">
            <span className="text-indigo-400 font-mono text-[10px] select-none">{olMatch[1]}.</span>
            <span>{olMatch[2]}</span>
          </div>
        );
        return;
      }

      // Blank line
      if (!line.trim()) {
        elements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Standard paragraph with inline formatting
      elements.push(
        <p key={idx} className="text-xs text-slate-300 leading-relaxed my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });

    if (inTable) flushTable('table-final');

    return elements;
  }, [content]);

  // Inline formatting helper (bold, italic, code, links)
  function renderInlineMarkdown(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded bg-white/10 text-sky-300 font-mono text-[11px]"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(
          <strong key={keyIdx++} className="font-semibold text-white">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        parts.push(
          <em key={keyIdx++} className="italic text-slate-200">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Next plain chunk
      const nextSpecial = remaining.search(/[`*]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts;
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => {
                  setDocTitle(e.target.value);
                  setIsDirty(true);
                }}
                className="text-xs font-bold text-white bg-transparent border border-transparent hover:border-white/15 focus:border-indigo-400 rounded px-1 py-0.5 focus:outline-none transition-colors"
              />
              {isDirty && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Modified
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono px-1">{currentPath}</div>
          </div>
        </div>

        {/* View mode switches & primary actions */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              title="Editor Only"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'edit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Write</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              title="Split View"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              title="Preview Only"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl p-1 z-50 backdrop-blur-md">
                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between"
                >
                  <span>Markdown (.md)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Standard</span>
                </button>
                <button
                  onClick={() => handleExport('rmd')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between"
                >
                  <span>Rocket Doc (.rmd)</span>
                  <span className="text-[10px] text-purple-400 font-mono">Native</span>
                </button>
                <button
                  onClick={() => handleExport('html')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between"
                >
                  <span>Web Page (.html)</span>
                  <span className="text-[10px] text-sky-400 font-mono">Styled</span>
                </button>
                <button
                  onClick={() => handleExport('txt')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 flex items-center justify-between"
                >
                  <span>Plain Text (.txt)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Raw</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handlePrint}
            title="Print to PDF"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Formatting Toolbar (shown in Edit or Split mode) */}
      {viewMode !== 'preview' && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/10 bg-slate-900/50 overflow-x-auto text-slate-400">
          <button
            onClick={() => insertFormatting('**', '**', 'bold text')}
            title="Bold (Ctrl+B)"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*', 'italic text')}
            title="Italic (Ctrl+I)"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('~~', '~~', 'strikethrough text')}
            title="Strikethrough"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-white/10 mx-1" />

          <button
            onClick={() => insertFormatting('# ', '', 'Heading 1')}
            title="Heading 1"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('## ', '', 'Heading 2')}
            title="Heading 2"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('### ', '', 'Heading 3')}
            title="Heading 3"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-white/10 mx-1" />

          <button
            onClick={() => insertFormatting('> ', '', 'Quote text')}
            title="Blockquote"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- ', '', 'List item')}
            title="Bullet List"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('1. ', '', 'Numbered item')}
            title="Numbered List"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- [ ] ', '', 'Task item')}
            title="Checklist"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-white/10 mx-1" />

          <button
            onClick={() => insertFormatting('```rocket\n', '\n```', '# Rocket code\nfn run() -> Int:\n    return 0')}
            title="Rocket Code Block"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Code className="w-3.5 h-3.5 text-purple-400" />
          </button>
          <button
            onClick={() =>
              insertFormatting(
                '| Feature | Description | Status |\n| :--- | :--- | :--- |\n| Item 1 | Details | Ready |\n'
              )
            }
            title="Insert Table"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('[', '](https://example.com)', 'link text')}
            title="Insert Link"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('\n---\n')}
            title="Horizontal Rule"
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Authoring Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`h-full flex flex-col ${
              viewMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Write your Markdown documentation here..."
              spellCheck={false}
              className="flex-1 w-full p-5 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-indigo-500/30 overflow-y-auto"
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`h-full overflow-y-auto p-6 bg-slate-900/30 ${
              viewMode === 'split' ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
            }`}
          >
            <div className="markdown-preview max-w-3xl mx-auto pb-16">
              {renderedPreview}
            </div>
          </div>
        )}
      </div>

      {/* Live Document Analytics Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/10 bg-slate-900/80 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rocket Docs v2.1</span>
          </span>
          <span>{stats.words.toLocaleString()} words</span>
          <span>{stats.chars.toLocaleString()} characters</span>
          <span>{stats.lines} lines</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{stats.readMins} min read</span>
          </span>
          <span className="text-emerald-400">UTF-8</span>
        </div>
      </div>
    </div>
  );
};
