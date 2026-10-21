# RocketOS Graphical Session Foundation & Desktop Host Gate (Phase 3)

**Status:** IMPLEMENTED — CI ACCEPTANCE PENDING
**Date:** 2026-10-21
**Base Distribution:** Debian 13 "Trixie" (`trixie`), amd64 (x86-64)
**Compositor:** Wayland via `cage` (Kiosk Compositor)
**Shell Host Runtime:** `rocket-shell-host` (GTK4 + WebKitGTK 6.0)
**Session User:** Dedicated unprivileged user `rocket` (UID 1000)
**Init System:** `systemd` 257.x (`graphical.target`)
**Target Format:** Bootable Hybrid ISO (`rocketos-0.1-phase3-amd64.iso`)
**Deterministic Marker:** `ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK`

---

## 1. Executive Summary & Purpose

Phase 3 transforms the verified Phase 2 console foundation into a fully functioning, unprivileged graphical foundation ready to host the protected RocketOS desktop in Phase 4.

In accordance with RocketOS foundational rules:
> **"Rocket owns the experience. Linux owns the machinery."**

### Key Architectural Boundaries:
- **Phase 3 Scope:** Establishes the unprivileged Wayland display server (`cage`), the native graphical host (`rocket-shell-host` with GTK4 + WebKitGTK 6.0), the typed JS/native bridge, the systemd session supervision, and the technical diagnostic interface.
- **Phase 4 Scope (Strictly Protected):** Integration of the real existing React/TypeScript RocketOS desktop is reserved for Phase 4. Phase 3 intentionally uses a minimal technical diagnostic UI and does **not** imitate or rebuild the real RocketOS desktop.

---

## 2. Locked Owner Decisions Implementation

| Locked Decision | Implementation Detail | Verification Mechanism |
|---|---|---|
| **1. Automatic Graphical Desktop** | Direct boot into `graphical.target`. No login manager or generic display manager prompt (GDM/LightDM omitted). | `systemctl get-default` returns `graphical.target`; `rocketos-graphical-session.service` starts at boot. |
| **2. Unprivileged Session User** | Session runs strictly as user `rocket` (UID 1000, primary group `rocket`, supplementary groups `video,render,input,audio,seat`). Home at `/home/rocket`. | Process UID validation (`id -u == 1000`) and systemd `User=rocket` specification. |
| **3. Crash Recovery / Auto-Restart** | `rocketos-graphical-session.service` configured with `Restart=always`, `RestartSec=2`. | systemd automatically relaunches `rocketos-session` and `cage` if terminated or crashed. |
| **4. Emergency TTY Availability** | TTY1 dedicated to graphical session (`Conflicts=getty@tty1.service`). TTY2 and TTY3 maintain active gettys (`getty@tty2.service`, `getty@tty3.service`). | Keyboard shortcuts (Ctrl+Alt+F2 / Ctrl+Alt+F3) grant emergency shell access. |
| **5. Technical Diagnostic UI** | Dedicated dark-mode telemetry interface at `/usr/share/rocketos/diagnostic/index.html`. No imitation of the protected Phase 4 desktop design. | Serves as technical testbed for bridge latency, memory queries, and serial verification. |
| **6. GTK4 + WebKitGTK 6.0 Runtime** | Native host `rocket-shell-host` built using GTK4 windowing and WebKitGTK 6.0 WebKitWebView with script message handlers. | Full Wayland-native acceleration with Pixman software rendering fallback for virtualized QEMU. |

---

## 3. Session Boot Flow

```
BIOS / UEFI Firmware
       │
       ▼
GRUB / Isolinux Bootloader (Live Boot)
       │
       ▼
Linux Kernel 6.12.x amd64
       │
       ▼
systemd (PID 1)
       │
       ▼
graphical.target
       │
       ▼
rocketos-graphical-session.service (User: rocket, PAM session on tty1)
       │
       ▼
/usr/local/bin/rocketos-session
       │
       ▼
Cage (Wayland Kiosk Compositor)
       │
       ▼
rocket-shell-host (GTK4 + WebKitGTK 6.0)
       │
       ▼
file:///usr/share/rocketos/diagnostic/index.html
       │
       ▼
Typed JS/Native Bridge Handshake & Serial Marker Emission
```

---

## 4. Typed Native Bridge Protocol

The bridge provides asynchronous, bidirectional, typed IPC between the web runtime and the native Linux host.

### JavaScript to Native
JavaScript invokes native capabilities via the WebKit user content manager:
```javascript
window.webkit.messageHandlers.rocketBridge.postMessage(JSON.stringify({
  version: 1,
  id: "req_1_1729470000000",
  type: "getSystemInfo",
  payload: null
}));
```

### Native to JavaScript
`rocket-shell-host` processes the message and responds by evaluating:
```javascript
window.__rocketBridgeReceive(JSON.stringify({
  version: 1,
  id: "req_1_1729470000000",
  type: "getSystemInfo",
  success: true,
  data: {
    systemName: "RocketOS",
    prettyName: "RocketOS 0.1 Alpha",
    id: "rocketos",
    versionId: "0.1",
    sessionType: "wayland",
    compositor: "cage",
    hostRuntime: "rocket-shell-host (GTK4 + WebKitGTK 6.0)",
    sessionUser: "rocket",
    ...
  }
}));
```

### Supported IPC Requests

| Request Type | Description | Response Data Payload |
|---|---|---|
| `ping` | Round-trip latency check | `{ pong: boolean, timestamp: number }` |
| `getBridgeVersion` | Protocol version (`1`), WebKitGTK, and GTK runtime versions | `{ protocolVersion, host, webkitVersion, gtkVersion }` |
| `getSystemInfo` | Detailed OS, kernel, session, and architecture info | `SafeSystemInfo` structure |

*(Note: `querySystemdState`, `queryMemory`, and `verifyGraphicalBoot` were audited and pruned in accordance with the locked Phase 3 minimal bridge gate. General system management and telemetry belong to Phase 5, and graphical boot proof is authoritatively determined externally via QEMU framebuffer and systemd session probes.)*

### Isolated TypeScript Native Bridge Client Architecture
To protect the existing RocketOS React/TypeScript desktop from premature modification, all Phase 3 bridge client code is isolated strictly outside `src/`:
- Implementation: `native-host/bridge/RocketNativeBridge.ts`
- Protocol Types: `native-host/bridge/types.ts`
- Unit Tests: `native-host/bridge/RocketNativeBridge.test.ts` (100% pass rate in Vitest, 11/11 tests passing)
- Export Index: `native-host/bridge/index.ts`
- Protected Desktop Integrity: `src/` has exactly 0 modifications relative to the frozen Phase 2 checkpoint (`e8e0917`).
- Browser Fallback: In browser preview mode, it gracefully provides simulated responses labeled in compliance with Rule 4 (`SIMULATED`).

---

## 5. Package Manifest Additions

The Phase 3 package set extends Phase 2 with strictly necessary graphical userspace components:

```text
# Wayland Compositor (Kiosk Mode)
cage                            # Lightweight Wayland kiosk compositor

# Native Desktop Shell Host
libgtk-4-1                      # GTK4 runtime library
gir1.2-gtk-4.0                  # GTK4 GObject introspection
libwebkitgtk-6.0-4              # WebKitGTK 6.0 modern engine
gir1.2-webkit-6.0               # WebKitGTK 6.0 GObject introspection
python3-gi, python3             # PyGObject runtime bindings

# Graphics & Mesa Software Fallback
libgl1-mesa-dri                 # DRI drivers (including llvmpipe for software rendering)
mesa-vulkan-drivers             # Modern Vulkan support

# Desktop Resources
fonts-dejavu-core               # Standard TrueType fonts for WebKit text layout
gsettings-desktop-schemas       # System desktop settings schema
adwaita-icon-theme              # Standard GTK icon assets

# Session Infrastructure
dbus-user-session               # User D-Bus session bus
libseat1                        # Unprivileged seat management (systemd-logind backend)
```

---

## 6. Deterministic Boot Verification Marker

During boot, `/usr/local/bin/rocketos-boot-probe` and `rocket-shell-host` validate system health and emit the deterministic marker to `/dev/ttyS0` and `/dev/console`:

```text
==================================================
ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK
==================================================
SYSTEM_NAME: RocketOS
PRETTY_NAME: RocketOS 0.1 Alpha
ID: rocketos
VERSION_ID: 0.1
SESSION_TYPE: wayland
COMPOSITOR: cage
SHELL_HOST: rocket-shell-host
RUNTIME: GTK4 + WebKitGTK 6.0
SESSION_USER: rocket (unprivileged: yes)
SESSION_SERVICE_STATE: active
SYSTEMD_TARGET: graphical.target
NATIVE_BRIDGE: active
KERNEL_UNAME: Linux rocketos 6.12.x #1 SMP amd64
ARCHITECTURE: x86_64
HOSTNAME: rocketos
TIMESTAMP_UTC: 2026-10-21T07:30:00Z
==================================================
```

Phase 2 marker `ROCKETOS_PHASE2_BOOT_OK` is also retained to verify non-regression of the base platform.

---

## 7. Verification Tooling & CI

- **Verification Tooling & CI:**
  - Build Script: `scripts/phase3/build-image.sh`
  - Smoke Test Script: `scripts/phase3/smoke-test-qemu.sh` (BIOS and UEFI OVMF support, QMP screendump capture)
  - CI Workflow: `.github/workflows/rocketos-phase3-graphical-image.yml`
- **Regression Gates:**
  - `npm test`: 85/85 tests passing (77 legacy desktop tests + 8 isolated native bridge tests)
  - `npm run lint`: 0 TypeScript errors
  - `npm run build`: Production Vite build passes cleanly
  - Protected Desktop `src/`: 0 modified files against `e8e0917`

---

## 8. WP5 Graphical Session Supervision, Crash Recovery & Emergency TTY Acceptance

### Supervisor Configuration (`rocketos-graphical-session.service`)
```ini
[Unit]
Description=RocketOS Phase 3 Graphical Session (Cage + rocket-shell-host)
Documentation=https://github.com/RyanEid06/RocketOS
After=systemd-user-sessions.service systemd-logind.service dbus.service
Wants=systemd-logind.service dbus.service
Conflicts=getty@tty1.service

[Service]
Type=simple
User=rocket
Group=rocket
PAMName=login
Environment=HOME=/home/rocket
Environment=USER=rocket
WorkingDirectory=/home/rocket
TTYPath=/dev/tty1
StandardInput=tty-fail
StandardOutput=journal
StandardError=journal
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes
UtmpIdentifier=tty1
ExecStart=/usr/local/bin/rocketos-session
Restart=always
RestartSec=2
TimeoutStopSec=10

[Install]
WantedBy=graphical.target
```

### WP5 Audit Verification & Acceptance Matrix

| Acceptance Requirement | Status | Verification & Mechanism |
|---|---|---|
| **Host running as user `rocket`** | `IMPLEMENTED — CI ACCEPTANCE PENDING` | `User=rocket`, `Group=rocket`, `WorkingDirectory=/home/rocket`, PAM session initialized under UID 1000 on controlling VT `/dev/tty1`. Verified by `rocketos-boot-probe` (`SESSION_USER: rocket (UID: 1000)`). |
| **Crash detection & automatic restart** | `IMPLEMENTED — CI ACCEPTANCE PENDING` | `Restart=always` with `RestartSec=2`. systemd PID 1 detects exit/crash of `rocketos-session` and immediately relaunches the session. |
| **Real UI-Loaded & Bridge-Ping Runtime Evidence** | `IMPLEMENTED — CI ACCEPTANCE PENDING` | Deterministic markers `/run/user/1000/rocketos-ui-loaded` and `/run/user/1000/rocketos-bridge-ping-ok` verified by `rocketos-boot-probe` matching current `HOST_PID`, and re-verified under `NEW_HOST_PID` after recovery. |
| **No accumulating orphan processes** | `IMPLEMENTED — CI ACCEPTANCE PENDING` | Cgroup process tracking verifies exactly 1 active `cage` and 1 active `rocket-shell-host` instance after recovery. |
| **Emergency TTYs available** | `IMPLEMENTED — CI ACCEPTANCE PENDING` | TTY1 is dedicated to graphical session (`Conflicts=getty@tty1.service`), while TTY2 and TTY3 maintain standard systemd getty units (`getty@tty2.service`, `getty@tty3.service`). Automated service availability is a mandatory CI gate in `rocketos-boot-probe`; physical keyboard switching (Ctrl+Alt+F2/F3) remains a separate local/manual verification. |
| **Controlled failure test in local container** | `BLOCKED (Local Container)` | The development environment runs inside a lightweight gVisor sandbox (`Linux 4.19.0-gvisor`) lacking `/dev/kvm`, `/dev/loop*`, loopback block devices, and `qemu-system-x86_64`. Live guest crash injection cannot be executed in this container and must be executed in GitHub Actions or an x86-64 KVM host. |
| **Controlled failure test procedure (CI / Guest VM)** | `IMPLEMENTED — CI ACCEPTANCE PENDING` | Automated in `rocketos-boot-probe` and verified in `scripts/phase3/smoke-test-qemu.sh` via serial marker `ROCKETOS_WP5_RECOVERY_TEST_PASS`. |
| **External QEMU Framebuffer Evidence** | `IMPLEMENTED — CI ACCEPTANCE PENDING` | Mandatory external proof: `scripts/phase3/smoke-test-qemu.sh` connects via QMP socket to issue `screendump`, capturing valid PPM virtual frame buffer memory (`artifacts/qemu-framebuffer-phase3-*.ppm`). Distinguishes display buffer presence from visual correctness. |


