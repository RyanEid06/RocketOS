# RocketOS

RocketOS is a Debian-based operating-system project with a custom desktop, shell, applications, and system experience designed around the Rocket programming language.

> **Project rule:** Rocket owns the experience. Linux owns the machinery.

RocketOS is **not** a custom bare-metal kernel project and is **not** a Yocto distribution. The project uses proven Debian/Linux infrastructure for low-level hardware and system machinery, while RocketOS owns the user-visible experience and progressively moves RocketOS-specific logic and UI into native Rocket as the language becomes capable enough.

## Current state

Today this repository contains the high-fidelity RocketOS desktop/workbench prototype alongside a verified, bootable Debian 13 foundation:

- React 19 + TypeScript 5.8 + Vite 6 implement the current desktop and applications.
- The current desktop design is a protected visual target, not disposable scaffolding.
- TypeScript core services and browser persistence keep the prototype functional while native Linux integration is built.
- `rocket/**/*.rocket` contains migration/prototype work, but it is **not currently the authoritative running core** and must be validated against the current Rocket compiler before being treated as production Rocket code.
- The old bare-metal/BusyBox boot prototype has been removed from the working tree. It remains recoverable from Git history and the `pre-debian-reset-2026-10-20` tag.
- **Phase 2 foundation is complete:** Debian 13 "Trixie" amd64 and Debian `live-build` have been selected and implemented. Phase 2 produced a compact bootable hybrid ISO (`rocketos-0.1-phase2-amd64.iso`, 363.00 MiB) with hybrid BIOS (`syslinux`/`isolinux`) + UEFI (`grub-efi`) bootloader support, verified via automated headless QEMU BIOS (18s) and UEFI (21s) smoke tests in GitHub Actions CI (Run 14571982630).
- **Phase 3 scope remains intentionally undefined** pending project owner and architecture review.

RocketOS is **not yet a finished native operating system**. With the minimal bootable Debian foundation established and verified, future phases will host the existing RocketOS experience on real Linux services and migrate RocketOS-owned functionality incrementally.

## Target architecture

```text
RocketOS desktop + first-party apps
    |  initially React/TypeScript, progressively native Rocket
    v
RocketOS Core / language-neutral platform API
    |  TypeScript and Rocket may coexist during migration
    v
Thin native bridge where Rocket cannot safely expose a Linux API
    |  C/C++ only when genuinely necessary
    v
Debian userspace and proven open-source services
    |  systemd, D-Bus, NetworkManager, BlueZ, PipeWire, Mesa,
    |  Wayland foundations, libinput, polkit, package tooling, etc.
    v
Linux kernel + upstream drivers + firmware
    v
Hardware
```

### Ownership boundary

**Debian/Linux owns:** kernel, drivers, firmware, hardware discovery, actual processes, filesystems, networking backend, Wi-Fi, Bluetooth, audio backend, graphics drivers, service management, package backend, and other low-level machinery.

**RocketOS owns:** desktop identity, shell behavior, launcher, carousel dock, window-management policy, workspaces, notifications UX, quick settings, Settings, Files, Terminal frontend, Store frontend, first-party apps, search, system UX, and RocketOS-specific core policy.

**React/TypeScript is temporary but protected:** it remains the reference implementation for complex UI that Rocket cannot yet reproduce cleanly. It is removed only after equivalent native Rocket functionality passes parity tests.

**C/C++ is infrastructure only:** use a thin bridge where callbacks or Linux APIs cannot yet be represented safely in Rocket. Do not build a second desktop in C++.

## Rocket language authority

The separate `RyanEid06/Rocket` repository is the authority for Rocket syntax, compiler/runtime behavior, supported native targets, and toolchain versions. Do not treat old RocketOS documentation as a language specification.

The Rocket snapshot reviewed for this reset contains the released Rocket compiler 3.0.0 plus later Rocket 3.5 graphics/assets/UI work. Its native toolchain uses LLVM 22.1.6 and Raylib 6.0. RocketOS must verify against the actual Rocket repository at integration time rather than hard-coding stale Rocket language claims here.

## Protected design

The existing RocketOS desktop design must survive implementation changes. The design contract is in [`docs/ROCKETOS_DESIGN_CONTRACT.md`](docs/ROCKETOS_DESIGN_CONTRACT.md).

The key reference is the October 20, 2026 desktop concept: dark navy/blue gradient background, large upper-right clock/date, Widgets control, centered curved/carousel desktop icons, and the dark bottom taskbar with launcher/workspace/search, pinned apps, and system controls.

## Roadmap

The authoritative implementation sequence is in [`docs/ROCKETOS_FOUNDATION_MASTER_PLAN.md`](docs/ROCKETOS_FOUNDATION_MASTER_PLAN.md).

Short version:

1. clean and freeze the architecture/documentation baseline (Phase 0 — complete);
2. prove the current Rocket compiler can build the native pieces RocketOS needs (Phase 1 — complete);
3. select the compact Debian foundation, build a bootable live ISO, and verify in QEMU (Phase 2 — complete);
4. Phase 3 scope to be locked by architecture review;
5. run the existing desktop against real Linux services instead of fake browser hardware;
6. migrate core domains from TypeScript to Rocket one at a time;
7. add missing Rocket desktop capabilities;
8. migrate apps and shell to native Rocket progressively;
9. test on physical x86-64 hardware.

The development-environment target is roughly **25–45 GB**. Avoid workflows that recreate the old 100+ GB Yocto-scale setup.

## Important non-decisions

The following foundation decisions have been established in Phase 2:
- Base OS: Debian 13 "Trixie" (`trixie`), amd64;
- Image builder: Debian `live-build` (`lb`);
- Bootloader: hybrid legacy BIOS (`syslinux`/`isolinux`) + UEFI (`grub-efi`).

The following remain deliberately **undecided** and must not be silently chosen by an implementation agent:
- Phase 3 scope (intentionally undefined pending project owner / architecture review);
- initial graphical compositor/session host (e.g. Wayland compositor/host strategy);
- initial React desktop host/runtime (Chromium/WebKit/Electron/other);
- final native IPC transport for the native core.

These choices belong to dedicated work packets with explicit project owner approval.

## Current web-development commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

For every change that touches the existing TypeScript/React implementation, the minimum gate is:

- `npm test` — all existing tests pass;
- `npm run lint` — zero TypeScript errors;
- `npm run build` — production build succeeds.

## Documentation

- [`docs/ROCKETOS_DEBIAN_FOUNDATION.md`](docs/ROCKETOS_DEBIAN_FOUNDATION.md) — Phase 2 Debian foundation specification and verified CI record.
- [`docs/ROCKETOS_ARCHITECTURE.md`](docs/ROCKETOS_ARCHITECTURE.md) — canonical architecture and ownership boundaries.
- [`docs/ROCKETOS_FOUNDATION_MASTER_PLAN.md`](docs/ROCKETOS_FOUNDATION_MASTER_PLAN.md) — staged implementation plan.
- [`docs/ROCKETOS_DESIGN_CONTRACT.md`](docs/ROCKETOS_DESIGN_CONTRACT.md) — protected visual/interaction target.
- [`docs/ROCKET_CORE_ARCHITECTURE.md`](docs/ROCKET_CORE_ARCHITECTURE.md) — transitional TypeScript/Rocket core migration model.
- [`docs/ROCKET_CORE_PROTOCOL.md`](docs/ROCKET_CORE_PROTOCOL.md) — logical core API contract; transport remains provisional.

## Historical note

Older revisions explored a Rocket bare-metal kernel, direct page tables/IDT/NVMe work, BusyBox/GRUB boot experiments, and a much heavier Yocto-based image path. Those approaches are no longer the RocketOS 0.x architecture. Git history preserves them; new work must not resurrect them without an explicit architecture decision.
