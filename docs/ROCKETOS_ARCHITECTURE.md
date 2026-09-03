# ROCKETOS ARCHITECTURE SPECIFICATION
**System Blueprint & Component Interconnects**
*Document Version: 1.0.0 — Phase 1: Core Subsystems*

---

## 1. Architectural Overview

RocketOS is structured in four decoupled layers:
```
┌─────────────────────────────────────────────────────────────┐
│                    User Shell (React 19)                    │
│   Desktop  │  WindowFrame  │  CarouselDock  │    Taskbar    │
└──────────────────────────────┬──────────────────────────────┘
                               │ UI Events & Rendering
┌──────────────────────────────▼──────────────────────────────┐
│                    RocketOS Core Services                   │
│   SystemManifest      │  AppRegistry       │ WindowManager  │
│   FileSystemService   │  SettingsService   │ SearchService  │
│   ClipboardService    │  NotificationSvc   │ PinningService │
└──────────────────────────────┬──────────────────────────────┘
                               │ Domain Operations
┌──────────────────────────────▼──────────────────────────────┐
│                 Platform Boundary & Providers               │
│               PlatformProvider (Real / Simulated)           │
│           BrowserPersistenceProvider (IndexedDB Schema v1)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Language & Spec Authority
┌──────────────────────────────▼──────────────────────────────┐
│                 Rocket Domain Modules (rocket/)             │
│    VFS & Path  │  Search  │  Registry  │ Manifest │ Windows │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 SystemManifest (`src/core/manifest/SystemManifest.ts` & `rocket/core/manifest.rocket`)
- **Responsibility**: Authoritative single source of truth for OS identity, kernel version, compiler build, simulated hardware specifications (CPU, RAM, Storage, PML4 paging status), and environment telemetry.
- **Rules**: Eliminates fragmented, contradictory hardcoded strings across `SettingsApp`, `SystemMonitorApp`, `ThisPC`, and `Terminal`.

### 2.2 AppRegistry (`src/core/apps/AppRegistry.ts` & `rocket/services/registry.rocket`)
- **Responsibility**: Central metadata catalog of all registered applications in RocketOS.
- **Fields**:
  - `id`: Unique identifier (`AppId`).
  - `displayName`: Localized or default title.
  - `description`: Application summary.
  - `icon`: Icon component reference.
  - `glyph`: Single character/emoji glyph.
  - `isSingleton`: Whether opening an already open app focuses the window or creates a new one.
  - `defaultBounds`: Initial width and height.
  - `minBounds`: Minimum resize constraints.
  - `category`: App classification (`system`, `developer`, `productivity`, `media`, `utilities`).
  - `keywords`: Searchable tokens for the universal search indexer.
  - `supportedExtensions`: File formats handled by this application.

### 2.3 WindowManager (`src/core/windowing/WindowManager.ts` & `rocket/windowing/manager.rocket`)
- **Responsibility**: Pure state machine managing window lifecycles independent of React rendering.
- **Features**:
  - Window creation, closing, minimize, maximize, and restoring.
  - Z-index stacking order and active window tracking.
  - Workspace filtering: only windows matching `currentWorkspace` (or sticky windows) are visible.
  - Screen boundary clamping and 3-corner snap geometry calculation.

### 2.4 FileSystemService (`src/core/filesystem/FileSystemService.ts` & `rocket/filesystem/vfs.rocket`)
- **Responsibility**: Virtual file system supporting hierarchical trees of files and folders.
- **Features**:
  - Path normalization and validation.
  - Recursive search through all levels of the tree.
  - Deep clone copy for folders, regenerating item IDs and updating relative child paths.
  - Atomic Cut/Paste (move) semantics.
  - Safe rename with duplicate collision handling.
  - Recycle bin with original-path metadata preservation and parent-fallback restoration.
  - Dynamic, locale-aware timestamps for file mutations.

### 2.5 Persistence Subsystem (`src/core/persistence/` & `src/platform/browser/`)
- **Contract**: `PersistenceProvider` interface.
- **Implementation**: `BrowserPersistenceProvider` using IndexedDB (`rocket-os-db`) with store `system_store`.
- **Schema Versioning**: `RocketDataSchemaVersion = 1`.
- **Managed Collections**:
  - `vfs`: Virtual file system state.
  - `trash`: Recycle bin contents.
  - `notes`: Scratchpad notes and checklists.
  - `paint`: Saved artwork documents.
  - `settings`: System preferences (wallpaper, volume, accents).
  - `pinned`: Pinned application IDs in order.
  - `workspaces`: Active and configured virtual desktops.
  - `window_session`: Restorable window bounds and active instances.

### 2.6 SoundEngine (`src/utils/audio.ts`)
- **Responsibility**: Procedural Web Audio API synthesizer.
- **Features**:
  - Global `volume` (0–100) scaling and `isMuted` suppression.
  - Sound effect hooks: window open, minimize, restore, snap, pin/unpin, workspace switch, recycle bin delete.
  - Clean fallbacks for suspended browser audio contexts.

### 2.7 SearchService (`src/core/search/SearchService.ts` & `rocket/commands/search.rocket`)
- **Responsibility**: Centralized recursive query engine across apps, files, directories, and settings.
- **Optimization**: Recursively indexes VFS nodes without loading unneeded document bodies.

---

## 3. Platform Capabilities & Boundary
The `PlatformProvider` defines how RocketOS distinguishes browser primitives from simulated hardware:
- `filesystem`: `REAL_PERSISTENT` (Backed by IndexedDB via VFS).
- `windowManager`: `REAL_BROWSER` (Rendered inside browser viewport).
- `audio`: `REAL_BROWSER` (Procedural Web Audio API).
- `networkStatus`: `REAL_BROWSER` (`navigator.onLine`).
- `cpuTelemetry`: `SIMULATED` (Simulated multi-core load algorithms).
- `pml4MemoryMap`: `SIMULATED` (Realistic x86_64 kernel paging table simulator).
- `nativeKernel`: `UNAVAILABLE` (Running in sandboxed browser container).

---

## 4. Shell Component Modularization
`src/shell/taskbar/` decomposes the previous monolithic `Taskbar.tsx`:
- `Taskbar.tsx`: Outer bar, app launcher strip, system tray container.
- `StartMenu.tsx`: Pinned apps launcher, user header, power controls.
- `SearchPanel.tsx`: Universal recursive search flyout with filter tabs.
- `QuickSettings.tsx`: Control center tiles for WiFi, Night Light, Volume slider.
- `ClockPanel.tsx`: Calendar grid, live clock, locale settings shortcut.
- `WorkspaceSwitcher.tsx`: Virtual desktop manager and window count badges.
- `NotificationCenter.tsx`: Flyout displaying system notifications.
