#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 RocketOS Bare-Metal ISO Builder"
echo "Target: x86_64 Laptop / PC (UEFI & BIOS Dual-Boot)"
echo "=========================================================="

WORKDIR="$(pwd)"
BUILD_DIR="$WORKDIR/build/iso-build"
ISO_DIR="$WORKDIR/build/isodir"
OUTPUT_ISO="$WORKDIR/rocket-os.iso"
PUBLIC_ISO="$WORKDIR/public/rocket-os.iso"

# 1. Clean previous build artifacts
rm -rf "$BUILD_DIR" "$ISO_DIR"
mkdir -p "$BUILD_DIR"/{bin,sbin,usr/bin,usr/sbin,etc,proc,sys,dev,tmp,root,home/ryan,rocket,demos,mnt}
mkdir -p "$ISO_DIR"/boot/grub

# 2. Compile native rsh shell
echo "[1/6] Compiling static RocketOS native shell (rsh)..."
gcc -static -O2 src/boot/rsh.c -o build/rsh
strip build/rsh
cp build/rsh "$BUILD_DIR/bin/rsh"
ln -sf /bin/rsh "$BUILD_DIR/bin/rocket"

# 3. Install BusyBox and configure symlinks
echo "[2/6] Setting up BusyBox core utilities..."
BUSYBOX_BIN="$(which busybox)"
if [ -z "$BUSYBOX_BIN" ]; then
    echo "Error: busybox not found. Please install busybox-static."
    exit 1
fi
cp "$BUSYBOX_BIN" "$BUILD_DIR/bin/busybox"
chmod +x "$BUILD_DIR/bin/busybox"

# Install symlinks for busybox tools
for tool in sh ls cat echo mkdir cp mv rm ps top free df clear dmesg grep find uname vi head tail more sync mount umount sleep stty kill chmod chown setsid cttyhack; do
    ln -sf /bin/busybox "$BUILD_DIR/bin/$tool"
done

# 4. Copy Rocket language files and demos
echo "[3/6] Populating RocketOS files and standard libraries..."
if [ -d "$WORKDIR/rocket" ]; then
    cp -r "$WORKDIR/rocket"/* "$BUILD_DIR/rocket/" 2>/dev/null || true
fi
if [ -d "$WORKDIR/demos" ]; then
    cp -r "$WORKDIR/demos"/* "$BUILD_DIR/demos/" 2>/dev/null || true
fi

# 5. Create /etc configuration and /init script (PID 1)
echo "[4/6] Generating RocketOS init subsystem (PID 1)..."

cat << 'EOF' > "$BUILD_DIR/etc/passwd"
root:x:0:0:root:/root:/bin/rsh
ryan:x:1000:1000:Ryan Eid:/home/ryan:/bin/rsh
EOF

cat << 'EOF' > "$BUILD_DIR/etc/group"
root:x:0:
ryan:x:1000:
EOF

cat << 'EOF' > "$BUILD_DIR/etc/hostname"
rocket-os
EOF

cat << 'EOF' > "$BUILD_DIR/init"
#!/bin/sh
export PATH=/bin:/sbin:/usr/bin:/usr/sbin
export HOME=/home/ryan
export USER=ryan
export TERM=linux

# 1. Mount essential pseudo-filesystems
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
mkdir -p /dev/pts /dev/shm
mount -t devpts devpts /dev/pts
mount -t tmpfs tmpfs /tmp

# 2. Configure system hostname
hostname rocket-os

# 3. Enable Linux terminal ANSI color palette and clear screen
stty sane 2>/dev/null || true

# 4. Launch RocketOS Native Shell loop with cttyhack
while true; do
    setsid cttyhack /bin/rsh
    echo "RocketOS Shell exited. Respawning in 1 second..."
    sleep 1
done
EOF
chmod +x "$BUILD_DIR/init"

# 6. Package initramfs
echo "[5/6] Packaging RocketOS initramfs..."
cd "$BUILD_DIR"
find . -print0 | cpio --null -ov --format=newc 2>/dev/null | gzip -9 > "$ISO_DIR/boot/initrd.img"
cd "$WORKDIR"

# 7. Copy Linux Kernel
VMLINUZ="$(ls -1 /boot/vmlinuz* 2>/dev/null | head -n 1)"
if [ -z "$VMLINUZ" ]; then
    echo "Error: No vmlinuz kernel found in /boot!"
    exit 1
fi
echo "Using kernel: $VMLINUZ"
cp "$VMLINUZ" "$ISO_DIR/boot/vmlinuz"

# 8. Create GRUB Configuration
cat << 'EOF' > "$ISO_DIR/boot/grub/grub.cfg"
set default="0"
set timeout=3

# Set high-resolution graphical terminal if available
if loadfont unicode ; then
    set gfxmode=auto
    set gfxpayload=keep
    insmod all_video
    insmod gfxterm
    terminal_output gfxterm
fi

menuentry "🚀 RocketOS 0.1 Alpha (Default)" {
    linux /boot/vmlinuz quiet loglevel=3 console=tty1 vga=current
    initrd /boot/initrd.img
}

menuentry "🛠️ RocketOS (Verbose / Debug Mode)" {
    linux /boot/vmlinuz debug console=tty0 console=ttyS0,115200
    initrd /boot/initrd.img
}

menuentry "🔄 Reboot Machine" {
    reboot
}

menuentry "⚡ Power Off" {
    halt
}
EOF

# 9. Generate Hybrid Bootable ISO
echo "[6/6] Generating hybrid bootable ISO with GRUB..."
grub-mkrescue -o "$OUTPUT_ISO" "$ISO_DIR" -- -volid "ROCKETOS" 2>&1 | grep -v "xorriso : NOTE :" || true

# Copy into public directory for browser download
mkdir -p "$WORKDIR/public"
cp "$OUTPUT_ISO" "$PUBLIC_ISO"

ISO_SIZE=$(du -h "$OUTPUT_ISO" | cut -f1)
echo "=========================================================="
echo "✅ SUCCESS! RocketOS bootable ISO created:"
echo "Location : $OUTPUT_ISO"
echo "Web URL  : /rocket-os.iso ($ISO_SIZE)"
echo "Target   : Flash with Rufus, Etcher, or 'dd' to USB drive"
echo "=========================================================="
