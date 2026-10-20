# RocketOS Image Build Specification (Phase 2)

This directory contains the declarative configuration for building the bootable **RocketOS 0.1 Alpha** live ISO using Debian `live-build`.

## Architecture Principles

> **Rocket owns the experience. Linux owns the machinery.**

Phase 2 establishes the minimal, reproducible Debian Linux foundation:
- **Base OS:** Debian 13 "Trixie" (`trixie`), amd64 / x86-64
- **Init System:** `systemd` / `systemd-sysv`
- **Boot Format:** Hybrid ISO supporting both legacy BIOS and UEFI x86-64
- **Verification Target:** Headless QEMU x86-64 with deterministic serial boot probe

## Directory Layout

```text
image/
├── README.md                           # This document
├── packages/
│   └── rocketos-core.list.chroot       # Declarative package list for minimal foundation
├── includes/                           # Root filesystem overlay tree
│   ├── etc/
│   │   ├── os-release                  # Canonical RocketOS identification
│   │   ├── issue                       # TTY pre-login banner
│   │   ├── issue.net                   # Network pre-login banner
│   │   ├── hostname                    # System hostname: rocketos
│   │   ├── hosts                       # Local loopback resolution
│   │   └── systemd/system/
│   │       └── rocketos-boot-probe.service # Development boot verification probe
│   └── usr/local/bin/
│       └── rocketos-boot-probe         # Diagnostic probe script
└── hooks/
    └── 0100-rocketos-setup.hook.chroot # Post-install permissions & systemd enablement
```

## Build Process

The build is driven by `scripts/phase2/build-image.sh`:
1. Validates host dependencies (`live-build`, `debootstrap`, `xorriso`, `mtools`, `dosfstools`).
2. Configures `live-build` with explicit target `--distribution trixie --architectures amd64`.
3. Ingests package lists, filesystem overlays (`includes/`), and chroot hooks (`hooks/`).
4. Generates a bootable hybrid ISO (`rocketos-0.1-phase2-amd64.iso`), SHA-256 checksum, and package manifest.

Generated build outputs (e.g., `image/build/`, `*.iso`, `*.manifest`) are strictly ignored by Git.
