import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  BookOpen,
  Printer,
  List,
  RotateCw,
  Check,
} from 'lucide-react';
import { FSItem } from '../../types';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { notificationService } from '../../core/notifications/NotificationService';
import { soundEngine } from '../../utils/audio';

interface PdfViewerAppProps {
  initialFilePath?: string;
}

interface DocPage {
  pageNumber: number;
  title: string;
  sections: { heading: string; body: string; code?: string }[];
}

export const PdfViewerApp: React.FC<PdfViewerAppProps> = ({
  initialFilePath = '/Documents/Rocket_2.1_Specification.pdf',
}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialFilePath);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [rotation, setRotation] = useState<number>(0);

  // Authoritative Rocket 2.1 Architecture & Language Specification Document Pages
  const documentPages: DocPage[] = useMemo(
    () => [
      {
        pageNumber: 1,
        title: 'Title & Overview',
        sections: [
          {
            heading: 'Rocket 2.1 Language Specification & Runtime ABI v1',
            body: 'Authoritative specification directly based on the compiler and standard library from RyanEid06/Rocket. Rocket is a statically-typed systems language engineered for predictable latency, compile-time memory safety, and thread-confined ARC.',
          },
          {
            heading: '1. Toolchain & Runtime Overview',
            body: 'The rocketc compiler utilizes a self-hosted frontend with an LLVM 22.1.6 code generation backend. Runtime execution operates under ABI v1, providing deterministic memory management without traditional tracing garbage collection overhead.',
            code: `# Canonical Rocket 2.1 Program
import std.string

pub fn add(left: Int, right: Int) -> Int:
    return left + right

fn main() -> Int:
    let result = add(20, 22)
    print("Result: " + string.from_int(result))
    return 0`,
          },
        ],
      },
      {
        pageNumber: 2,
        title: 'Grammar & Lexical Rules',
        sections: [
          {
            heading: '2. Indentation & Block Delimiters',
            body: 'Rocket enforces a strict 4-space indentation rule. Tab characters are forbidden and trigger a compiler diagnostic ("tabs are not allowed; use spaces"). Code blocks start following a colon (:) symbol followed by an indented line.',
          },
          {
            heading: '3. Variables & Mutability',
            body: 'Bindings are declared using let for immutable variables and var for mutable bindings. Rocket eliminates null pointer exceptions by utilizing Option[T] and represents errors explicitly through Result[T, E].',
            code: `# Variables & Optionals
let pi: Float = 3.14159265
var counter: Int = 0

fn parse_score(text: String) -> Result[Int, String]:
    let parsed = string.parse_int(text)?
    return Ok(parsed)`,
          },
        ],
      },
      {
        pageNumber: 3,
        title: 'Types & Collections',
        sections: [
          {
            heading: '4. Built-in Primitives & Collections',
            body: 'Primitives include Int (signed 64-bit with overflow checks), Float (IEEE 754 64-bit binary64), Bool, Char (single-byte ASCII), and String (owned UTF-8). Compound structures include Array[T] with copy-on-write semantics, Slice[T], and Map[K, V].',
            code: `struct Point:
    x: Int
    y: Int

enum ConnectionState:
    Connecting
    Connected(Int)
    Disconnected(String)

fn evaluate_state(state: ConnectionState) -> Unit:
    match state:
        case Connected(id):
            print("Client active")
        case Disconnected(reason):
            print(reason)
        case Connecting:
            print("Handshake pending")`,
          },
        ],
      },
      {
        pageNumber: 4,
        title: 'Concurrency & OS Architecture',
        sections: [
          {
            heading: '5. Concurrency & Raylib Subsystem',
            body: 'RocketOS utilizes cooperative asynchronous tasks (Task[T]), thread-safe channels, and hardware-accelerated 2D orbital rendering via rocket.raylib bindings. Interrupt descriptors (IDT) and PML4 virtual paging isolate userland processes from kernel rings.',
            code: `import std.task
import rocket.raylib

fn render_frame() -> Unit:
    raylib.draw_rectangle(10, 10, 200, 50, 0x00FF88FF)
    raylib.draw_circle(100, 100, 32.0, 0x00AFFFFF)`,
          },
        ],
      },
    ],
    []
  );

  const totalPages = documentPages.length;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
      soundEngine.play('click');
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      soundEngine.play('click');
    }
  };

  const handlePrint = () => {
    window.print();
    notificationService.sendNotification({
      title: 'PDF Viewer',
      message: 'Sent document to browser print dialog',
      type: 'info',
    });
  };

  const activePageData = documentPages[currentPage - 1] || documentPages[0];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/90 backdrop-blur-md gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide truncate max-w-[240px]">
              {currentPath.split('/').pop()}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-xl">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              className="p-0.5 hover:text-sky-400"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] w-12 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
              className="p-0.5 hover:text-sky-400"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
            title="Rotate Page 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-xl border transition-colors ${
              showThumbnails
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}
            title="Toggle Thumbnails Sidebar"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrint}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Reader Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-48 border-r border-white/10 bg-slate-900/60 overflow-y-auto p-3 space-y-3 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Document Pages ({totalPages})
            </div>
            {documentPages.map((page) => (
              <div
                key={page.pageNumber}
                onClick={() => {
                  setCurrentPage(page.pageNumber);
                  soundEngine.play('click');
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  currentPage === page.pageNumber
                    ? 'bg-sky-500/20 border-sky-400/40 text-white shadow-md'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span>Page {page.pageNumber}</span>
                  {currentPage === page.pageNumber && <Check className="w-3 h-3 text-sky-400" />}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{page.title}</div>
                <div className="mt-2 h-12 bg-white/5 rounded border border-white/10 p-1 flex flex-col gap-1 overflow-hidden pointer-events-none">
                  <div className="h-1 bg-slate-500/40 rounded w-3/4" />
                  <div className="h-1 bg-slate-600/30 rounded w-full" />
                  <div className="h-1 bg-slate-600/30 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Center Page Canvas */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-950/90">
          <div
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-[680px] min-h-[880px] bg-slate-900 border border-white/20 rounded-2xl shadow-2xl p-10 text-slate-100 flex flex-col justify-between"
          >
            {/* Page Header */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/15 text-xs text-slate-400">
                <span className="font-bold tracking-wider uppercase text-sky-400">RocketOS Official Document</span>
                <span className="font-mono">Page {activePageData.pageNumber} of {totalPages}</span>
              </div>

              {/* Page Content */}
              <div className="mt-6 space-y-6">
                {activePageData.sections.map((sec, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {sec.heading}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {sec.body}
                    </p>
                    {sec.code && (
                      <pre className="p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
                        <code>{sec.code}</code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Page Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Rocket 2.1 Specification ABI v1 • RyanEid06/Rocket</span>
              <span>CONFIDENTIAL & AUTHORITATIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
