#!/bin/bash
# scripts/test-qemu.sh
# Test RocketOS bootable ISO in QEMU (virtual laptop test)

WORKDIR="$(pwd)"
ISO_PATH="$WORKDIR/rocket-os.iso"

if [ ! -f "$ISO_PATH" ]; then
    echo "Error: $ISO_PATH does not exist. Please run ./scripts/build-bootable-iso.sh first."
    exit 1
fi

echo "=========================================================="
echo "🚀 Booting RocketOS in QEMU (Virtual Machine Test)"
echo "Memory : 1024 MB"
echo "Image  : $ISO_PATH"
echo "Press Ctrl+A then X to exit QEMU if running headless"
echo "=========================================================="

# Check if KVM is available
KVM_FLAG=""
if [ -e /dev/kvm ] && [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
    KVM_FLAG="-enable-kvm"
fi

qemu-system-x86_64 \
    $KVM_FLAG \
    -m 1024M \
    -smp 2 \
    -cdrom "$ISO_PATH" \
    -boot d \
    -vga std \
    -name "RocketOS 0.1 Alpha"
