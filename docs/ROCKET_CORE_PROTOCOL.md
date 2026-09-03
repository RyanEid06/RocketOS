# Rocket Core Protocol Specification (Version 1)

## 1. Overview

The Rocket Core Protocol defines the standard IPC communication between client environments (such as the RocketOS React UI or CLI tools) and the authoritative Rocket Core Host.

- **Protocol Version**: `1`
- **Default Port**: `5180`
- **Transport**: HTTP/1.1 JSON-RPC / REST (WebSockets for real-time telemetry)
- **API Prefix**: `/api/v1/core`

---

## 2. Authentication & Headers

Requests originating from authenticated sessions pass the session token:
- Header: `X-Rocket-Token: <token>` OR `Authorization: Bearer <token>`
- Unauthenticated requests receive `401 Unauthorized` (`PERMISSION_DENIED`).
- The handshake probe endpoint (`/api/v1/core/ping`) allows unauthenticated access for availability detection.

---

## 3. Endpoints Reference

### 3.1 System Subsystem

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/core/ping` | Liveness handshake returning compiler engine, runtime version, and bootId. |
| `GET` | `/api/v1/core/diagnostics` | System diagnostics including memory model, active provider, and uptime. |
| `GET` | `/api/v1/core/manifest` | Authoritative system manifest (OS version, kernel architecture, hardware). |
| `GET` | `/api/v1/core/capabilities`| Platform capabilities and storage provider status. |
| `GET` | `/api/v1/core/status` | Real-time status (CPU, memory, load average, uptime). |

### 3.2 File System Subsystem

| Method | Endpoint | Parameters / Body | Description |
|---|---|---|---|
| `GET` | `/api/v1/core/fs/stat` | `?path=<path>` | Return metadata, UID/GID, size, mode, and timestamps. |
| `GET` | `/api/v1/core/fs/list` | `?path=<path>` | List directory entries. |
| `GET` | `/api/v1/core/fs/read` | `?path=<path>` | Read UTF-8 text file contents. |
| `POST` | `/api/v1/core/fs/write` | `{ path, content }` | Write/overwrite text content. |
| `POST` | `/api/v1/core/fs/create-file` | `{ path, content }` | Atomically create file. |
| `POST` | `/api/v1/core/fs/mkdir` | `{ path }` | Create directory. |
| `POST` | `/api/v1/core/fs/rename` | `{ oldPath, newPath }` | Rename file or directory. |
| `POST` | `/api/v1/core/fs/copy` | `{ srcPath, dstPath }` | Copy node to destination. |
| `POST` | `/api/v1/core/fs/move` | `{ srcPath, dstPath }` | Move node to destination. |
| `POST` | `/api/v1/core/fs/remove` | `{ path, recursive }` | Delete node. |
| `POST` | `/api/v1/core/fs/trash` | `{ path }` | Move node into trash store. |

### 3.3 Shell Subsystem

| Method | Endpoint | Parameters / Body | Description |
|---|---|---|---|
| `POST` | `/api/v1/core/shell/execute` | `{ commandLine }` | Parse and execute pipeline returning exitCode, stdout, stderr. |
| `GET` | `/api/v1/core/shell/complete` | `?line=<line>` | Tab completion proposals. |
| `POST` | `/api/v1/core/shell/parse` | `{ commandLine }` | Return parsed AST chain nodes and syntax validation. |

### 3.4 Process & Service Subsystems

| Method | Endpoint | Parameters / Body | Description |
|---|---|---|---|
| `GET` | `/api/v1/core/processes` | None | List running processes. |
| `POST` | `/api/v1/core/processes/launch` | `{ appId, name, commandLine }` | Launch a managed process. |
| `POST` | `/api/v1/core/processes/:pid/terminate` | None | Terminate process by PID. |
| `GET` | `/api/v1/core/services` | None | List system services and their state. |
| `GET` | `/api/v1/core/services/:name` | None | Get service details. |
| `POST` | `/api/v1/core/services/:name/:action` | None | Action: `start`, `stop`, `restart`. |

### 3.5 Users & Security Subsystem

| Method | Endpoint | Parameters / Body | Description |
|---|---|---|---|
| `GET` | `/api/v1/core/users` | None | List system users. |
| `GET` | `/api/v1/core/users/current` | None | Get active session user. |
| `GET` | `/api/v1/core/users/:uid` | None | Get user details by UID. |
| `POST` | `/api/v1/core/users/permissions/check` | `{ path, mode }` | Evaluate POSIX permission bits for path. |

### 3.6 Apps & Workspaces

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/core/apps` | List registered applications. |
| `GET` | `/api/v1/core/apps/:id` | Get app definition and constraints. |
| `GET` | `/api/v1/core/apps/associations` | Get file extension associations. |
| `GET` | `/api/v1/core/workspaces` | Get workspace profiles. |
| `GET` | `/api/v1/core/workspaces/:id` | Get workspace profile details. |

---

## 4. Standard Error Codes

All errors return JSON in the format:
```json
{
  "code": "PERMISSION_DENIED",
  "message": "Access denied: Root directory is protected",
  "details": {}
}
```

Standard codes:
- `INVALID_ARGUMENT` (400)
- `PERMISSION_DENIED` (401/403)
- `NOT_FOUND` (404)
- `ALREADY_EXISTS` (409)
- `UNSUPPORTED` (501)
- `CORE_UNAVAILABLE` (503)
- `SERVICE_FAILED` (500)
