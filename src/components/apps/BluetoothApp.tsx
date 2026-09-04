import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  RefreshCw,
  Headphones,
  Keyboard,
  Mouse,
  Gamepad2,
  Smartphone,
  Activity,
  Battery,
  BatteryCharging,
  Send,
  Trash2,
  Check,
  ShieldCheck,
  Sliders,
  Radio,
  FileUp,
  Info,
  ChevronRight,
  X,
  Volume2,
} from 'lucide-react';
import { DriverManager, BluetoothDevice } from '../../core/drivers/DriverManager';
import { soundEngine } from '../../utils/audio';

export const BluetoothApp: React.FC = () => {
  const driverMgr = DriverManager.getInstance();
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean>(driverMgr.isBluetoothEnabled());
  const [devices, setDevices] = useState<BluetoothDevice[]>(driverMgr.getBluetoothDevices());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [discoverable, setDiscoverable] = useState<boolean>(true);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);

  // Pairing Modal
  const [pairingDevice, setPairingDevice] = useState<BluetoothDevice | null>(null);
  const [pairPin, setPairPin] = useState<string>('');

  // File Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState<boolean>(false);
  const [transferDevice, setTransferDevice] = useState<BluetoothDevice | null>(null);
  const [transferFileName, setTransferFileName] = useState<string>('rocket_kernel_notes.txt');
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  useEffect(() => {
    const unsub = driverMgr.subscribe(() => {
      setBluetoothEnabled(driverMgr.isBluetoothEnabled());
      setDevices(driverMgr.getBluetoothDevices());
    });
    return unsub;
  }, []);

  const handleToggleBluetooth = () => {
    const next = !bluetoothEnabled;
    driverMgr.setBluetoothEnabled(next);
    soundEngine.playClick();
  };

  const handleScan = async () => {
    if (!bluetoothEnabled || isScanning) return;
    setIsScanning(true);
    soundEngine.playOpen();
    await driverMgr.scanBluetoothDevices();
    setDevices(driverMgr.getBluetoothDevices());
    setIsScanning(false);
  };

  const handleStartPair = (dev: BluetoothDevice) => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPairPin(randomPin);
    setPairingDevice(dev);
    soundEngine.playClick();
  };

  const handleConfirmPair = () => {
    if (!pairingDevice) return;
    driverMgr.pairBluetoothDevice(pairingDevice.id);
    soundEngine.playSuccess();
    setPairingDevice(null);
  };

  const handleToggleConnect = (dev: BluetoothDevice) => {
    if (dev.isConnected) {
      driverMgr.disconnectBluetoothDevice(dev.id);
    } else {
      driverMgr.connectBluetoothDevice(dev.id);
    }
    soundEngine.playClick();
  };

  const handleUnpair = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    driverMgr.unpairBluetoothDevice(id);
    soundEngine.playClick();
  };

  const handleStartFileTransfer = (dev: BluetoothDevice) => {
    setTransferDevice(dev);
    setTransferProgress(0);
    setIsTransferring(false);
    setTransferModalOpen(true);
    soundEngine.playClick();
  };

  const handleExecuteFileTransfer = async () => {
    setIsTransferring(true);
    soundEngine.playOpen();
    for (let p = 0; p <= 100; p += 10) {
      setTransferProgress(p);
      await new Promise((r) => setTimeout(r, 150));
    }
    setIsTransferring(false);
    soundEngine.playSuccess();
    setTimeout(() => {
      setTransferModalOpen(false);
    }, 800);
  };

  const getDeviceIcon = (type: BluetoothDevice['type']) => {
    switch (type) {
      case 'audio':
        return <Headphones className="w-5 h-5 text-sky-400" />;
      case 'input':
        return <Keyboard className="w-5 h-5 text-emerald-400" />;
      case 'peripheral':
        return <Gamepad2 className="w-5 h-5 text-violet-400" />;
      case 'phone':
        return <Smartphone className="w-5 h-5 text-amber-400" />;
      case 'sensor':
        return <Activity className="w-5 h-5 text-rose-400" />;
      default:
        return <Bluetooth className="w-5 h-5 text-blue-400" />;
    }
  };

  const pairedDevices = devices.filter((d) => d.isPaired);
  const availableDevices = devices.filter((d) => !d.isPaired);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-14 px-5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Bluetooth className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Bluetooth & Device Hub
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Bluetooth 5.4 LE (LMP 13.x)
              </span>
            </h2>
            <span className="text-[11px] text-slate-400">
              Host: Intel Wireless Bluetooth HCI Controller (btintel driver)
            </span>
          </div>
        </div>

        {/* Global Bluetooth Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
            {bluetoothEnabled ? 'Bluetooth On' : 'Bluetooth Off'}
          </span>
          <button
            onClick={handleToggleBluetooth}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              bluetoothEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                bluetoothEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Devices List */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
          {/* Status and Scanner Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                <Radio className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  Discoverable as: <span className="font-mono text-sky-300">RocketOS-Station</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {bluetoothEnabled
                    ? 'Nearby devices can discover and request pairing'
                    : 'Radio transmitter disabled'}
                </div>
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={!bluetoothEnabled || isScanning}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Nearby Radio...' : 'Scan for Devices'}</span>
            </button>
          </div>

          {!bluetoothEnabled ? (
            <div className="p-12 text-center rounded-2xl bg-black/20 border border-white/5 space-y-3">
              <Bluetooth className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Bluetooth is turned off</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Turn on Bluetooth to connect your wireless headphones, mice, keyboards, game controllers, and smart sensors.
              </p>
              <button
                onClick={handleToggleBluetooth}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
              >
                Turn On Bluetooth
              </button>
            </div>
          ) : (
            <>
              {/* Paired Devices Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Paired Devices ({pairedDevices.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pairedDevices.map((dev) => (
                    <div
                      key={dev.id}
                      onClick={() => setSelectedDevice(dev)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                        selectedDevice?.id === dev.id
                          ? 'bg-blue-950/40 border-blue-500/50 shadow-md'
                          : 'bg-slate-900/60 hover:bg-slate-900/90 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            {getDeviceIcon(dev.type)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-white flex items-center gap-2">
                              <span>{dev.name}</span>
                              {dev.isConnected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className={dev.isConnected ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                                {dev.isConnected ? 'Connected' : 'Paired, Offline'}
                              </span>
                              {dev.batteryPercent !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-mono text-slate-300">
                                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                                    {dev.batteryPercent}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleUnpair(dev.id, e)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Unpair Device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                        <span className="text-[10px] font-mono text-slate-500">
                          {dev.mac}
                        </span>

                        <div className="flex items-center gap-2">
                          {dev.type === 'phone' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartFileTransfer(dev);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <FileUp className="w-3 h-3 text-amber-400" />
                              <span>Beam File</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleConnect(dev);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              dev.isConnected
                                ? 'bg-white/10 hover:bg-rose-500/20 text-rose-300'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                            }`}
                          >
                            {dev.isConnected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Nearby Devices Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Available Nearby Devices ({availableDevices.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableDevices.map((dev) => (
                    <div
                      key={dev.id}
                      className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                          {getDeviceIcon(dev.type)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">{dev.name}</div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {dev.mac} • RSSI {dev.rssi} dBm
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartPair(dev)}
                        className="px-3 py-1 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-colors shadow-sm"
                      >
                        Pair
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Details Drawer */}
        {selectedDevice && (
          <div className="w-80 border-l border-white/10 bg-slate-900/60 p-5 overflow-y-auto custom-scrollbar space-y-5 select-none hidden lg:block">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {getDeviceIcon(selectedDevice.type)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedDevice.name}</h4>
                  <span className="text-[11px] text-slate-400 capitalize">{selectedDevice.type} Device</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Properties Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Connection State</span>
                <span className={selectedDevice.isConnected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {selectedDevice.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Physical Address (MAC)</span>
                <span className="font-mono text-slate-200">{selectedDevice.mac}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Link Signal (RSSI)</span>
                <span className="font-mono text-sky-400">{selectedDevice.rssi} dBm</span>
              </div>
              {selectedDevice.batteryPercent !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Battery Level</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedDevice.batteryPercent}%</span>
                </div>
              )}
            </div>

            {/* Supported Profiles */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] block">
                Negotiated Bluetooth Profiles
              </span>
              <div className="space-y-1.5">
                {selectedDevice.profiles.map((prof, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-300 font-mono flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{prof}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleToggleConnect(selectedDevice)}
                className={`w-full py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  selectedDevice.isConnected
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {selectedDevice.isConnected ? 'Disconnect Device' : 'Connect Device'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pairing PIN Confirmation Modal */}
      {pairingDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 select-none text-xs">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Bluetooth className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Pair with {pairingDevice.name}</h3>
                <span className="text-[11px] text-slate-400">Bluetooth Security Handshake</span>
              </div>
            </div>

            <div className="text-center space-y-2 py-2">
              <p className="text-slate-300">
                Confirm that the pairing passkey displayed below matches the one on your peripheral device:
              </p>
              <div className="text-3xl font-mono font-bold tracking-widest text-sky-400 bg-black/40 py-3 rounded-2xl border border-white/10">
                {pairPin}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPairingDevice(null)}
                className="px-3.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPair}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer shadow-md transition-colors"
              >
                Confirm & Pair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OBEX File Transfer Modal */}
      {transferModalOpen && transferDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <FileUp className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Bluetooth OBEX File Beam</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Target: {transferDevice.name}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Target File</label>
                <input
                  type="text"
                  value={transferFileName}
                  onChange={(e) => setTransferFileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-amber-500 outline-none"
                />
              </div>

              {isTransferring && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Beaming to {transferDevice.mac}...</span>
                    <span>{transferProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 transition-all duration-150"
                      style={{ width: `${transferProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isTransferring}
                onClick={() => setTransferModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                disabled={isTransferring}
                onClick={handleExecuteFileTransfer}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer shadow-md transition-colors"
              >
                {isTransferring ? 'Sending...' : 'Send File Over Bluetooth'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
