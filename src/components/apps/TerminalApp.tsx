import React, { useState, useRef, useEffect } from 'react';
import { FSItem } from '../../types';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { PathEngine } from '../../core/filesystem/PathEngine';
import { PermissionsEngine } from '../../core/filesystem/PermissionsEngine';
import { UserManager } from '../../core/users/UserManager';
import { AuditLogger } from '../../core/admin/AuditLogger';
import { SystemUser } from '../../core/filesystem/types';

interface TerminalAppProps {
  fileSystem?: FSItem[];
  currentPath?: string;
  onReboot: () => void;
  onOpenFile: (file: FSItem) => void;
}

interface CommandHistory {
  command: string;
  output: string | React.ReactNode;
  userAtRun: string;
  cwdAtRun: string;
}

export const TerminalApp: React.FC<TerminalAppProps> = ({
  currentPath = '/home/ryan',
  onReboot,
  onOpenFile,
}) => {
  const [currentUser, setCurrentUser] = useState<SystemUser>(() =>
    UserManager.getInstance().getCurrentUser()
  );

  const [history, setHistory] = useState<CommandHistory[]>([
    {
      command: 'sysinfo',
      output: (
        <div className="text-slate-300 space-y-1">
          <div className="text-sky-400 font-bold">RocketOS v2.1.0-native (x86_64-pc-windows-msvc)</div>
          <div>Compiler: rocketc 2.1 (LLVM 22.1.6 Backend | Stage3 Self-Hosted | ABI v1)</div>
          <div>Repository: https://github.com/RyanEid06/Rocket</div>
          <div>Security: RBAC Multi-User Engine (Default Session: ryan [UID 1000])</div>
          <div>Filesystem: RocketFS Virtual Filesystem with Inodes & Permissions</div>
          <div className="text-slate-400 mt-2">
            Type <span className="text-sky-300 font-semibold">&apos;help&apos;</span>, try <span className="text-sky-300 font-semibold">&apos;rocketc run hello.rocket&apos;</span>, or run <span className="text-sky-300 font-semibold">&apos;sudo -i&apos;</span> to elevate.
          </div>
        </div>
      ),
      userAtRun: 'ryan',
      cwdAtRun: '~',
    },
  ]);

  const [inputVal, setInputVal] = useState<string>('');
  const [cwd, setCwd] = useState<string>(() => PathEngine.canonicalize(currentPath));
  const [pastCommands, setPastCommands] = useState<string[]>(['sysinfo']);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const endRef = useRef<HTMLDivElement>(null);

  // Sync user updates
  useEffect(() => {
    return UserManager.getInstance().subscribe((u) => {
      setCurrentUser(u);
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const rfs = RocketFS.getInstance();

  const formatDisplayCwd = (rawCwd: string, user: SystemUser) => {
    if (rawCwd === user.homeDirectory) return '~';
    if (rawCwd.startsWith(user.homeDirectory + '/')) {
      return '~' + rawCwd.slice(user.homeDirectory.length);
    }
    return rawCwd;
  };

  // Tab completion
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
      'id',
      'sudo',
      'su',
      'exit',
      'uname',
      'pwd',
      'echo',
      'touch',
      'mkdir',
      'rm',
      'chmod',
    ];

    if (parts.length === 1) {
      const match = availableCommands.find((c) => c.startsWith(parts[0]));
      if (match) {
        setInputVal(`${match} `);
      }
    } else {
      const listRes = rfs.listDirectory(cwd, currentUser);
      if (listRes.success) {
        const lastArg = parts[parts.length - 1];
        const match = listRes.data.find((f) =>
          f.name.toLowerCase().startsWith(lastArg.toLowerCase())
        );
        if (match) {
          parts[parts.length - 1] = match.name;
          setInputVal(parts.join(' '));
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
      return;
    }

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
    }
  };

  const executeCommand = (
    cmdLine: string,
    actingUser: SystemUser = currentUser
  ): string | React.ReactNode => {
    const trimmed = cmdLine.trim();
    if (!trimmed) return '';

    const parts = trimmed.split(' ').filter(Boolean);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        return (
          <div className="space-y-1 text-slate-300">
            <div className="font-semibold text-sky-400">RocketOS Shell Commands:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
              <div><span className="text-sky-300">ls [-l] [path]</span> - List directory items</div>
              <div><span className="text-sky-300">cd &lt;dir&gt;</span> - Change directory (~ for home)</div>
              <div><span className="text-sky-300">cat &lt;file&gt;</span> - Print file text or /proc telemetry</div>
              <div><span className="text-sky-300">pwd</span> - Print working directory</div>
              <div><span className="text-sky-300">whoami</span> - Display current user identity</div>
              <div><span className="text-sky-300">id</span> - Display UID, GID, and group list</div>
              <div><span className="text-sky-300">sudo &lt;cmd&gt;</span> - Execute with root privileges</div>
              <div><span className="text-sky-300">su / sudo -i</span> - Elevate interactive shell to root</div>
              <div><span className="text-sky-300">exit</span> - Drop back from root session</div>
              <div><span className="text-sky-300">touch &lt;file&gt;</span> - Create empty file</div>
              <div><span className="text-sky-300">mkdir &lt;dir&gt;</span> - Create directory</div>
              <div><span className="text-sky-300">rm [-r] &lt;path&gt;</span> - Delete file or directory</div>
              <div><span className="text-sky-300">edit &lt;file&gt;</span> - Launch in Text Editor</div>
              <div><span className="text-sky-300">rocketc run &lt;file&gt;</span> - Compile and execute Rocket program</div>
              <div><span className="text-sky-300">reboot</span> - Restart RocketOS</div>
              <div><span className="text-sky-300">clear</span> - Clear terminal screen</div>
            </div>
          </div>
        );

      case 'clear':
        setHistory([]);
        return null;

      case 'reboot':
        onReboot();
        return null;

      case 'pwd':
        return cwd;

      case 'whoami':
        return actingUser.username;

      case 'id': {
        const groupsStr = actingUser.supplementaryGids
          .map((g) => `${g}(${UserManager.getInstance().getGroup(g)?.name || g})`)
          .join(',');
        const primaryGroupName =
          UserManager.getInstance().getGroup(actingUser.primaryGid)?.name || actingUser.primaryGid;
        return `uid=${actingUser.uid}(${actingUser.username}) gid=${actingUser.primaryGid}(${primaryGroupName}) groups=${groupsStr}`;
      }

      case 'exit': {
        if (actingUser.uid === 0) {
          UserManager.getInstance().dropToNormalUser();
          return 'logout (returned to unprivileged session as user ryan)';
        }
        return 'rsh: no parent shell to exit';
      }

      case 'sudo':
      case 'su': {
        if (!UserManager.getInstance().canElevate(actingUser)) {
          AuditLogger.getInstance().logSecurity(
            actingUser,
            'sudo',
            args.join(' '),
            false,
            'User is not in admin group'
          );
          return `[sudo] ${actingUser.username} is not in the sudoers/admin group. This incident will be reported.`;
        }

        AuditLogger.getInstance().logSecurity(
          actingUser,
          'sudo',
          args.length > 0 ? args.join(' ') : 'interactive_elevation',
          true,
          'Privilege elevation authorized'
        );

        if (args.length === 0 || args[0] === '-i' || args[0] === 'su') {
          UserManager.getInstance().elevateToRoot();
          return '[sudo] session elevated to root (uid 0). Type \'exit\' to drop back.';
        }

        // Run sub-command as root
        const rootUser = UserManager.ROOT_USER;
        return executeCommand(args.join(' '), rootUser);
      }

      case 'ls': {
        let isLong = false;
        let targetArg = '';

        for (const arg of args) {
          if (arg.startsWith('-') && arg.includes('l')) {
            isLong = true;
          } else if (!arg.startsWith('-')) {
            targetArg = arg;
          }
        }

        const resolvedTarget = targetArg ? PathEngine.resolve(targetArg, cwd) : cwd;
        const listRes = rfs.listDirectory(resolvedTarget, actingUser);

        if (!listRes.success) {
          if (listRes.error === 'NOT_FOUND') {
            // Check if it's a file
            const fileRes = rfs.stat(resolvedTarget, actingUser);
            if (fileRes.success) {
              return fileRes.data.name;
            }
            return `ls: cannot access '${targetArg || resolvedTarget}': No such file or directory`;
          }
          if (listRes.error === 'PERMISSION_DENIED') {
            return `ls: cannot open directory '${targetArg || resolvedTarget}': Permission denied`;
          }
          return `ls: ${listRes.message}`;
        }

        const items = listRes.data;

        if (isLong) {
          const totalBlocks = items.reduce((acc, i) => acc + Math.ceil(i.sizeBytes / 1024), 0);
          return (
            <div className="font-mono text-xs space-y-0.5">
              <div className="text-slate-500">total {totalBlocks}</div>
              {items.map((item) => {
                const isDir = item.nodeType === 'directory';
                const modeStr = PermissionsEngine.formatMode(item.mode, isDir);
                const ownerName = UserManager.getInstance().getUser(item.uid)?.username || item.uid;
                const groupName = UserManager.getInstance().getGroup(item.gid)?.name || item.gid;
                const dateStr = item.modifiedAt.slice(5, 16).replace('T', ' ');

                return (
                  <div key={item.inode} className="flex gap-3">
                    <span className="text-slate-400">{modeStr}</span>
                    <span className="text-slate-500 w-12">{ownerName}</span>
                    <span className="text-slate-500 w-12">{groupName}</span>
                    <span className="text-slate-300 w-12 text-right">{item.sizeBytes}</span>
                    <span className="text-slate-400">{dateStr}</span>
                    <span
                      className={
                        isDir
                          ? 'text-sky-400 font-semibold cursor-pointer hover:underline'
                          : item.name.endsWith('.rocket')
                          ? 'text-emerald-300 font-mono cursor-pointer hover:underline'
                          : 'text-slate-200 cursor-pointer hover:underline'
                      }
                      onClick={() => {
                        if (isDir) {
                          setCwd(item.canonicalPath);
                        } else {
                          const fsItem = rfs.findItemByPath(item.canonicalPath);
                          if (fsItem) onOpenFile(fsItem);
                        }
                      }}
                    >
                      {item.name}
                      {isDir ? '/' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }

        return (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {items.map((item) => {
              const isDir = item.nodeType === 'directory';
              return (
                <span
                  key={item.inode}
                  className={
                    isDir
                      ? 'text-sky-400 font-semibold cursor-pointer hover:underline'
                      : item.name.endsWith('.rocket')
                      ? 'text-emerald-300 font-mono cursor-pointer hover:underline'
                      : 'text-slate-200 cursor-pointer hover:underline'
                  }
                  onClick={() => {
                    if (isDir) {
                      setCwd(item.canonicalPath);
                    } else {
                      const fsItem = rfs.findItemByPath(item.canonicalPath);
                      if (fsItem) onOpenFile(fsItem);
                    }
                  }}
                >
                  {item.name}
                  {isDir ? '/' : ''}
                </span>
              );
            })}
          </div>
        );
      }

      case 'cd': {
        const targetRaw = args[0] || actingUser.homeDirectory;
        const resolved = PathEngine.resolve(targetRaw, cwd);
        const lookupRes = rfs.lookup(resolved, actingUser);

        if (!lookupRes.success) {
          if (lookupRes.error === 'PERMISSION_DENIED') {
            return `cd: ${targetRaw}: Permission denied`;
          }
          return `cd: ${targetRaw}: No such file or directory`;
        }

        if (lookupRes.data.nodeType !== 'directory') {
          return `cd: ${targetRaw}: Not a directory`;
        }

        setCwd(lookupRes.data.canonicalPath);
        return '';
      }

      case 'cat': {
        if (!args[0]) return 'cat: missing file operand';
        const target = PathEngine.resolve(args[0], cwd);
        const readRes = rfs.readFile(target, actingUser);

        if (!readRes.success) {
          if (readRes.error === 'PERMISSION_DENIED') {
            return `cat: ${args[0]}: Permission denied`;
          }
          if (readRes.error === 'NOT_FOUND') {
            return `cat: ${args[0]}: No such file or directory`;
          }
          if (readRes.error === 'IS_A_DIRECTORY') {
            return `cat: ${args[0]}: Is a directory`;
          }
          return `cat: ${readRes.message}`;
        }

        return <pre className="whitespace-pre-wrap font-mono text-xs">{readRes.data}</pre>;
      }

      case 'touch': {
        if (!args[0]) return 'touch: missing file operand';
        const target = PathEngine.resolve(args[0], cwd);
        const res = rfs.createFile(target, '', actingUser);
        if (!res.success) {
          return `touch: cannot touch '${args[0]}': ${res.message}`;
        }
        return '';
      }

      case 'mkdir': {
        if (!args[0]) return 'mkdir: missing operand';
        const target = PathEngine.resolve(args[0], cwd);
        const res = rfs.createDirectory(target, actingUser);
        if (!res.success) {
          return `mkdir: cannot create directory '${args[0]}': ${res.message}`;
        }
        return '';
      }

      case 'rm': {
        let isRecursive = false;
        let targetArg = '';
        for (const a of args) {
          if (a === '-r' || a === '-rf' || a === '-fr') isRecursive = true;
          else if (!a.startsWith('-')) targetArg = a;
        }
        if (!targetArg) return 'rm: missing operand';

        const target = PathEngine.resolve(targetArg, cwd);
        const res = rfs.delete(target, actingUser, isRecursive);
        if (!res.success) {
          return `rm: cannot remove '${targetArg}': ${res.message}`;
        }
        return '';
      }

      case 'chmod': {
        if (args.length < 2) return 'chmod: missing operand (syntax: chmod <octal_mode> <path>)';
        const mode = parseInt(args[0], 8);
        if (isNaN(mode)) return `chmod: invalid mode: '${args[0]}'`;

        const target = PathEngine.resolve(args[1], cwd);
        const statRes = rfs.lookup(target, actingUser);
        if (!statRes.success) {
          return `chmod: cannot access '${args[1]}': ${statRes.message}`;
        }

        // Only owner or root can change mode
        if (actingUser.uid !== 0 && actingUser.uid !== statRes.data.uid) {
          return `chmod: changing permissions of '${args[1]}': Operation not permitted`;
        }

        statRes.data.mode = mode;
        statRes.data.modifiedAt = new Date().toISOString();
        return '';
      }

      case 'edit': {
        if (!args[0]) return 'edit: missing file argument';
        const target = PathEngine.resolve(args[0], cwd);
        const fsItem = rfs.findItemByPath(target);
        if (fsItem) {
          onOpenFile(fsItem);
          return `Launching ${args[0]} in Rocket Code Editor...`;
        }
        return `edit: file not found: ${args[0]}`;
      }

      case 'rocketc': {
        const sub = args[0];
        const targetFileName = args[1] || 'hello.rocket';

        if (!sub || sub === 'help') {
          return (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400 font-bold">rocketc v2.1.0-native Compiler Sub-commands:</div>
              <div>  rocketc run &lt;file&gt;      - Compile and execute Rocket program</div>
              <div>  rocketc check &lt;file&gt;    - Full semantic & concurrency safety check</div>
              <div>  rocketc emit-ir &lt;file&gt;  - Print optimized LLVM 22 IR</div>
              <div>  rocketc emit-asm &lt;file&gt; - Output native x86_64 machine assembly</div>
              <div>  rocketc fmt &lt;file&gt;      - Canonical Rocket indentation formatter</div>
              <div>  rocketc target            - Show LLVM target triple and CPU features</div>
              <div>  rocketc --version         - Compiler release and commit ID</div>
            </div>
          );
        }

        if (sub === '--version' || sub === '-v') {
          return (
            <div className="text-slate-300 font-mono">
              <div>rocketc 2.1.0-native (LLVM 22.1.6 O2 Target Pipeline)</div>
              <div className="text-slate-400 text-[11px]">Commit: 8f4b2a9d (x86_64-pc-windows-msvc)</div>
            </div>
          );
        }

        if (sub === 'run') {
          return (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400">[rocketc] Compiling {targetFileName} with LLVM 22 O2 pipeline...</div>
              <div className="text-emerald-400 font-bold">=== Program Output ===</div>
              <div className="text-white bg-slate-900 p-2 rounded border border-slate-800">
                Hello from Rocket 2.1 native compiler!
                <div className="text-slate-500 text-[11px] mt-1">Process exited with code 0</div>
              </div>
            </div>
          );
        }

        if (sub === 'check') {
          return (
            <div className="space-y-1 text-slate-300 font-mono">
              <div className="text-sky-400 font-bold">[rocketc check] Validating {targetFileName}...</div>
              <div className="text-emerald-400">✓ Phase 1: Indentation-aware Lexer and Token Stream OK</div>
              <div className="text-emerald-400">✓ Phase 2: Typed High-Level IR (HIR) resolved</div>
              <div className="text-emerald-400">✓ Phase 3: Control-flow MIR & Concurrency Send/Share validated</div>
              <div className="text-sky-300">✓ Phase 4: Thread-confined ARC graphs checked (0 errors, 0 warnings)</div>
              <div className="text-slate-400 text-[11px]">Time elapsed: 48ms | Memory used: 12.4 MB</div>
            </div>
          );
        }

        return `rocketc: completed sub-command '${sub}'.`;
      }

      case 'neofetch':
      case 'fetch': {
        const v = rfs.lookup('/proc/version', actingUser);
        const mem = rfs.lookup('/proc/meminfo', actingUser);
        return (
          <div className="flex flex-col sm:flex-row gap-4 font-mono text-xs py-1">
            <div className="text-sky-400 font-bold leading-tight select-none">
              <pre>{`   ___     ___  
  / _ \\   / _ \\ 
 | (_) | | (_) |
  \\___/   \\___/ 
  | | |   | | | 
  | | |   | | | 
 / / \\ \\ / / \\ \\`}</pre>
            </div>
            <div className="space-y-0.5">
              <div className="text-sky-300 font-bold">{actingUser.username}@rocket-os</div>
              <div className="text-slate-500">----------------------</div>
              <div><span className="text-sky-400">OS:</span> RocketOS 2.1.0-LTS x86_64</div>
              <div><span className="text-sky-400">Kernel:</span> Long Mode Ring 0 #1 SMP</div>
              <div><span className="text-sky-400">Compiler:</span> rocketc 2.1 (LLVM 22.1.6)</div>
              <div><span className="text-sky-400">Shell:</span> rsh 2.1 (POSIX compatible)</div>
              <div><span className="text-sky-400">Uptime:</span> 42 mins</div>
              <div><span className="text-sky-400">Memory:</span> 2293MB / 8192MB</div>
            </div>
          </div>
        );
      }

      case 'uname':
        return args[0] === '-a' ? 'RocketOS 2.1.0-native #1 SMP PREEMPT x86_64 GNU/Rocket' : 'RocketOS';

      case 'echo':
        return args.join(' ');

      default:
        return `rsh: command not found: ${cmd}. Type 'help' for available commands.`;
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const output = executeCommand(trimmed, currentUser);

    if (output !== null) {
      const displayCwd = formatDisplayCwd(cwd, currentUser);
      setHistory((prev) => [
        ...prev,
        {
          command: trimmed,
          output,
          userAtRun: currentUser.username,
          cwdAtRun: displayCwd,
        },
      ]);
      setPastCommands((prev) => [...prev, trimmed]);
    }

    setHistoryIndex(-1);
    setInputVal('');
  };

  const promptSymbol = currentUser.uid === 0 ? '#' : '$';
  const displayCwd = formatDisplayCwd(cwd, currentUser);

  return (
    <div id="terminal-app" className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs select-text">
      {/* Scrollable Output Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {history.map((h, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className={h.userAtRun === 'root' ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {h.userAtRun}@rocket-os
              </span>
              <span>:</span>
              <span className="text-sky-400 font-semibold">{h.cwdAtRun}</span>
              <span className="text-slate-400">{h.userAtRun === 'root' ? '#' : '$'}</span>
              <span className="text-slate-100 font-medium">{h.command}</span>
            </div>
            <div className="pl-2 border-l border-slate-800 text-slate-300">{h.output}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Prompt */}
      <form onSubmit={handleCommand} className="flex items-center gap-1.5 p-2 bg-slate-900 border-t border-slate-800">
        <span className={currentUser.uid === 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
          {currentUser.username}@rocket-os
        </span>
        <span>:</span>
        <span className="text-sky-400 font-semibold">{displayCwd}</span>
        <span className="text-slate-400">{promptSymbol}</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xs"
          placeholder="Type 'help', 'ls -l', 'whoami', 'sudo -i', or 'rocketc run hello.rocket'..."
          autoFocus
        />
      </form>
    </div>
  );
};
