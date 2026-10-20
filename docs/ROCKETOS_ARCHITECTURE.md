# RocketOS Architecture Specification

**Status:** Canonical architecture for RocketOS 0.x
**Updated:** 2026-10-20

## 1. Core principle

> **Rocket owns the experience. Linux owns the machinery.**

RocketOS is a Debian-based operating-system project. It is not a custom bare-metal kernel and not a Yocto distribution.

The project deliberately reuses mature open-source Linux infrastructure for low-level system work while preserving a distinct RocketOS shell, application suite, system behavior, and visual identity.

## 2. Layered target

```text
+------------------------------------------------------------------+
| RocketOS experience                                               |
| Desktop, carousel dock, taskbar, launcher, workspaces, apps, UX   |
| Initially React/TypeScript; progressively native Rocket           |
+-------------------------------+----------------------------------+
                                |
+-------------------------------v----------------------------------+
| RocketOS Core / platform-neutral contracts                        |
| Settings, search, app registry, policy, domain logic, adapters    |
| TypeScript and Rocket coexist during migration                    |
+-------------------------------+----------------------------------+
                                |
+-------------------------------v----------------------------------+
| Thin native integration boundary                                  |
| C/C++ only where Rocket cannot safely expose a Linux API/callback |
+-------------------------------+----------------------------------+
                                |
+-------------------------------v----------------------------------+
| Debian/Linux userspace                                             |
| systemd, D-Bus, polkit, NetworkManager, BlueZ, PipeWire/ALSA,     |
| Mesa/DRM, Wayland foundations, libinput, package tools, etc.      |
+-------------------------------+----------------------------------+
                                |
+-------------------------------v----------------------------------+
| Linux kernel, upstream drivers, firmware, filesystems, hardware   |
+------------------------------------------------------------------+
```

## 3. Responsibility matrix

### Debian/Linux responsibility

Use existing Debian/upstream components for:

- Linux kernel, scheduling, virtual memory, process primitives;
- CPU/GPU/network/storage/USB/input drivers;
- firmware distribution;
- real filesystems and block devices;
- system boot/service primitives;
- D-Bus and system IPC foundations;
- user/session/privilege foundations where appropriate;
- networking and Wi-Fi backend;
- Bluetooth backend;
- audio backend;
- Mesa/DRM/KMS graphics stack;
- Wayland protocol/foundation;
- input backend;
- package backend and dependency resolution;
- hardware discovery and system telemetry sources.

RocketOS should adapt these systems. It should not reimplement them merely for language purity.

### RocketOS responsibility

RocketOS owns:

- desktop composition and identity;
- taskbar and launcher;
- centered/carousel dock behavior;
- window-management policy and RocketOS window UX;
- workspaces and Mission Control-style overview;
- notifications UX and quick settings;
- Settings frontend and RocketOS policy;
- Files frontend;
- Terminal frontend and Rocket-specific tooling UX;
- Store frontend;
- search/index UX;
- first-party apps;
- login/session and installer experience;
- visual language, motion, theming, and branding;
- RocketOS-specific core/domain policy.

The implementation language for RocketOS-owned code can be transitional. The destination is increasing native Rocket ownership, not an immediate rewrite at any cost.

## 4. Current implementation reality

The current working desktop is React 19 + TypeScript 5.8 + Vite 6.

This is a strong visual/interaction prototype and remains the reference implementation for the desktop and 48 app frontends. It is **not** evidence that the project already has a native Linux desktop.

Current TypeScript services, browser persistence, mock process/service models, and fake hardware data exist to make the prototype usable. They are migration sources, not the final Linux backend.

The `rocket/` directory contains Rocket migration/prototype modules. They are not currently compiled into the production Vite application and must be checked against the actual current Rocket compiler before being promoted to authoritative native code.

## 5. Rocket's role

Rocket is retained as a first-class language for RocketOS.

The reviewed Rocket repository proves native compilation for Linux x64/ARM64 and contains a genuine LLVM backend. However, the current Rocket UI/FFI surface does not yet cover every requirement of the existing RocketOS desktop, including some desktop-oriented scrolling/input/control behavior and retained callback-heavy integrations.

Therefore:

- use Rocket now where it is reliable and testable;
- keep complex React/TypeScript UI until native parity exists;
- extend Rocket deliberately when a missing capability is reusable and justified;
- use a thin C/C++ adapter where Linux APIs require callback/event patterns Rocket cannot safely expose yet;
- never build a second full desktop in C++.

The Rocket repository, not this repository, is authoritative for current Rocket syntax/version/toolchain information.

## 6. UI and compositor boundary

RocketOS owns compositor/window **policy and UX**, but RocketOS 0.x does not require the compositor implementation itself to be 100% Rocket.

The initial Linux graphical host may use existing Wayland infrastructure plus a narrow native integration layer while the React desktop remains the shell. As Rocket gains sufficient desktop capabilities, shell components can migrate natively.

The exact initial compositor/host technology is **not selected in this document**.

## 7. Core/provider boundary

The long-term UI must not be permanently coupled to browser-only services.

The intended direction is:

```text
UI
 |
 v
ICoreProvider / language-neutral RocketOS API
 |                         |
 | temporary               | progressively native
 v                         v
TypeScript implementation  Rocket implementation
           \               /
            v             v
             Linux adapters
                  |
                  v
              Debian/Linux
```

`BrowserFallbackCoreProvider` remains useful for AI Studio/web preview. It must not be mistaken for the real installed-OS backend.

## 8. Build and runtime targets

Primary architecture: **x86-64 first**.

Development/testing progression:

1. browser preview for rapid UI iteration;
2. native Linux host development;
3. QEMU as the primary VM engineering target;
4. VirtualBox as a secondary compatibility target;
5. bootable installer/image;
6. physical x86-64 laptop testing.

Development workspace target: approximately **25Ã¢â‚¬â€œ45 GB**.

## 9. Explicitly rejected 0.x directions

Do not reintroduce these without an explicit architecture decision:

- custom Rocket bare-metal kernel;
- Rocket-written Wi-Fi/GPU/NVMe/USB drivers as the default path;
- direct IDT/page-table work for RocketOS 0.x;
- Yocto/BitBake as the base build system;
- a giant source rebuild of Debian/Linux infrastructure;
- a C++ rewrite of the RocketOS desktop;
- deleting the React reference UI before native parity is proven.

## 10. Decisions intentionally deferred

A dedicated work packet must select each of these after the reset:

- exact Debian release/snapshot;
- image construction method;
- bootloader;
- graphical session/compositor host;
- React desktop host for the first native Debian image;
- system IPC transport;
- packaging/update strategy for RocketOS-owned components.

No implementation agent may silently choose one and convert it into project policy.
