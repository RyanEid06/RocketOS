import React, { useState, useMemo } from 'react';
import {
  Binary,
  Search,
  FileCode,
  FolderOpen,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

type HexTab = 'hex' | 'disasm' | 'strings';

export const HexEditorApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HexTab>('hex');
  const [selectedOffset, setSelectedOffset] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFileLabel, setSelectedFileLabel] = useState<string>('rocket_kernel.sys');

  // Sample binary buffer (ELF64 header + Rocket ABI v1 bytecode header)
  const sampleBytes = useMemo<number[]>(() => {
    return [
      0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x02, 0x00, 0x3e, 0x00, 0x01, 0x00, 0x00, 0x00, 0x80, 0x10, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xa0, 0x3b, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x38, 0x00, 0x09, 0x00, 0x40, 0x00, 0x1d, 0x00, 0x1c, 0x00,
      0x52, 0x4f, 0x43, 0x4b, 0x45, 0x54, 0x5f, 0x41, 0x42, 0x49, 0x5f, 0x56, 0x31, 0x00, 0x00, 0x01,
      0x48, 0x89, 0xe5, 0x48, 0x83, 0xec, 0x20, 0x89, 0x7d, 0xec, 0x48, 0x89, 0x75, 0xe0, 0xb8, 0x00,
      0x00, 0x00, 0x00, 0xe8, 0x45, 0x01, 0x00, 0x00, 0x48, 0x89, 0x45, 0xf8, 0x48, 0x8b, 0x45, 0xf8,
      0x48, 0x83, 0xc4, 0x20, 0x5d, 0xc3, 0x90, 0x90, 0x66, 0x2e, 0x0f, 0x1f, 0x84, 0x00, 0x00, 0x00,
      0x2e, 0x72, 0x6f, 0x64, 0x61, 0x74, 0x61, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x52,
      0x6f, 0x63, 0x6b, 0x65, 0x74, 0x4f, 0x53, 0x21, 0x0a, 0x00, 0x6c, 0x69, 0x62, 0x73, 0x74, 0x64,
      0x2e, 0x73, 0x6f, 0x00, 0x5f, 0x5a, 0x34, 0x6d, 0x61, 0x69, 0x6e, 0x76, 0x00, 0x00, 0x00, 0x00,
      0x55, 0x48, 0x89, 0xe5, 0x41, 0x57, 0x41, 0x56, 0x41, 0x55, 0x41, 0x54, 0x53, 0x48, 0x83, 0xec,
    ];
  }, []);

  const totalBytes = sampleBytes.length;
  const currentByte = sampleBytes[selectedOffset] ?? 0;

  // Data Inspector calculations
  const inspector = useMemo(() => {
    const b0 = sampleBytes[selectedOffset] ?? 0;
    const b1 = sampleBytes[selectedOffset + 1] ?? 0;
    const b2 = sampleBytes[selectedOffset + 2] ?? 0;
    const b3 = sampleBytes[selectedOffset + 3] ?? 0;

    const u8 = b0;
    const i8 = b0 > 127 ? b0 - 256 : b0;
    const u16le = b0 | (b1 << 8);
    const u32le = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
    const binStr = b0.toString(2).padStart(8, '0');

    return {
      offsetHex: `0x${selectedOffset.toString(16).padStart(8, '0').toUpperCase()}`,
      bin: binStr,
      u8,
      i8,
      u16le,
      u32le,
      hex: `0x${b0.toString(16).padStart(2, '0').toUpperCase()}`,
    };
  }, [sampleBytes, selectedOffset]);

  // Simulated Disassembly Instructions
  const disasmInstructions = [
    { offset: '0x00401080', bytes: '55', mnemonic: 'push', ops: '%rbp', comment: 'Setup stack frame' },
    { offset: '0x00401081', bytes: '48 89 E5', mnemonic: 'mov', ops: '%rsp, %rbp', comment: 'Base pointer anchor' },
    { offset: '0x00401084', bytes: '48 83 EC 20', mnemonic: 'sub', ops: '$0x20, %rsp', comment: 'Reserve 32 bytes' },
    { offset: '0x00401088', bytes: '89 7D EC', mnemonic: 'mov', ops: '%edi, -0x14(%rbp)', comment: 'Store argc' },
    { offset: '0x0040108B', bytes: '48 89 75 E0', mnemonic: 'mov', ops: '%rsi, -0x20(%rbp)', comment: 'Store argv' },
    { offset: '0x0040108F', bytes: 'B8 00 00 00 00', mnemonic: 'mov', ops: '$0x0, %eax', comment: 'Clear accumulator' },
    { offset: '0x00401094', bytes: 'E8 45 01 00 00', mnemonic: 'call', ops: '0x004011DE <rocket_init>', comment: 'Bootstrap runtime' },
    { offset: '0x00401099', bytes: '48 89 45 F8', mnemonic: 'mov', ops: '%rax, -0x8(%rbp)', comment: 'Save exit code' },
    { offset: '0x0040109D', bytes: '48 83 C4 20', mnemonic: 'add', ops: '$0x20, %rsp', comment: 'Clean stack' },
    { offset: '0x004010A1', bytes: '5D', mnemonic: 'pop', ops: '%rbp', comment: 'Restore base pointer' },
    { offset: '0x004010A2', bytes: 'C3', mnemonic: 'ret', ops: '', comment: 'Return to caller' },
  ];

  // Printable ASCII chunks (strings)
  const extractedStrings = [
    { offset: '0x00000040', text: 'ROCKET_ABI_V1' },
    { offset: '0x00000080', text: '.rodata' },
    { offset: '0x00000088', text: 'Hello, RocketOS!\n' },
    { offset: '0x0000009A', text: 'libstd.so' },
    { offset: '0x000000A4', text: '_Z4mainv' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Binary className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-xs text-white">ByteForge Hex Editor</span>
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px]">
              {selectedFileLabel} ({totalBytes} bytes)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('hex')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'hex' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hex & ASCII
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('disasm')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'disasm' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Disassembly (x86_64)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('strings')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'strings' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Strings
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10 text-xs w-48">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hex / ASCII..."
            className="bg-transparent text-white outline-none w-full font-mono text-[11px]"
          />
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Hex / Disasm Views */}
        <div className="flex-1 overflow-auto p-3 font-mono text-xs">
          {activeTab === 'hex' && (
            <div className="space-y-1">
              {/* Header */}
              <div className="flex text-slate-500 text-[11px] pb-1 border-b border-white/10 font-bold">
                <span className="w-24">OFFSET</span>
                <span className="flex-1 tracking-widest">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
                <span className="w-36 text-center">ASCII</span>
              </div>

              {/* Rows */}
              {Array.from({ length: Math.ceil(sampleBytes.length / 16) }).map((_, rowIdx) => {
                const rowOffset = rowIdx * 16;
                const rowBytes = sampleBytes.slice(rowOffset, rowOffset + 16);

                return (
                  <div key={rowOffset} className="flex items-center hover:bg-white/5 py-0.5 rounded">
                    {/* Offset */}
                    <span className="w-24 text-slate-500 font-bold">
                      {rowOffset.toString(16).padStart(8, '0').toUpperCase()}
                    </span>

                    {/* Hex bytes */}
                    <div className="flex-1 flex gap-1.5">
                      {rowBytes.map((b, colIdx) => {
                        const idx = rowOffset + colIdx;
                        const isSelected = selectedOffset === idx;
                        return (
                          <button
                            key={colIdx}
                            type="button"
                            onClick={() => {
                              soundEngine.play('click');
                              setSelectedOffset(idx);
                            }}
                            className={`w-5 text-center rounded transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500 text-white font-bold'
                                : b === 0
                                ? 'text-slate-600'
                                : 'text-slate-300 hover:text-white'
                            } ${colIdx === 7 ? 'mr-2' : ''}`}
                          >
                            {b.toString(16).padStart(2, '0').toUpperCase()}
                          </button>
                        );
                      })}
                    </div>

                    {/* ASCII */}
                    <span className="w-36 text-slate-400 tracking-widest pl-2">
                      {rowBytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'disasm' && (
            <div className="space-y-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/30 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-white/10">
                    <th className="py-2 px-3">Address</th>
                    <th className="py-2 px-3">Machine Code</th>
                    <th className="py-2 px-3">Mnemonic</th>
                    <th className="py-2 px-3">Operands</th>
                    <th className="py-2 px-3">Annotation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {disasmInstructions.map((inst, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-2 px-3 text-sky-400">{inst.offset}</td>
                      <td className="py-2 px-3 text-slate-500">{inst.bytes}</td>
                      <td className="py-2 px-3 font-bold text-amber-300">{inst.mnemonic}</td>
                      <td className="py-2 px-3 text-white">{inst.ops}</td>
                      <td className="py-2 px-3 text-slate-400 font-sans text-xs italic">{inst.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'strings' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400">Extracted null-terminated UTF-8 ASCII symbols:</div>
              <div className="border border-white/10 rounded-xl bg-slate-900/60 divide-y divide-white/5">
                {extractedStrings.map((str, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between font-mono text-xs hover:bg-white/5">
                    <span className="text-sky-400">{str.offset}</span>
                    <span className="text-emerald-300 font-semibold">{str.text}</span>
                    <span className="text-slate-500 text-[10px]">{str.text.length} chars</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Data Inspector Panel */}
        <div className="w-64 border-l border-white/10 bg-slate-900/80 p-3 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white">Data Inspector</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400">Selected Offset:</div>
              <div className="text-sky-300 font-bold">{inspector.offsetHex}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">Hex Value:</div>
              <div className="text-emerald-400 font-bold">{inspector.hex}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">Binary Byte:</div>
              <div className="text-white font-bold">{inspector.bin}</div>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>UInt8:</span>
                <span className="text-white">{inspector.u8}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Int8:</span>
                <span className="text-white">{inspector.i8}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>UInt16 (LE):</span>
                <span className="text-white">{inspector.u16le}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>UInt32 (LE):</span>
                <span className="text-white">{inspector.u32le}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
