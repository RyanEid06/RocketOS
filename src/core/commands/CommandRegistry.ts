// CommandRegistry.ts
// Central Command Registry for RocketOS rsh v2.0
// Implements rocket/commands/command_registry.rocket domain model
// Directly connected to RocketFS, ProcessManager, ServiceManager, and SessionManager

import { AuditLogger } from '../admin/AuditLogger';
import { RocketFS } from '../filesystem/RocketFS';
import { PermissionsEngine } from '../filesystem/PermissionsEngine';
import { SystemManifest } from '../manifest/SystemManifest';
import { ProcessManager } from '../process/ProcessManager';
import { ServiceManager } from '../services/ServiceManager';
import { SessionManager } from '../sessions/SessionManager';
import { ShellParser } from '../shell/ShellParser';
import {
  CommandChainNode,
  ParsedCommand,
  ShellEnvironment,
  ShellExecutionResult,
} from '../shell/types';
import { UserManager } from '../users/UserManager';

export interface CommandContext {
  cwd: string;
  env: ShellEnvironment;
  stdin?: string;
  args: string[];
  onCwdChange?: (newCwd: string) => void;
  onClear?: () => void;
  onExit?: () => void;
}

export type CommandHandler = (
  ctx: CommandContext
) => Promise<ShellExecutionResult> | ShellExecutionResult;

export interface RegisteredCommand {
  name: string;
  aliases: string[];
  usage: string;
  description: string;
  category: 'filesystem' | 'process' | 'system' | 'text' | 'admin' | 'info';
  requiresElevation: boolean;
  minArgs: number;
  maxArgs: number;
  handler: CommandHandler;
}

export class CommandRegistry {
  private static instance: CommandRegistry;

  private commands: Map<string, RegisteredCommand> = new Map();
  private aliasMap: Map<string, string> = new Map();

  private constructor() {
    this.registerStandardCommands();
  }

  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  public register(cmd: RegisteredCommand): void {
    const primary = cmd.name.toLowerCase();
    this.commands.set(primary, cmd);
    for (const alias of cmd.aliases) {
      this.aliasMap.set(alias.toLowerCase(), primary);
    }
  }

  public getCommand(name: string): RegisteredCommand | undefined {
    const lower = name.toLowerCase();
    if (this.commands.has(lower)) {
      return this.commands.get(lower);
    }
    const resolved = this.aliasMap.get(lower);
    if (resolved) {
      return this.commands.get(resolved);
    }
    return undefined;
  }

  public getAllCommands(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  // =========================================================================
  // STANDARD COMMAND REGISTRATIONS
  // =========================================================================
  private registerStandardCommands(): void {
    const fs = RocketFS.getInstance();
    const userMgr = UserManager.getInstance();
    const sessionMgr = SessionManager.getInstance();
    const procMgr = ProcessManager.getInstance();
    const svcMgr = ServiceManager.getInstance();

    // 1. PWD
    this.register({
      name: 'pwd',
      aliases: [],
      usage: 'pwd',
      description: 'Print current working directory',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: (ctx) => ({
        exitCode: 0,
        stdout: ctx.cwd + '\n',
        stderr: '',
      }),
    });

    // 2. CD
    this.register({
      name: 'cd',
      aliases: [],
      usage: 'cd [path]',
      description: 'Change current working directory',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 1,
      handler: (ctx) => {
        const target = ctx.args[0] ?? '~';
        const user = userMgr.getCurrentUser();
        const homeDir = user.homeDirectory;
        let resolved = target === '~' ? homeDir : target.startsWith('~/') ? homeDir + target.slice(1) : target;

        if (!resolved.startsWith('/')) {
          resolved = ctx.cwd === '/' ? `/${resolved}` : `${ctx.cwd}/${resolved}`;
        }
        resolved = fs.normalizePath(resolved);

        const lookup = fs.lookup(resolved, user);
        if (!lookup.success) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `cd: no such file or directory: ${target}\n`,
          };
        }

        if (lookup.data.nodeType !== 'directory') {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `cd: not a directory: ${target}\n`,
          };
        }

        if (!PermissionsEngine.checkAccess(lookup.data, user, 1)) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `cd: permission denied: ${target}\n`,
          };
        }

        if (ctx.onCwdChange) {
          ctx.onCwdChange(resolved);
        }
        ctx.cwd = resolved;
        ctx.env['PWD'] = resolved;

        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 3. LS
    this.register({
      name: 'ls',
      aliases: ['dir'],
      usage: 'ls [-l] [-a] [path]',
      description: 'List directory contents',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 3,
      handler: (ctx) => {
        let showLong = false;
        let showAll = false;
        let targetPath = ctx.cwd;

        for (const arg of ctx.args) {
          if (arg === '-l') showLong = true;
          else if (arg === '-a') showAll = true;
          else if (arg === '-la' || arg === '-al') {
            showLong = true;
            showAll = true;
          } else if (!arg.startsWith('-')) {
            targetPath = arg.startsWith('/') ? arg : (ctx.cwd === '/' ? `/${arg}` : `${ctx.cwd}/${arg}`);
          }
        }

        targetPath = fs.normalizePath(targetPath);
        const user = userMgr.getCurrentUser();
        const listRes = fs.listDirectory(targetPath, user);

        if (!listRes.success) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `ls: cannot access '${targetPath}': ${listRes.message}\n`,
          };
        }

        const items = listRes.data.filter((item) => showAll || !item.name.startsWith('.'));

        if (!showLong) {
          const names = items.map((i) => (i.nodeType === 'directory' ? `${i.name}/` : i.name));
          return {
            exitCode: 0,
            stdout: names.length > 0 ? names.join('  ') + '\n' : '',
            stderr: '',
          };
        }

        // Long format
        const lines = items.map((item) => {
          const perm = PermissionsEngine.formatMode(item.mode, item.nodeType === 'directory');
          const owner = userMgr.getUser(item.uid)?.username ?? String(item.uid);
          const group = userMgr.getGroup(item.gid)?.name ?? String(item.gid);
          const size = String(item.sizeBytes).padStart(6, ' ');
          const date = item.modifiedAt.slice(0, 10);
          const name = item.nodeType === 'directory' ? `${item.name}/` : item.name;
          return `${perm}  1 ${owner} ${group}  ${size}  ${date}  ${name}`;
        });

        return {
          exitCode: 0,
          stdout: `total ${items.length}\n` + lines.join('\n') + (lines.length > 0 ? '\n' : ''),
          stderr: '',
        };
      },
    });

    // 4. CAT
    this.register({
      name: 'cat',
      aliases: [],
      usage: 'cat <file...>',
      description: 'Concatenate and print file contents',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 10,
      handler: (ctx) => {
        if (ctx.args.length === 0) {
          if (ctx.stdin !== undefined) {
            return { exitCode: 0, stdout: ctx.stdin, stderr: '' };
          }
          return { exitCode: 0, stdout: '', stderr: '' };
        }

        const user = userMgr.getCurrentUser();
        let output = '';
        let hasError = false;
        let stderr = '';

        for (const file of ctx.args) {
          const fullPath = fs.normalizePath(
            file.startsWith('/') ? file : (ctx.cwd === '/' ? `/${file}` : `${ctx.cwd}/${file}`)
          );
          const readRes = fs.readFile(fullPath, user);
          if (readRes.success) {
            output += readRes.data;
            if (!readRes.data.endsWith('\n') && readRes.data.length > 0) {
              output += '\n';
            }
          } else {
            hasError = true;
            stderr += `cat: ${file}: ${readRes.message}\n`;
          }
        }

        return {
          exitCode: hasError ? 1 : 0,
          stdout: output,
          stderr,
        };
      },
    });

    // 5. ECHO
    this.register({
      name: 'echo',
      aliases: [],
      usage: 'echo [args...]',
      description: 'Display a line of text',
      category: 'system',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 100,
      handler: (ctx) => ({
        exitCode: 0,
        stdout: ctx.args.join(' ') + '\n',
        stderr: '',
      }),
    });

    // 6. CLEAR
    this.register({
      name: 'clear',
      aliases: ['cls'],
      usage: 'clear',
      description: 'Clear terminal screen',
      category: 'system',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: (ctx) => {
        if (ctx.onClear) ctx.onClear();
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 7. MKDIR
    this.register({
      name: 'mkdir',
      aliases: [],
      usage: 'mkdir [-p] <directory>',
      description: 'Create directories in RocketFS',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 5,
      handler: (ctx) => {
        let recursive = false;
        const dirs: string[] = [];

        for (const a of ctx.args) {
          if (a === '-p') recursive = true;
          else dirs.push(a);
        }

        if (dirs.length === 0) {
          return { exitCode: 1, stdout: '', stderr: 'mkdir: missing operand\n' };
        }

        const user = userMgr.getCurrentUser();
        let stderr = '';
        let exitCode = 0;

        for (const dir of dirs) {
          const fullPath = fs.normalizePath(
            dir.startsWith('/') ? dir : (ctx.cwd === '/' ? `/${dir}` : `${ctx.cwd}/${dir}`)
          );
          const res = fs.createDirectory(fullPath, user);
          if (!res.success) {
            stderr += `mkdir: cannot create directory '${dir}': ${res.message}\n`;
            exitCode = 1;
          }
        }

        return { exitCode, stdout: '', stderr };
      },
    });

    // 8. TOUCH
    this.register({
      name: 'touch',
      aliases: [],
      usage: 'touch <file...>',
      description: 'Create empty file or update timestamp',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 10,
      handler: (ctx) => {
        const user = userMgr.getCurrentUser();
        let stderr = '';
        let exitCode = 0;

        for (const f of ctx.args) {
          const fullPath = fs.normalizePath(
            f.startsWith('/') ? f : (ctx.cwd === '/' ? `/${f}` : `${ctx.cwd}/${f}`)
          );
          const lookup = fs.lookup(fullPath, user);
          if (lookup.success) {
            lookup.data.modifiedAt = new Date().toISOString();
          } else {
            const res = fs.createFile(fullPath, '', user);
            if (!res.success) {
              stderr += `touch: cannot touch '${f}': ${res.message}\n`;
              exitCode = 1;
            }
          }
        }

        return { exitCode, stdout: '', stderr };
      },
    });

    // 9. RM
    this.register({
      name: 'rm',
      aliases: [],
      usage: 'rm [-r] [-f] <path...>',
      description: 'Remove files or directories in RocketFS',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 10,
      handler: (ctx) => {
        let recursive = false;
        const targets: string[] = [];

        for (const a of ctx.args) {
          if (a === '-r' || a === '-rf' || a === '-R') recursive = true;
          else if (a === '-f') {
            // ignore force
          } else targets.push(a);
        }

        if (targets.length === 0) {
          return { exitCode: 1, stdout: '', stderr: 'rm: missing operand\n' };
        }

        const user = userMgr.getCurrentUser();
        let stderr = '';
        let exitCode = 0;

        for (const t of targets) {
          const fullPath = fs.normalizePath(
            t.startsWith('/') ? t : (ctx.cwd === '/' ? `/${t}` : `${ctx.cwd}/${t}`)
          );
          const res = fs.delete(fullPath, user, recursive);
          if (!res.success) {
            stderr += `rm: cannot remove '${t}': ${res.message}\n`;
            exitCode = 1;
          }
        }

        return { exitCode, stdout: '', stderr };
      },
    });

    // 10. RMDIR
    this.register({
      name: 'rmdir',
      aliases: [],
      usage: 'rmdir <directory>',
      description: 'Remove empty directory',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 5,
      handler: (ctx) => {
        const user = userMgr.getCurrentUser();
        let stderr = '';
        let exitCode = 0;

        for (const d of ctx.args) {
          const fullPath = fs.normalizePath(
            d.startsWith('/') ? d : (ctx.cwd === '/' ? `/${d}` : `${ctx.cwd}/${d}`)
          );
          const res = fs.delete(fullPath, user, false);
          if (!res.success) {
            stderr += `rmdir: failed to remove '${d}': ${res.message}\n`;
            exitCode = 1;
          }
        }

        return { exitCode, stdout: '', stderr };
      },
    });

    // 11. CP
    this.register({
      name: 'cp',
      aliases: ['copy'],
      usage: 'cp [-r] <source> <destination>',
      description: 'Copy files or directories',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 2,
      maxArgs: 3,
      handler: (ctx) => {
        let recursive = false;
        const paths: string[] = [];

        for (const a of ctx.args) {
          if (a === '-r' || a === '-R') recursive = true;
          else paths.push(a);
        }

        if (paths.length < 2) {
          return { exitCode: 1, stdout: '', stderr: 'cp: missing destination file operand\n' };
        }

        const src = fs.normalizePath(
          paths[0].startsWith('/') ? paths[0] : (ctx.cwd === '/' ? `/${paths[0]}` : `${ctx.cwd}/${paths[0]}`)
        );
        const dest = fs.normalizePath(
          paths[1].startsWith('/') ? paths[1] : (ctx.cwd === '/' ? `/${paths[1]}` : `${ctx.cwd}/${paths[1]}`)
        );

        const user = userMgr.getCurrentUser();
        const res = fs.copy(src, dest, user, recursive);
        if (!res.success) {
          return { exitCode: 1, stdout: '', stderr: `cp: ${res.message}\n` };
        }

        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 12. MV
    this.register({
      name: 'mv',
      aliases: ['move'],
      usage: 'mv <source> <destination>',
      description: 'Move or rename files and directories',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 2,
      maxArgs: 2,
      handler: (ctx) => {
        const src = fs.normalizePath(
          ctx.args[0].startsWith('/') ? ctx.args[0] : (ctx.cwd === '/' ? `/${ctx.args[0]}` : `${ctx.cwd}/${ctx.args[0]}`)
        );
        const dest = fs.normalizePath(
          ctx.args[1].startsWith('/') ? ctx.args[1] : (ctx.cwd === '/' ? `/${ctx.args[1]}` : `${ctx.cwd}/${ctx.args[1]}`)
        );

        const user = userMgr.getCurrentUser();
        const res = fs.move(src, dest, user);
        if (!res.success) {
          return { exitCode: 1, stdout: '', stderr: `mv: ${res.message}\n` };
        }

        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 13. FIND
    this.register({
      name: 'find',
      aliases: [],
      usage: 'find [path] [-name pattern]',
      description: 'Search for files in directory hierarchy',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 4,
      handler: (ctx) => {
        let searchRoot = ctx.cwd;
        let pattern = '';

        for (let i = 0; i < ctx.args.length; i++) {
          if (ctx.args[i] === '-name' && i + 1 < ctx.args.length) {
            pattern = ctx.args[i + 1].replace(/[*]/g, '');
            i++;
          } else if (!ctx.args[i].startsWith('-')) {
            searchRoot = fs.normalizePath(
              ctx.args[i].startsWith('/') ? ctx.args[i] : (ctx.cwd === '/' ? `/${ctx.args[i]}` : `${ctx.cwd}/${ctx.args[i]}`)
            );
          }
        }

        const user = userMgr.getCurrentUser();
        const inodes = fs.search(pattern || '', user, searchRoot);
        const lines = inodes.map((i) => i.canonicalPath);
        return {
          exitCode: 0,
          stdout: lines.join('\n') + (lines.length > 0 ? '\n' : ''),
          stderr: '',
        };
      },
    });

    // 14. GREP
    this.register({
      name: 'grep',
      aliases: [],
      usage: 'grep [-i] <pattern> [file...]',
      description: 'Search pattern in files or standard input',
      category: 'text',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 5,
      handler: (ctx) => {
        let ignoreCase = false;
        let pattern = '';
        const files: string[] = [];

        for (const a of ctx.args) {
          if (a === '-i') ignoreCase = true;
          else if (!pattern) pattern = a;
          else files.push(a);
        }

        if (!pattern) {
          return { exitCode: 1, stdout: '', stderr: 'grep: missing pattern\n' };
        }

        const checkMatch = (line: string): boolean => {
          if (ignoreCase) {
            return line.toLowerCase().includes(pattern.toLowerCase());
          }
          return line.includes(pattern);
        };

        if (files.length === 0) {
          const content = ctx.stdin ?? '';
          const lines = content.split('\n').filter(checkMatch);
          return {
            exitCode: lines.length > 0 ? 0 : 1,
            stdout: lines.join('\n') + (lines.length > 0 ? '\n' : ''),
            stderr: '',
          };
        }

        const user = userMgr.getCurrentUser();
        const matched: string[] = [];
        let exitCode = 1;

        for (const file of files) {
          const fullPath = fs.normalizePath(
            file.startsWith('/') ? file : (ctx.cwd === '/' ? `/${file}` : `${ctx.cwd}/${file}`)
          );
          const read = fs.readFile(fullPath, user);
          if (read.success) {
            const lines = read.data.split('\n');
            for (const line of lines) {
              if (checkMatch(line)) {
                matched.push(files.length > 1 ? `${file}:${line}` : line);
                exitCode = 0;
              }
            }
          }
        }

        return {
          exitCode,
          stdout: matched.join('\n') + (matched.length > 0 ? '\n' : ''),
          stderr: '',
        };
      },
    });

    // 15. HEAD
    this.register({
      name: 'head',
      aliases: [],
      usage: 'head [-n count] [file]',
      description: 'Output the first part of files',
      category: 'text',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 3,
      handler: (ctx) => {
        let count = 10;
        let targetFile = '';

        for (let i = 0; i < ctx.args.length; i++) {
          if (ctx.args[i] === '-n' && i + 1 < ctx.args.length) {
            count = parseInt(ctx.args[i + 1], 10) || 10;
            i++;
          } else {
            targetFile = ctx.args[i];
          }
        }

        let content = ctx.stdin ?? '';
        if (targetFile) {
          const fullPath = fs.normalizePath(
            targetFile.startsWith('/') ? targetFile : (ctx.cwd === '/' ? `/${targetFile}` : `${ctx.cwd}/${targetFile}`)
          );
          const res = fs.readFile(fullPath, userMgr.getCurrentUser());
          if (!res.success) {
            return { exitCode: 1, stdout: '', stderr: `head: cannot open '${targetFile}': ${res.message}\n` };
          }
          content = res.data;
        }

        const lines = content.split('\n').slice(0, count);
        return {
          exitCode: 0,
          stdout: lines.join('\n') + '\n',
          stderr: '',
        };
      },
    });

    // 16. TAIL
    this.register({
      name: 'tail',
      aliases: [],
      usage: 'tail [-n count] [file]',
      description: 'Output the last part of files',
      category: 'text',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 3,
      handler: (ctx) => {
        let count = 10;
        let targetFile = '';

        for (let i = 0; i < ctx.args.length; i++) {
          if (ctx.args[i] === '-n' && i + 1 < ctx.args.length) {
            count = parseInt(ctx.args[i + 1], 10) || 10;
            i++;
          } else {
            targetFile = ctx.args[i];
          }
        }

        let content = ctx.stdin ?? '';
        if (targetFile) {
          const fullPath = fs.normalizePath(
            targetFile.startsWith('/') ? targetFile : (ctx.cwd === '/' ? `/${targetFile}` : `${ctx.cwd}/${targetFile}`)
          );
          const res = fs.readFile(fullPath, userMgr.getCurrentUser());
          if (!res.success) {
            return { exitCode: 1, stdout: '', stderr: `tail: cannot open '${targetFile}': ${res.message}\n` };
          }
          content = res.data;
        }

        const lines = content.split('\n');
        const slice = lines.slice(Math.max(0, lines.length - count));
        return {
          exitCode: 0,
          stdout: slice.join('\n') + '\n',
          stderr: '',
        };
      },
    });

    // 17. WHOAMI
    this.register({
      name: 'whoami',
      aliases: [],
      usage: 'whoami',
      description: 'Print current user identity',
      category: 'info',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: () => {
        const u = userMgr.getCurrentUser();
        return { exitCode: 0, stdout: `${u.username}\n`, stderr: '' };
      },
    });

    // 18. ID
    this.register({
      name: 'id',
      aliases: [],
      usage: 'id',
      description: 'Print user and group information',
      category: 'info',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: () => {
        const u = userMgr.getCurrentUser();
        const priGroup = userMgr.getGroup(u.primaryGid);
        const priStr = `${u.primaryGid}(${priGroup?.name ?? 'unknown'})`;
        const suppStrs = u.supplementaryGids.map((gid) => {
          const g = userMgr.getGroup(gid);
          return `${gid}(${g?.name ?? 'unknown'})`;
        });

        return {
          exitCode: 0,
          stdout: `uid=${u.uid}(${u.username}) gid=${priStr} groups=${suppStrs.join(',')}\n`,
          stderr: '',
        };
      },
    });

    // 19. ENV
    this.register({
      name: 'env',
      aliases: ['printenv'],
      usage: 'env',
      description: 'Display environment variables',
      category: 'system',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: (ctx) => {
        const lines = Object.entries(ctx.env).map(([k, v]) => `${k}=${v}`);
        return {
          exitCode: 0,
          stdout: lines.sort().join('\n') + (lines.length > 0 ? '\n' : ''),
          stderr: '',
        };
      },
    });

    // 20. EXPORT
    this.register({
      name: 'export',
      aliases: ['set'],
      usage: 'export KEY=VALUE',
      description: 'Set environment variable',
      category: 'system',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 1,
      handler: (ctx) => {
        const pair = ctx.args[0];
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) {
          return { exitCode: 1, stdout: '', stderr: 'export: usage: export KEY=VALUE\n' };
        }
        const key = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        ctx.env[key] = value;
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 21. DATE
    this.register({
      name: 'date',
      aliases: [],
      usage: 'date',
      description: 'Display system date and time',
      category: 'info',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: () => ({
        exitCode: 0,
        stdout: `${new Date().toUTCString()}\n`,
        stderr: '',
      }),
    });

    // 22. UPTIME
    this.register({
      name: 'uptime',
      aliases: [],
      usage: 'uptime',
      description: 'Show how long RocketOS has been running',
      category: 'info',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: () => {
        const session = sessionMgr.getCurrentSession();
        const uptimeSec = Math.floor((Date.now() - session.startTimeEpochMs) / 1000);
        const mins = Math.floor(uptimeSec / 60);
        const secs = uptimeSec % 60;
        const activeProcs = procMgr.getActiveCount();

        return {
          exitCode: 0,
          stdout: `up ${mins} min ${secs} sec, 1 user, load average: 0.14, 0.08, 0.05 (${activeProcs} active processes)\n`,
          stderr: '',
        };
      },
    });

    // 23. FREE
    this.register({
      name: 'free',
      aliases: [],
      usage: 'free [-m] [-h]',
      description: 'Display memory usage accounting',
      category: 'info',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 1,
      handler: () => {
        const totalMb = SystemManifest.HARDWARE.totalMemoryMb;
        // Accounting based on real running processes
        const procs = procMgr.getAllProcesses();
        const usedBytes = procs.reduce((acc, p) => acc + p.accounting.memoryRssBytes, 0);
        const usedMb = Math.round(usedBytes / (1024 * 1024)) + 480; // include kernel/compositor baseline
        const freeMb = totalMb - usedMb;

        return {
          exitCode: 0,
          stdout: `               total        used        free      shared  buff/cache   available\nMem:         ${totalMb}M       ${usedMb}M       ${freeMb}M         64M        512M       ${freeMb}M\nSwap:         2048M          0M       2048M\n`,
          stderr: '',
        };
      },
    });

    // 24. PS
    this.register({
      name: 'ps',
      aliases: [],
      usage: 'ps [-a]',
      description: 'Report snapshot of active processes',
      category: 'process',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 1,
      handler: (ctx) => {
        const showAll = ctx.args.includes('-a') || ctx.args.includes('-aux');
        const procs = procMgr.getAllProcesses();
        const user = userMgr.getCurrentUser();

        const filtered = showAll ? procs : procs.filter((p) => p.uid === user.uid || p.pid === 1);

        const lines = filtered.map((p) => {
          const pid = String(p.pid).padStart(5, ' ');
          const ppid = String(p.ppid).padStart(5, ' ');
          const state = p.state.padEnd(8, ' ');
          const mem = `${Math.round(p.accounting.memoryRssBytes / (1024 * 1024))}M`.padStart(6, ' ');
          const cpu = `${(p.accounting.cpuPercentTenth / 10).toFixed(1)}%`.padStart(6, ' ');
          return `${pid} ${ppid} ${state} ${mem} ${cpu} ${p.name}`;
        });

        return {
          exitCode: 0,
          stdout: `  PID  PPID STATE      MEM    CPU COMMAND\n` + lines.join('\n') + '\n',
          stderr: '',
        };
      },
    });

    // 25. KILL
    this.register({
      name: 'kill',
      aliases: [],
      usage: 'kill [-9] <pid>',
      description: 'Terminate process by ID',
      category: 'process',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 2,
      handler: (ctx) => {
        let signal = 15;
        let pidStr = '';

        for (const a of ctx.args) {
          if (a === '-9') signal = 9;
          else if (a.startsWith('-')) signal = parseInt(a.slice(1), 10) || 15;
          else pidStr = a;
        }

        const pid = parseInt(pidStr, 10);
        if (isNaN(pid)) {
          return { exitCode: 1, stdout: '', stderr: `kill: illegal pid: ${pidStr}\n` };
        }

        const target = procMgr.getProcess(pid);
        if (!target) {
          return { exitCode: 1, stdout: '', stderr: `kill: (${pid}) - No such process\n` };
        }

        const user = userMgr.getCurrentUser();
        if (user.uid !== 0 && target.uid !== user.uid) {
          return { exitCode: 1, stdout: '', stderr: `kill: (${pid}) - Operation not permitted\n` };
        }

        const ok = procMgr.kill(pid, signal);
        if (!ok) {
          return { exitCode: 1, stdout: '', stderr: `kill: failed to signal process ${pid}\n` };
        }

        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 26. CHMOD
    this.register({
      name: 'chmod',
      aliases: [],
      usage: 'chmod <mode> <path>',
      description: 'Change file access permissions',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 2,
      maxArgs: 2,
      handler: (ctx) => {
        const modeStr = ctx.args[0];
        const path = ctx.args[1];
        const fullPath = fs.normalizePath(
          path.startsWith('/') ? path : (ctx.cwd === '/' ? `/${path}` : `${ctx.cwd}/${path}`)
        );

        let parsedMode: number;
        if (/^[0-7]{3,4}$/.test(modeStr)) {
          parsedMode = parseInt(modeStr, 8);
        } else {
          return { exitCode: 1, stdout: '', stderr: `chmod: invalid mode: '${modeStr}'\n` };
        }

        const user = userMgr.getCurrentUser();
        const res = fs.chmod(fullPath, parsedMode, user);
        if (!res.success) {
          return { exitCode: 1, stdout: '', stderr: `chmod: ${res.message}\n` };
        }

        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 27. CHOWN
    this.register({
      name: 'chown',
      aliases: [],
      usage: 'chown <owner[:group]> <path>',
      description: 'Change file owner and group',
      category: 'filesystem',
      requiresElevation: true,
      minArgs: 2,
      maxArgs: 2,
      handler: (ctx) => {
        const spec = ctx.args[0];
        const path = ctx.args[1];
        const fullPath = fs.normalizePath(
          path.startsWith('/') ? path : (ctx.cwd === '/' ? `/${path}` : `${ctx.cwd}/${path}`)
        );

        let targetUid: number | undefined;
        let targetGid: number | undefined;

        if (spec.includes(':')) {
          const [userPart, groupPart] = spec.split(':');
          if (userPart) {
            const u = userMgr.getUserByUsername(userPart);
            if (!u) return { exitCode: 1, stdout: '', stderr: `chown: invalid user: '${userPart}'\n` };
            targetUid = u.uid;
          }
          if (groupPart) {
            const g = userMgr.getGroups().find((grp) => grp.name === groupPart);
            if (!g) return { exitCode: 1, stdout: '', stderr: `chown: invalid group: '${groupPart}'\n` };
            targetGid = g.gid;
          }
        } else {
          const u = userMgr.getUserByUsername(spec);
          if (!u) return { exitCode: 1, stdout: '', stderr: `chown: invalid user: '${spec}'\n` };
          targetUid = u.uid;
        }

        const user = userMgr.getCurrentUser();
        const res = fs.chown(fullPath, targetUid ?? -1, targetGid, user);
        if (!res.success) {
          return { exitCode: 1, stdout: '', stderr: `chown: ${res.message}\n` };
        }

        return { exitCode: 0, stdout: '', stderr: '' };
      },
    });

    // 28. MOUNT-INFO
    this.register({
      name: 'mount-info',
      aliases: ['df', 'mount'],
      usage: 'mount-info',
      description: 'Display mounted virtual filesystems',
      category: 'filesystem',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: () => {
        const out = `Filesystem     Type       Size  Used Avail Use% Mounted on
/dev/nvme0n1p1 rocketfs   256G   24M  256G   1% /
proc           procfs       0B    0B    0B   0% /proc
sys            sysfs        0B    0B    0B   0% /sys
dev            devtmpfs   4.0M    4K  4.0M   1% /dev
tmp            tmpfs      1.0G   16K  1.0G   1% /tmp
`;
        return { exitCode: 0, stdout: out, stderr: '' };
      },
    });

    // 29. ROCKETCTL
    this.register({
      name: 'rocketctl',
      aliases: ['systemctl'],
      usage: 'rocketctl <status|list|start|stop|restart> [service]',
      description: 'Control and inspect RocketOS background services',
      category: 'admin',
      requiresElevation: false,
      minArgs: 1,
      maxArgs: 2,
      handler: (ctx) => {
        const action = ctx.args[0]?.toLowerCase();
        const target = ctx.args[1];

        if (action === 'list') {
          const services = svcMgr.listServices();
          const lines = services.map((s) => {
            const state = s.state.padEnd(8, ' ');
            const pid = s.processId ? `PID ${s.processId}`.padEnd(9, ' ') : 'Inactive '.padEnd(9, ' ');
            const restarts = `restarts=${s.restartCount}`.padEnd(12, ' ');
            return `* ${s.id.padEnd(16, ' ')} [${state}] ${pid} ${restarts} ${s.name}`;
          });
          return {
            exitCode: 0,
            stdout: `RocketOS Service Supervisor State:\n` + lines.join('\n') + '\n',
            stderr: '',
          };
        }

        if (action === 'status') {
          if (!target) {
            const running = svcMgr.getRunningCount();
            const total = svcMgr.listServices().length;
            return {
              exitCode: 0,
              stdout: `RocketOS System Supervisor: ${running}/${total} services running. Use 'rocketctl list' or 'rocketctl status <service>'.\n`,
              stderr: '',
            };
          }

          const svc = svcMgr.getStatus(target);
          if (!svc) {
            return { exitCode: 1, stdout: '', stderr: `rocketctl: service '${target}' not found\n` };
          }

          const uptime = svc.startTimeEpochMs ? `${Math.floor((Date.now() - svc.startTimeEpochMs) / 1000)}s` : 'N/A';
          const out = `● ${svc.id} - ${svc.name}
   Loaded: loaded (startup-mode=${svc.startupMode}; critical=${svc.isCritical})
   Active: ${svc.state.toLowerCase()} since ${new Date(svc.startTimeEpochMs || Date.now()).toISOString()} (uptime: ${uptime})
  Process: ${svc.processId || 0}
   Status: "${svc.statusMessage}"
 Restarts: ${svc.restartCount}
     Deps: [${svc.dependencies.join(', ')}]
`;
          return { exitCode: 0, stdout: out, stderr: '' };
        }

        if (action === 'start') {
          if (!target) return { exitCode: 1, stdout: '', stderr: 'rocketctl start: missing service name\n' };
          const res = svcMgr.start(target);
          return {
            exitCode: res.success ? 0 : 1,
            stdout: res.success ? `${res.message}\n` : '',
            stderr: res.success ? '' : `rocketctl: ${res.message}\n`,
          };
        }

        if (action === 'stop') {
          if (!target) return { exitCode: 1, stdout: '', stderr: 'rocketctl stop: missing service name\n' };
          const res = svcMgr.stop(target);
          return {
            exitCode: res.success ? 0 : 1,
            stdout: res.success ? `${res.message}\n` : '',
            stderr: res.success ? '' : `rocketctl: ${res.message}\n`,
          };
        }

        if (action === 'restart') {
          if (!target) return { exitCode: 1, stdout: '', stderr: 'rocketctl restart: missing service name\n' };
          const res = svcMgr.restart(target);
          return {
            exitCode: res.success ? 0 : 1,
            stdout: res.success ? `${res.message}\n` : '',
            stderr: res.success ? '' : `rocketctl: ${res.message}\n`,
          };
        }

        return {
          exitCode: 1,
          stdout: '',
          stderr: `rocketctl: unknown action '${action}'. Expected list, status, start, stop, or restart.\n`,
        };
      },
    });

    // 30. HELP
    this.register({
      name: 'help',
      aliases: ['?'],
      usage: 'help [command]',
      description: 'Display command assistance or man page',
      category: 'info',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 1,
      handler: (ctx) => {
        if (ctx.args[0]) {
          const target = ctx.args[0];
          const cmd = this.getCommand(target);
          if (!cmd) {
            return { exitCode: 1, stdout: '', stderr: `help: no help topics match '${target}'\n` };
          }
          const aliases = cmd.aliases.length > 0 ? `Aliases: ${cmd.aliases.join(', ')}\n` : '';
          return {
            exitCode: 0,
            stdout: `${cmd.name.toUpperCase()} - ${cmd.description}\nUsage: ${cmd.usage}\nCategory: ${cmd.category}\n${aliases}`,
            stderr: '',
          };
        }

        const list = this.getAllCommands()
          .map((c) => `  ${c.name.padEnd(12, ' ')} - ${c.description}`)
          .sort();

        return {
          exitCode: 0,
          stdout: `RocketOS rsh v2.0 Shell Commands:\n${list.join('\n')}\n\nType 'help <command>' for specific usage information.\n`,
          stderr: '',
        };
      },
    });

    // 31. HISTORY
    this.register({
      name: 'history',
      aliases: [],
      usage: 'history [-c]',
      description: 'Display or clear command history',
      category: 'system',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 1,
      handler: (ctx) => {
        // Will be filled by terminal executor
        return { exitCode: 0, stdout: 'Command history active.\n', stderr: '' };
      },
    });

    // 32. EXIT
    this.register({
      name: 'exit',
      aliases: ['quit'],
      usage: 'exit',
      description: 'Exit shell or drop privilege elevation',
      category: 'system',
      requiresElevation: false,
      minArgs: 0,
      maxArgs: 0,
      handler: (ctx) => {
        if (sessionMgr.isElevated()) {
          sessionMgr.dropElevation();
          return {
            exitCode: 0,
            stdout: 'Dropped administrative elevation. Restored normal Ryan user session.\n',
            stderr: '',
          };
        }
        if (ctx.onExit) ctx.onExit();
        return { exitCode: 0, stdout: 'logout\n', stderr: '' };
      },
    });
  }

  // =========================================================================
  // PIPELINE & STATEMENT EXECUTION ENGINE
  // =========================================================================
  public async executeCommandLine(
    rawLine: string,
    context: CommandContext
  ): Promise<ShellExecutionResult> {
    const parseRes = ShellParser.parse(rawLine, context.env);
    if (parseRes.hasSyntaxError) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: `rsh: ${parseRes.errorMessage}\n`,
      };
    }

    if (parseRes.nodes.length === 0) {
      return { exitCode: 0, stdout: '', stderr: '' };
    }

    let lastResult: ShellExecutionResult = { exitCode: 0, stdout: '', stderr: '' };
    let currentInput = '';
    let skipNextIfAndFailed = false;
    let skipNextIfOrSucceeded = false;

    for (let i = 0; i < parseRes.nodes.length; i++) {
      const node = parseRes.nodes[i];

      if (skipNextIfAndFailed) {
        if (node.combinator === 'AND') continue;
        skipNextIfAndFailed = false;
      }
      if (skipNextIfOrSucceeded) {
        if (node.combinator === 'OR') continue;
        skipNextIfOrSucceeded = false;
      }

      // Execute single command node with piping & redirection
      lastResult = await this.executeSingleNode(node, context, currentInput);

      // Redirection output handling
      if (node.command.redirectStdout) {
        const fs = RocketFS.getInstance();
        const user = UserManager.getInstance().getCurrentUser();
        const targetPath = fs.normalizePath(
          node.command.redirectStdout.startsWith('/')
            ? node.command.redirectStdout
            : context.cwd === '/'
            ? `/${node.command.redirectStdout}`
            : `${context.cwd}/${node.command.redirectStdout}`
        );

        if (node.command.appendStdout) {
          fs.appendFile(targetPath, lastResult.stdout, user);
        } else {
          fs.writeFile(targetPath, lastResult.stdout, user);
        }
        lastResult.stdout = ''; // Redirected to file
      }

      // Pipeline handling
      if (node.combinator === 'PIPE') {
        currentInput = lastResult.stdout;
        continue;
      } else {
        currentInput = '';
      }

      // Boolean combinator handling
      if (node.combinator === 'AND') {
        if (lastResult.exitCode !== 0) {
          skipNextIfAndFailed = true;
        }
      } else if (node.combinator === 'OR') {
        if (lastResult.exitCode === 0) {
          skipNextIfOrSucceeded = true;
        }
      }
    }

    return lastResult;
  }

  private async executeSingleNode(
    node: CommandChainNode,
    ctx: CommandContext,
    stdinPipe: string
  ): Promise<ShellExecutionResult> {
    const { argv, redirectStdin } = node.command;
    if (argv.length === 0) {
      return { exitCode: 0, stdout: '', stderr: '' };
    }

    const cmdName = argv[0];
    const args = argv.slice(1);

    // If input redirection '< file' was specified, read file into stdin
    let effectiveStdin = stdinPipe;
    if (redirectStdin) {
      const fs = RocketFS.getInstance();
      const user = UserManager.getInstance().getCurrentUser();
      const targetPath = fs.normalizePath(
        redirectStdin.startsWith('/') ? redirectStdin : (ctx.cwd === '/' ? `/${redirectStdin}` : `${ctx.cwd}/${redirectStdin}`)
      );
      const readRes = fs.readFile(targetPath, user);
      if (readRes.success) {
        effectiveStdin = readRes.data;
      } else {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `rsh: cannot read '${redirectStdin}': ${readRes.message}\n`,
        };
      }
    }

    // Special command: sudo
    if (cmdName === 'sudo') {
      if (args.length === 0) {
        return { exitCode: 1, stdout: '', stderr: 'usage: sudo <command...>\n' };
      }
      const sessionMgr = SessionManager.getInstance();
      const elevRes = sessionMgr.requestElevation(args.join(' '));
      if (!elevRes.success) {
        return { exitCode: 1, stdout: '', stderr: `sudo: ${elevRes.message}\n` };
      }
      // Execute the sub-command elevated
      return this.executeCommandLine(args.join(' '), ctx);
    }

    const cmd = this.getCommand(cmdName);
    if (!cmd) {
      return {
        exitCode: 127,
        stdout: '',
        stderr: `rsh: command not found: ${cmdName}\n`,
      };
    }

    // Check elevation requirements
    if (cmd.requiresElevation && !SessionManager.getInstance().isElevated()) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `rsh: '${cmdName}' requires administrative elevation (sudo).\n`,
      };
    }

    const cmdCtx: CommandContext = {
      ...ctx,
      args,
      stdin: effectiveStdin,
    };

    try {
      return await cmd.handler(cmdCtx);
    } catch (err: any) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `rsh: runtime exception in ${cmdName}: ${err?.message || 'unknown error'}\n`,
      };
    }
  }
}
