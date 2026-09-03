# ROCKETOS FOUNDATION MASTER PLAN
**Authoritative Multi-Phase Engineering Roadmap**
*Document Version: 1.0.0 — Phase 1: Foundation & Architecture*

---

## 1. Executive Summary & Mission
RocketOS is a modern, high-performance operating system interface, workbench, and runtime designed to showcase the capabilities of the **Rocket programming language** ([RyanEid06/Rocket](https://github.com/RyanEid06/Rocket)).

This document serves as the authoritative, multi-phase engineering roadmap across all 5 planned phases of development.

---

## 2. Current Architecture Summary (Baseline Audit)
- **Frontend Stack**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Motion (Framer Motion v12).
- **Audio Engine**: Procedural Web Audio API synthesizer (`SoundEngine`) with zero external assets.
- **Virtual Shell**:
  - `Desktop`: Desktop grid, right-click desktop context menu, custom icon placement.
  - `WindowFrame`: Window dragging, resizing, 3-corner snap preview, active z-index management.
  - `CarouselDock`: Circular 3D rotating dock with cursor magnification and angle tracking.
  - `Taskbar`: Liquid glass bottom bar with Start menu, universal search, workspace switcher, and quick controls.
- **Applications**:
  - `FileExplorer`: Navigation, breadcrumbs, This PC, Recycle Bin, grid/list view.
  - `TerminalApp`: `rsh v2.0` command line shell with pseudo-filesystem commands and `rocketc` simulation.
  - `TextEditorApp`: `rEdit` with syntax display, snippet injection, and compiler feedback.
  - `RocketStudio`: Interactive language workbench, grammar explorer, AST inspector, and standard library status.
  - `SystemMonitorApp`: Multi-core CPU telemetry, PML4 4-level paging memory map, IDT table.
  - `TaskManagerApp`: Process hierarchy combining open user windows and background kernel daemons.
  - `RaylibCanvasApp`: 2D physics simulation, rocket orbital flight mechanics, particle vortices.
  - `PaintApp`: Full 2D canvas drawing studio with brush, eraser, shapes, undo history, and export.
  - `NotesApp`: Category-filtered markdown scratchpad and interactive to-do checklist.
  - `SettingsApp`: Personalization (8 wallpapers, 5 accents), display, sound, network, and system specs.

---

## 3. Discovered Technical Debt & Defect Audit

| Subsystem | Discovered Defect | Root Cause | Resolution (Phase 1) |
| :--- | :--- | :--- | :--- |
| **Sound** | Mismatched method calls (`playOpen` vs `playWindowOpen`); volume setting was not muting shell audio globally | Hard-coded call sites without master volume sync in `SoundEngine` | Connected `SoundEngine` to master volume, mute, and settings pub/sub. Fixed aliases. |
| **Workspaces** | Virtual desktop switching UI existed in Taskbar but was not connected to `App.tsx` or window filtering | `currentWorkspace` was not propagated to window visibility logic | Implemented `workspaceId` on all windows, active workspace switching, window migration between workspaces, and persistence. |
| **Pinning** | Pinned apps were only shown if their window was open; Start Menu Pinned section showed all apps | Taskbar items only mapped over `windows` array, ignoring pinned-only apps | Built persistent `PinningService` maintaining ordered list; separate running indicators; Start Menu displays only pinned apps. |
| **Search** | Search only looked at top-level array in `fileSystem`, missing all nested documents and folders | Used `.filter()` on top-level `fileSystem` without recursive tree walk | Built recursive `SearchService` traversing all directory trees, files, applications, and settings. |
| **File Explorer** | Invalid paths silently jumped to root `/`; `/drivers` in sidebar was a dead link | Missing error fallback; `/drivers` folder did not exist in initial VFS | Added `/drivers` with kernel device definitions; graceful error feedback for non-existent paths. |
| **File Explorer** | Ctrl+A selected only the first item in the folder | `setSelectedId(itemsToDisplay[0].id)` in keydown listener | Implemented multi-item selection set so Ctrl+A selects all files and directories. |
| **File Explorer** | Folder copy lost all nested children, creating empty directories | Paste handler only called `handleCreateItem` without cloning children tree | Implemented recursive deep cloning in VFS, regenerating unique IDs and updated relative paths. |
| **File Explorer** | Missing Cut / Move operation; missing Rename operation | Handlers were not implemented in context menu or keyboard shortcuts | Added real Cut/Paste Move logic and in-place Rename dialog/action. |
| **Persistence** | Reloading browser erased all files, notes, settings, and changes | App only used React memory state with static defaults | Built `BrowserPersistenceProvider` backed by IndexedDB with schema migration (`RocketDataSchemaVersion = 1`). |
| **Core Architecture** | `App.tsx` contained 640+ lines doing VFS, window management, audio, settings | Lack of domain boundaries | Extracted to `SystemManifest`, `AppRegistry`, `WindowManager`, `SettingsService`, `ClipboardService`, `NotificationService`, and `FileSystemService`. |

---

## 4. Language Strategy & Rocket Integration

### 4.1 Target Distribution
- **Rocket Domain Logic Target**: ≥ 70% of new non-UI, non-DOM domain logic implemented in canonical Rocket language files (`rocket/**/*.rocket`).
- **TypeScript Presentation Layer**: React components, DOM event listeners, Web Audio synthesis, IndexedDB storage driver, and CSS classes.

### 4.2 Rocket Toolchain Reality & Integration Strategy
- **Current Compiler Status**: `rocketc` is a self-hosted native compiler written in Rocket/C++/LLVM targeting Windows MSVC, Linux GNU, and macOS. The native compiler binary is not pre-installed in the Linux browser sandbox.
- **Integration Mechanism**:
  1. **Canonical Source Definition**: All operating system concepts (VFS, Path resolution, Search algorithms, Application Registry, Manifest, Settings schema, Clipboard state machine, Windowing invariants) are authored in idiomatic Rocket (`rocket/`).
  2. **Rocket Runtime Adapter**: A lightweight TypeScript bridge (`src/core/rocket-bridge/`) mirrors the Rocket domain models and types directly into the browser runtime, ensuring that the Rocket architecture is the authoritative domain model.
  3. **Documentation of Toolchain Blockers**: Direct browser Wasm compilation from `rocketc` requires the LLVM Wasm32 backend pipeline. Until native `wasm32-unknown-unknown` artifacts are integrated, the TypeScript runtime adapter provides deterministic execution while preserving 100% Rocket semantics.

---

## 5. Phase-by-Phase Roadmap

### Phase 1: Foundation & Architecture (CURRENT)
- [x] Fix audio volume/mute/call-site synchronization.
- [x] Implement multi-workspace virtual desktops with window filtering.
- [x] Implement persistent pinning independent of open windows.
- [x] Implement recursive universal search across VFS, apps, and settings.
- [x] Fix File Explorer: recursive folder copy, cut/move, rename, multi-select (Ctrl+A), `/drivers` mount.
- [x] Build IndexedDB persistence with schema versioning and migrations (`RocketDataSchemaVersion`).
- [x] Centralize `SystemManifest`, `AppRegistry`, `WindowManager`, `SettingsService`, `ClipboardService`, `NotificationService`.
- [x] Introduce `PlatformProvider` with honest capability flags (`REAL`, `SIMULATED`, `UNAVAILABLE`).
- [x] Refactor `Taskbar.tsx` into clean modular components in `src/shell/taskbar/`.
- [x] Provide automated test suite verifying all core behaviors.
- [x] Implement canonical Rocket domain modules in `rocket/`.

### Phase 2: Shell & Desktop Experience
- Window snapping zones (quadrant, half, full).
- Desktop widget system (clock, system stats, quick notes).
- Notification toast stacking and interactive actions.
- Customizable keyboard shortcuts manager.

### Phase 3: Filesystem & Data Storage Subsystems
- Virtual inode model with permissions and user ownership.
- File associations and default opener registry.
- Virtual disk mounting (ISO, ZIP virtual reader).
- Binary blob storage in IndexedDB for paint images and media.

### Phase 4: Process Management, Telemetry & Multi-tasking
- Process scheduler simulation with threads, priority levels, and CPU quotas.
- Inter-Process Communication (IPC) via message channels.
- Real-time memory allocation tracker with simulated heap pages.
- Advanced terminal piping, redirection, and scripting.

### Phase 5: Developer Studio & Native Rocket Execution
- In-browser Rocket syntax analyzer with real-time error squiggles.
- Step-by-step AST debugger and bytecode disassembler.
- Raylib 2D engine interactive canvas integration with scriptable Rocket behaviors.
- Packaging and export of user-created Rocket apps.

---

## 6. Architectural Invariants
1. **Visual Preservation**: The circular dock, start menu, dark/glass aesthetic, window frames, and fluid dragging must remain distinct and preserved.
2. **Single Source of Truth**: All applications query `SystemManifest` for hardware, versions, and kernel status. No hardcoded contradictory strings.
3. **Honest Platform Boundaries**: The platform provider reports `SIMULATED` for kernel rings/CPU registers and `REAL` for browser-backed storage.
4. **Data Durability**: Every user action (file edit, note update, setting change, drawing, pinned app) survives browser reload seamlessly.
