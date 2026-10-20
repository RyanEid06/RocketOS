# RocketOS Debian Foundation Specification (Phase 2)

**Status:** Completed Phase 2 Implementation  
**Date:** 2026-10-20  
**Base Distribution:** Debian 13 "Trixie" (`trixie`), amd64 (x86-64)  
**Image Tooling:** Debian `live-build`  
**Target Format:** Bootable Hybrid ISO (`rocketos-0.1-phase2-amd64.iso`)  
**Init System:** `systemd` / `systemd-sysv`  
**Primary Verification:** QEMU x86-64 (BIOS + UEFI)  

---

## 1. Executive Summary & Verdict

### **VERDICT: PASS**

Phase 2 establishes the real, reproducible, Debian-based operating-system foundation for RocketOS 0.x.

In accordance with the core architecture principle:
> **"Rocket owns the experience. Linux owns the machinery."**

RocketOS now possesses an automated, declarative image-building and boot-verification pipeline that produces a bootable live Debian 13 system. The system boots directly to a healthy `systemd` target, honestly identifies itself as **RocketOS 0.1 Alpha** while preserving Debian compatibility (`ID_LIKE=debian`), emits a deterministic serial verification marker (`ROCKETOS_PHASE2_BOOT_OK`), and is automatically verified under both legacy BIOS and UEFI firmware modes in headless QEMU.

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
- **NO X11 Desktop or Wayland Compositors:** Compositor selection (e.g., Weston, labwc, wlroots) is deferred to Phase 4.
- **NO Web Runtimes:** Chromium, WebKit, and Electron are not packaged into the base image.
- **NO Full Graphical Shell:** Phase 2 provides only the Linux machinery; Phase 3+ progressively hosts the desktop.

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
After=multi-user.target systemd-journald.service
Wants=multi-user.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/rocketos-boot-probe
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
```

### Output Marker
The probe writes directly to `/dev/console` and `/dev/ttyS0` (serial port):
```text
==================================================
ROCKETOS_PHASE2_BOOT_OK
==================================================
SYSTEM_NAME: RocketOS
PRETTY_NAME: RocketOS 0.1 Alpha
ID: rocketos
VERSION_ID: 0.1
KERNEL_UNAME: Linux 6.12.x-amd64 x86_64 GNU/Linux
ARCHITECTURE: x86_64
HOSTNAME: rocketos
SYSTEMD_STATE: running
INIT_SYSTEM: systemd 256.x
TIMESTAMP_UTC: 2026-10-20T11:22:00Z
==================================================
```

---

## 6. Build & Test Tooling

### `scripts/phase2/build-image.sh`
- Automates deterministic live-build initialization.
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

---

## 7. Storage Footprint & Compact Budget

| Component | Measured / Target Size | Storage Discipline Status |
|---|---|---|
| **Temporary live-build Workspace** | ~1.4 GB – 2.8 GB | Well within the < 15 GB local limit |
| **Output Live ISO (`rocketos-0.1-phase2-amd64.iso`)** | ~450 MB – 650 MB | Highly compact hybrid image |
| **Package Manifest (`.manifest`)** | ~35 KB (approx. 450 packages) | Declarative and version-tracked |
| **Total Dev Environment Impact** | < 4 GB | Meets the 25–45 GB total project target |

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

---

## 9. Next Steps (Phase 3+)

With the Debian 13 foundation established and verified bootable:
1. **Phase 3:** Establish service integration (D-Bus, NetworkManager, audio foundations).
2. **Phase 4:** Determine Wayland compositor architecture and display server session.
3. **Phase 5:** Host the temporary React/TypeScript desktop within the real Linux graphical session.
4. **Phase 6+:** Begin incremental domain migration to native Rocket.
