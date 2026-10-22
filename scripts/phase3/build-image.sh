#!/usr/bin/env bash
# ==============================================================================
# RocketOS Phase 3 — Graphical Session Foundation Live ISO Builder
# Builds a bootable x86-64 hybrid ISO featuring Cage + GTK4/WebKitGTK 6.0 host
# Output: rocketos-0.1-phase3-amd64.iso, .sha256, and .manifest
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

OUTPUT_DIR="${REPO_ROOT}/artifacts"
WORK_DIR="${REPO_ROOT}/image/build"
IMAGE_DIR="${REPO_ROOT}/image"
CLEAN_FIRST=false
DRY_RUN=false
TARGET_ISO_NAME="rocketos-0.1-phase3-amd64.iso"

# ------------------------------------------------------------------------------
# Argument Parsing
# ------------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --work-dir)
      WORK_DIR="$2"
      shift 2
      ;;
    --clean)
      CLEAN_FIRST=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --output-dir DIR   Directory for output ISO and manifest (default: artifacts)"
      echo "  --work-dir DIR     Temporary live-build directory (default: image/build)"
      echo "  --clean            Purge previous build tree before building"
      echo "  --dry-run          Validate host requirements & configuration without building"
      echo "  -h, --help         Show this help message"
      exit 0
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Ensure paths are absolute before changing working directory
mkdir -p "${OUTPUT_DIR}"
OUTPUT_DIR="$(cd "${OUTPUT_DIR}" && pwd)"
mkdir -p "${WORK_DIR}"
WORK_DIR="$(cd "${WORK_DIR}" && pwd)"

echo "=================================================================="
echo " RocketOS Phase 3 — Graphical Session Live ISO Builder"
echo "=================================================================="
echo "Repository Root:  ${REPO_ROOT}"
echo "Image Template:   ${IMAGE_DIR}"
echo "Working Tree:     ${WORK_DIR}"
echo "Output Directory: ${OUTPUT_DIR}"
echo "Target Suite:     trixie (Debian 13)"
echo "Architecture:     amd64 (x86_64)"
echo "Target ISO Name:  ${TARGET_ISO_NAME}"
echo "=================================================================="

# ------------------------------------------------------------------------------
# Privilege Check
# ------------------------------------------------------------------------------
if [[ "${DRY_RUN}" != "true" && "$(id -u)" -ne 0 ]]; then
  echo "ERROR: live-build requires root privileges for chroot and loop mounts." >&2
  echo "Please run with: sudo $0 $*" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Dependency Verification
# ------------------------------------------------------------------------------
MISSING_DEPS=()
for cmd in lb debootstrap xorriso mcopy mkfs.vfat mksquashfs sha256sum; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    MISSING_DEPS+=("${cmd}")
  fi
done

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
  echo "ERROR: Missing required build dependencies:" >&2
  for d in "${MISSING_DEPS[@]}"; do
    echo "  - ${d}" >&2
  done
  echo "" >&2
  echo "Install them using:" >&2
  echo "  sudo apt-get update" >&2
  echo "  sudo apt-get install -y live-build debootstrap xorriso mtools dosfstools squashfs-tools" >&2
  exit 1
fi

# Verify debootstrap legitimately supports trixie
if [[ ! -e /usr/share/debootstrap/scripts/trixie ]]; then
  echo "ERROR: debootstrap does not legitimately support suite 'trixie' (/usr/share/debootstrap/scripts/trixie not found)." >&2
  echo "RocketOS strictly requires legitimate Debian 13 Trixie support without host symlink hacks." >&2
  echo "Please install or update debootstrap to a version providing official 'trixie' support." >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Workspace Cleaning
# ------------------------------------------------------------------------------
if [[ "${CLEAN_FIRST}" == "true" && -d "${WORK_DIR}" ]]; then
  echo "Cleaning existing build directory at ${WORK_DIR}..."
  if [[ -f "${WORK_DIR}/auto/clean" || -d "${WORK_DIR}/.build" ]]; then
    (cd "${WORK_DIR}" && lb clean --purge 2>/dev/null || true)
  fi
  rm -rf "${WORK_DIR}"
fi

mkdir -p "${WORK_DIR}"
mkdir -p "${OUTPUT_DIR}"

# ------------------------------------------------------------------------------
# Populate Live-Build Tree from Declarative Configuration
# ------------------------------------------------------------------------------
echo "Preparing live-build directory structure..."

cd "${WORK_DIR}"

mkdir -p config/package-lists
mkdir -p config/includes.chroot
mkdir -p config/hooks/live
mkdir -p config/hooks/normal

# Ingest all package lists (core + graphical)
cp "${IMAGE_DIR}/packages/"*.list.chroot config/package-lists/

# Ingest includes overlay
cp -r "${IMAGE_DIR}/includes/"* config/includes.chroot/

# Ingest hooks and make executable
cp "${IMAGE_DIR}/hooks/"*.hook.chroot config/hooks/live/
cp "${IMAGE_DIR}/hooks/"*.hook.chroot config/hooks/normal/
chmod +x config/hooks/live/*.hook.chroot config/hooks/normal/*.hook.chroot 2>/dev/null || true

# Ingest bootloader overrides if present
if [[ -d "${IMAGE_DIR}/bootloaders" ]]; then
  mkdir -p config/bootloaders
  cp -r "${IMAGE_DIR}/bootloaders/"* config/bootloaders/
fi

# Validate Phase 3 capability directives in declarative service template
SERVICE_TEMPLATE="config/includes.chroot/etc/systemd/system/rocketos-graphical-session.service"
if [[ -f "${SERVICE_TEMPLATE}" ]]; then
  if ! grep -q "^CapabilityBoundingSet=$" "${SERVICE_TEMPLATE}"; then
    echo "ERROR: ${SERVICE_TEMPLATE} missing empty CapabilityBoundingSet=" >&2
    exit 1
  fi
  if ! grep -q "^AmbientCapabilities=$" "${SERVICE_TEMPLATE}"; then
    echo "ERROR: ${SERVICE_TEMPLATE} missing empty AmbientCapabilities=" >&2
    exit 1
  fi
  if grep -i "CAP_" "${SERVICE_TEMPLATE}"; then
    echo "ERROR: ${SERVICE_TEMPLATE} explicitly grants capabilities (forbidden)!" >&2
    exit 1
  fi
fi

# ------------------------------------------------------------------------------
# Run lb config
# ------------------------------------------------------------------------------
echo "Executing lb config for Debian 13 trixie amd64..."
echo "Live-build version: $(lb --version 2>&1 || echo 'unknown')"

lb config \
  --mode debian \
  --distribution trixie \
  --architectures amd64 \
  --archive-areas "main contrib non-free-firmware" \
  --parent-archive-areas "main contrib non-free-firmware" \
  --mirror-bootstrap "https://deb.debian.org/debian" \
  --mirror-chroot "https://deb.debian.org/debian" \
  --mirror-binary "https://deb.debian.org/debian" \
  --mirror-chroot-security "https://deb.debian.org/debian-security" \
  --mirror-binary-security "https://deb.debian.org/debian-security" \
  --parent-mirror-bootstrap "https://deb.debian.org/debian" \
  --parent-mirror-chroot "https://deb.debian.org/debian" \
  --parent-mirror-binary "https://deb.debian.org/debian" \
  --parent-mirror-chroot-security "https://deb.debian.org/debian-security" \
  --parent-mirror-binary-security "https://deb.debian.org/debian-security" \
  --security true \
  --updates true \
  --binary-images iso-hybrid \
  --bootloaders "syslinux,grub-efi" \
  --bootappend-live "boot=live components quiet console=ttyS0,115200 console=tty0" \
  --iso-application "RocketOS 0.1 Alpha Phase 3" \
  --iso-preparer "RocketOS Core Team" \
  --iso-publisher "RocketOS Project" \
  --iso-volume "ROCKETOS_0_1_P3" \
  --system live \
  --initsystem systemd \
  --apt-indices false \
  --memtest none \
  --win32-loader false \
  --build-with-chroot false

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "DRY RUN: Configuration prepared successfully at ${WORK_DIR}."
  exit 0
fi

# ------------------------------------------------------------------------------
# Build the ISO Image
# ------------------------------------------------------------------------------
echo "Building RocketOS Debian live graphical ISO (Phase 3)..."
START_TIME=$(date +%s)

lb build 2>&1 | tee "${OUTPUT_DIR}/build.log"

END_TIME=$(date +%s)
BUILD_DURATION=$((END_TIME - START_TIME))

# ------------------------------------------------------------------------------
# Image Filesystem & Sandbox Capability Validation
# ------------------------------------------------------------------------------
echo "Validating image filesystem sandbox prerequisites..."
if [[ -d chroot ]]; then
  if [[ ! -f chroot/usr/bin/bwrap ]]; then
    echo "ERROR: Image validation failed: /usr/bin/bwrap does not exist in built image filesystem." >&2
    exit 1
  fi
  if [[ ! -x chroot/usr/bin/bwrap ]]; then
    echo "ERROR: Image validation failed: /usr/bin/bwrap is not executable in built image filesystem." >&2
    exit 1
  fi
  SVC_CHROOT="chroot/etc/systemd/system/rocketos-graphical-session.service"
  if [[ -f "${SVC_CHROOT}" ]]; then
    if ! grep -q "^CapabilityBoundingSet=$" "${SVC_CHROOT}"; then
      echo "ERROR: Image validation failed: ${SVC_CHROOT} missing empty CapabilityBoundingSet=" >&2
      exit 1
    fi
    if ! grep -q "^AmbientCapabilities=$" "${SVC_CHROOT}"; then
      echo "ERROR: Image validation failed: ${SVC_CHROOT} missing empty AmbientCapabilities=" >&2
      exit 1
    fi
    if grep -i "CAP_" "${SVC_CHROOT}"; then
      echo "ERROR: Image validation failed: ${SVC_CHROOT} explicitly grants capabilities (forbidden)!" >&2
      exit 1
    fi
  fi
  echo "Image filesystem validation: /usr/bin/bwrap exists, is executable, and capability policy verified."
fi

# ------------------------------------------------------------------------------
# Locate Generated Binary & Package Manifest
# ------------------------------------------------------------------------------
GENERATED_ISO=""
for cand in live-image-amd64.hybrid.iso binary.hybrid.iso live-image-amd64.iso binary.iso; do
  if [[ -f "${cand}" ]]; then
    GENERATED_ISO="${cand}"
    break
  fi
done

if [[ -z "${GENERATED_ISO}" ]]; then
  cand=$(ls -1 *.iso 2>/dev/null | head -n1 || true)
  if [[ -n "${cand}" && -f "${cand}" ]]; then
    GENERATED_ISO="${cand}"
  fi
fi

if [[ -z "${GENERATED_ISO}" || ! -f "${GENERATED_ISO}" ]]; then
  echo "ERROR: Build completed but no output ISO found." >&2
  exit 1
fi

DEST_ISO="${OUTPUT_DIR}/${TARGET_ISO_NAME}"
cp "${GENERATED_ISO}" "${DEST_ISO}"

# Calculate SHA-256 Checksum
(cd "${OUTPUT_DIR}" && sha256sum "${TARGET_ISO_NAME}" > "${TARGET_ISO_NAME}.sha256")

# Extract Package Manifest
DEST_MANIFEST="${OUTPUT_DIR}/rocketos-0.1-phase3-amd64.manifest"
if [[ -f binary/live/filesystem.packages ]]; then
  cp binary/live/filesystem.packages "${DEST_MANIFEST}"
elif [[ -f chroot/var/lib/dpkg/status ]]; then
  grep -E "^(Package|Version):" chroot/var/lib/dpkg/status | paste - - | awk '{print $2 "\t" $4}' > "${DEST_MANIFEST}"
else
  cat "${IMAGE_DIR}/packages/"*.list.chroot > "${DEST_MANIFEST}"
fi

PACKAGE_COUNT=$(wc -l < "${DEST_MANIFEST}" || echo "0")
ISO_SIZE_BYTES=$(stat -c%s "${DEST_ISO}" 2>/dev/null || stat -f%z "${DEST_ISO}" 2>/dev/null || wc -c < "${DEST_ISO}")
ISO_SIZE_MB=$(awk "BEGIN {printf \"%.2f\", ${ISO_SIZE_BYTES}/1048576}")
SHA256_HASH=$(cut -d' ' -f1 "${OUTPUT_DIR}/${TARGET_ISO_NAME}.sha256")
WORK_SIZE_MB=$(du -sm "${WORK_DIR}" | awk '{print $1}')
# Restore non-root ownership if run under sudo
if [[ -n "${SUDO_UID:-}" && -n "${SUDO_GID:-}" ]]; then
  chown -R "${SUDO_UID}:${SUDO_GID}" "${OUTPUT_DIR}" 2>/dev/null || true
elif [[ -n "${SUDO_USER:-}" ]]; then
  chown -R "${SUDO_USER}:" "${OUTPUT_DIR}" 2>/dev/null || true
fi

echo "=================================================================="
echo " RocketOS Phase 3 — Image Build Complete"
echo "=================================================================="
echo "Output ISO:       ${DEST_ISO}"
echo "ISO Size:         ${ISO_SIZE_MB} MB (${ISO_SIZE_BYTES} bytes)"
echo "SHA-256:          ${SHA256_HASH}"
echo "Package Count:    ${PACKAGE_COUNT}"
echo "Manifest:         ${DEST_MANIFEST}"
echo "Build Workspace:  ${WORK_SIZE_MB} MB"
echo "Build Duration:   ${BUILD_DURATION} seconds"
echo "=================================================================="
