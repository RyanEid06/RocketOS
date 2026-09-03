// RocketFS.ts
// Single authoritative Virtual File System for RocketOS
// Authoritative TypeScript binding for rocket/filesystem/vfs.rocket

import { FSItem } from '../../types';
import { AuditLogger } from '../admin/AuditLogger';
import { UserManager } from '../users/UserManager';
import { FileAssociations } from './FileAssociations';
import { PathEngine } from './PathEngine';
import { PermissionsEngine } from './PermissionsEngine';
import { TrashSubsystem } from './TrashSubsystem';
import {
  RocketFSSnapshot,
  SystemUser,
  TrashRecord,
  VFSErrorCode,
  VFSInode,
  VFSNodeType,
  VFSResult,
  VFSStat,
} from './types';
import { VirtualFS } from './VirtualFS';

export class RocketFS {
  private static instance: RocketFS;

  private nextInode = 1;
  private inodesById: Map<number, VFSInode> = new Map();
  private inodesByPath: Map<string, number> = new Map();
  private trashSubsystem: TrashSubsystem;
  private listeners: Set<() => void> = new Set();

  private constructor(snapshot?: RocketFSSnapshot) {
    this.trashSubsystem = new TrashSubsystem();

    if (snapshot) {
      this.loadSnapshot(snapshot);
    } else {
      this.bootstrapDefaultHierarchy();
    }
  }

  public static getInstance(initialSnapshot?: RocketFSSnapshot): RocketFS {
    if (!RocketFS.instance) {
      RocketFS.instance = new RocketFS(initialSnapshot);
    }
    return RocketFS.instance;
  }

  public getTrashSubsystem(): TrashSubsystem {
    return this.trashSubsystem;
  }

  // =========================================================================
  // BOOTSTRAP DEFAULT ROOT HIERARCHY
  // =========================================================================
  public bootstrapDefaultHierarchy(): void {
    this.inodesById.clear();
    this.inodesByPath.clear();
    this.nextInode = 1;

    const now = new Date().toISOString();

    // 1. Root /
    this.createRawInode('/', 'directory', 0, 0, 0o755, 1, 'inode/directory');

    // 2. Unix standard top-level directories
    const topDirs = [
      { path: '/boot', mode: 0o755, uid: 0, gid: 0 },
      { path: '/dev', mode: 0o755, uid: 0, gid: 0 },
      { path: '/etc', mode: 0o755, uid: 0, gid: 0 },
      { path: '/home', mode: 0o755, uid: 0, gid: 0 },
      { path: '/root', mode: 0o700, uid: 0, gid: 0 }, // Private root home
      { path: '/run', mode: 0o755, uid: 0, gid: 0 },
      { path: '/tmp', mode: 0o777, uid: 0, gid: 0 },
      { path: '/usr', mode: 0o755, uid: 0, gid: 0 },
      { path: '/var', mode: 0o755, uid: 0, gid: 0 },
      { path: '/proc', mode: 0o555, uid: 0, gid: 0 }, // Read-only virtual
      { path: '/sys', mode: 0o555, uid: 0, gid: 0 },  // Read-only virtual
      { path: '/mnt', mode: 0o755, uid: 0, gid: 0 },
      { path: '/opt', mode: 0o755, uid: 0, gid: 0 },
    ];

    for (const d of topDirs) {
      this.createRawInode(d.path, 'directory', d.uid, d.gid, d.mode, undefined, 'inode/directory');
    }

    // 3. /etc sub-hierarchy
    this.createRawInode('/etc/rocketos', 'directory', 0, 0, 0o755);
    this.createRawInode(
      '/etc/rocketos/release',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/plain',
      'NAME="RocketOS"\nVERSION="2.1.0-LTS"\nID=rocketos\nPRETTY_NAME="RocketOS 2.1 LTS (x86_64)"\n'
    );
    this.createRawInode(
      '/etc/rocketos/config.toml',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/x-toml',
      '[kernel]\nconcurrency = "send_share_arc"\npaging = "PML4"\n\n[graphics]\nadapter = "raylib-6.0"\ncompositor = "liquid-glass"\n'
    );
    this.createRawInode(
      '/etc/passwd',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/plain',
      'root:x:0:0:System Administrator:/root:/usr/bin/rsh\nryan:x:1000:100:Ryan Eid:/home/ryan:/usr/bin/rsh\n'
    );
    this.createRawInode(
      '/etc/group',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/plain',
      'root:x:0:root\nadmin:x:10:root,ryan\naudio:x:29:ryan\nusers:x:100:ryan\nnetwork:x:101:ryan\nstorage:x:102:ryan\ndevelopers:x:1000:ryan\n'
    );

    // 4. /home/ryan user environment
    this.createRawInode('/home/ryan', 'directory', 1000, 100, 0o755);
    const userDirs = [
      '/home/ryan/Desktop',
      '/home/ryan/Documents',
      '/home/ryan/Downloads',
      '/home/ryan/Pictures',
      '/home/ryan/Music',
      '/home/ryan/Projects',
      '/home/ryan/Projects/Rocket',
    ];
    for (const d of userDirs) {
      this.createRawInode(d, 'directory', 1000, 100, 0o755);
    }

    // Default Desktop files for Ryan
    this.createRawInode(
      '/home/ryan/Desktop/hello.rocket',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/x-rocket',
      '// RocketOS Language Demo - Hello World\nfn main() -> Int:\n    print("Hello from Rocket 2.1 native compiler!")\n    return 0\n'
    );

    this.createRawInode(
      '/home/ryan/Desktop/language_tour.rocket',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/x-rocket',
      '// Rocket Language Tour\nimport std.math\nimport std.collections\n\nstruct Vector2:\n    x: Float\n    y: Float\n\nfn main() -> Int:\n    let v = Vector2(x: 10.5, y: 20.2)\n    print("Vector initialized: " + string.from_float(v.x))\n    return 0\n'
    );

    this.createRawInode(
      '/home/ryan/Desktop/ownership_concurrency.rocket',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/x-rocket',
      '// Rocket Concurrency & Thread-Confined ARC\nimport std.concurrency\n\nfn worker_task(id: Int) -> Void:\n    print("Worker task active: " + string.from_int(id))\n\nfn main() -> Int:\n    spawn worker_task(1)\n    spawn worker_task(2)\n    return 0\n'
    );

    this.createRawInode(
      '/home/ryan/Desktop/fibonacci.rocket',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/x-rocket',
      '// Fast Recursive Fibonacci with Memoization\nfn fib(n: Int) -> Int:\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nfn main() -> Int:\n    print("fib(10) = " + string.from_int(fib(10)))\n    return 0\n'
    );

    this.createRawInode(
      '/home/ryan/Desktop/rocket.toml',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/x-toml',
      '[package]\nname = "my_rocket_app"\nversion = "1.0.0"\nauthors = ["Ryan Eid <ryan@rocket-lang.org>"]\nedition = "2026"\n\n[dependencies]\nraylib = "6.0"\n'
    );

    this.createRawInode(
      '/home/ryan/Desktop/README.md',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/markdown',
      '# Welcome to RocketOS 2.1\n\nRocketOS is a high-performance desktop environment powered by the Rocket Programming Language.\n\n### Key Features\n- Real Virtual Filesystem (RocketFS) with full Unix permissions\n- Authoritative Path Engine & Multi-User Architecture\n- Procedural Audio & WebAudio Synthesis Engine\n- Raylib 6.0 Safe Primitive Adapter\n'
    );

    this.createRawInode(
      '/home/ryan/Desktop/ROCKET_3_0_STATUS.txt',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/plain',
      'ROCKET 3.0 ROADMAP STATUS:\n- Stage 1: Lexer / AST Parser [COMPLETE]\n- Stage 2: Type Inference & HIR [COMPLETE]\n- Stage 3: Thread-Confined ARC & Concurrency [COMPLETE]\n- Stage 4: LLVM 22 O2 Optimization Pipeline [READY]\n'
    );

    // User Documents
    this.createRawInode(
      '/home/ryan/Documents/PHASE_19_AUDIT_SUMMARY.md',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/markdown',
      '# RocketOS Architecture Audit\n\nStatus: Verified\nKernel: Pure 64-bit protected mode\nSecurity: Sudo & RBAC privilege model active\n'
    );

    // User Projects
    this.createRawInode(
      '/home/ryan/Projects/Rocket/main.rocket',
      'file',
      1000,
      100,
      0o644,
      undefined,
      'text/x-rocket',
      'fn main() -> Int:\n    print("Rocket Project Main Entry")\n    return 0\n'
    );

    // 5. /root user private profile
    this.createRawInode(
      '/root/.profile',
      'file',
      0,
      0,
      0o600, // Private to root
      undefined,
      'text/plain',
      'export PATH=/usr/bin:/bin\nexport PS1="root@rocket-os:~# "\numask 022\n'
    );

    // 6. /usr sub-hierarchy
    this.createRawInode('/usr/bin', 'directory', 0, 0, 0o755);
    this.createRawInode('/usr/lib', 'directory', 0, 0, 0o755);
    this.createRawInode('/usr/share', 'directory', 0, 0, 0o755);
    this.createRawInode('/usr/share/applications', 'directory', 0, 0, 0o755);
    this.createRawInode('/usr/src', 'directory', 0, 0, 0o755);
    this.createRawInode('/usr/src/rocketos', 'directory', 0, 0, 0o755);
    this.createRawInode('/usr/src/rocketos/kernel', 'directory', 0, 0, 0o755);

    this.createRawInode(
      '/usr/bin/rocketc',
      'file',
      0,
      0,
      0o755,
      undefined,
      'application/x-executable',
      '#!/usr/bin/rsh\n# Rocket Compiler Native Executable Stub (LLVM 22 Target)\n'
    );

    this.createRawInode(
      '/usr/bin/rsh',
      'file',
      0,
      0,
      0o755,
      undefined,
      'application/x-executable',
      '#!/usr/bin/rsh\n# Rocket Shell v2.1 Interactive Command Interpreter\n'
    );

    this.createRawInode(
      '/usr/src/rocketos/kernel/boot_handoff.rocket',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/x-rocket',
      '// RocketOS Boot Handoff Routine\nimport kernel.arch.x86_64\n\nfn handoff_to_user_space() -> Void:\n    print("[KERNEL] Switching to ring 3 user mode...")\n'
    );

    // 7. /var and logging
    this.createRawInode('/var/log', 'directory', 0, 0, 0o755);
    this.createRawInode('/var/cache', 'directory', 0, 0, 0o755);
    this.createRawInode('/var/lib', 'directory', 0, 0, 0o755);

    this.createRawInode(
      '/var/log/system.log',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/plain',
      `[${now}] SYSTEM: RocketOS kernel initialized.\n[${now}] VFS: RocketFS virtual filesystem mounted on /.\n[${now}] USER: Interactive desktop session launched as user ryan (uid 1000).\n`
    );

    this.createRawInode(
      '/var/log/security.log',
      'file',
      0,
      0,
      0o640, // Group admin can read, only root can write
      undefined,
      'text/plain',
      `[${now}] AUDIT: Security subsystem initialized. Admin group (gid 10) authorized for sudo elevation.\n`
    );

    this.createRawInode(
      '/var/log/services.log',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/plain',
      `[${now}] AUDIO: WebAudio procedural synthesizer daemon started.\n[${now}] WM: WindowManager v2 initialized with 4 workspaces.\n`
    );

    this.createRawInode(
      '/var/log/apps.log',
      'file',
      0,
      0,
      0o644,
      undefined,
      'text/plain',
      `[${now}] APPS: System registry loaded 12 core desktop applications.\n`
    );

    // 8. Virtual /proc entries
    this.createVirtualInode('/proc/version', 'proc', 0o444, () => VirtualFS.getProcVersion());
    this.createVirtualInode('/proc/uptime', 'proc', 0o444, () => VirtualFS.getProcUptime());
    this.createVirtualInode('/proc/meminfo', 'proc', 0o444, () => VirtualFS.getProcMeminfo());
    this.createVirtualInode('/proc/cpuinfo', 'proc', 0o444, () => VirtualFS.getProcCpuinfo());
    this.createVirtualInode('/proc/processes', 'proc', 0o444, () => VirtualFS.getProcProcesses());

    // 9. Virtual /sys entries
    this.createRawInode('/sys/devices', 'directory', 0, 0, 0o555);
    this.createVirtualInode('/sys/platform', 'sys', 0o444, () => VirtualFS.getSysPlatform());
    this.createVirtualInode('/sys/capabilities', 'sys', 0o444, () => VirtualFS.getSysCapabilities());
    this.createVirtualInode('/sys/devices/nvme0', 'sys', 0o444, () => VirtualFS.getSysDeviceNvme0());
    this.createVirtualInode('/sys/devices/hdaudio0', 'sys', 0o444, () => VirtualFS.getSysDeviceHdaudio0());
    this.createVirtualInode('/sys/devices/gpu0', 'sys', 0o444, () => VirtualFS.getSysDeviceGpu0());

    // 10. Virtual /dev entries
    this.createVirtualInode('/dev/null', 'dev', 0o666, () => '');
    this.createVirtualInode('/dev/zero', 'dev', 0o444, () => '\0\0\0\0');
    this.createVirtualInode('/dev/random', 'dev', 0o444, () => Math.random().toString(36).slice(2));
    this.createVirtualInode('/dev/tty', 'dev', 0o666, () => 'Active Terminal /dev/tty1');
  }

  private createRawInode(
    canonicalPath: string,
    nodeType: VFSNodeType,
    uid = 0,
    gid = 0,
    mode = 0o644,
    parentInodeOverride?: number,
    mimeType?: string,
    content?: string
  ): VFSInode {
    const canonical = PathEngine.canonicalize(canonicalPath);
    let parentInodeId = parentInodeOverride;

    if (parentInodeId === undefined) {
      if (canonical === '/') {
        parentInodeId = 1;
      } else {
        const parentPath = PathEngine.getParentPath(canonical);
        parentInodeId = this.inodesByPath.get(parentPath) || 1;
      }
    }

    const name = PathEngine.getBasename(canonical);
    const resolvedMime =
      mimeType ||
      (nodeType === 'directory'
        ? 'inode/directory'
        : FileAssociations.getMimeType(name));

    const sizeBytes = content ? new TextEncoder().encode(content).length : (nodeType === 'directory' ? 4096 : 0);
    const now = new Date().toISOString();

    const inode: VFSInode = {
      inode: this.nextInode++,
      name,
      canonicalPath: canonical,
      parentInode: parentInodeId,
      nodeType,
      uid,
      gid,
      mode,
      sizeBytes,
      mimeType: resolvedMime,
      createdAt: now,
      modifiedAt: now,
      accessedAt: now,
      flags: 0,
      backend: 'vfs_disk',
      content: content ?? (nodeType === 'directory' ? undefined : ''),
      childrenInodes: nodeType === 'directory' ? [] : undefined,
    };

    this.inodesById.set(inode.inode, inode);
    this.inodesByPath.set(canonical, inode.inode);

    if (canonical !== '/') {
      const parentNode = this.inodesById.get(parentInodeId);
      if (parentNode && parentNode.childrenInodes) {
        if (!parentNode.childrenInodes.includes(inode.inode)) {
          parentNode.childrenInodes.push(inode.inode);
        }
      }
    }

    return inode;
  }

  private createVirtualInode(
    canonicalPath: string,
    backend: 'proc' | 'sys' | 'dev',
    mode: number,
    generator: () => string
  ): VFSInode {
    const canonical = PathEngine.canonicalize(canonicalPath);
    const parentPath = PathEngine.getParentPath(canonical);
    const parentInodeId = this.inodesByPath.get(parentPath) || 1;
    const name = PathEngine.getBasename(canonical);
    const now = new Date().toISOString();

    const inode: VFSInode = {
      inode: this.nextInode++,
      name,
      canonicalPath: canonical,
      parentInode: parentInodeId,
      nodeType: 'virtual',
      uid: 0,
      gid: 0,
      mode,
      sizeBytes: 0,
      mimeType: 'text/plain',
      createdAt: now,
      modifiedAt: now,
      accessedAt: now,
      flags: 0,
      backend,
      virtualGenerator: generator,
    };

    this.inodesById.set(inode.inode, inode);
    this.inodesByPath.set(canonical, inode.inode);

    const parentNode = this.inodesById.get(parentInodeId);
    if (parentNode && parentNode.childrenInodes) {
      if (!parentNode.childrenInodes.includes(inode.inode)) {
        parentNode.childrenInodes.push(inode.inode);
      }
    }

    return inode;
  }

  // =========================================================================
  // CORE VFS OPERATIONS
  // =========================================================================

  public lookup(path: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<VFSInode> {
    try {
      const canonical = PathEngine.canonicalize(path);
      const inodeId = this.inodesByPath.get(canonical);
      if (!inodeId) {
        return { success: false, error: 'NOT_FOUND', message: `Path '${path}' does not exist.` };
      }

      const inode = this.inodesById.get(inodeId);
      if (!inode) {
        return { success: false, error: 'NOT_FOUND', message: `Inode ${inodeId} missing.` };
      }

      // Check directory traversal permission for parent path
      if (canonical !== '/') {
        const parentPath = PathEngine.getParentPath(canonical);
        const parentInodeId = this.inodesByPath.get(parentPath);
        if (parentInodeId) {
          const parentNode = this.inodesById.get(parentInodeId);
          if (parentNode && !PermissionsEngine.checkAccess(parentNode, user, 1)) {
            AuditLogger.getInstance().logSecurity(user, 'lookup', path, false, 'Permission denied on parent directory');
            return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied to traverse '${parentPath}'.` };
          }
        }
      }

      return { success: true, data: inode };
    } catch {
      return { success: false, error: 'INVALID_PATH', message: `Path '${path}' is invalid.` };
    }
  }

  public stat(path: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<VFSStat> {
    const res = this.lookup(path, user);
    if (!res.success) return { success: false, error: res.error, message: res.message };

    const inode = res.data;
    const isDir = inode.nodeType === 'directory';
    const dynamicContent = inode.virtualGenerator ? inode.virtualGenerator() : inode.content;
    const size = isDir ? this.calculateDirectorySize(inode.inode) : (dynamicContent ? new TextEncoder().encode(dynamicContent).length : inode.sizeBytes);

    const statObj: VFSStat = {
      inode: inode.inode,
      name: inode.name,
      path: inode.canonicalPath,
      nodeType: inode.nodeType,
      uid: inode.uid,
      gid: inode.gid,
      mode: inode.mode,
      modeFormatted: PermissionsEngine.formatMode(inode.mode, isDir),
      sizeBytes: size,
      mimeType: inode.mimeType,
      createdAt: inode.createdAt,
      modifiedAt: inode.modifiedAt,
      accessedAt: inode.accessedAt,
      backend: inode.backend,
      isReadOnly: inode.backend === 'proc' || inode.backend === 'sys' || (inode.mode & 0o222) === 0,
    };

    return { success: true, data: statObj };
  }

  public readFile(path: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<string> {
    const res = this.lookup(path, user);
    if (!res.success) return { success: false, error: res.error, message: res.message };

    const inode = res.data;
    if (inode.nodeType === 'directory') {
      return { success: false, error: 'IS_A_DIRECTORY', message: `'${path}' is a directory.` };
    }

    if (!PermissionsEngine.checkAccess(inode, user, 4)) {
      AuditLogger.getInstance().logSecurity(user, 'read', path, false, 'Permission denied');
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied reading '${path}'.` };
    }

    inode.accessedAt = new Date().toISOString();

    if (inode.virtualGenerator) {
      return { success: true, data: inode.virtualGenerator() };
    }

    return { success: true, data: inode.content ?? '' };
  }

  public writeFile(path: string, content: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<VFSInode> {
    const lookupRes = this.lookup(path, user);
    if (lookupRes.success) {
      const inode = lookupRes.data;
      if (inode.backend === 'proc' || inode.backend === 'sys') {
        return { success: false, error: 'READ_ONLY', message: `Cannot write to virtual filesystem '${path}'.` };
      }
      if (inode.nodeType === 'directory') {
        return { success: false, error: 'IS_A_DIRECTORY', message: `'${path}' is a directory.` };
      }
      if (!PermissionsEngine.checkAccess(inode, user, 2)) {
        AuditLogger.getInstance().logSecurity(user, 'write', path, false, 'Permission denied');
        return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied writing to '${path}'.` };
      }

      inode.content = content;
      inode.sizeBytes = new TextEncoder().encode(content).length;
      inode.modifiedAt = new Date().toISOString();
      this.notify();
      return { success: true, data: inode };
    }

    // If file does not exist, create it
    return this.createFile(path, content, user);
  }

  public appendFile(path: string, content: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<void> {
    const lookupRes = this.lookup(path, user);
    if (!lookupRes.success) {
      const createRes = this.createFile(path, content, user);
      if (!createRes.success) return { success: false, error: createRes.error, message: createRes.message };
      return { success: true, data: undefined };
    }

    const inode = lookupRes.data;
    if (inode.backend === 'proc' || inode.backend === 'sys') {
      return { success: false, error: 'READ_ONLY', message: `Cannot write to virtual filesystem '${path}'.` };
    }
    if (inode.nodeType === 'directory') {
      return { success: false, error: 'IS_A_DIRECTORY', message: `'${path}' is a directory.` };
    }
    if (!PermissionsEngine.checkAccess(inode, user, 2)) {
      AuditLogger.getInstance().logSecurity(user, 'append', path, false, 'Permission denied');
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied appending to '${path}'.` };
    }

    inode.content = (inode.content ?? '') + content;
    inode.sizeBytes = new TextEncoder().encode(inode.content).length;
    inode.modifiedAt = new Date().toISOString();
    this.notify();
    return { success: true, data: undefined };
  }

  public createFile(
    path: string,
    content = '',
    user: SystemUser = UserManager.getInstance().getCurrentUser(),
    mode = PermissionsEngine.DEFAULT_FILE_MODE
  ): VFSResult<VFSInode> {
    try {
      const canonical = PathEngine.canonicalize(path);
      if (this.inodesByPath.has(canonical)) {
        return { success: false, error: 'ALREADY_EXISTS', message: `File '${canonical}' already exists.` };
      }

      const parentPath = PathEngine.getParentPath(canonical);
      const parentRes = this.lookup(parentPath, user);
      if (!parentRes.success) {
        return { success: false, error: 'NOT_FOUND', message: `Parent directory '${parentPath}' not found.` };
      }

      const parentInode = parentRes.data;
      if (parentInode.nodeType !== 'directory') {
        return { success: false, error: 'NOT_A_DIRECTORY', message: `Parent '${parentPath}' is not a directory.` };
      }

      // Check write + execute on parent directory
      if (!PermissionsEngine.checkAccess(parentInode, user, 2 | 1)) {
        AuditLogger.getInstance().logSecurity(user, 'create_file', path, false, `Permission denied in parent '${parentPath}'`);
        return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied creating file in '${parentPath}'.` };
      }

      const inode = this.createRawInode(
        canonical,
        'file',
        user.uid,
        user.primaryGid,
        mode,
        parentInode.inode,
        undefined,
        content
      );

      this.notify();
      return { success: true, data: inode };
    } catch {
      return { success: false, error: 'INVALID_PATH', message: `Invalid path '${path}'.` };
    }
  }

  public createDirectory(
    path: string,
    user: SystemUser = UserManager.getInstance().getCurrentUser(),
    mode = PermissionsEngine.DEFAULT_DIR_MODE
  ): VFSResult<VFSInode> {
    try {
      const canonical = PathEngine.canonicalize(path);
      if (this.inodesByPath.has(canonical)) {
        return { success: false, error: 'ALREADY_EXISTS', message: `Directory '${canonical}' already exists.` };
      }

      const parentPath = PathEngine.getParentPath(canonical);
      const parentRes = this.lookup(parentPath, user);
      if (!parentRes.success) {
        return { success: false, error: 'NOT_FOUND', message: `Parent directory '${parentPath}' not found.` };
      }

      const parentInode = parentRes.data;
      if (parentInode.nodeType !== 'directory') {
        return { success: false, error: 'NOT_A_DIRECTORY', message: `Parent '${parentPath}' is not a directory.` };
      }

      if (!PermissionsEngine.checkAccess(parentInode, user, 2 | 1)) {
        AuditLogger.getInstance().logSecurity(user, 'create_dir', path, false, `Permission denied in parent '${parentPath}'`);
        return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied creating directory in '${parentPath}'.` };
      }

      const inode = this.createRawInode(
        canonical,
        'directory',
        user.uid,
        user.primaryGid,
        mode,
        parentInode.inode
      );

      this.notify();
      return { success: true, data: inode };
    } catch {
      return { success: false, error: 'INVALID_PATH', message: `Invalid path '${path}'.` };
    }
  }

  public listDirectory(path: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<VFSInode[]> {
    const res = this.lookup(path, user);
    if (!res.success) return { success: false, error: res.error, message: res.message };

    const inode = res.data;
    if (inode.nodeType !== 'directory') {
      return { success: false, error: 'NOT_A_DIRECTORY', message: `'${path}' is not a directory.` };
    }

    if (!PermissionsEngine.checkAccess(inode, user, 4 | 1)) {
      AuditLogger.getInstance().logSecurity(user, 'list_dir', path, false, 'Permission denied');
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied listing directory '${path}'.` };
    }

    const childIds = inode.childrenInodes || [];
    const children: VFSInode[] = [];
    for (const cid of childIds) {
      const child = this.inodesById.get(cid);
      if (child) children.push(child);
    }

    return { success: true, data: children };
  }

  public rename(
    oldPath: string,
    newNameOrPath: string,
    user: SystemUser = UserManager.getInstance().getCurrentUser()
  ): VFSResult<VFSInode> {
    const res = this.lookup(oldPath, user);
    if (!res.success) return res;

    const inode = res.data;
    if (inode.canonicalPath === '/') {
      return { success: false, error: 'INVALID_OPERATION', message: 'Cannot rename root /.' };
    }
    if (inode.backend === 'proc' || inode.backend === 'sys') {
      return { success: false, error: 'READ_ONLY', message: 'Cannot rename virtual filesystem nodes.' };
    }

    // Check write on parent directory
    const parentPath = PathEngine.getParentPath(inode.canonicalPath);
    const parentRes = this.lookup(parentPath, user);
    if (!parentRes.success || !PermissionsEngine.checkAccess(parentRes.data, user, 2)) {
      AuditLogger.getInstance().logSecurity(user, 'rename', oldPath, false, 'Permission denied on parent directory');
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied renaming '${oldPath}'.` };
    }

    const newBasename = PathEngine.getBasename(newNameOrPath);
    const newCanonicalPath = PathEngine.joinPaths(parentPath, newBasename);

    if (this.inodesByPath.has(newCanonicalPath)) {
      return { success: false, error: 'ALREADY_EXISTS', message: `Target '${newCanonicalPath}' already exists.` };
    }

    const oldCanonicalPath = inode.canonicalPath;
    this.inodesByPath.delete(oldCanonicalPath);
    inode.name = newBasename;
    inode.canonicalPath = newCanonicalPath;
    inode.modifiedAt = new Date().toISOString();
    this.inodesByPath.set(newCanonicalPath, inode.inode);

    // If it's a directory, recursively update children paths
    if (inode.nodeType === 'directory') {
      this.recursivelyUpdateChildPaths(inode, oldCanonicalPath, newCanonicalPath);
    }

    this.notify();
    return { success: true, data: inode };
  }

  public move(
    srcPath: string,
    destDirPath: string,
    user: SystemUser = UserManager.getInstance().getCurrentUser()
  ): VFSResult<VFSInode> {
    const srcRes = this.lookup(srcPath, user);
    if (!srcRes.success) return srcRes;

    const srcInode = srcRes.data;
    if (srcInode.canonicalPath === '/') {
      return { success: false, error: 'INVALID_OPERATION', message: 'Cannot move root /.' };
    }

    const destDirRes = this.lookup(destDirPath, user);
    if (!destDirRes.success) return destDirRes;
    const destDir = destDirRes.data;

    if (destDir.nodeType !== 'directory') {
      return { success: false, error: 'NOT_A_DIRECTORY', message: `Destination '${destDirPath}' is not a directory.` };
    }

    // Check permissions
    const oldParentPath = PathEngine.getParentPath(srcInode.canonicalPath);
    const oldParent = this.inodesById.get(srcInode.parentInode);
    if (oldParent && !PermissionsEngine.checkAccess(oldParent, user, 2)) {
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied in source parent '${oldParentPath}'.` };
    }
    if (!PermissionsEngine.checkAccess(destDir, user, 2)) {
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied in destination directory '${destDirPath}'.` };
    }

    const newCanonical = PathEngine.joinPaths(destDir.canonicalPath, srcInode.name);
    if (this.inodesByPath.has(newCanonical)) {
      return { success: false, error: 'ALREADY_EXISTS', message: `Target '${newCanonical}' already exists.` };
    }

    // Unlink from old parent
    if (oldParent && oldParent.childrenInodes) {
      oldParent.childrenInodes = oldParent.childrenInodes.filter((id) => id !== srcInode.inode);
    }

    // Link to new parent
    if (!destDir.childrenInodes) destDir.childrenInodes = [];
    destDir.childrenInodes.push(srcInode.inode);

    const oldCanonical = srcInode.canonicalPath;
    this.inodesByPath.delete(oldCanonical);
    srcInode.parentInode = destDir.inode;
    srcInode.canonicalPath = newCanonical;
    srcInode.modifiedAt = new Date().toISOString();
    this.inodesByPath.set(newCanonical, srcInode.inode);

    if (srcInode.nodeType === 'directory') {
      this.recursivelyUpdateChildPaths(srcInode, oldCanonical, newCanonical);
    }

    this.notify();
    return { success: true, data: srcInode };
  }

  public copy(
    srcPath: string,
    destPath: string,
    user: SystemUser = UserManager.getInstance().getCurrentUser(),
    recursive = true
  ): VFSResult<VFSInode> {
    const srcRes = this.lookup(srcPath, user);
    if (!srcRes.success) return srcRes;

    const srcInode = srcRes.data;
    if (srcInode.canonicalPath === '/') {
      return { success: false, error: 'INVALID_OPERATION', message: 'Cannot copy root /.' };
    }

    // Determine target canonical path
    let targetCanonical: string;
    const destLookup = this.lookup(destPath, user);
    if (destLookup.success && destLookup.data.nodeType === 'directory') {
      targetCanonical = PathEngine.joinPaths(destLookup.data.canonicalPath, srcInode.name);
    } else {
      targetCanonical = PathEngine.canonicalize(destPath);
    }

    if (this.inodesByPath.has(targetCanonical)) {
      return { success: false, error: 'ALREADY_EXISTS', message: `Target '${targetCanonical}' already exists.` };
    }

    const destParentPath = PathEngine.getParentPath(targetCanonical);
    const destParentRes = this.lookup(destParentPath, user);
    if (!destParentRes.success) {
      return { success: false, error: 'NOT_FOUND', message: `Destination directory '${destParentPath}' not found.` };
    }
    if (!PermissionsEngine.checkAccess(destParentRes.data, user, 2)) {
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied in destination '${destParentPath}'.` };
    }

    if (srcInode.nodeType === 'file' || srcInode.nodeType === 'virtual') {
      const content = srcInode.virtualGenerator ? srcInode.virtualGenerator() : (srcInode.content ?? '');
      return this.createFile(targetCanonical, content, user, srcInode.mode);
    }

    if (srcInode.nodeType === 'directory') {
      if (!recursive) {
        return { success: false, error: 'IS_A_DIRECTORY', message: `'${srcPath}' is a directory (use recursive copy).` };
      }

      const createDirRes = this.createDirectory(targetCanonical, user, srcInode.mode);
      if (!createDirRes.success) return createDirRes;

      const newDirInode = createDirRes.data;
      const childIds = srcInode.childrenInodes || [];

      for (const cid of childIds) {
        const child = this.inodesById.get(cid);
        if (child) {
          const childDest = PathEngine.joinPaths(targetCanonical, child.name);
          this.copy(child.canonicalPath, childDest, user, true);
        }
      }

      this.notify();
      return { success: true, data: newDirInode };
    }

    return { success: false, error: 'INVALID_OPERATION', message: 'Unsupported node type for copy.' };
  }

  public delete(
    path: string,
    user: SystemUser = UserManager.getInstance().getCurrentUser(),
    recursive = false
  ): VFSResult<void> {
    const res = this.lookup(path, user);
    if (!res.success) return { success: false, error: res.error, message: res.message };

    const inode = res.data;
    if (inode.canonicalPath === '/') {
      return { success: false, error: 'INVALID_OPERATION', message: 'Cannot delete root /.' };
    }
    if (inode.backend === 'proc' || inode.backend === 'sys') {
      return { success: false, error: 'READ_ONLY', message: 'Cannot delete virtual filesystem nodes.' };
    }

    const parentPath = PathEngine.getParentPath(inode.canonicalPath);
    const parentInode = this.inodesById.get(inode.parentInode);
    if (parentInode && !PermissionsEngine.checkAccess(parentInode, user, 2)) {
      AuditLogger.getInstance().logSecurity(user, 'delete', path, false, `Permission denied in parent '${parentPath}'`);
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied deleting in '${parentPath}'.` };
    }

    if (inode.nodeType === 'directory') {
      const childCount = (inode.childrenInodes || []).length;
      if (childCount > 0 && !recursive) {
        return { success: false, error: 'DIRECTORY_NOT_EMPTY', message: `Directory '${path}' is not empty.` };
      }

      if (recursive && childCount > 0) {
        for (const cid of [...inode.childrenInodes!]) {
          const child = this.inodesById.get(cid);
          if (child) {
            this.delete(child.canonicalPath, user, true);
          }
        }
      }
    }

    // Unlink from parent
    if (parentInode && parentInode.childrenInodes) {
      parentInode.childrenInodes = parentInode.childrenInodes.filter((id) => id !== inode.inode);
    }

    this.inodesById.delete(inode.inode);
    this.inodesByPath.delete(inode.canonicalPath);
    this.notify();
    return { success: true, data: undefined };
  }

  public trash(path: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<TrashRecord> {
    const res = this.lookup(path, user);
    if (!res.success) return { success: false, error: res.error, message: res.message };

    const inode = res.data;
    if (inode.canonicalPath === '/') {
      return { success: false, error: 'INVALID_OPERATION', message: 'Cannot trash root /.' };
    }
    if (inode.backend === 'proc' || inode.backend === 'sys') {
      return { success: false, error: 'READ_ONLY', message: 'Cannot trash virtual nodes.' };
    }

    const parentInode = this.inodesById.get(inode.parentInode);
    if (parentInode && !PermissionsEngine.checkAccess(parentInode, user, 2)) {
      return { success: false, error: 'PERMISSION_DENIED', message: `Permission denied trashing in parent.` };
    }

    // Create trash snapshot
    const record = this.trashSubsystem.createTrashRecord(inode);

    // Delete node from active tree
    this.delete(inode.canonicalPath, user, true);

    return { success: true, data: record };
  }

  public restore(
    trashId: string,
    user: SystemUser = UserManager.getInstance().getCurrentUser(),
    conflictStrategy: 'rename' | 'overwrite' | 'fail' = 'rename'
  ): VFSResult<string> {
    const record = this.trashSubsystem.getRecord(trashId);
    if (!record) {
      return { success: false, error: 'NOT_FOUND', message: `Trash record '${trashId}' not found.` };
    }

    const originalPath = record.originalPath;
    const parentPath = PathEngine.getParentPath(originalPath);

    // Verify parent directory exists or restore to /home/ryan/Desktop fallback
    let safeParentPath = parentPath;
    if (!this.inodesByPath.has(safeParentPath)) {
      safeParentPath = '/home/ryan/Desktop';
    }

    let targetPath = PathEngine.joinPaths(safeParentPath, PathEngine.getBasename(originalPath));

    if (this.inodesByPath.has(targetPath)) {
      if (conflictStrategy === 'fail') {
        return { success: false, error: 'ALREADY_EXISTS', message: `Item already exists at '${targetPath}'.` };
      }
      if (conflictStrategy === 'rename') {
        const existingPaths = new Set(this.inodesByPath.keys());
        targetPath = this.trashSubsystem.generateConflictSafePath(existingPaths, targetPath);
      } else if (conflictStrategy === 'overwrite') {
        this.delete(targetPath, user, true);
      }
    }

    // Re-create the node
    const snapshot = record.inodeSnapshot;
    if (snapshot.nodeType === 'directory') {
      this.createDirectory(targetPath, user, snapshot.mode);
    } else {
      this.createFile(targetPath, snapshot.content ?? '', user, snapshot.mode);
    }

    this.trashSubsystem.removeRecord(trashId);
    this.notify();
    return { success: true, data: targetPath };
  }

  public permanentDelete(trashId: string, user: SystemUser = UserManager.getInstance().getCurrentUser()): VFSResult<void> {
    const record = this.trashSubsystem.getRecord(trashId);
    if (!record) {
      return { success: false, error: 'NOT_FOUND', message: `Trash record '${trashId}' not found.` };
    }

    this.trashSubsystem.removeRecord(trashId);
    return { success: true, data: undefined };
  }

  public search(query: string, user: SystemUser = UserManager.getInstance().getCurrentUser(), basePath = '/'): VFSInode[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const canonicalBase = PathEngine.canonicalize(basePath);
    const results: VFSInode[] = [];

    for (const inode of this.inodesById.values()) {
      if (inode.canonicalPath !== '/' && PathEngine.isChildOf(canonicalBase, inode.canonicalPath)) {
        if (
          inode.name.toLowerCase().includes(cleanQuery) ||
          inode.canonicalPath.toLowerCase().includes(cleanQuery)
        ) {
          // Check access
          if (PermissionsEngine.checkAccess(inode, user, 4)) {
            results.push(inode);
          }
        }
      }
    }

    return results;
  }

  public calculateDirectorySize(dirInodeId: number): number {
    const dir = this.inodesById.get(dirInodeId);
    if (!dir || !dir.childrenInodes) return 0;

    let total = 0;
    for (const cid of dir.childrenInodes) {
      const child = this.inodesById.get(cid);
      if (child) {
        if (child.nodeType === 'file') {
          total += child.sizeBytes;
        } else if (child.nodeType === 'directory') {
          total += this.calculateDirectorySize(child.inode);
        }
      }
    }
    return total;
  }

  // =========================================================================
  // BACKWARDS-COMPATIBILITY VIEW ADAPTER (FSItem[])
  // =========================================================================
  public toFSItemTree(): FSItem[] {
    const rootNode = this.inodesById.get(1);
    if (!rootNode) return [];

    const buildTree = (inode: VFSInode): FSItem => {
      const isDir = inode.nodeType === 'directory';
      const children: FSItem[] = [];

      if (isDir && inode.childrenInodes) {
        for (const cid of inode.childrenInodes) {
          const child = this.inodesById.get(cid);
          if (child) {
            children.push(buildTree(child));
          }
        }
      }

      return {
        id: String(inode.inode),
        name: inode.name,
        type: isDir ? 'folder' : 'file',
        path: inode.canonicalPath,
        content: inode.content,
        size: inode.sizeBytes > 0 ? `${inode.sizeBytes} B` : undefined,
        updatedAt: inode.modifiedAt,
        children: isDir ? children : undefined,
      };
    };

    // Return the top-level items under /
    const rootItem = buildTree(rootNode);
    return rootItem.children || [];
  }

  public findItemByPath(path: string): FSItem | null {
    try {
      const canonical = PathEngine.canonicalize(path);
      const inodeId = this.inodesByPath.get(canonical);
      if (!inodeId) return null;
      const inode = this.inodesById.get(inodeId);
      if (!inode) return null;

      const isDir = inode.nodeType === 'directory';
      const children: FSItem[] = [];
      if (isDir && inode.childrenInodes) {
        for (const cid of inode.childrenInodes) {
          const child = this.inodesById.get(cid);
          if (child) {
            children.push({
              id: String(child.inode),
              name: child.name,
              type: child.nodeType === 'directory' ? 'folder' : 'file',
              path: child.canonicalPath,
              content: child.content,
              size: child.sizeBytes > 0 ? `${child.sizeBytes} B` : undefined,
              updatedAt: child.modifiedAt,
            });
          }
        }
      }

      return {
        id: String(inode.inode),
        name: inode.name,
        type: isDir ? 'folder' : 'file',
        path: inode.canonicalPath,
        content: inode.content,
        size: inode.sizeBytes > 0 ? `${inode.sizeBytes} B` : undefined,
        updatedAt: inode.modifiedAt,
        children: isDir ? children : undefined,
      };
    } catch {
      return null;
    }
  }

  // =========================================================================
  // PERSISTENCE SNAPSHOTS
  // =========================================================================
  public snapshot(): RocketFSSnapshot {
    // Exclude virtual dynamic nodes (/proc, /sys, /dev) from persistent serialization
    const persistentInodes = Array.from(this.inodesById.values())
      .filter((i) => i.backend === 'vfs_disk')
      .map((i) => ({ ...i, virtualGenerator: undefined }));

    return {
      version: 2,
      nextInode: this.nextInode,
      inodes: persistentInodes,
      trash: this.trashSubsystem.getItems(),
    };
  }

  public loadSnapshot(snapshot: RocketFSSnapshot): void {
    this.inodesById.clear();
    this.inodesByPath.clear();
    this.nextInode = snapshot.nextInode || 1;

    for (const inode of snapshot.inodes) {
      this.inodesById.set(inode.inode, { ...inode });
      this.inodesByPath.set(inode.canonicalPath, inode.inode);
    }

    // Re-mount dynamic virtual trees (/proc, /sys, /dev)
    this.createVirtualInode('/proc/version', 'proc', 0o444, () => VirtualFS.getProcVersion());
    this.createVirtualInode('/proc/uptime', 'proc', 0o444, () => VirtualFS.getProcUptime());
    this.createVirtualInode('/proc/meminfo', 'proc', 0o444, () => VirtualFS.getProcMeminfo());
    this.createVirtualInode('/proc/cpuinfo', 'proc', 0o444, () => VirtualFS.getProcCpuinfo());
    this.createVirtualInode('/proc/processes', 'proc', 0o444, () => VirtualFS.getProcProcesses());

    this.createVirtualInode('/sys/platform', 'sys', 0o444, () => VirtualFS.getSysPlatform());
    this.createVirtualInode('/sys/capabilities', 'sys', 0o444, () => VirtualFS.getSysCapabilities());
    this.createVirtualInode('/sys/devices/nvme0', 'sys', 0o444, () => VirtualFS.getSysDeviceNvme0());
    this.createVirtualInode('/sys/devices/hdaudio0', 'sys', 0o444, () => VirtualFS.getSysDeviceHdaudio0());
    this.createVirtualInode('/sys/devices/gpu0', 'sys', 0o444, () => VirtualFS.getSysDeviceGpu0());

    this.createVirtualInode('/dev/null', 'dev', 0o666, () => '');
    this.createVirtualInode('/dev/zero', 'dev', 0o444, () => '\0\0\0\0');
    this.createVirtualInode('/dev/random', 'dev', 0o444, () => Math.random().toString(36).slice(2));
    this.createVirtualInode('/dev/tty', 'dev', 0o666, () => 'Active Terminal /dev/tty1');

    this.trashSubsystem = new TrashSubsystem(snapshot.trash || []);
    this.notify();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {}
    }
  }

  private recursivelyUpdateChildPaths(
    dirInode: VFSInode,
    oldPrefix: string,
    newPrefix: string
  ): void {
    if (!dirInode.childrenInodes) return;
    for (const cid of dirInode.childrenInodes) {
      const child = this.inodesById.get(cid);
      if (child) {
        const oldChildPath = child.canonicalPath;
        const newChildPath = newPrefix + oldChildPath.slice(oldPrefix.length);
        this.inodesByPath.delete(oldChildPath);
        child.canonicalPath = newChildPath;
        this.inodesByPath.set(newChildPath, child.inode);

        if (child.nodeType === 'directory') {
          this.recursivelyUpdateChildPaths(child, oldChildPath, newChildPath);
        }
      }
    }
  }
}
