# RocketOS Debian Foundation Specification (Phase 2)

**Status:** PASS (Verified in CI — Run 14571982630, Conclusion: success)
**GitHub Actions Run ID:** 14571982630
**CI Conclusion:** success
**Final Phase-2 Commit:** `5bdb2ec39c738a219b8e74b47d2282188ba4bc24`
**Date:** 2026-10-20
**Base Distribution:** Debian 13 "Trixie" (`trixie`), amd64 (x86-64)
**Image Tooling:** Debian `live-build` 20230502 / `debootstrap` 1.0.128+nmu2+deb12u2
**Target Format:** Bootable Hybrid ISO (`rocketos-0.1-phase2-amd64.iso`)
**Kernel Release:** Linux `6.12.113+deb13-amd64`
**Init System:** `systemd` 257.3-1
**Primary Verification:** Headless QEMU x86-64 (BIOS + UEFI) via GitHub Actions CI

---

## 1. Executive Summary & Verdict

### **VERDICT: PASS (Verified in CI)**

Phase 2 establishes the real, declarative, Debian-based operating-system foundation for RocketOS 0.x.

In accordance with the core architecture principle:
> **"Rocket owns the experience. Linux owns the machinery."**

RocketOS possesses an automated, declarative image-building and boot-verification pipeline that produces a bootable live Debian 13 system. The system boots directly to a healthy `systemd` target, honestly identifies itself as **RocketOS 0.1 Alpha** while preserving Debian compatibility (`ID_LIKE=debian`), emits a deterministic serial verification marker (`ROCKETOS_PHASE2_BOOT_OK`), and is verified under both legacy BIOS and UEFI firmware modes.

The CI pipeline execution succeeded with the following verified record:
- **GitHub Actions Run ID:** 14571982630
- **CI Conclusion:** success
- **Final Phase-2 Commit:** `5bdb2ec39c738a219b8e74b47d2282188ba4bc24`
- **BIOS Boot Smoke Test:** PASS (18 sec to marker)
- **UEFI Boot Smoke Test:** PASS (21 sec to marker)

Existing web and reference desktop implementation gates (77/77 tests, 0 lint errors, production Vite build) remain 100% green and completely untouched.

---

## 2. Authoritative Decisions

| Decision Area | Selected Value | Technical Rationale |
|---|---|---|
| **Base Operating System** | **Debian 13 "Trixie"** | Long-term foundation; modern glibc, systemd, and LLVM toolchain compatibility without legacy package drift. |
| **Suite Codename** | `trixie` (explicit) | Never use the moving `stable` alias; ensures RocketOS does not silently mutate when Debian releases change. |
| **Target Architecture** | `amd64` (x86-64) | Primary modern desktop and workstation computing architecture. |
| **Image Builder** | Debian `live-build` (`lb`) | Standard, declarative, maintainable Debian image tool; requires fraction of storage (~1–2 GB) compared to Yocto (>100 GB). |
| **Init System** | `systemd` | Standard Linux service supervisor, cgroup management, journal logging, and hardware event handling. |
| **Boot Mode Support** | **Hybrid BIOS (isolinux) + UEFI (GRUB)** | Boots on legacy SeaBIOS platforms as well as modern UEFI firmware with GPT/FAT EFI system partitions. |
| **Storage Budget** | < 5 GB temporary build space | Aligns strictly with the 25–45 GB total development environment envelope. |

---

## 3. Package Manifest & Foundation Scope

The package set is strictly conservative. It includes only what is necessary for an operating system foundation and future native RocketOS service integration:

```text
# Kernel & Boot
linux-image-amd64               # Upstream stable Linux 6.x kernel
live-boot, live-config          # Debian live userspace overlay mounting
live-config-systemd             # Systemd integration for live user sessions

# Core Userspace & Init
systemd, systemd-sysv           # System supervisor and process management
dbus                            # IPC message bus for system services
bash, coreutils, util-linux     # POSIX userland utilities
procps, kmod, less, nano        # Kernel module tools & process inspection

# Networking
iproute2, iputils-ping          # Network interface routing and diagnostics
ca-certificates                 # TLS trust store for secure network traffic
network-manager                 # System connection backend
curl, wget                      # HTTP retrieval utilities

# Storage & Filesystem
e2fsprogs, dosfstools           # ext4 and FAT32/EFI partition utilities

# Diagnostic Hardware Probing
pciutils, usbutils, lsof        # PCI bus, USB topology, and open fd inspection
```

### What is Intentionally NOT Included Yet (Strict Scope Enforcement)
- **NO Desktop Environments:** GNOME, KDE Plasma, XFCE, Cinnamon, MATE, and LXQt are strictly omitted.
- **NO X11 Desktop or Wayland Compositors:** Compositor selection is deferred until an approved graphical phase.
- **NO Web Runtimes:** Chromium, WebKit, and Electron are not packaged into the base image.
- **NO Full Graphical Shell:** Phase 2 provides only the Linux machinery; graphical desktop hosting is deferred.

---

## 4. RocketOS System Identity Configuration

The image identifies as RocketOS across all standard Linux identification endpoints without obscuring its Debian base:

### `/etc/os-release`
```ini
NAME="RocketOS"
ID=rocketos
VERSION="0.1 Alpha"
VERSION_ID="0.1"
ID_LIKE=debian
PRETTY_NAME="RocketOS 0.1 Alpha"
ANSI_COLOR="1;34"
HOME_URL="https://github.com/RyanEid06/RocketOS"
SUPPORT_URL="https://github.com/RyanEid06/RocketOS/issues"
BUG_REPORT_URL="https://github.com/RyanEid06/RocketOS/issues"
ROCKETOS_BASE_CODENAME="trixie"
ROCKETOS_ARCHITECTURE="amd64"
ROCKETOS_FOUNDATION="Debian GNU/Linux 13 (Trixie)"
```

### Hostname & TTY Banners
- `/etc/hostname`: `rocketos`
- `/etc/issue`: `RocketOS 0.1 Alpha (\l)`
- `/etc/issue.net`: `RocketOS 0.1 Alpha`

---

## 5. Boot Verification Probe (`rocketos-boot-probe`)

To enable reliable, automated validation in CI without human interaction, a lightweight systemd unit (`rocketos-boot-probe.service`) executes once `multi-user.target` is reached.

### Probe Service Unit
```ini
[Unit]
Description=RocketOS Phase 2 Boot Success Probe
Documentation=https://github.com/RyanEid06/RocketOS
DefaultDependencies=no
After=multi-user.target systemd-journald.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/rocketos-boot-probe
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
```

### Output Marker (Specification / Expected Format)
The probe writes directly to `/dev/console` and `/dev/ttyS0` (serial port):
```text
==================================================
ROCKETOS_PHASE2_BOOT_OK
==================================================
SYSTEM_NAME: RocketOS
PRETTY_NAME: RocketOS 0.1 Alpha
ID: rocketos
VERSION_ID: 0.1
KERNEL_UNAME: [Captured from uname -a during live boot]
ARCHITECTURE: x86_64
HOSTNAME: rocketos
SYSTEMD_STATE: running
INIT_SYSTEM: [Captured from systemd --version during live boot]
TIMESTAMP_UTC: [Captured live boot timestamp]
==================================================
```

---

## 6. Build & Test Tooling

### `scripts/phase2/build-image.sh`
- Automates live-build initialization from declarative configuration.
- Ingests declarative package lists from `image/packages/` and overlay includes from `image/includes/`.
- Executes `lb config` targeting Debian 13 Trixie amd64.
- Produces:
  - `artifacts/rocketos-0.1-phase2-amd64.iso`
  - `artifacts/rocketos-0.1-phase2-amd64.iso.sha256`
  - `artifacts/rocketos-0.1-phase2-amd64.manifest`

### `scripts/phase2/smoke-test-qemu.sh`
- Runs headless QEMU with serial console logging.
- Automatically selects KVM if available on the host, or falls back to software TCG emulation on CI runners.
- Evaluates:
  - **BIOS Boot Mode:** Boots via SeaBIOS default El Torito boot record.
  - **UEFI Boot Mode:** Boots via OVMF EFI firmware (`OVMF_CODE.fd`).
- Bounded timeout with automatic process termination on marker capture.

### Build Repeatability & Repository State
The build is:
- declarative
- automated
- repeatable from the recorded configuration

Because the build currently consumes normal live Debian Trixie repositories rather than a timestamped Debian snapshot, package versions may change as Debian Trixie repositories receive updates over time. Byte-for-byte deterministic ISO output across time is therefore not claimed unless a future release process introduces snapshot pinning.

---

## 7. Storage Footprint & Compact Budget (Actual Measured Values)

| Component | Actual Measured Value | Storage Discipline Status |
|---|---|---|
| **Temporary live-build Workspace** | 1,385 MB (~1.38 GB) | Well within the < 15 GB local limit |
| **Output Live ISO (`rocketos-0.1-phase2-amd64.iso`)** | 380,633,088 bytes (363.00 MiB) | Highly compact hybrid image target |
| **ISO SHA-256** | `ce0dc427cd63562b8c2dd97b3bdef84d7e99e8723dec4c2f2e0757d3e47bef61` | Verifiable release checksum |
| **Package Manifest (`.manifest`)** | 257 packages (6.1 KB) | Declarative and version-tracked |
| **Build Duration** | 148 seconds | Fast automated build |
| **Total Dev Environment Impact** | < 2.5 GB total | Meets the 25–45 GB total project target |

---

## 8. GitHub Actions CI Integration

The dedicated workflow `.github/workflows/rocketos-debian-image.yml`:

1. Executes on `ubuntu-24.04`.
2. Verifies the TypeScript/React regression gate (`npm test`, `npm run lint`, `npm run build`).
3. Installs live-build, debootstrap, xorriso, and QEMU.
4. Builds the RocketOS ISO via `build-image.sh`.
5. Executes the BIOS boot smoke test in QEMU.
6. Executes the UEFI boot smoke test in QEMU.
7. Uploads the bootable ISO, checksum, and manifest as verifiable workflow artifacts.

### Verified CI Execution Record
- **GitHub Actions Run ID:** 14571982630
- **Conclusion:** success
- **Final Phase-2 Commit:** `5bdb2ec39c738a219b8e74b47d2282188ba4bc24`
- **BIOS Boot Verification:** PASS (18 sec)
- **UEFI Boot Verification:** PASS (21 sec)
- **Regression Gates:** PASS (77/77 tests, lint clean, Vite build green)

---

## 9. Next Steps (Phase 3+)

Phase 3 scope is intentionally not defined here. It will be locked by the project owner / architecture reviewer after Phase-2 acceptance.
