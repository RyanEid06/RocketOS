#!/usr/bin/env bash
# ==============================================================================
# RocketOS Phase 3 — QEMU Headless Boot Smoke Test
# Boots rocketos-0.1-phase3-amd64.iso in QEMU and verifies the graphical marker:
# ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK
# Supports both legacy BIOS and UEFI (OVMF) modes.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ISO_PATH=""
BOOT_MODE="bios"
TIMEOUT_SECS=300
LOG_FILE=""
MEM_MB=2048
SMP_CPUS=2
QEMU_PID=""
OVMF_CODE=""
OVMF_VARS_TEMPLATE=""
OVMF_VARS_RUNTIME=""

# ------------------------------------------------------------------------------
# Argument Parsing
# ------------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --iso)
      ISO_PATH="$2"
      shift 2
      ;;
    --mode)
      BOOT_MODE="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECS="$2"
      shift 2
      ;;
    --log-file)
      LOG_FILE="$2"
      shift 2
      ;;
    --screendump)
      SCREENDUMP_FILE="$2"
      shift 2
      ;;
    --memory)
      MEM_MB="$2"
      shift 2
      ;;
    --smp)
      SMP_CPUS="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --iso PATH         Path to RocketOS live ISO"
      echo "  --mode bios|uefi   Boot firmware mode (default: bios)"
      echo "  --timeout SECS     Timeout in seconds (default: 240)"
      echo "  --log-file PATH    Serial console capture file"
      echo "  --screendump PATH  Target path for QEMU framebuffer screendump (.ppm)"
      echo "  --memory MB        RAM allocation in MB (default: 2048)"
      echo "  --smp CPUS         vCPU count (default: 2)"
      echo "  -h, --help         Show this help message"
      exit 0
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# ------------------------------------------------------------------------------
# Default ISO Resolution
# ------------------------------------------------------------------------------
if [[ -z "${ISO_PATH}" ]]; then
  DEFAULT_CANDIDATES=(
    "${REPO_ROOT}/artifacts/rocketos-0.1-phase3-amd64.iso"
    "${REPO_ROOT}/rocketos-0.1-phase3-amd64.iso"
    "${REPO_ROOT}/image/build/rocketos-0.1-phase3-amd64.iso"
  )
  for cand in "${DEFAULT_CANDIDATES[@]}"; do
    if [[ -f "${cand}" ]]; then
      ISO_PATH="${cand}"
      break
    fi
  done
fi

if [[ -z "${ISO_PATH}" || ! -f "${ISO_PATH}" ]]; then
  echo "ERROR: RocketOS ISO not found. Specified path: '${ISO_PATH}'" >&2
  echo "Build it first using: scripts/phase3/build-image.sh" >&2
  exit 1
fi

if [[ -z "${LOG_FILE}" ]]; then
  LOG_DIR="${REPO_ROOT}/artifacts"
  mkdir -p "${LOG_DIR}"
  LOG_FILE="${LOG_DIR}/qemu-serial-phase3-${BOOT_MODE}.log"
fi

if [[ -z "${SCREENDUMP_FILE:-}" ]]; then
  LOG_DIR="${REPO_ROOT}/artifacts"
  mkdir -p "${LOG_DIR}"
  SCREENDUMP_FILE="${LOG_DIR}/qemu-framebuffer-phase3-${BOOT_MODE}.ppm"
fi

QMP_SOCKET="/tmp/qemu-qmp-${BOOT_MODE}-$$.sock"
mkdir -p "$(dirname "${LOG_FILE}")" "$(dirname "${SCREENDUMP_FILE}")"
rm -f "${LOG_FILE}" "${SCREENDUMP_FILE}" "${QMP_SOCKET}"
touch "${LOG_FILE}"

echo "=================================================================="
echo " RocketOS Phase 3 — QEMU Graphical Boot Smoke Test"
echo "=================================================================="
echo "Target ISO:       ${ISO_PATH}"
echo "Boot Mode:        ${BOOT_MODE^^}"
echo "Timeout:          ${TIMEOUT_SECS} seconds"
echo "Memory:           ${MEM_MB} MB"
echo "vCPUs:            ${SMP_CPUS}"
echo "Serial Log:       ${LOG_FILE}"
echo "Screendump:       ${SCREENDUMP_FILE}"
echo "=================================================================="

# ------------------------------------------------------------------------------
# Verify QEMU installation
# ------------------------------------------------------------------------------
if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
  echo "ERROR: qemu-system-x86_64 not found." >&2
  echo "Install with: sudo apt-get install -y qemu-system-x86" >&2
  exit 1
fi

# Detect KVM or TCG software emulation
QEMU_ACCEL_ARGS=()
if [[ -w /dev/kvm ]]; then
  echo "Acceleration:     KVM hardware acceleration enabled"
  QEMU_ACCEL_ARGS=(-enable-kvm)
else
  echo "Acceleration:     TCG software emulation (CI/container environment)"
  QEMU_ACCEL_ARGS=(-accel tcg)
fi

# ------------------------------------------------------------------------------
# Cleanup Handler
# ------------------------------------------------------------------------------
cleanup() {
  if [[ -n "${QEMU_PID:-}" ]] && kill -0 "${QEMU_PID}" 2>/dev/null; then
    kill -15 "${QEMU_PID}" 2>/dev/null || true
    sleep 1
    kill -9 "${QEMU_PID}" 2>/dev/null || true
  fi
  rm -f "${QMP_SOCKET:-}"
  if [[ -n "${OVMF_VARS_RUNTIME:-}" && -f "${OVMF_VARS_RUNTIME}" ]]; then
    rm -f "${OVMF_VARS_RUNTIME}"
  fi
}
trap cleanup EXIT INT TERM

# ------------------------------------------------------------------------------
# UEFI Firmware Verification (Matched CODE + VARS Pair or Unified Image)
# ------------------------------------------------------------------------------
if [[ "${BOOT_MODE}" == "uefi" ]]; then
  OVMF_PAIR_CANDIDATES=(
    # Modern Debian/Ubuntu 4MB split images (Ubuntu 24.04 ovmf package default)
    "/usr/share/OVMF/OVMF_CODE_4M.fd:/usr/share/OVMF/OVMF_VARS_4M.fd"
    # Debian/Ubuntu 2MB / standard split images
    "/usr/share/OVMF/OVMF_CODE.fd:/usr/share/OVMF/OVMF_VARS.fd"
    # Modern edk2 x64 split images
    "/usr/share/edk2/x64/OVMF_CODE_4M.fd:/usr/share/edk2/x64/OVMF_VARS_4M.fd"
    "/usr/share/edk2/x64/OVMF_CODE.fd:/usr/share/edk2/x64/OVMF_VARS.fd"
    # Modern edk2-ovmf split images (Fedora / RHEL / Arch)
    "/usr/share/edk2/ovmf/OVMF_CODE_4M.fd:/usr/share/edk2/ovmf/OVMF_VARS_4M.fd"
    "/usr/share/edk2/ovmf/OVMF_CODE.fd:/usr/share/edk2/ovmf/OVMF_VARS.fd"
    "/usr/share/edk2-ovmf/x64/OVMF_CODE.fd:/usr/share/edk2-ovmf/x64/OVMF_VARS.fd"
    # Alternative QEMU share paths
    "/usr/share/qemu/OVMF_CODE_4M.fd:/usr/share/qemu/OVMF_VARS_4M.fd"
    "/usr/share/qemu/OVMF_CODE.fd:/usr/share/qemu/OVMF_VARS.fd"
  )

  for pair in "${OVMF_PAIR_CANDIDATES[@]}"; do
    code_cand="${pair%%:*}"
    vars_cand="${pair##*:}"
    if [[ -f "${code_cand}" && -f "${vars_cand}" ]]; then
      OVMF_CODE="${code_cand}"
      OVMF_VARS_TEMPLATE="${vars_cand}"
      break
    fi
  done

  if [[ -n "${OVMF_CODE}" && -n "${OVMF_VARS_TEMPLATE}" ]]; then
    # Create writable temporary copy of the matching VARS template
    OVMF_VARS_RUNTIME="/tmp/rocketos-ovmf-vars-${BOOT_MODE}-$$.fd"
    cp -f "${OVMF_VARS_TEMPLATE}" "${OVMF_VARS_RUNTIME}"
    chmod 600 "${OVMF_VARS_RUNTIME}"

    echo "UEFI CODE Firmware: ${OVMF_CODE} (read-only pflash)"
    echo "UEFI VARS Template: ${OVMF_VARS_TEMPLATE}"
    echo "UEFI VARS Runtime:  ${OVMF_VARS_RUNTIME} (writable copy)"
  else
    # Fallback to unified single-file OVMF images (compatible with -bios)
    UNIFIED_CANDIDATES=(
      "/usr/share/ovmf/OVMF.fd"
      "/usr/share/OVMF/OVMF.fd"
      "/usr/share/qemu/OVMF.fd"
    )
    for cand in "${UNIFIED_CANDIDATES[@]}"; do
      if [[ -f "${cand}" ]]; then
        OVMF_CODE="${cand}"
        break
      fi
    done

    if [[ -z "${OVMF_CODE}" ]]; then
      echo "==================================================================" >&2
      echo "STATUS: [BLOCKED] UEFI Boot Smoke Test" >&2
      echo "REASON: Matched OVMF UEFI firmware CODE/VARS pair or unified image not found on host." >&2
      echo "Checked candidate pairs:" >&2
      for pair in "${OVMF_PAIR_CANDIDATES[@]}"; do
        echo "  - ${pair%%:*} + ${pair##*:}" >&2
      done
      echo "Install with: sudo apt-get install -y ovmf" >&2
      echo "==================================================================" >&2
      exit 2
    fi

    echo "UEFI Unified Firmware: ${OVMF_CODE} (-bios)"
  fi
fi

# ------------------------------------------------------------------------------
# Launch QEMU in Background
# ------------------------------------------------------------------------------
QEMU_CMD=(
  qemu-system-x86_64
  -name "RocketOS-Smoke-Phase3-${BOOT_MODE}"
  -m "${MEM_MB}M"
  -smp "${SMP_CPUS}"
  "${QEMU_ACCEL_ARGS[@]}"
  -display none
  -vga virtio
  -nic none
  -no-reboot
  -cdrom "${ISO_PATH}"
  -boot d
  -serial file:"${LOG_FILE}"
  -qmp "unix:${QMP_SOCKET},server,nowait"
)

if [[ "${BOOT_MODE}" == "uefi" ]]; then
  if [[ -n "${OVMF_VARS_RUNTIME:-}" ]]; then
    QEMU_CMD+=(
      -drive "if=pflash,format=raw,readonly=on,file=${OVMF_CODE}"
      -drive "if=pflash,format=raw,file=${OVMF_VARS_RUNTIME}"
    )
  else
    QEMU_CMD+=(-bios "${OVMF_CODE}")
  fi
fi

echo "Launching QEMU command:"
echo "  ${QEMU_CMD[*]}"
echo ""

"${QEMU_CMD[@]}" &
QEMU_PID=$!

# ------------------------------------------------------------------------------
# Screendump Helper Function
# ------------------------------------------------------------------------------
capture_screendump() {
  if [[ -S "${QMP_SOCKET}" ]] && kill -0 "${QEMU_PID}" 2>/dev/null; then
    echo "Capturing external QEMU framebuffer evidence via QMP screendump to ${SCREENDUMP_FILE}..."
    python3 - <<PYEOF || true
import socket, json, time, os, sys
sock_path = "${QMP_SOCKET}"
out_path = "${SCREENDUMP_FILE}"
if os.path.exists(sock_path):
    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(15)
        s.connect(sock_path)
        data = b""
        while b"\r\n" not in data and b"\n" not in data:
            chunk = s.recv(1024)
            if not chunk: break
            data += chunk
        s.sendall(json.dumps({"execute": "qmp_capabilities"}).encode() + b"\n")
        data = b""
        while b"\r\n" not in data and b"\n" not in data:
            chunk = s.recv(1024)
            if not chunk: break
            data += chunk
        s.sendall(json.dumps({"execute": "screendump", "arguments": {"filename": out_path}}).encode() + b"\n")
        data = b""
        while b"\r\n" not in data and b"\n" not in data:
            chunk = s.recv(1024)
            if not chunk: break
            data += chunk
        s.close()
    except Exception as e:
        print(f"Notice: QMP screendump attempt returned: {e}", file=sys.stderr)
PYEOF

    # If netpbm pnmtopng is available, convert PPM to standard PNG
    if command -v pnmtopng >/dev/null 2>&1 && [[ -f "${SCREENDUMP_FILE}" && -s "${SCREENDUMP_FILE}" ]]; then
      pnmtopng "${SCREENDUMP_FILE}" > "${SCREENDUMP_FILE%.ppm}.png" 2>/dev/null || true
    fi
  fi
}

# ------------------------------------------------------------------------------
# Verification Monitoring Loop
# ------------------------------------------------------------------------------
echo "Monitoring serial console output for markers:"
echo "  1. ROCKETOS_PHASE2_BOOT_OK"
echo "  2. ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK"
echo "  3. UI_LOADED_MARKER: verified"
echo "  4. BRIDGE_PING_MARKER: verified"
echo "  5. ROCKETOS_WP5_RECOVERY_TEST_PASS"
START_TIME=$(date +%s)
FOUND_ALL_MARKERS=false

while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))

  # Check if serial log reported an explicit boot failure
  if grep -q "ROCKETOS_BOOT_FAIL" "${LOG_FILE}" 2>/dev/null; then
    echo "ERROR: Serial log reported explicit ROCKETOS_BOOT_FAIL."
    grep "ROCKETOS_PHASE3_FAIL:" "${LOG_FILE}" 2>/dev/null || true
    break
  fi

  # Check for all required verification markers
  P2_OK=false
  P3_OK=false
  UI_OK=false
  PING_OK=false
  WP5_OK=false

  grep -q "ROCKETOS_PHASE2_BOOT_OK" "${LOG_FILE}" 2>/dev/null && P2_OK=true || true
  grep -q "ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK" "${LOG_FILE}" 2>/dev/null && P3_OK=true || true
  grep -q "UI_LOADED_MARKER: verified" "${LOG_FILE}" 2>/dev/null && UI_OK=true || true
  grep -q "BRIDGE_PING_MARKER: verified" "${LOG_FILE}" 2>/dev/null && PING_OK=true || true
  grep -q "ROCKETOS_WP5_RECOVERY_TEST_PASS" "${LOG_FILE}" 2>/dev/null && WP5_OK=true || true

  if [[ "${P2_OK}" == "true" && "${P3_OK}" == "true" && "${UI_OK}" == "true" && "${PING_OK}" == "true" && "${WP5_OK}" == "true" ]]; then
    FOUND_ALL_MARKERS=true
    break
  fi

  # Check if QEMU exited prematurely
  if ! kill -0 "${QEMU_PID}" 2>/dev/null; then
    echo "Notice: QEMU process exited before all boot markers were observed."
    break
  fi

  if [[ ${ELAPSED} -ge ${TIMEOUT_SECS} ]]; then
    echo "Timeout reached (${TIMEOUT_SECS}s)."
    break
  fi

  sleep 1
done

# Always attempt screendump before killing QEMU (captures screen on both success and failure)
capture_screendump

# ------------------------------------------------------------------------------
# Evaluate Results with Strict Failure Semantics
# ------------------------------------------------------------------------------
echo ""
FAILURES=0

if ! grep -q "ROCKETOS_PHASE2_BOOT_OK" "${LOG_FILE}" 2>/dev/null; then
  echo "FAIL: Base systemd marker ROCKETOS_PHASE2_BOOT_OK not found (Phase 2 regression)." >&2
  FAILURES=$((FAILURES + 1))
fi

if ! grep -q "ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK" "${LOG_FILE}" 2>/dev/null; then
  echo "FAIL: Graphical marker ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK not found." >&2
  FAILURES=$((FAILURES + 1))
fi

if ! grep -q "UI_LOADED_MARKER: verified" "${LOG_FILE}" 2>/dev/null; then
  echo "FAIL: Diagnostic UI loaded runtime marker not verified in serial output." >&2
  FAILURES=$((FAILURES + 1))
fi

if ! grep -q "BRIDGE_PING_MARKER: verified" "${LOG_FILE}" 2>/dev/null; then
  echo "FAIL: Native bridge ping runtime marker not verified in serial output." >&2
  FAILURES=$((FAILURES + 1))
fi

if ! grep -q "ROCKETOS_WP5_RECOVERY_TEST_PASS" "${LOG_FILE}" 2>/dev/null; then
  echo "FAIL: Crash recovery marker ROCKETOS_WP5_RECOVERY_TEST_PASS not found." >&2
  FAILURES=$((FAILURES + 1))
fi

# Framebuffer validation
PPM_VALID=false
PPM_WIDTH=0
PPM_HEIGHT=0
if [[ ! -f "${SCREENDUMP_FILE}" || ! -s "${SCREENDUMP_FILE}" ]]; then
  echo "FAIL: Mandatory external framebuffer screendump (${SCREENDUMP_FILE}) was not created or is empty." >&2
  FAILURES=$((FAILURES + 1))
else
  # Validate PPM structure and dimensions
  PPM_CHECK="$(python3 - <<PYEOF || echo "PARSE_ERROR"
import sys
try:
    with open("${SCREENDUMP_FILE}", "rb") as f:
        tokens = []
        while len(tokens) < 4:
            line = f.readline()
            if not line: break
            line = line.strip()
            if not line or line.startswith(b'#'): continue
            tokens.extend(line.split())
        magic, w, h, maxval = tokens[0], int(tokens[1]), int(tokens[2]), int(tokens[3])
        if magic in (b'P6', b'P3') and w >= 640 and h >= 480 and maxval == 255:
            print(f"OK {w} {h}")
        else:
            print(f"INVALID_HEADER magic={magic} w={w} h={h} maxval={maxval}")
except Exception as e:
    print(f"ERROR: {e}")
PYEOF
  )"
  if [[ "${PPM_CHECK}" =~ ^OK[[:space:]]+([0-9]+)[[:space:]]+([0-9]+) ]]; then
    PPM_VALID=true
    PPM_WIDTH="${BASH_REMATCH[1]}"
    PPM_HEIGHT="${BASH_REMATCH[2]}"
  else
    echo "FAIL: Framebuffer screendump is not a valid PPM image (details: ${PPM_CHECK})." >&2
    FAILURES=$((FAILURES + 1))
  fi

  # Validate PNG conversion if netpbm pnmtopng tool was present
  if command -v pnmtopng >/dev/null 2>&1; then
    if [[ ! -f "${SCREENDUMP_FILE%.ppm}.png" || ! -s "${SCREENDUMP_FILE%.ppm}.png" ]]; then
      echo "FAIL: Conversion from PPM to PNG failed despite pnmtopng being available." >&2
      FAILURES=$((FAILURES + 1))
    fi
  fi
fi

if [[ ${FAILURES} -eq 0 && "${FOUND_ALL_MARKERS}" == "true" ]]; then
  FB_SIZE="$(wc -c < "${SCREENDUMP_FILE}")"
  echo "=================================================================="
  echo " RESULT: PASS — RocketOS Phase 3 Graphical & WP5 Verification (${BOOT_MODE^^} Mode)"
  echo " Elapsed Time: ${ELAPSED} seconds"
  echo "=================================================================="
  echo ""
  echo "--- External QEMU Framebuffer Evidence ---"
  echo "Framebuffer Image:  ${SCREENDUMP_FILE}"
  echo "Framebuffer Size:   ${FB_SIZE} bytes"
  echo "PPM Dimensions:     ${PPM_WIDTH}x${PPM_HEIGHT} (valid PPM)"
  if [[ -f "${SCREENDUMP_FILE%.ppm}.png" ]]; then
    echo "PNG Converted:      ${SCREENDUMP_FILE%.ppm}.png"
  fi
  echo ""
  echo "FRAMEBUFFER EVIDENCE CLASSIFICATION:"
  echo "- Framebuffer Capture: PRESENT (display buffer initialized and written to by KMS/Cage)"
  echo "- Visual Correctness:  REQUIRES_HUMAN_INSPECTION_OR_VISUAL_DIFF"
  echo "  (Note: Framebuffer capture proves physical scanout initialization; visual design contract"
  echo "   compliance requires visual diff or human review, not purely non-empty buffer checks.)"
  echo "------------------------------------------"
  echo ""
  SESSION_LOG="${LOG_DIR}/qemu-session-phase3-${BOOT_MODE}.log"
  RECOVERY_LOG="${LOG_DIR}/qemu-recovery-phase3-${BOOT_MODE}.log"

  # Extract structured session block
  awk '/==================================================/,/==================================================/' "${LOG_FILE}" | grep -B 2 -A 40 "ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK" > "${SESSION_LOG}" 2>/dev/null || true
  # Extract structured recovery block
  awk '/==================================================/,/==================================================/' "${LOG_FILE}" | grep -B 2 -A 35 "ROCKETOS_WP5_RECOVERY_TEST_PASS" > "${RECOVERY_LOG}" 2>/dev/null || true

  echo "--- Session Evidence Log (${SESSION_LOG}) ---"
  cat "${SESSION_LOG}" 2>/dev/null || grep -A 30 "ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK" "${LOG_FILE}" || true
  echo ""
  echo "--- Recovery Evidence Log (${RECOVERY_LOG}) ---"
  cat "${RECOVERY_LOG}" 2>/dev/null || grep -A 30 "ROCKETOS_WP5_RECOVERY_TEST_PASS" "${LOG_FILE}" || true
  echo "---------------------------------------"
  echo ""
  exit 0
else
  SESSION_LOG="${LOG_DIR}/qemu-session-phase3-${BOOT_MODE}.log"
  RECOVERY_LOG="${LOG_DIR}/qemu-recovery-phase3-${BOOT_MODE}.log"
  awk '/==================================================/,/==================================================/' "${LOG_FILE}" | grep -B 2 -A 40 "ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK" > "${SESSION_LOG}" 2>/dev/null || true
  awk '/==================================================/,/==================================================/' "${LOG_FILE}" | grep -B 2 -A 35 "ROCKETOS_WP5_RECOVERY_TEST_PASS" > "${RECOVERY_LOG}" 2>/dev/null || true

  echo "=================================================================="
  echo " RESULT: FAIL — Verification requirements not satisfied (${FAILURES} failures)"
  echo " Boot Mode:    ${BOOT_MODE^^}"
  echo " Elapsed Time: ${ELAPSED} seconds"
  echo "=================================================================="
  echo ""
  echo "--- Last 50 Lines of Serial Log (${LOG_FILE}) ---"
  tail -n 50 "${LOG_FILE}" || echo "(empty log)"
  echo "--------------------------------------------------"
  echo ""
  exit 1
fi
