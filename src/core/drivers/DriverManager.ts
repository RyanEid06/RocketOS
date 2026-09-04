// DriverManager.ts
// Real Driver Subsystem & Hardware Layer for RocketOS

export interface NetworkInterface {
  id: string;
  name: string;
  type: 'wifi' | 'ethernet' | 'loopback';
  mac: string;
  ip: string;
  subnet: string;
  gateway: string;
  dns: string[];
  status: 'UP' | 'DOWN';
  speedMbps: number;
  duplex: 'full' | 'half';
  driver: string;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  signalStrength: number; // 0 to 100%
  bars: number; // 1 to 4
  frequencyGhz: number; // 2.4 or 5.0
  security: 'WPA3-SAE' | 'WPA2-PSK' | 'Open';
  channel: number;
  isConnected: boolean;
}

export interface DriverInfo {
  id: string;
  name: string;
  subsystem: 'display' | 'audio' | 'network' | 'storage' | 'input' | 'power';
  version: string;
  status: 'LOADED' | 'INITIALIZING' | 'STANDBY';
  vendor: string;
  devicePath: string;
  features: string[];
}

export class DriverManager {
  private static instance: DriverManager | null = null;

  private wifiEnabled: boolean = true;
  private activeSsid: string = 'HomeNet-5G';
  private subscribers: Set<() => void> = new Set();

  private interfaces: NetworkInterface[] = [
    {
      id: 'eth0',
      name: 'Gigabit Ethernet',
      type: 'ethernet',
      mac: '52:54:00:12:34:56',
      ip: '192.168.1.150',
      subnet: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: ['1.1.1.1', '8.8.8.8'],
      status: 'UP',
      speedMbps: 1000,
      duplex: 'full',
      driver: 'virtio-net-pci',
    },
    {
      id: 'wlan0',
      name: 'Intel Dual Band Wi-Fi 6 AX200',
      type: 'wifi',
      mac: '00:1A:2B:3C:4D:5E',
      ip: '192.168.1.151',
      subnet: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: ['1.1.1.1', '1.0.0.1'],
      status: 'UP',
      speedMbps: 866,
      duplex: 'full',
      driver: 'iwlwifi',
    },
    {
      id: 'lo',
      name: 'Local Loopback',
      type: 'loopback',
      mac: '00:00:00:00:00:00',
      ip: '127.0.0.1',
      subnet: '255.0.0.0',
      gateway: '0.0.0.0',
      dns: ['127.0.0.53'],
      status: 'UP',
      speedMbps: 10000,
      duplex: 'full',
      driver: 'loopback_vfs',
    },
  ];

  private availableWifiNetworks: WifiNetwork[] = [
    {
      ssid: 'HomeNet-5G',
      bssid: 'c4:ad:34:11:22:33',
      signalStrength: 92,
      bars: 4,
      frequencyGhz: 5.0,
      security: 'WPA3-SAE',
      channel: 36,
      isConnected: true,
    },
    {
      ssid: 'Rocket_Lab_Secure',
      bssid: 'a0:04:60:88:99:aa',
      signalStrength: 78,
      bars: 3,
      frequencyGhz: 5.0,
      security: 'WPA2-PSK',
      channel: 44,
      isConnected: false,
    },
    {
      ssid: 'Starlink_Orbit_Guest',
      bssid: '70:54:d2:44:55:66',
      signalStrength: 64,
      bars: 3,
      frequencyGhz: 2.4,
      security: 'WPA2-PSK',
      channel: 6,
      isConnected: false,
    },
    {
      ssid: 'CoffeeHouse_Free_WiFi',
      bssid: 'e8:9f:80:12:34:78',
      signalStrength: 45,
      bars: 2,
      frequencyGhz: 2.4,
      security: 'Open',
      channel: 11,
      isConnected: false,
    },
  ];

  private drivers: DriverInfo[] = [
    {
      id: 'drv-display',
      name: 'Intel Iris Xe / virtio-gpu DRM Driver',
      subsystem: 'display',
      version: '6.8.0-rocket',
      status: 'LOADED',
      vendor: 'Intel Corporation / VirtIO',
      devicePath: '/dev/dri/card0',
      features: ['Direct Rendering Manager (DRM)', 'KMS 60Hz', 'WebGL 2.0 Acceleration', 'Double Buffer VSync'],
    },
    {
      id: 'drv-audio',
      name: 'Intel HD Audio / Realtek ALSA Driver',
      subsystem: 'audio',
      version: '2.1.0-alsa',
      status: 'LOADED',
      vendor: 'Realtek / Linux ALSA Core',
      devicePath: '/dev/snd/pcmC0D0p',
      features: ['48000 Hz Stereo PCM', 'WebAudio Low Latency Engine', 'Master Hardware Mixer', 'Sound Synthesis'],
    },
    {
      id: 'drv-storage',
      name: 'NVMe Standard Express Controller',
      subsystem: 'storage',
      version: '1.4.2-kernel',
      status: 'LOADED',
      vendor: 'NVM Express Workgroup',
      devicePath: '/dev/nvme0n1',
      features: ['IndexedDB Block Persistence', 'TRIM Command Support', '4KB Sector Alignment', 'Crash Safe Journal'],
    },
    {
      id: 'drv-net-wifi',
      name: 'Intel Wi-Fi 6 AX200 Wireless Subsystem',
      subsystem: 'network',
      version: 'iwlwifi-2026.04',
      status: 'LOADED',
      vendor: 'Intel Wireless Core',
      devicePath: '/dev/net/wlan0',
      features: ['802.11ax Dual-Band', 'WPA3-SAE Hardware Cryptography', 'Fast BSS Transition', 'Power Save Polling'],
    },
    {
      id: 'drv-input',
      name: 'Generic Evdev Event Interface',
      subsystem: 'input',
      version: 'evdev-1.3',
      status: 'LOADED',
      vendor: 'Linux Input Subsystem',
      devicePath: '/dev/input/event0',
      features: ['Pointer Event Emulation', 'Multi-touch Gestures', 'Keyboard Scancode Translation', 'Smooth Wheel Scrolling'],
    },
    {
      id: 'drv-power',
      name: 'ACPI 6.4 Power & Battery Subsystem',
      subsystem: 'power',
      version: 'acpi-6.4',
      status: 'LOADED',
      vendor: 'Advanced Configuration & Power Interface',
      devicePath: '/sys/class/power_supply/BAT0',
      features: ['Real Battery Gauge API', 'C-State Sleep Idle', 'Thermal Zone Throttling', 'Dynamic Frequency Scaling'],
    },
  ];

  private constructor() {
    // Listen for browser online/offline events to mirror real connectivity
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateOnlineState(true);
      });
      window.addEventListener('offline', () => {
        this.updateOnlineState(false);
      });
    }
  }

  public static getInstance(): DriverManager {
    if (!this.instance) {
      this.instance = new DriverManager();
    }
    return this.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[DriverManager] subscriber error:', err);
      }
    });
  }

  private updateOnlineState(online: boolean): void {
    const wlan = this.interfaces.find((i) => i.id === 'wlan0');
    if (wlan) {
      wlan.status = online && this.wifiEnabled ? 'UP' : 'DOWN';
    }
    this.notify();
  }

  public getInterfaces(): NetworkInterface[] {
    return [...this.interfaces];
  }

  public getWifiNetworks(): WifiNetwork[] {
    return [...this.availableWifiNetworks];
  }

  public isWifiEnabled(): boolean {
    return this.wifiEnabled;
  }

  public setWifiEnabled(enabled: boolean): void {
    this.wifiEnabled = enabled;
    const wlan = this.interfaces.find((i) => i.id === 'wlan0');
    if (wlan) {
      wlan.status = enabled ? 'UP' : 'DOWN';
    }
    if (!enabled) {
      this.availableWifiNetworks = this.availableWifiNetworks.map((n) => ({
        ...n,
        isConnected: false,
      }));
    } else {
      this.availableWifiNetworks = this.availableWifiNetworks.map((n) => ({
        ...n,
        isConnected: n.ssid === this.activeSsid,
      }));
    }
    this.notify();
  }

  public connectToWifi(ssid: string): boolean {
    if (!this.wifiEnabled) return false;
    this.activeSsid = ssid;
    this.availableWifiNetworks = this.availableWifiNetworks.map((n) => ({
      ...n,
      isConnected: n.ssid === ssid,
    }));
    const wlan = this.interfaces.find((i) => i.id === 'wlan0');
    if (wlan) {
      wlan.status = 'UP';
    }
    this.notify();
    return true;
  }

  public disconnectWifi(): void {
    this.activeSsid = '';
    this.availableWifiNetworks = this.availableWifiNetworks.map((n) => ({
      ...n,
      isConnected: false,
    }));
    const wlan = this.interfaces.find((i) => i.id === 'wlan0');
    if (wlan) {
      wlan.status = 'DOWN';
    }
    this.notify();
  }

  public getActiveSsid(): string {
    return this.activeSsid;
  }

  public getDrivers(): DriverInfo[] {
    return [...this.drivers];
  }

  public getHostHardwareInfo(): {
    cpuCores: number;
    ramGb: number;
    platform: string;
    isOnline: boolean;
  } {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
    const ramGb = typeof navigator !== 'undefined' && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : 8;
    const platform = typeof navigator !== 'undefined' ? navigator.platform || 'x86_64' : 'x86_64';

    return { cpuCores, ramGb, platform, isOnline };
  }
}
