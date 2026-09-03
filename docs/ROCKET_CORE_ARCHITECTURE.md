# RocketOS Core Architecture (Phase 7 Specification)

## 1. Architectural Vision

RocketOS operates under a clear, disciplined architectural model:
**The user interface is React/TypeScript for high-fidelity browser previewing and developer productivity, while the operating-system core is canonically specified and authored in Rocket (`.rocket`).**

```
+-------------------------------------------------------------------------+
|                         RocketOS Desktop Shell                          |
|         (React 18 + Tailwind CSS + Lucide Icons + Windowing Engine)     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  Core Provider Interface (ICoreProvider)                |
|       Typed Contracts: System, FS, Shell, Proc, Svc, Users, Apps        |
+-------------------------------------------------------------------------+
                |                                         |
   (Production / Native Mode)                     (Browser Fallback Mode)
                v                                         v
+-------------------------------+       +---------------------------------+
|       RocketCoreClient        |       |   BrowserFallbackCoreProvider   |
|   (HTTP/JSON IPC Protocol v1) |       |  (In-Memory IndexedDB/Local VFS)|
+-------------------------------+       +---------------------------------+
                |
                v  Network / UNIX Domain Socket IPC
+-------------------------------------------------------------------------+
|                     Rocket Core Host (`rocketc`)                        |
|  - Inode-based RocketFS with Unix permissions (UID/GID/mode)            |
|  - Deterministic Path Canonicalizer & Lexical Parser                   |
|  - Process Supervisor & Service Registry                                |
|  - User Identity, RBAC & Group Membership                               |
|  - Shell Tokenizer, AST Pipeline & Command Execution Engine             |
|  - Native Persistent Storage Engine (`.rocketos-data/`)                 |
+-------------------------------------------------------------------------+
```

---

## 2. Canonical Separation of Responsibilities

### What Belongs in Rocket (`/rocket/**`)
1. **Virtual File System (RocketFS)**:
   - Inode structures, directory entries, metadata, timestamps.
   - Posix permission enforcement (`check_permission` in `rocket/filesystem/permissions.rocket`).
   - Path resolution and canonicalization (`rocket/filesystem/path.rocket`).
   - Schema migration and file extension associations (`rocket/filesystem/associations.rocket`).
2. **Process and Service Subsystem**:
   - Process control blocks (`PCB`), PIDs, parent/child relationships (`rocket/process/manager.rocket`).
   - Service state machines (`RUNNING`, `STOPPED`, `DEGRADED`) and daemon supervision (`rocket/services/service_manager.rocket`).
3. **Shell and Execution Pipeline**:
   - Pipeline tokenization, quotation parsing, redirection AST (`rocket/commands/`).
   - Command dispatch, argument validation, and return code management.
4. **Security, Users, and Permissions**:
   - Multi-user authentication, group membership (`wheel`, `users`), root elevation (`rocket/admin/elevation.rocket`).

### What Belongs in the UI Layer (`/src/**`)
1. **Window Management and Compositor**:
   - Dragging, resizing, maximizing, minimizing, z-index ordering, and snap-to-grid tiling.
2. **Desktop Rendering**:
   - Taskbar, launcher, app icons, window framing, wallpaper rendering, and theme application.
3. **Application Shells**:
   - React presentation views for Editor, Notes, Paint, Terminal, System Monitor, Settings, and Explorer.
4. **Client RPC Adaptation**:
   - `RocketCoreClient` translates UI intent into Protocol v1 requests, handles network failures, and falls back to `BrowserFallbackCoreProvider` seamlessly when native core is offline.

---

## 3. Dual-Provider Implementation

### `ICoreProvider` Contract
Both the native client (`RocketCoreClient`) and the browser fallback (`BrowserFallbackCoreProvider`) implement the exact same TypeScript interface:

```typescript
export interface ICoreProvider {
  readonly isConnected: boolean;
  connect(): Promise<ProtocolHandshake>;
  disconnect(): Promise<void>;
  getDiagnostics(): Promise<CoreDiagnosticsInfo>;

  readonly system: ICoreSystemAPI;
  readonly fs: ICoreFileSystemAPI;
  readonly shell: ICoreShellAPI;
  readonly processes: ICoreProcessesAPI;
  readonly services: ICoreServicesAPI;
  readonly users: ICoreUsersAPI;
  readonly apps: ICoreAppsAPI;
  readonly workspaces: ICoreWorkspacesAPI;
}
```

### Automatic Fallback and Resilience
1. At desktop boot, `CoreProviderService` probes `http://127.0.0.1:5180/api/v1/core/ping`.
2. If the native Rocket Core Host responds with a valid handshake, `RocketCoreClient` is bound as the active provider.
3. If the host is unreachable (e.g., standard browser sandbox without local native daemon), `BrowserFallbackCoreProvider` is initialized, guaranteeing complete zero-friction offline usability in web previews.
4. The user can view current provider telemetry and test real-time connectivity directly from the **Settings > System Information** panel.

---

## 4. Inode and Storage Model

RocketFS organizes files and directories using an inode-based hierarchy:

- **Inodes**: Assigned a 64-bit integer ID, owning user UID, group GID, octal mode (e.g. `0o644`, `0o755`), ISO 8601 timestamps (`createdAt`, `updatedAt`), byte size, and data payload.
- **Root Directory (`/`)**: Owned by `root` (UID 0), permission `0o755`.
- **System Directories (`/bin`, `/etc`, `/usr`, `/lib`)**: Owned by `root`, permission `0o755`.
- **User Home (`/home/ryan`)**: Owned by user `ryan` (UID 1000, GID 100), permission `0o755`.
- **Protected Superuser Directory (`/root`)**: Owned by `root` (UID 0, GID 0), permission `0o700`.
