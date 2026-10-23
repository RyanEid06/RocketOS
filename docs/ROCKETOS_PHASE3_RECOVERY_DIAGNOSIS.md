# Phase 3 WP5 recovery diagnosis

Date: 2026-10-23. Scope: Phase 3 recovery only; no Phase 4 work.

## Source and environment

The Windows checkout initially contained Phase 2 (`e8e0917`). The recovery branch
`codex/phase3-shell-recovery` starts at fetched `origin/main` (`fdc110e`).
The existing ISO's verification report identifies `f996d0a`; the next commit adds
the emergency TTY `nottyautologin` gate. No ISO was downloaded or rebuilt.

Tests used Windows QEMU, WHPX, the existing ISO/kernel/initrd, and persistence.
Serial console access was added for diagnosis. This evidence is `REAL_LINUX` VM
evidence, not physical hardware or native Rocket language acceptance.

## Root cause

systemd supervises Cage: `rocketos-session` ends by executing Cage with the host
as its primary client. `Restart=always` takes effect only when Cage exits.

Cage 0.2.0-2 detects client exit through a pipe inherited by the primary client.
Its write descriptor also reaches exec'd WebKit helpers because the host did not
mark inherited descriptors close-on-exec. A surviving helper keeps the pipe open
after host death, so Cage does not exit and systemd never schedules a restart.
See the installed version's [Debian source](https://sources.debian.org/src/cage/0.2.0-2/cage.c/),
`spawn_primary_client` and `sigchld_handler`.

Baseline boot WP5 and a plain manual host kill both passed. A deterministic
injection reproduced the reported failure: stop the WebKit helpers, then kill
only the host. Cage PID 1937 stayed active, `NRestarts=2` stayed unchanged past
30 seconds, and host PID 2136 remained a zombie. Pipe inode 6797 was held by the
host and WebKitNetworkProcess 2162, xdg-dbus-proxy 2165, WebKitWebProcess 2170.
Continuing those helpers immediately allowed Cage to exit and systemd to
restart it (Cage 3054, `NRestarts=3`). This reproduces the failure mechanism;
the original unassisted timing was not reproduced.

## Fix and regression gates

- `rocket-shell-host`: before importing GI, mark inherited non-stdio descriptors
  non-inheritable. Keep the host's descriptors open; close them only on exec.
  This preserves Cage's lifetime pipe until host death without leaking it into
  WebKit helpers. No service, account, capability, sandbox, or compositor change.
- `rocketos-boot-probe`: stop a real WebKit network helper, verify it stopped,
  kill the host, and require recovery before releasing the helper. Restore it
  on failure too. Report measured restart time and fail if host termination fails.
- `test-host-recovery.py`: exercise the actual host entry point with a fake GI
  module that launches a real surviving helper. Verify the lifecycle pipe stays
  open while the host lives and reaches EOF after SIGKILL/SIGTERM while that
  helper still lives. Both cases failed before the fix and passed after it.
- Phase 3 CI requires this Python regression. QEMU smoke acceptance requires the
  strengthened fault-injection marker and rejects explicit guest failures even
  alongside success markers.

## Verification and local delivery

The first patched VM passed strengthened WP5: host 1075 -> 1796, Cage restarted,
new UI-loaded and bridge-ping markers both matched 1796, one host and one Cage.
A repeat with all three WebKit helpers stopped recovered to Cage 2255 and host
2454 while the old helpers were still stopped. All checked processes remained
UID 1000 with zero effective and bounding capabilities; TTY2/TTY3 were active.

`npm test`: 116/116 pass with loopback access. The initial sandboxed invocation
failed six localhost integration cases; the authorized loopback rerun passed.
`npm run lint`, `npm run build`, Python recovery regression, and Bash syntax
checks passed. Vite reports its existing large-chunk warning. Remote CI was not
run; BIOS/UEFI ISO acceptance and physical hardware remain separate gates.

The original persistence disk is patched through its `/rw` overlay with only the
host and boot probe. An independent pre-patch disk backup is retained at
`artifacts/recovery-original-backup.qcow2` (no backing-file dependency).
The original ISO/kernel/initrd remain unchanged. Serial/process evidence is in
`artifacts/recovery-console.log`. Offline testing first required replaying the
disposable copy's ext4 journal before patching; the inconsistent disposable copy
was discarded and recreated. The original was patched through a mounted ext4
filesystem and unmounted cleanly.

Final exact-source original-disk verification: strengthened WP5 passed on
`artifacts/rocketos-dev.img`: host 1079 -> 1739, Cage 841 -> 1535,
`NRestarts=1`, measured recovery 3 seconds, both recovered readiness markers
1739, one live host/Cage, TTY2/TTY3 active. Guest host/probe SHA-256 values
matched the working source exactly.

Recovered framebuffer: `artifacts/recovery-final-framebuffer.png` (visually
inspected; diagnostic UI rendered and bridge success visible). The task-created
VM is stopped. Guest writes were synced before QMP quit, then the original disk
was mounted to replay its journal and unmounted cleanly; final `e2fsck -fn`
passed and both installed file hashes still matched. Disposable VM copies and
helpers were removed; the original disk, backup, console evidence, and screenshot
remain.
