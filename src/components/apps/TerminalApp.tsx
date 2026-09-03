// TerminalApp.tsx
// High-performance, multi-tab POSIX-compliant terminal frontend for RocketOS rsh v2.0
// Powered by CommandRegistry, ShellParser, SessionManager, and RocketFS

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Terminal, Copy, Trash2 } from 'lucide-react';
import { FSItem } from '../../types';
import { CommandRegistry, CommandContext } from '../../core/commands/CommandRegistry';
import { PathEngine } from '../../core/filesystem/PathEngine';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { SystemManifest } from '../../core/manifest/SystemManifest';
import { SessionManager } from '../../core/sessions/SessionManager';
import { ShellEnvironment, TerminalTabSession } from '../../core/shell/types';
import { UserManager } from '../../core/users/UserManager';
import { SystemUser } from '../../core/filesystem/types';

interface TerminalAppProps {
  fileSystem?: FSItem[];
  currentPath?: string;
  onReboot: () => void;
  onOpenFile: (file: FSItem) => void;
}

const createDefaultEnv = (user: SystemUser, cwd: string): ShellEnvironment => ({
  USER: user.username,
  HOME: user.homeDirectory,
  SHELL: '/bin/rsh',
  PATH: '/bin:/usr/bin:/usr/local/bin',
  PWD: cwd,
  HOSTNAME: 'rocket',
  TERM: 'xterm-256color',
  LANG: 'en_US.UTF-8',
  ROCKETOS_VERSION: SystemManifest.VERSION.osVersion,
});

export const TerminalApp: React.FC<TerminalAppProps> = ({
  currentPath = '/home/ryan',
  onReboot,
  onOpenFile,
}) => {
  const sessionMgr = SessionManager.getInstance();
  const userMgr = UserManager.getInstance();
  const cmdRegistry = CommandRegistry.getInstance();
  const rfs = RocketFS.getInstance();

  const [currentUser, setCurrentUser] = useState<SystemUser>(() => userMgr.getCurrentUser());
  const [isElevated, setIsElevated] = useState<boolean>(() => sessionMgr.isElevated());

  // Terminal tab sessions
  const [tabs, setTabs] = useState<TerminalTabSession[]>([
    {
      id: 'tab-1',
      title: 'rsh: ~',
      cwd: PathEngine.canonicalize(currentPath),
      env: createDefaultEnv(userMgr.getCurrentUser(), PathEngine.canonicalize(currentPath)),
      history: ['sysinfo'],
      historyIndex: -1,
      outputLines: [
        {
          id: 'banner',
          type: 'system',
          text: `RocketOS ${SystemManifest.VERSION.osVersion} (${SystemManifest.VERSION.kernelArchitecture}-unknown-rocket)\nHost: rocket | Shell: rsh v2.0 POSIX compliant\nType 'help' for command list, 'rocketctl list' for services, or 'rocketc run' for compiler.\n`,
        },
      ],
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputVal, setInputVal] = useState<string>('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Synchronize session and elevation changes
  useEffect(() => {
    const unsubUser = userMgr.subscribe((u) => {
      setCurrentUser(u);
      setIsElevated(sessionMgr.isElevated());
    });
    const unsubSession = sessionMgr.subscribe(() => {
      setIsElevated(sessionMgr.isElevated());
    });
    return () => {
      unsubUser();
      unsubSession();
    };
  }, [userMgr, sessionMgr]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab?.outputLines]);

  const formatDisplayCwd = (rawCwd: string, user: SystemUser) => {
    if (rawCwd === user.homeDirectory) return '~';
    if (rawCwd.startsWith(user.homeDirectory + '/')) {
      return '~' + rawCwd.slice(user.homeDirectory.length);
    }
    return rawCwd;
  };

  // Tab management
  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    const user = userMgr.getCurrentUser();
    const newTab: TerminalTabSession = {
      id: newId,
      title: 'rsh: ~',
      cwd: user.homeDirectory,
      env: createDefaultEnv(user, user.homeDirectory),
      history: [],
      historyIndex: -1,
      outputLines: [
        {
          id: `banner-${newId}`,
          type: 'system',
          text: `RocketOS Terminal Tab ${tabs.length + 1} initialized. Active session: ${user.username}\n`,
        },
      ],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setInputVal('');
  };

  const handleCloseTab = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[0].id);
    }
  };

  // Autocomplete / Tab completion
  const handleTabComplete = () => {
    const trimmed = inputVal.trimStart();
    const parts = trimmed.split(' ');

    if (parts.length === 1) {
      const allCmds = cmdRegistry.getAllCommands().map((c) => c.name);
      allCmds.push('reboot', 'edit', 'sysinfo', 'neofetch', 'rocketc', 'sudo');
      const match = allCmds.find((c) => c.startsWith(parts[0]));
      if (match) {
        setInputVal(`${match} `);
      }
    } else {
      const listRes = rfs.listDirectory(activeTab.cwd, currentUser);
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

    if (e.ctrlKey && e.key === 'c') {
      // Cancel command
      e.preventDefault();
      const promptStr = `${currentUser.username}@rocket:${formatDisplayCwd(activeTab.cwd, currentUser)} ${isElevated || currentUser.uid === 0 ? '#' : '$'}`;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                outputLines: [
                  ...t.outputLines,
                  { id: `c-${Date.now()}`, type: 'input', text: inputVal + ' ^C', prompt: promptStr },
                ],
              }
            : t
        )
      );
      setInputVal('');
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeTab.history.length === 0) return;
      const nextIdx =
        activeTab.historyIndex === -1
          ? activeTab.history.length - 1
          : Math.max(0, activeTab.historyIndex - 1);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab.id ? { ...t, historyIndex: nextIdx } : t))
      );
      setInputVal(activeTab.history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeTab.historyIndex === -1) return;
      const nextIdx = activeTab.historyIndex + 1;
      if (nextIdx >= activeTab.history.length) {
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTab.id ? { ...t, historyIndex: -1 } : t))
        );
        setInputVal('');
      } else {
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTab.id ? { ...t, historyIndex: nextIdx } : t))
        );
        setInputVal(activeTab.history[nextIdx]);
      }
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawLine = inputVal.trim();
    if (!rawLine) return;

    const displayCwd = formatDisplayCwd(activeTab.cwd, currentUser);
    const promptStr = `${currentUser.username}@rocket:${displayCwd} ${isElevated || currentUser.uid === 0 ? '#' : '$'}`;

    // Add input entry to output
    const inputEntry = {
      id: `in-${Date.now()}`,
      type: 'input' as const,
      text: rawLine,
      prompt: promptStr,
    };

    // Update history
    const nextHistory = [...activeTab.history, rawLine];
    setInputVal('');

    // Handle special built-in UI commands
    if (rawLine === 'reboot') {
      onReboot();
      return;
    }

    if (rawLine.startsWith('edit ') || rawLine === 'edit') {
      const target = rawLine.split(' ')[1];
      if (target) {
        const fullPath = PathEngine.resolve(activeTab.cwd, target);
        const lookup = rfs.lookup(fullPath, currentUser);
        if (lookup.success && lookup.data.nodeType === 'file') {
          onOpenFile(lookup.data);
        }
      }
    }

    // Special rich visualization commands
    if (rawLine === 'neofetch' || rawLine === 'fetch') {
      const neofetchText = `   ___     ___    ${currentUser.username}@rocket
  / _ \\   / _ \\   ----------------------
 | (_) | | (_) |  OS: RocketOS ${SystemManifest.VERSION.osVersion} x86_64
  \\___/   \\___/   Kernel: Long Mode Ring 0 #1 SMP
  | | |   | | |   Compiler: rocketc 2.1 (LLVM 22.1.6)
  | | |   | | |   Shell: rsh 2.0 (POSIX Pipelines)
 / / \\ \\ / / \\ \\  Architecture: AMD64 / UEFI 2.8
                  Security: RBAC UID=${currentUser.uid} (${currentUser.isAdmin ? 'sudoers' : 'standard'})
`;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                history: nextHistory,
                historyIndex: -1,
                outputLines: [
                  ...t.outputLines,
                  inputEntry,
                  { id: `out-${Date.now()}`, type: 'stdout', text: neofetchText },
                ],
              }
            : t
        )
      );
      return;
    }

    if (rawLine === 'sysinfo') {
      const sysinfoText = `RocketOS ${SystemManifest.VERSION.osVersion} (${SystemManifest.VERSION.kernelArchitecture}-unknown-rocket)
Compiler: rocketc 2.1 (LLVM 22.1.6 Backend | Stage3 Self-Hosted | ABI v1)
Repository: https://github.com/RyanEid06/Rocket
Security: RBAC Multi-User Engine (Default Session: ${currentUser.username} [UID ${currentUser.uid}])
Filesystem: RocketFS Virtual Filesystem with Inodes & Permissions
Memory: ${SystemManifest.HARDWARE.totalMemoryMb} MB System RAM (CR3 Identity Paging)

Type 'help' for shell commands, 'rocketctl status' for service supervision, or 'rocketc run <file>' to test code.
`;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                history: nextHistory,
                historyIndex: -1,
                outputLines: [
                  ...t.outputLines,
                  inputEntry,
                  { id: `out-${Date.now()}`, type: 'stdout', text: sysinfoText },
                ],
              }
            : t
        )
      );
      return;
    }

    // Prepare execution context
    let updatedCwd = activeTab.cwd;
    let didClear = false;

    const ctx: CommandContext = {
      cwd: activeTab.cwd,
      env: activeTab.env,
      args: [],
      onCwdChange: (newCwd) => {
        updatedCwd = newCwd;
      },
      onClear: () => {
        didClear = true;
      },
      onExit: () => {
        handleCloseTab(activeTab.id);
      },
    };

    // Execute via authoritative CommandRegistry
    const execRes = await cmdRegistry.executeCommandLine(rawLine, ctx);

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTab.id) return t;

        if (didClear) {
          return {
            ...t,
            history: nextHistory,
            historyIndex: -1,
            outputLines: [],
          };
        }

        const newLines = [...t.outputLines, inputEntry];
        if (execRes.stdout) {
          newLines.push({
            id: `out-${Date.now()}-out`,
            type: 'stdout',
            text: execRes.stdout,
          });
        }
        if (execRes.stderr) {
          newLines.push({
            id: `out-${Date.now()}-err`,
            type: 'stderr',
            text: execRes.stderr,
          });
        }

        // Title update based on current directory
        const shortName = updatedCwd === '/' ? '/' : updatedCwd.split('/').pop() || '~';

        return {
          ...t,
          cwd: updatedCwd,
          title: `rsh: ${shortName}`,
          history: nextHistory,
          historyIndex: -1,
          outputLines: newLines,
        };
      })
    );
  };

  const handleCopySelection = () => {
    const text = activeTab.outputLines.map((l) => (l.prompt ? `${l.prompt} ${l.text}` : l.text)).join('\n');
    navigator.clipboard?.writeText(text);
  };

  const handleClearCurrent = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, outputLines: [] } : t))
    );
  };

  const promptSymbol = isElevated || currentUser.uid === 0 ? '#' : '$';
  const displayCwd = formatDisplayCwd(activeTab.cwd, currentUser);

  return (
    <div id="terminal-app" className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs select-text">
      {/* Tab Bar & Action Controls */}
      <div className="flex items-center justify-between bg-slate-900 border-b border-slate-800 px-1 pt-1">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs cursor-pointer select-none transition-colors border-t border-x ${
                  isActive
                    ? 'bg-slate-950 text-sky-400 border-slate-700 font-semibold'
                    : 'bg-slate-900/60 text-slate-400 border-transparent hover:bg-slate-800/80 hover:text-slate-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[120px] truncate">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                    title="Close session"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={handleAddTab}
            className="p-1.5 rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
            title="Open new terminal tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1 px-2 pb-1 text-slate-400">
          <button
            onClick={handleCopySelection}
            className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Copy all output to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearCurrent}
            className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Clear current tab (Ctrl+L)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Output Area */}
      <div
        className="flex-1 p-3 overflow-y-auto space-y-2 select-text"
        onClick={() => inputRef.current?.focus()}
      >
        {activeTab.outputLines.map((entry) => {
          if (entry.type === 'input') {
            return (
              <div key={entry.id} className="flex items-start gap-1.5 text-slate-300">
                <span className="text-emerald-400 font-semibold shrink-0 select-none">
                  {entry.prompt}
                </span>
                <span className="text-white font-medium break-all">{entry.text}</span>
              </div>
            );
          }

          if (entry.type === 'stderr') {
            return (
              <pre
                key={entry.id}
                className="text-rose-400 whitespace-pre-wrap font-mono leading-relaxed pl-2 border-l-2 border-rose-500/40"
              >
                {entry.text}
              </pre>
            );
          }

          if (entry.type === 'system') {
            return (
              <div
                key={entry.id}
                className="text-sky-400/90 whitespace-pre-wrap font-mono leading-relaxed p-2 bg-sky-950/20 rounded border border-sky-900/30"
              >
                {entry.text}
              </div>
            );
          }

          // stdout
          return (
            <pre
              key={entry.id}
              className="text-slate-300 whitespace-pre-wrap font-mono leading-relaxed pl-2 border-l border-slate-800"
            >
              {entry.text}
            </pre>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Interactive Input Prompt */}
      <form
        onSubmit={handleCommand}
        className="flex items-center gap-1.5 p-2 bg-slate-900/90 border-t border-slate-800 select-none"
      >
        <span
          className={
            isElevated || currentUser.uid === 0
              ? 'text-rose-400 font-semibold'
              : 'text-emerald-400 font-semibold'
          }
        >
          {currentUser.username}@rocket
        </span>
        <span className="text-slate-500">:</span>
        <span className="text-sky-400 font-semibold">{displayCwd}</span>
        <span
          className={
            isElevated || currentUser.uid === 0 ? 'text-rose-400 font-bold' : 'text-slate-400 font-bold'
          }
        >
          {promptSymbol}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xs select-text"
          placeholder="Type command ('help', 'ps', 'rocketctl list', 'ls -la', 'sysinfo')..."
          autoFocus
        />
      </form>
    </div>
  );
};
