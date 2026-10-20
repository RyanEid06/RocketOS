#!/usr/bin/env bash
# ==============================================================================
# RocketOS Phase 2 — QEMU Headless Boot Smoke Test
# Boots rocketos-0.1-phase2-amd64.iso in QEMU and verifies the boot marker:
# ROCKETOS_PHASE2_BOOT_OK
# Supports both legacy BIOS and UEFI (OVMF) modes.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ISO_PATH=""
BOOT_MODE="bios"
TIMEOUT_SECS=180
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
      echo "  --timeout SECS     Timeout in seconds (default: 180)"
      echo "  --log-file PATH    Serial console capture file"
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
    "${REPO_ROOT}/artifacts/rocketos-0.1-phase2-amd64.iso"
    "${REPO_ROOT}/rocketos-0.1-phase2-amd64.iso"
    "${REPO_ROOT}/image/build/rocketos-0.1-phase2-amd64.iso"
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
  echo "Build it first using: scripts/phase2/build-image.sh" >&2
  exit 1
fi

if [[ -z "${LOG_FILE}" ]]; then
  LOG_DIR="${REPO_ROOT}/artifacts"
  mkdir -p "${LOG_DIR}"
  LOG_FILE="${LOG_DIR}/qemu-smoke-${BOOT_MODE}.log"
fi

mkdir -p "$(dirname "${LOG_FILE}")"
rm -f "${LOG_FILE}"
touch "${LOG_FILE}"

echo "=================================================================="
echo " RocketOS Phase 2 — QEMU Boot Smoke Test"
echo "=================================================================="
echo "Target ISO:       ${ISO_PATH}"
echo "Boot Mode:        ${BOOT_MODE^^}"
echo "Timeout:          ${TIMEOUT_SECS} seconds"
echo "Memory:           ${MEM_MB} MB"
echo "vCPUs:            ${SMP_CPUS}"
echo "Serial Log:       ${LOG_FILE}"
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
    "/usr/share/OVMF/OVMF_CODE.fd"
    "/usr/share/OVMF/OVMF_CODE_4M.fd"
    "/usr/share/ovmf/OVMF.fd"
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
  -name "RocketOS-Smoke-${BOOT_MODE}"
  -m "${MEM_MB}M"
  -smp "${SMP_CPUS}"
  "${QEMU_ACCEL_ARGS[@]}"
  -display none
  -vga none
  -no-reboot
  -cdrom "${ISO_PATH}"
  -boot d
  -serial file:"${LOG_FILE}"
)

if [[ "${BOOT_MODE}" == "uefi" && -n "${OVMF_CODE}" ]]; then
  QEMU_CMD+=(-bios "${OVMF_CODE}")
fi

echo "Launching QEMU command:"
echo "  ${QEMU_CMD[*]}"
echo ""

"${QEMU_CMD[@]}" &
QEMU_PID=$!

# Ensure QEMU process is cleaned up on exit
cleanup() {
  if kill -0 "${QEMU_PID}" 2>/dev/null; then
    kill -15 "${QEMU_PID}" 2>/dev/null || true
    sleep 1
    kill -9 "${QEMU_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# ------------------------------------------------------------------------------
# Verification Monitoring Loop
# ------------------------------------------------------------------------------
echo "Monitoring serial console output for marker: ROCKETOS_PHASE2_BOOT_OK ..."
START_TIME=$(date +%s)
FOUND_MARKER=false

while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))

  # Check if serial log contains the deterministic boot marker
  if grep -q "ROCKETOS_PHASE2_BOOT_OK" "${LOG_FILE}" 2>/dev/null; then
    FOUND_MARKER=true
    break
  fi

  # Check if QEMU exited prematurely
  if ! kill -0 "${QEMU_PID}" 2>/dev/null; then
    echo "Notice: QEMU process exited before boot marker was observed."
    break
  fi

  if [[ ${ELAPSED} -ge ${TIMEOUT_SECS} ]]; then
    echo "Timeout reached (${TIMEOUT_SECS}s)."
    break
  fi

  sleep 1
done

# ------------------------------------------------------------------------------
# Evaluate Results
# ------------------------------------------------------------------------------
echo ""
if [[ "${FOUND_MARKER}" == "true" ]]; then
  echo "=================================================================="
  echo " RESULT: PASS — RocketOS Boot Verified (${BOOT_MODE^^} Mode)"
  echo " Elapsed Time: ${ELAPSED} seconds"
  echo "=================================================================="
  echo ""
  echo "--- Captured Boot Evidence from Serial Console ---"
  grep -A 14 "ROCKETOS_PHASE2_BOOT_OK" "${LOG_FILE}" || true
  echo "--------------------------------------------------"
  echo ""
  exit 0
else
  echo "=================================================================="
  echo " RESULT: FAIL — Boot marker ROCKETOS_PHASE2_BOOT_OK not observed"
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
