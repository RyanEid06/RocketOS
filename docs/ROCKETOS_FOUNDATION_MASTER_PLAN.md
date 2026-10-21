# RocketOS Foundation Master Plan

**Status:** Authoritative roadmap for the Debian-based RocketOS 0.x restart
**Updated:** 2026-10-20

## Mission

Build a real, bootable Debian-based RocketOS while preserving the current RocketOS desktop/application design and progressively moving RocketOS-owned functionality into native Rocket.

The project must become more real at every phase. Do not replace functioning behavior with architectural theater.

## Non-negotiable rules

1. **Rocket owns the experience. Linux owns the machinery.**
2. Preserve the current desktop/app design as the visual target.
3. No custom bare-metal kernel for RocketOS 0.x.
4. No Yocto-scale build workflow.
5. No big-bang React/TypeScript rewrite.
6. No second full desktop written in C++.
7. Use the real Rocket repository as language/compiler authority.
8. Label simulated functionality honestly until it is backed by Linux.
9. Keep the existing test/build gates green during migration.
10. Prefer small reversible milestones over giant one-shot rewrites.

---

## Phase 0 — Repository reset and architecture freeze

**Purpose:** remove misleading obsolete architecture artifacts and establish one source of truth.

Deliverables:

- canonical `README.md`;
- canonical Debian-based architecture document;
- canonical master plan;
- protected design contract;
- corrected agent guidance;
- updated core migration/protocol documents;
- old bare-metal/BusyBox boot prototype removed from the working tree but recoverable from Git history/tag;
- generated VM/image artifacts ignored by Git.

No application/core behavior is intentionally changed in this phase.

**Exit gate:** documentation agrees on one architecture and the existing JS test/lint/build gates still pass.

---

## Phase 1 — Rocket native compatibility gate

**Purpose:** prove exactly what the current Rocket toolchain can supply before RocketOS depends on it.

Required checks on Linux x64:

- build/use the current Rocket compiler;
- compile and execute a trivial native Rocket program;
- validate files, processes, networking, concurrency, and SQLite capabilities needed by RocketOS;
- build and run a simple Rocket graphical program;
- record runtime dependencies and produced binary sizes;
- compile representative existing `rocket/**/*.rocket` modules and classify failures rather than blindly patching syntax;
- document desktop/FFI gaps that block direct shell migration.

**Exit gate:** Rocket is proven usable for selected native RocketOS domains, with unsupported areas explicitly listed.

---

## Phase 2 — Select the compact Debian foundation & Live ISO

**Status:** PASS (Verified in CI — Run 14571982630, Conclusion: success)
**Decisions Accepted & Implemented:**
- **Base OS:** Debian 13 "Trixie" (`trixie`), amd64 (x86-64)
- **Image Builder:** Debian `live-build` (`lb`) producing bootable hybrid ISO (`rocketos-0.1-phase2-amd64.iso`, 363.00 MiB)
- **Kernel Release:** Linux 6.12.113+deb13-amd64
- **Init System:** `systemd` 257.3-1 / `systemd-sysv`
- **Bootloader:** Hybrid legacy BIOS (`syslinux`/`isolinux`) and UEFI (`grub-efi`)
- **Automated Verification:** Headless QEMU x86-64 smoke test detecting deterministic marker `ROCKETOS_PHASE2_BOOT_OK`
- **Documentation:** [`docs/ROCKETOS_DEBIAN_FOUNDATION.md`](ROCKETOS_DEBIAN_FOUNDATION.md)
- **CI Workflow:** [`.github/workflows/rocketos-debian-image.yml`](../.github/workflows/rocketos-debian-image.yml)
- **Storage Target:** 1,385 MB build workspace footprint (< 2.5 GB total footprint)

---

## Phase 3 — Graphical session foundation & desktop host gate

**Status:** IMPLEMENTED — CI ACCEPTANCE PENDING
**Specification:** [`docs/ROCKETOS_PHASE3_GRAPHICAL_FOUNDATION.md`](ROCKETOS_PHASE3_GRAPHICAL_FOUNDATION.md)

**Purpose:** transform the verified Phase 2 console ISO into a graphical RocketOS foundation capable of hosting the protected RocketOS desktop in Phase 4.

Deliverables:
- Wayland kiosk compositor (`cage`);
- native shell host runtime (`rocket-shell-host` with GTK4 + WebKitGTK 6.0);
- dedicated unprivileged graphical user session (`rocket`, UID 1000);
- automatic systemd supervisor integration (`rocketos-graphical-session.service`, `Restart=always`);
- keyboard-accessible emergency TTYs preserved on TTY2/TTY3;
- minimal technical diagnostic UI (strictly avoiding desktop imitation until Phase 4);
- typed JS/native bridge with 100% unit-tested TypeScript client and protocol;
- deterministic boot verification marker `ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK`;
- automated QEMU smoke test (`scripts/phase3/smoke-test-qemu.sh`) and CI workflow (`.github/workflows/rocketos-phase3-graphical-image.yml`).

**Exit gate:** RocketOS boots to the graphical diagnostic interface in QEMU (BIOS and UEFI) and emits `ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK`.

---


## Phase 4 — Run the protected RocketOS desktop on Debian

**Purpose:** make the current design run as a real Linux session before rewriting it.

Deliverables:

- current React/TypeScript shell launches inside the Debian image;
- current desktop/app design remains visually recognizable and functionally intact;
- browser-only assumptions are isolated behind platform providers;
- web preview remains available for rapid design work.

**Exit gate:** RocketOS boots to the existing desktop design in QEMU.

---

## Phase 5 — Replace fake platform data with real Linux adapters

**Purpose:** turn the desktop from a simulation into a real system interface.

Migrate adapters incrementally:

- filesystem -> real Linux filesystem where appropriate;
- process list/launch -> real Linux processes;
- services -> systemd;
- Wi-Fi/network -> NetworkManager/Linux networking;
- Bluetooth -> BlueZ;
- audio -> PipeWire/ALSA;
- system telemetry -> `/proc`, `/sys`, and supported system APIs;
- privilege operations -> appropriate Linux policy/privilege mechanisms;
- package operations -> Debian package backend.

Keep fake/demo data only when clearly marked and useful for preview mode.

**Exit gate:** major system apps report real VM state rather than invented hardware state.

---

## Phase 6 — Stabilize the RocketOS core boundary

**Purpose:** stop UI code from bypassing the provider/core contract.

Deliverables:

- `ICoreProvider` becomes the real boundary for OS operations;
- direct UI calls into browser-only singleton services are reduced/migrated;
- browser fallback remains a preview implementation;
- native/Linux provider becomes authoritative inside installed RocketOS;
- same behavioral tests can be run against old/new providers where practical.

**Exit gate:** UI behavior is not tied to one storage/process/service implementation.

---

## Phase 7 — Migrate core domains to Rocket incrementally

**Purpose:** increase real Rocket ownership without destabilizing the OS.

Candidate domains:

- settings/domain policy;
- search/index logic;
- app registry/contracts;
- command parsing and Rocket-specific shell logic;
- notifications logic;
- package metadata/policy;
- selected filesystem/path policy;
- selected process/service policy.

Migration rule:

1. compile the Rocket implementation with the actual current Rocket compiler;
2. run shared conformance tests;
3. compare behavior with the existing implementation;
4. switch one domain at a time;
5. delete the TypeScript implementation only after parity is proven.

---

## Phase 8 — Rocket desktop enablement

**Purpose:** add reusable Rocket capabilities required by the protected desktop design.

Likely gaps include:

- mouse-wheel and scroll state;
- scrollable containers;
- richer text input/editing;
- clipboard/selection/IME integration;
- tabs, toggles, sliders, context menus;
- drag/drop;
- multi-monitor/display APIs;
- desktop-grade focus/input behavior;
- glass/blur/effects strategy;
- long-lived native event integration where current FFI limitations require a bridge.

Do not create RocketOS-only hacks when a reusable Rocket library/runtime feature is the correct solution.

**Exit gate:** a representative complex RocketOS app can be reproduced natively without simplifying the design.

---

## Phase 9 — Native Rocket app migration

Start with applications whose requirements fit Rocket's proven capabilities, not merely apps that look visually simple.

Possible order after capability review:

1. Calculator / Clock-class apps;
2. simple system/status tools;
3. Settings sections;
4. Notes/editor only after text-input/clipboard/scrolling parity;
5. Files/Terminal/media/developer tools after their required APIs exist.

Each native app must match the design contract before the React version is retired.

---

## Phase 10 — Native Rocket shell migration

Only after the native app/UI stack is proven:

- desktop background/widgets;
- taskbar;
- notifications;
- quick settings;
- launcher/search;
- carousel dock;
- workspace/Mission Control experience;
- window chrome and snapping;
- remaining shell surfaces.

The carousel behavior and existing desktop identity are requirements, not optional polish.

---

## Phase 11 — Remove temporary web/runtime layers

Remove components only when equivalent native functionality is proven:

- browser fallback from installed builds;
- TypeScript domain implementations that have native parity;
- temporary Node/web runtime dependencies;
- React shell pieces after native Rocket replacements pass design/behavior acceptance.

Web preview tooling may remain as a development mode if useful.

---

## Phase 12 — VM acceptance

Primary engineering target: **QEMU x86-64**.
Secondary compatibility target: **VirtualBox x86-64**.

Acceptance includes:

- boot and session startup;
- display resizing;
- networking;
- audio;
- storage persistence;
- app launch/close/recovery;
- shutdown/reboot;
- update/install path;
- crash handling;
- resource use.

---

## Phase 13 — Physical hardware

After VM acceptance:

- create installer/recovery media;
- boot on an old x86-64 laptop;
- test GPU/display, Wi-Fi, audio, storage, Bluetooth, input, suspend/resume;
- solve hardware compatibility through Debian/Linux packages and drivers wherever possible.

---

## Definition of success for RocketOS 0.x

RocketOS 0.x succeeds when it is a declarative, repeatably buildable Debian-based OS that boots on supported VM/hardware targets, presents the protected RocketOS desktop/app experience, uses real Linux system services rather than simulated hardware, and contains an increasing amount of native Rocket code without making the system fragile for language purity.
