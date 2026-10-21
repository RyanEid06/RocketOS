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
TIMEOUT_SECS=240
LOG_FILE=""
MEM_MB=2048
SMP_CPUS=2

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
    "${REPO_ROOT}/artifacts/rocketos-0.1-phase2-amd64.iso"
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
  LOG_FILE="${LOG_DIR}/qemu-smoke-phase3-${BOOT_MODE}.log"
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
# UEFI Firmware Verification
# ------------------------------------------------------------------------------
OVMF_CODE=""
if [[ "${BOOT_MODE}" == "uefi" ]]; then
  OVMF_CANDIDATES=(
    "/usr/share/ovmf/OVMF.fd"
    "/usr/share/OVMF/OVMF.fd"
    "/usr/share/OVMF/OVMF_CODE.fd"
    "/usr/share/OVMF/OVMF_CODE_4M.fd"
    "/usr/share/qemu/OVMF.fd"
    "/usr/share/edk2/x64/OVMF_CODE.fd"
  )
  for cand in "${OVMF_CANDIDATES[@]}"; do
    if [[ -f "${cand}" ]]; then
      OVMF_CODE="${cand}"
      break
    fi
  done

  if [[ -z "${OVMF_CODE}" ]]; then
    echo "=================================================================="
    echo "STATUS: [BLOCKED] UEFI Boot Smoke Test"
    echo "REASON: OVMF UEFI firmware image not found on host."
    echo "Install with: sudo apt-get install -y ovmf"
    echo "=================================================================="
    exit 2
  fi
  echo "UEFI Firmware:    ${OVMF_CODE}"
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
  -vga std
  -no-reboot
  -cdrom "${ISO_PATH}"
  -boot d
  -serial file:"${LOG_FILE}"
  -qmp "unix:${QMP_SOCKET},server,nowait"
)

if [[ "${BOOT_MODE}" == "uefi" && -n "${OVMF_CODE}" ]]; then
  QEMU_CMD+=(-bios "${OVMF_CODE}")
fi

echo "Launching QEMU command:"
echo "  ${QEMU_CMD[*]}"
echo ""

"${QEMU_CMD[@]}" &
QEMU_PID=$!

cleanup() {
  if kill -0 "${QEMU_PID}" 2>/dev/null; then
    kill -15 "${QEMU_PID}" 2>/dev/null || true
    sleep 1
    kill -9 "${QEMU_PID}" 2>/dev/null || true
  fi
  rm -f "${QMP_SOCKET}"
}
trap cleanup EXIT INT TERM

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
echo "  3. ROCKETOS_WP5_RECOVERY_TEST_PASS"
START_TIME=$(date +%s)
FOUND_ALL_MARKERS=false

while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))

  # Check if serial log reported an explicit boot failure
  if grep -q "ROCKETOS_BOOT_FAIL" "${LOG_FILE}" 2>/dev/null; then
    echo "ERROR: Serial log reported explicit ROCKETOS_BOOT_FAIL."
    break
  fi

  # Check for all required verification markers
  P2_OK=false
  P3_OK=false
  WP5_OK=false

  grep -q "ROCKETOS_PHASE2_BOOT_OK" "${LOG_FILE}" 2>/dev/null && P2_OK=true || true
  grep -q "ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK" "${LOG_FILE}" 2>/dev/null && P3_OK=true || true
  grep -q "ROCKETOS_WP5_RECOVERY_TEST_PASS" "${LOG_FILE}" 2>/dev/null && WP5_OK=true || true

  if [[ "${P2_OK}" == "true" && "${P3_OK}" == "true" && "${WP5_OK}" == "true" ]]; then
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

if ! grep -q "ROCKETOS_WP5_RECOVERY_TEST_PASS" "${LOG_FILE}" 2>/dev/null; then
  echo "FAIL: Crash recovery marker ROCKETOS_WP5_RECOVERY_TEST_PASS not found." >&2
  FAILURES=$((FAILURES + 1))
fi

if [[ ! -f "${SCREENDUMP_FILE}" || ! -s "${SCREENDUMP_FILE}" ]]; then
  echo "FAIL: Mandatory external framebuffer screendump (${SCREENDUMP_FILE}) was not created or is empty." >&2
  FAILURES=$((FAILURES + 1))
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
  head -n 3 "${SCREENDUMP_FILE}" 2>/dev/null | tr '\n' ' ' || true
  echo ""
  if [[ -f "${SCREENDUMP_FILE%.ppm}.png" ]]; then
    echo "PNG Converted:      ${SCREENDUMP_FILE%.ppm}.png"
  fi
  echo "------------------------------------------"
  echo ""
  echo "--- Serial Console Evidence Summary ---"
  grep -A 18 "ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK" "${LOG_FILE}" || true
  echo ""
  grep -A 11 "ROCKETOS_WP5_RECOVERY_TEST_PASS" "${LOG_FILE}" || true
  echo "---------------------------------------"
  echo ""
  exit 0
else
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
