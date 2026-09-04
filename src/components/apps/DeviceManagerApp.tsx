import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Monitor,
  Wifi,
  Bluetooth,
  HardDrive,
  Volume2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  ChevronDown,
  ChevronRight,
  Info,
  Check,
  AlertTriangle,
  Download,
  Terminal,
  Folder,
  Layers,
  X,
  Power,
} from 'lucide-react';
import { DriverManager, HardwareDevice, DriverInfo } from '../../core/drivers/DriverManager';
import { soundEngine } from '../../utils/audio';

export const DeviceManagerApp: React.FC = () => {
  const driverMgr = DriverManager.getInstance();
  const [devices, setDevices] = useState<HardwareDevice[]>(driverMgr.getHardwareDevices());
  const [drivers, setDrivers] = useState<DriverInfo[]>(driverMgr.getDrivers());
  const [selectedDevice, setSelectedDevice] = useState<HardwareDevice | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState<boolean>(false);
  const [propertiesTab, setPropertiesTab] = useState<'general' | 'driver' | 'resources'>('general');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Update Driver Wizard
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<'select' | 'installing' | 'finished'>('select');
  const [selectedDriverPackage, setSelectedDriverPackage] = useState<string>('cloud');

  // Diagnostics Modal
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);

  // Expanded Categories in Tree
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    processor: true,
    display: true,
    network: true,
    bluetooth: true,
    audio: true,
    storage: true,
    system: false,
  });

  useEffect(() => {
    const unsub = driverMgr.subscribe(() => {
      setDevices(driverMgr.getHardwareDevices());
      setDrivers(driverMgr.getDrivers());
    });
    return unsub;
  }, []);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
    soundEngine.playClick();
  };

  const handleScanHardware = async () => {
    setIsScanning(true);
    soundEngine.playOpen();
    await new Promise((r) => setTimeout(r, 800));
    setDevices(driverMgr.getHardwareDevices());
    setIsScanning(false);
    soundEngine.playSuccess();
  };

  const handleToggleDeviceStatus = (dev: HardwareDevice) => {
    const next = dev.status === 'OK' ? false : true;
    driverMgr.toggleDeviceEnabled(dev.id, next);
    soundEngine.playClick();
  };

  const handleOpenProperties = (dev: HardwareDevice) => {
    setSelectedDevice(dev);
    setPropertiesTab('general');
    setPropertiesOpen(true);
    soundEngine.playClick();
  };

  const handleStartUpdateDriver = (dev: HardwareDevice) => {
    setSelectedDevice(dev);
    setWizardStep('select');
    setWizardOpen(true);
    soundEngine.playClick();
  };

  const handleExecuteDriverInstall = async () => {
    if (!selectedDevice) return;
    setWizardStep('installing');
    soundEngine.playOpen();
    await new Promise((r) => setTimeout(r, 1400));

    const updatedVersion = `${selectedDevice.driverVersion}.1-upgraded`;
    driverMgr.updateDeviceDriver(
      selectedDevice.id,
      updatedVersion,
      'RHQL Cloud Verified Driver Service'
    );
    setWizardStep('finished');
    soundEngine.playSuccess();
  };

  const handleRunDiagnostics = async () => {
    setDiagnosticsOpen(true);
    setIsRunningDiagnostics(true);
    setDiagnosticLogs(['Initiating Host Hardware Self-Test (POST Diagnostics)...']);
    soundEngine.playOpen();

    const res = await driverMgr.runHardwareDiagnostics();
    setDiagnosticLogs(res.details);
    setIsRunningDiagnostics(false);
    soundEngine.playSuccess();
  };

  const PREMADE_CLOUD_DRIVERS = [
    {
      id: 'drv-intel-ax211',
      target: 'Intel Wi-Fi 6E AX211 Adapter',
      version: '23.50.0.1 (Latest)',
      provider: 'Intel RHQL Verified',
      size: '14.2 MB',
    },
    {
      id: 'drv-nv-555',
      target: 'NVIDIA GeForce RTX 4090 / Mesa Vulkan 3D',
      version: '555.85 GameReady (WHQL)',
      provider: 'NVIDIA Driver Engine',
      size: '64.8 MB',
    },
    {
      id: 'drv-realtek-alc',
      target: 'Realtek ALC897 HD Audio Codec',
      version: '6.0.9670.1 Low Latency',
      provider: 'Realtek Semiconductor',
      size: '8.4 MB',
    },
    {
      id: 'drv-rocket-accel',
      target: 'RocketOS LLVM Kernel Hardware Accelerator',
      version: '2.1.6-ABIv1 Native',
      provider: 'RocketOS Core Team',
      size: '3.1 MB',
    },
  ];

  const categories = [
    { id: 'processor', label: 'Processors', icon: <Cpu className="w-4 h-4 text-sky-400" /> },
    { id: 'display', label: 'Display Adapters', icon: <Monitor className="w-4 h-4 text-emerald-400" /> },
    { id: 'network', label: 'Network Adapters', icon: <Wifi className="w-4 h-4 text-blue-400" /> },
    { id: 'bluetooth', label: 'Bluetooth Radios', icon: <Bluetooth className="w-4 h-4 text-indigo-400" /> },
    { id: 'audio', label: 'Sound, Video and Game Controllers', icon: <Volume2 className="w-4 h-4 text-violet-400" /> },
    { id: 'storage', label: 'Storage Controllers & NVMe Drives', icon: <HardDrive className="w-4 h-4 text-amber-400" /> },
    { id: 'system', label: 'System Devices & ACPI Infrastructure', icon: <Layers className="w-4 h-4 text-rose-400" /> },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-14 px-5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Device Manager & Driver Hub
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20">
                ACPI 6.4 / PCIe 4.0
              </span>
            </h2>
            <span className="text-[11px] text-slate-400">
              Host: RocketOS Hardware Abstraction Layer (HAL v2.1)
            </span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunDiagnostics}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>Hardware Self-Test</span>
          </button>

          <button
            onClick={handleScanHardware}
            disabled={isScanning}
            className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Bus...' : 'Scan for Hardware Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Device Tree View */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
          {/* Host Computer Root Item */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">ROCKET-WORKSTATION-X64</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  ACPI x64-based PC • Unified Memory 32 GB • BIOS v2.10
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> All Subsystems Nominal
            </span>
          </div>

          {/* Categories Tree */}
          <div className="space-y-2">
            {categories.map((cat) => {
              const catDevices = devices.filter((d) => d.category === cat.id);
              const isExpanded = !!expandedCategories[cat.id];

              return (
                <div key={cat.id} className="rounded-2xl border border-white/5 bg-slate-900/30 overflow-hidden">
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategory(cat.id)}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <button className="text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      {cat.icon}
                      <span className="text-xs font-semibold text-slate-200">{cat.label}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {catDevices.length} item{catDevices.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Category Children Devices */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/20 divide-y divide-white/5">
                      {catDevices.map((dev) => (
                        <div
                          key={dev.id}
                          className="px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                dev.status === 'OK'
                                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <div>
                              <div className="text-xs font-medium text-white flex items-center gap-2">
                                <span>{dev.name}</span>
                                {dev.temperatureC !== undefined && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 font-mono text-amber-300">
                                    {dev.temperatureC}°C
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Driver: {dev.driverVersion} ({dev.driverDate}) • IRQ {dev.irq}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartUpdateDriver(dev)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                            >
                              Update Driver
                            </button>
                            <button
                              onClick={() => handleToggleDeviceStatus(dev)}
                              className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
                                dev.status === 'OK'
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {dev.status === 'OK' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleOpenProperties(dev)}
                              className="px-2.5 py-1 rounded-lg bg-violet-600/80 hover:bg-violet-500 text-white text-xs font-medium cursor-pointer transition-colors shadow-sm"
                            >
                              Properties
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Device Properties Dialog */}
      {propertiesOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none text-xs">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">{selectedDevice.name}</h3>
                <span className="text-[11px] text-slate-400">Hardware Component Properties</span>
              </div>
              <button
                onClick={() => setPropertiesOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dialog Tabs */}
            <div className="flex items-center gap-1 border-b border-white/10 pb-2">
              <button
                onClick={() => setPropertiesTab('general')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  propertiesTab === 'general' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setPropertiesTab('driver')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  propertiesTab === 'driver' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Driver
              </button>
              <button
                onClick={() => setPropertiesTab('resources')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  propertiesTab === 'resources' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Resources
              </button>
            </div>

            {/* General Tab */}
            {propertiesTab === 'general' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Type:</span>
                    <span className="capitalize text-slate-200">{selectedDevice.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Manufacturer:</span>
                    <span className="text-slate-200">{selectedDevice.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Path:</span>
                    <span className="font-mono text-sky-400">{selectedDevice.devicePath}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hardware ID:</span>
                    <span className="font-mono text-slate-300 text-[11px]">{selectedDevice.hardwareId}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Device Status
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    This device is working properly without IRQ resource conflicts or memory allocation errors.
                  </p>
                </div>
              </div>
            )}

            {/* Driver Tab */}
            {propertiesTab === 'driver' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver Provider:</span>
                    <span className="text-slate-200">{selectedDevice.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver Date:</span>
                    <span className="font-mono text-slate-200">{selectedDevice.driverDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver Version:</span>
                    <span className="font-mono text-violet-400 font-semibold">{selectedDevice.driverVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Digital Signer:</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {selectedDevice.driverSigner}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setPropertiesOpen(false);
                      handleStartUpdateDriver(selectedDevice);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer shadow-md transition-colors"
                  >
                    Update Driver...
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playSuccess();
                      alert('Driver is already at the most stable baseline release.');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer transition-colors"
                  >
                    Roll Back Driver
                  </button>
                </div>
              </div>
            )}

            {/* Resources Tab */}
            {propertiesTab === 'resources' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interrupt Request (IRQ):</span>
                    <span className="font-mono text-amber-400">IRQ {selectedDevice.irq} (APIC)</span>
                  </div>
                  {selectedDevice.ioPort && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">I/O Port Range:</span>
                      <span className="font-mono text-slate-300">{selectedDevice.ioPort}</span>
                    </div>
                  )}
                  {selectedDevice.memoryRange && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Memory Range:</span>
                      <span className="font-mono text-slate-300 text-[11px]">{selectedDevice.memoryRange}</span>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Resource settings are managed automatically by RocketOS Hardware HAL. No conflicts detected.
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPropertiesOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Driver Wizard Modal */}
      {wizardOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 select-none text-xs">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Update Driver Software</h3>
                <span className="text-[11px] text-slate-400">{selectedDevice.name}</span>
              </div>
            </div>

            {wizardStep === 'select' && (
              <div className="space-y-3">
                <p className="text-slate-300">
                  How do you want to search for drivers?
                </p>

                <div
                  onClick={() => setSelectedDriverPackage('cloud')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedDriverPackage === 'cloud'
                      ? 'bg-violet-950/40 border-violet-500/60 shadow-sm'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold text-white">
                    Search automatically in Rocket Cloud Driver Repository
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    RocketOS will search for the latest verified RHQL driver for your hardware.
                  </div>
                </div>

                <div
                  onClick={() => setSelectedDriverPackage('local')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedDriverPackage === 'local'
                      ? 'bg-violet-950/40 border-violet-500/60 shadow-sm'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold text-white">
                    Browse my computer for drivers (.inf, .sys, .rocket)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Locate and install driver software manually from RocketFS.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setWizardOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDriverInstall}
                    className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer shadow-md transition-colors"
                  >
                    Install Driver
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 'installing' && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
                <p className="font-semibold text-white">Installing driver software...</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Flashing driver package to /sys/bus/pci/drivers
                </p>
              </div>
            )}

            {wizardStep === 'finished' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Driver updated successfully
                  </div>
                  <p className="text-[11px] text-slate-300">
                    RocketOS has successfully installed the updated driver package. The hardware is operating at peak efficiency.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setWizardOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer transition-colors"
                  >
                    Finish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hardware Diagnostics Modal */}
      {diagnosticsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm text-white">Hardware Diagnostic POST Sweep</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                HAL v2.1
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 font-mono text-[11px] text-slate-300 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {isRunningDiagnostics ? (
                <div className="flex items-center gap-2 text-rose-400 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sweeping bus lines, caches, registers, and PHY...</span>
                </div>
              ) : null}

              {diagnosticLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{log}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={isRunningDiagnostics}
                onClick={() => setDiagnosticsOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
