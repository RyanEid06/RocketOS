import React, { useState, useRef, useEffect } from 'react';
import { FSItem } from '../../types';

interface TerminalAppProps {
  fileSystem: FSItem[];
  currentPath?: string;
  onReboot: () => void;
  onOpenFile: (file: FSItem) => void;
}

interface CommandHistory {
  command: string;
  output: string | React.ReactNode;
}

export const TerminalApp: React.FC<TerminalAppProps> = ({
  fileSystem,
  currentPath = '/Desktop',
  onReboot,
  onOpenFile,
}) => {
  const [history, setHistory] = useState<CommandHistory[]>([
    {
      command: 'sysinfo',
      output: (
        <div className="text-slate-300 space-y-1">
          <div className="text-sky-400 font-bold">RocketOS v2.1.0-native (x86_64-pc-windows-msvc)</div>
          <div>Compiler: rocketc 2.1 (LLVM 22.1.6 Backend | Stage3 Self-Hosted | ABI v1)</div>
          <div>Repository: https://github.com/RyanEid06/Rocket</div>
          <div>Graphics: raylib 6.0 Safe Primitive Adapter | rocket.motion 1.0</div>
          <div>Memory: Thread-Confined ARC + Atomic Publication Graph</div>
          <div className="text-slate-400 mt-2">
            Type <span className="text-sky-300 font-semibold">&apos;rocketc help&apos;</span> or try <span className="text-sky-300 font-semibold">&apos;rocketc run hello.rocket&apos;</span>
          </div>
        </div>
      ),
    },
  ]);

  const [inputVal, setInputVal] = useState<string>('');
  const [cwd, setCwd] = useState<string>(currentPath);
  const [pastCommands, setPastCommands] = useState<string[]>(['sysinfo']);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const findItemByPath = (items: FSItem[], pathStr: string): FSItem | null => {
    for (const item of items) {
      if (item.path === pathStr) return item;
      if (item.children) {
        const found = findItemByPath(item.children, pathStr);
        if (found) return found;
      }
    }
    return null;
  };

  // Tab completion helper
  const handleTabComplete = () => {
    const trimmed = inputVal.trimStart();
    const parts = trimmed.split(' ');

    const availableCommands = [
      'help',
      'ls',
      'cd',
      'cat',
      'edit',
      'rocketc',
      'clear',
      'reboot',
      'neofetch',
      'fetch',
      'top',
      'matrix',
      'history',
      'whoami',
      'uname',
      'pwd',
      'echo',
    ];

    if (parts.length === 1) {
      const match = availableCommands.find((c) => c.startsWith(parts[0]));
      if (match) {
        setInputVal(`${match} `);
      }
    } else {
      const folder = findItemByPath(fileSystem, cwd);
      if (folder && folder.children) {
        const lastArg = parts[parts.length - 1];
        const match = folder.children.find((f) => f.name.toLowerCase().startsWith(lastArg.toLowerCase()));
        if (match) {
          parts[parts.length - 1] = match.name;
          setInputVal(parts.join(' '));
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pastCommands.length === 0) return;
      const nextIdx = historyIndex === -1 ? pastCommands.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputVal(pastCommands[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= pastCommands.length) {
        setHistoryIndex(-1);
        setInputVal('');
      } else {
        setHistoryIndex(nextIdx);
        setInputVal(pastCommands[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setHistory([]);
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let output: string | React.ReactNode = '';

    switch (cmd) {
      case 'help':
        output = (
          <div className="space-y-1 text-slate-300">
            <div className="font-semibold text-sky-400">Available Commands:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
              <div><span className="text-sky-300">help</span> - Show this command directory</div>
              <div><span className="text-sky-300">ls [path]</span> - List directory items</div>
              <div><span className="text-sky-300">cd &lt;dir&gt;</span> - Change directory</div>
              <div><span className="text-sky-300">cat &lt;file&gt;</span> - Print file text</div>
              <div><span className="text-sky-300">edit &lt;file&gt;</span> - Launch in Text Editor</div>
              <div><span className="text-sky-300">rocketc run &lt;file&gt;</span> - Compile and execute Rocket program</div>
              <div><span className="text-sky-300">rocketc check &lt;file&gt;</span> - Semantic and type verification</div>
              <div><span className="text-sky-300">rocketc emit-ir &lt;file&gt;</span> - Output verified LLVM 22 IR</div>
              <div><span className="text-sky-300">rocketc emit-asm &lt;file&gt;</span> - Output native machine assembly</div>
              <div><span className="text-sky-300">rocketc target</span> - Query supported cross targets</div>
              <div><span className="text-sky-300">rocketc --version</span> - Show compiler version & commit info</div>
              <div><span className="text-sky-300">reboot</span> - Restart RocketOS boot cycle</div>
              <div><span className="text-sky-300">clear</span> - Clear screen</div>
            </div>
          </div>
        );
        break;

      case 'clear':
        setHistory([]);
        setInputVal('');
        return;

      case 'reboot':
        onReboot();
        return;

      case 'pwd':
        output = cwd;
        break;

      case 'ls': {
        const targetPath = args[0]
          ? args[0].startsWith('/')
            ? args[0]
            : cwd === '/'
            ? `/${args[0]}`
            : `${cwd}/${args[0]}`
          : cwd;

        const folder = findItemByPath(fileSystem, targetPath);
        if (!folder) {
          output = `ls: cannot access '${args[0]}': No such file or directory`;
        } else if (folder.type !== 'folder') {
          output = folder.name;
        } else {
          const items = folder.children || [];
          output = (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {items.map((item) => (
                <span
                  key={item.id}
                  className={
                    item.type === 'folder'
                      ? 'text-sky-400 font-semibold cursor-pointer hover:underline'
                      : item.name.endsWith('.rocket')
                      ? 'text-emerald-300 font-mono cursor-pointer hover:underline'
                      : 'text-slate-200 cursor-pointer hover:underline'
                  }
                  onClick={() => {
                    if (item.type === 'folder') {
                      setCwd(item.path);
                    } else {
                      onOpenFile(item);
                    }
                  }}
                >
                  {item.name}
                  {item.type === 'folder' ? '/' : ''}
                </span>
              ))}
            </div>
          );
        }
        break;
      }

      case 'cd': {
        if (!args[0] || args[0] === '~') {
          setCwd('/Desktop');
          output = '';
        } else if (args[0] === '..') {
          const parts = cwd.split('/').filter(Boolean);
          parts.pop();
          setCwd(parts.length === 0 ? '/' : '/' + parts.join('/'));
          output = '';
        } else {
          const target = args[0].startsWith('/')
            ? args[0]
            : cwd === '/'
            ? `/${args[0]}`
            : `${cwd}/${args[0]}`;
          const item = findItemByPath(fileSystem, target);
          if (item && item.type === 'folder') {
            setCwd(item.path);
            output = '';
          } else {
            output = `cd: no such directory: ${args[0]}`;
          }
        }
        break;
      }

      case 'cat': {
        if (!args[0]) {
          output = 'cat: missing file argument';
        } else {
          const target = args[0].startsWith('/')
            ? args[0]
            : cwd === '/'
            ? `/${args[0]}`
            : `${cwd}/${args[0]}`;
          const item = findItemByPath(fileSystem, target);
          if (!item) {
            output = `cat: ${args[0]}: No such file or directory`;
          } else if (item.type === 'folder') {
            output = `cat: ${args[0]}: Is a directory`;
          } else {
            output = (
              <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap">
                {item.content || '(empty file)'}
              </pre>
            );
          }
        }
        break;
      }

      case 'edit': {
        if (!args[0]) {
          output = 'edit: specify a file name to open in Editor';
        } else {
          const target = args[0].startsWith('/')
            ? args[0]
            : cwd === '/'
            ? `/${args[0]}`
            : `${cwd}/${args[0]}`;
          const item = findItemByPath(fileSystem, target);
          if (item && item.type === 'file') {
            onOpenFile(item);
            output = `Opened ${item.name} in Code Editor.`;
          } else {
            output = `edit: ${args[0]}: File not found.`;
          }
        }
        break;
      }

      case 'rocketc':
      case 'rocket': {
        const sub = args[0];
        const targetFileName = args[1] || 'hello.rocket';
        const target = targetFileName.startsWith('/')
          ? targetFileName
          : cwd === '/'
          ? `/${targetFileName}`
          : `${cwd}/${targetFileName}`;
        const fileItem = findItemByPath(fileSystem, target);

        if (!sub || sub === 'help' || sub === '--help') {
          output = (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400 font-bold">Rocket Compiler (rocketc) CLI Dictionary</div>
              <div className="text-slate-400">Usage: rocketc [command] [options] &lt;input.rocket&gt;</div>
              <div className="mt-2 space-y-1">
                <div>  <span className="text-emerald-300">check &lt;file&gt;</span>      Parse, resolve imports, and type-check without code generation</div>
                <div>  <span className="text-emerald-300">run &lt;file&gt;</span>        Compile and execute native application immediately</div>
                <div>  <span className="text-emerald-300">build &lt;file&gt;</span>      Compile native executable to .rocketc/bin</div>
                <div>  <span className="text-emerald-300">emit-ir &lt;file&gt;</span>    Emit verified, unoptimized LLVM 22 IR</div>
                <div>  <span className="text-emerald-300">emit-asm &lt;file&gt;</span>   Emit native machine assembly</div>
                <div>  <span className="text-emerald-300">target</span>           Query supported platform targets and triples</div>
                <div>  <span className="text-emerald-300">fmt &lt;file&gt;</span>        Format file with canonical LF and 4-space indentation</div>
                <div>  <span className="text-emerald-300">bind &lt;header.h&gt;</span>   Generate safe Rocket bindings for C header</div>
                <div>  <span className="text-emerald-300">--version</span>         Display compiler version, LLVM backend, and commit SHA</div>
              </div>
            </div>
          );
        } else if (sub === '--version' || sub === '-v' || sub === 'version') {
          output = (
            <div className="text-slate-300 font-mono space-y-1">
              <div className="text-sky-400 font-bold">rocketc 2.1.0-release (LLVM 22.1.6, ABI v1)</div>
              <div>Host Target: x86_64-pc-windows-msvc (Windows x64)</div>
              <div>Stage: Stage3 Self-Hosted (Rocket-written compiler)</div>
              <div>Origin: https://github.com/RyanEid06/Rocket (Commit: master)</div>
            </div>
          );
        } else if (sub === 'target') {
          output = (
            <div className="text-slate-300 font-mono space-y-1">
              <div className="text-sky-400 font-bold">Rocket 2.1 Supported Production Targets (Phase 19 Parity):</div>
              <div>  1. <span className="text-emerald-400 font-bold">windows-x64</span>  - x86_64-pc-windows-msvc [HOST/TIER-1]</div>
              <div>  2. <span className="text-emerald-400 font-bold">linux-x64</span>    - x86_64-unknown-linux-gnu [TIER-1]</div>
              <div>  3. <span className="text-emerald-400 font-bold">linux-arm64</span>  - aarch64-unknown-linux-gnu [TIER-1]</div>
              <div>  4. <span className="text-emerald-400 font-bold">macos-arm64</span>  - aarch64-apple-darwin [TIER-1]</div>
              <div className="text-amber-400 mt-1">Experimental/Evaluation:</div>
              <div className="text-slate-400">  - windows-arm64 (aarch64-pc-windows-msvc) [Under evaluation]</div>
              <div className="text-slate-500">  - wasm32-unknown-unknown [Not yet implemented]</div>
            </div>
          );
        } else if (sub === 'check') {
          output = (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400 font-bold">[rocketc check] Validating {targetFileName}...</div>
              <div className="text-emerald-400">✓ Phase 1: Indentation-aware Lexer and Token Stream OK</div>
              <div className="text-emerald-400">✓ Phase 2: Typed High-Level IR (HIR) resolved</div>
              <div className="text-emerald-400">✓ Phase 3: Control-flow MIR & Concurrency Send/Share validated</div>
              <div className="text-sky-300">✓ Phase 4: Thread-confined ARC graphs checked (0 errors, 0 warnings)</div>
              <div className="text-slate-400 text-[11px]">Time elapsed: 48ms | Memory used: 12.4 MB</div>
            </div>
          );
        } else if (sub === 'run') {
          const isHello = targetFileName.includes('hello');
          const isFib = targetFileName.includes('fib');
          const isTour = targetFileName.includes('language_tour');
          const isConc = targetFileName.includes('concurrency');

          output = (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400">[rocketc] Compiling {targetFileName} with LLVM 22 O2 pipeline...</div>
              <div className="text-emerald-400 font-bold">=== Program Output ===</div>
              <div className="text-white bg-slate-900 p-2 rounded border border-slate-800">
                {isHello && (
                  <div>
                    Hello from Rocket
                    <div className="text-slate-500 text-[11px] mt-1">Process exited with code 0</div>
                  </div>
                )}
                {isFib && (
                  <div>
                    55
                    <div className="text-slate-500 text-[11px] mt-1">Process exited with code 0</div>
                  </div>
                )}
                {isTour && (
                  <div className="space-y-0.5">
                    <div>2</div>
                    <div>42</div>
                    <div>done</div>
                    <div className="text-slate-500 text-[11px] mt-1">Process exited with code 0</div>
                  </div>
                )}
                {isConc && (
                  <div className="space-y-0.5">
                    <div>41</div>
                    <div>3</div>
                    <div>42</div>
                    <div>7</div>
                    <div>7</div>
                    <div className="text-slate-500 text-[11px] mt-1">Process exited with code 0</div>
                  </div>
                )}
                {!isHello && !isFib && !isTour && !isConc && (
                  <div>
                    {fileItem?.content ? (
                      <div>
                        Executing {targetFileName}...
                        <br />
                        Output: Rocket execution successful.
                        <div className="text-slate-500 text-[11px] mt-1">Process exited with code 0</div>
                      </div>
                    ) : (
                      <span className="text-rose-400">rocketc error: file not found: {targetFileName}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        } else if (sub === 'emit-ir') {
          output = (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400 font-bold">; LLVM 22.1.6 Target: x86_64-pc-windows-msvc</div>
              <div className="text-slate-400">; ModuleID = &apos;{targetFileName}&apos;</div>
              <pre className="text-sky-200 text-[11px] bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
{`define dso_local i32 @rocket_main() #0 {
entry:
  %greeting = alloca %struct.RocketString, align 8
  call void @rocket_rt_str_from_literal(%struct.RocketString* %greeting, i8* getelementptr inbounds ([18 x i8], [18 x i8]* @.str, i64 0, i64 0))
  call void @rocket_rt_print_str(%struct.RocketString* %greeting)
  call void @rocket_rt_decref(%struct.RocketString* %greeting)
  ret i32 0
}`}
              </pre>
            </div>
          );
        } else if (sub === 'emit-asm') {
          output = (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400 font-bold">.file &quot;{targetFileName}&quot;</div>
              <pre className="text-emerald-200 text-[11px] bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
{`.globl rocket_main
.p2align 4, 0x90
rocket_main:
.seh_proc rocket_main
    subq    $40, %rsp
    .seh_stackalloc 40
    .seh_endprologue
    leaq    .Lstr_literal(%rip), %rcx
    callq   rocket_rt_print_str
    xorl    %eax, %eax
    addq    $40, %rsp
    retq
    .seh_endproc`}
              </pre>
            </div>
          );
        } else if (sub === 'fmt') {
          output = (
            <div className="text-emerald-400 font-mono">
              [rocketc fmt] Formatted {targetFileName} with canonical 4-space indentation and LF line endings.
            </div>
          );
        } else {
          output = `rocketc: unknown sub-command '${sub}'. Type 'rocketc help' for available commands.`;
        }
        break;
      }

      case 'neofetch':
      case 'fetch':
        output = (
          <div className="flex flex-col sm:flex-row gap-4 font-mono text-xs py-1">
            <div className="text-sky-400 font-bold leading-tight select-none">
              <pre>{`       /\\
      /  \\
     / /\\ \\
    | |  | |
   /  |  |  \\
  |---|--|---|
  |   |  |   |
  /   \\  /   \\
 / /\\ \\  / /\\ \\`}</pre>
            </div>
            <div className="space-y-1">
              <div className="text-sky-300 font-bold border-b border-white/10 pb-1">root@rocket-os</div>
              <div><span className="text-slate-400 font-semibold">OS:</span> RocketOS 2.1.0-native x86_64</div>
              <div><span className="text-slate-400 font-semibold">Kernel:</span> Stage-3 Bootloader + PML4 Long Mode</div>
              <div><span className="text-slate-400 font-semibold">Uptime:</span> 1 hour, 12 mins</div>
              <div><span className="text-slate-400 font-semibold">Shell:</span> rsh v2.0 (Posix-compatible)</div>
              <div><span className="text-slate-400 font-semibold">Compiler:</span> rocketc 2.1 (LLVM 22.1.6 Backend)</div>
              <div><span className="text-slate-400 font-semibold">Graphics:</span> Raylib 6.0 Safe Primitive Adapter</div>
              <div><span className="text-slate-400 font-semibold">Memory:</span> 1,840 MB / 16,384 MB (ARC)</div>
              <div className="flex gap-1 pt-1.5">
                <span className="w-3 h-3 bg-sky-500 rounded-xs inline-block" />
                <span className="w-3 h-3 bg-emerald-500 rounded-xs inline-block" />
                <span className="w-3 h-3 bg-amber-500 rounded-xs inline-block" />
                <span className="w-3 h-3 bg-rose-500 rounded-xs inline-block" />
                <span className="w-3 h-3 bg-indigo-500 rounded-xs inline-block" />
                <span className="w-3 h-3 bg-slate-300 rounded-xs inline-block" />
              </div>
            </div>
          </div>
        );
        break;

      case 'top':
        output = (
          <div className="space-y-1 font-mono text-xs">
            <div className="text-slate-400">Tasks: 18 total, 2 running, 16 sleeping, 0 stopped</div>
            <div className="text-slate-400">%Cpu(s): 2.4 us, 0.8 sy, 0.0 ni, 96.8 id</div>
            <div className="text-slate-400">MiB Mem : 16384.0 total, 14544.0 free, 1840.0 used</div>
            <div className="grid grid-cols-5 gap-2 font-bold text-sky-400 pt-1 border-b border-white/10 pb-0.5">
              <span>PID</span>
              <span>USER</span>
              <span>%CPU</span>
              <span>%MEM</span>
              <span>COMMAND</span>
            </div>
            <div className="space-y-0.5 text-slate-300">
              <div className="grid grid-cols-5 gap-2"><span>1</span><span>root</span><span>0.1</span><span>0.4</span><span>rocket_init</span></div>
              <div className="grid grid-cols-5 gap-2 text-emerald-400"><span>104</span><span>root</span><span>1.8</span><span>2.1</span><span>rocketc-daemon</span></div>
              <div className="grid grid-cols-5 gap-2 text-sky-300"><span>208</span><span>root</span><span>0.6</span><span>1.5</span><span>raylib_render_60fps</span></div>
              <div className="grid grid-cols-5 gap-2"><span>312</span><span>root</span><span>0.0</span><span>0.8</span><span>rsh_shell</span></div>
              <div className="grid grid-cols-5 gap-2"><span>415</span><span>root</span><span>0.0</span><span>0.6</span><span>rocketfs_vfs</span></div>
            </div>
          </div>
        );
        break;

      case 'matrix':
        output = (
          <div className="text-emerald-400 font-mono space-y-0.5 select-none animate-pulse">
            <div>01001000 01100101 01101100 01101100 01101111 00100000 01010010 01101111 01100011 01101011 01100101 01110100</div>
            <div>[PML4_CR3: 0x0000000000100000] Page table level 4 mapping Long Mode virtual addresses</div>
            <div>Wake up, Neo... RocketOS has bare-metal x86_64 control.</div>
          </div>
        );
        break;

      case 'history':
        output = (
          <div className="space-y-0.5 font-mono text-slate-300">
            {pastCommands.map((c, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-slate-500 font-mono w-6 text-right">{idx + 1}</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        );
        break;

      case 'whoami':
        output = 'root';
        break;

      case 'uname':
        output = args[0] === '-a' ? 'RocketOS 2.1.0-native #1 SMP x86_64 GNU/Rocket' : 'RocketOS';
        break;

      case 'echo':
        output = args.join(' ');
        break;

      default:
        output = `rsh: command not found: ${cmd}. Type 'help' for valid commands.`;
        break;
    }

    setPastCommands((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setHistory((prev) => [...prev, { command: trimmed, output }]);
    setInputVal('');
  };

  return (
    <div id="terminal-app" className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs select-text">
      {/* Scrollable Output Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {history.map((h, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400 font-semibold">root@rocket-os</span>
              <span>:</span>
              <span className="text-sky-400 font-semibold">{cwd}</span>
              <span className="text-slate-400">$</span>
              <span className="text-slate-100 font-medium">{h.command}</span>
            </div>
            <div className="pl-2 border-l border-slate-800 text-slate-300">{h.output}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Prompt */}
      <form onSubmit={handleCommand} className="flex items-center gap-1.5 p-2 bg-slate-900 border-t border-slate-800">
        <span className="text-emerald-400 font-semibold">root@rocket-os</span>
        <span>:</span>
        <span className="text-sky-400 font-semibold">{cwd}</span>
        <span className="text-slate-400">$</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xs"
          placeholder="Type 'help', 'neofetch', or 'rocketc run hello.rocket'..."
          autoFocus
        />
      </form>
    </div>
  );
};
