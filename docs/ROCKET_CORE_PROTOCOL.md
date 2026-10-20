# RocketOS Core Protocol

**Status:** Draft logical contract for RocketOS 0.x
**Protocol generation:** v1
**Updated:** 2026-10-20

## 1. Purpose

This document defines the logical boundary between RocketOS user interfaces/tools and the RocketOS core/platform provider.

It is a **contract target**, not a claim that a native Rocket daemon already implements every endpoint.

The current development client uses HTTP-style calls to a local TypeScript core-host simulation. The installed Debian architecture may keep HTTP during development or move to a local IPC transport such as a Unix-domain socket later. Transport choice is intentionally deferred; the domain semantics should remain stable where practical.

## 2. Capability honesty

Every provider should be able to report whether a capability is:

- `REAL_LINUX`
- `REAL_ROCKET_NATIVE`
- `REAL_WEB`
- `SIMULATED`
- `PROTOTYPE`
- `UNAVAILABLE`

A preview provider must not report synthetic Wi-Fi, kernel, process, or hardware data as native capability.

## 3. Logical service groups

The v1 contract groups operations into:

- System / capabilities / diagnostics
- Filesystem
- Shell / command execution
- Processes
- Services
- Users / permissions
- Applications
- Workspaces

Existing TypeScript types in `src/core-api/` are the current executable specification and should be evolved carefully rather than replaced by documentation alone.

## 4. Development HTTP mapping

The existing development mapping uses the prefix:

`/api/v1/core`

Representative operations:

| Method | Endpoint | Logical purpose |
|---|---|---|
| `GET` | `/ping` | provider liveness/handshake |
| `GET` | `/diagnostics` | provider/runtime diagnostics |
| `GET` | `/manifest` | system identity/capability summary |
| `GET` | `/capabilities` | honest capability flags |
| `GET` | `/status` | current system status |
| `GET` | `/fs/stat` | file metadata |
| `GET` | `/fs/list` | directory listing |
| `GET` | `/fs/read` | read file content |
| `POST` | `/fs/write` | write file content |
| `POST` | `/fs/mkdir` | create directory |
| `POST` | `/fs/rename` | rename path |
| `POST` | `/fs/copy` | copy path |
| `POST` | `/fs/move` | move path |
| `POST` | `/fs/remove` | remove path |
| `POST` | `/fs/trash` | move to trash |
| `POST` | `/shell/execute` | execute command line |
| `GET` | `/shell/complete` | completion suggestions |
| `POST` | `/shell/parse` | parse command line |
| `GET` | `/processes` | list processes |
| `POST` | `/processes/launch` | launch managed process/app |
| `POST` | `/processes/:pid/terminate` | terminate process |
| `GET` | `/services` | list services |
| `POST` | `/services/:name/:action` | service action |
| `GET` | `/users` | list users |
| `GET` | `/users/current` | current user/session |
| `POST` | `/users/permissions/check` | permission decision |
| `GET` | `/apps` | application registry |
| `GET` | `/workspaces` | workspace state |

The exact HTTP shape may change when the real Debian provider is implemented. Preserve domain semantics and conformance coverage over URL purity.

## 5. Authentication and trust

The browser development host currently supports token/header concepts. The final installed-OS trust model is not yet frozen.

Do not invent a permanent authentication scheme before the Debian session/user model is selected.

Any privileged operation must eventually map to real Linux user/session/privilege boundaries rather than a browser-only fake authorization layer.

## 6. Errors

Keep structured, machine-readable errors. Current categories include:

- `INVALID_ARGUMENT`
- `PERMISSION_DENIED`
- `NOT_FOUND`
- `ALREADY_EXISTS`
- `UNSUPPORTED`
- `CORE_UNAVAILABLE`
- `SERVICE_FAILED`

Providers may attach implementation-specific diagnostic detail, but callers should be able to depend on stable high-level categories.

## 7. Conformance rule

When a domain moves from TypeScript to Rocket/native Linux:

1. preserve or update the contract intentionally;
2. run the same conformance fixtures against both implementations where practical;
3. prove behavior parity before switching the active provider;
4. only then remove the old implementation.

`src/core-api/conformance.test.ts` and its fixtures are valuable migration gates and must not be discarded casually.
