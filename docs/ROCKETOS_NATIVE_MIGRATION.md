# RocketOS Native Migration Roadmap

## Phase 7 Milestone Review: The Canonical Rocket Core

Phase 7 establishes the canonical boundary for RocketOS:
- **Core OS Canonical in Rocket**: The filesystem, path resolution, process state machine, service manager, permissions engine, command registry, and execution pipeline are formally implemented and specified in `.rocket` code.
- **IPC Protocol v1**: Clean REST/RPC boundary decoupled from DOM and browser specifics.
- **Provider Abstraction**: UI accesses OS operations strictly via `ICoreProvider`, seamlessly supporting both native compiled Rocket Core and in-browser fallback.

---

## Future Migration Phases

```
+-------------------------------------------------------------------------------+
| PHASE 7 (CURRENT): Canonical Core + Protocol v1 + Dual-Provider UI Architecture|
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 8: Native Graphics & Window Compositor in Rocket (Raylib / Wayland)     |
|   - Migrate Desktop Shell and Windowing engine from React to Rocket Raylib    |
|   - Canvas and software framebuffer rendering in native Rocket                |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 9: Kernel & Hardware HAL (Bare-Metal / QEMU Boot)                       |
|   - x86_64 UEFI long mode kernel written in Rocket with LLVM backend         |
|   - Interrupt Descriptor Table (IDT), Page Table management, Serial Driver    |
|   - Direct NVMe / VirtIO block storage driver replacing `.rocketos-data/`     |
+-------------------------------------------------------------------------------+
```

### Guidance for Native Boot
Do NOT attempt bare-metal migration until Rocket's graphics primitives and standard runtime (`std.file`, `std.task`) have achieved complete feature parity with the visual capabilities currently delivered by the React frontend.
