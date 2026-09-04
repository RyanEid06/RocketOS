import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Lock,
  Unlock,
  Check,
  Globe,
  Radio,
  Sliders,
  Zap,
  ArrowDown,
  ArrowUp,
  Activity,
  Smartphone,
  ShieldCheck,
  Info,
  ChevronRight,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { DriverManager, WifiNetwork, NetworkInterface } from '../../core/drivers/DriverManager';
import { soundEngine } from '../../utils/audio';

export const WifiApp: React.FC = () => {
  const driverMgr = DriverManager.getInstance();
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(driverMgr.isWifiEnabled());
  const [activeSsid, setActiveSsid] = useState<string>(driverMgr.getActiveSsid());
  const [networks, setNetworks] = useState<WifiNetwork[]>(driverMgr.getWifiNetworks());
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>(driverMgr.getInterfaces());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'networks' | 'ipconfig' | 'hotspot' | 'speedtest'>('networks');

  // Connect Modal State
  const [connectingNetwork, setConnectingNetwork] = useState<WifiNetwork | null>(null);
  const [connectPassword, setConnectPassword] = useState<string>('');
  const [connectStep, setConnectStep] = useState<'idle' | 'auth' | 'ip' | 'done'>('idle');

  // Hotspot State
  const [hotspot, setHotspot] = useState(driverMgr.getHotspot());

  // Speedtest State
  const [speedtesting, setSpeedtesting] = useState<boolean>(false);
  const [speedResults, setSpeedResults] = useState({
    pingMs: 12,
    jitterMs: 1.8,
    downloadMbps: 482.4,
    uploadMbps: 124.7,
    progress: 0,
  });

  // IP Config Form
  const wlanInterface = interfaces.find((i) => i.id === 'wlan0') || interfaces[0];
  const [isDhcp, setIsDhcp] = useState<boolean>(true);
  const [ipAddress, setIpAddress] = useState<string>(wlanInterface?.ip || '192.168.1.151');
  const [subnetMask, setSubnetMask] = useState<string>(wlanInterface?.subnet || '255.255.255.0');
  const [gateway, setGateway] = useState<string>(wlanInterface?.gateway || '192.168.1.1');
  const [dnsServers, setDnsServers] = useState<string[]>(wlanInterface?.dns || ['1.1.1.1', '1.0.0.1']);
  const [ipSaveSuccess, setIpSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const unsub = driverMgr.subscribe(() => {
      setWifiEnabled(driverMgr.isWifiEnabled());
      setActiveSsid(driverMgr.getActiveSsid());
      setNetworks(driverMgr.getWifiNetworks());
      setInterfaces(driverMgr.getInterfaces());
      setHotspot(driverMgr.getHotspot());
    });
    return unsub;
  }, []);

  const handleToggleWifi = () => {
    const next = !wifiEnabled;
    driverMgr.setWifiEnabled(next);
    soundEngine.playClick();
  };

  const handleScan = async () => {
    if (!wifiEnabled) return;
    setIsScanning(true);
    soundEngine.playClick();
    await new Promise((r) => setTimeout(r, 900));
    setNetworks(driverMgr.getWifiNetworks());
    setIsScanning(false);
  };

  const handleStartConnect = (net: WifiNetwork) => {
    if (net.isConnected) return;
    if (net.security === 'Open') {
      executeConnect(net.ssid);
    } else {
      setConnectingNetwork(net);
      setConnectPassword('');
      setConnectStep('idle');
    }
  };

  const executeConnect = async (ssid: string) => {
    setConnectStep('auth');
    soundEngine.playClick();
    await new Promise((r) => setTimeout(r, 600));
    setConnectStep('ip');
    await new Promise((r) => setTimeout(r, 600));
    setConnectStep('done');
    driverMgr.connectToWifi(ssid);
    soundEngine.playSuccess();
    setTimeout(() => {
      setConnectingNetwork(null);
      setConnectStep('idle');
    }, 700);
  };

  const handleDisconnect = () => {
    driverMgr.disconnectWifi();
    soundEngine.playClick();
  };

  const handleRunSpeedtest = async () => {
    setSpeedtesting(true);
    soundEngine.playOpen();
    for (let p = 0; p <= 100; p += 10) {
      setSpeedResults((prev) => ({
        ...prev,
        progress: p,
        downloadMbps: Number((380 + Math.random() * 140).toFixed(1)),
        uploadMbps: Number((95 + Math.random() * 45).toFixed(1)),
        pingMs: Math.floor(10 + Math.random() * 6),
      }));
      await new Promise((r) => setTimeout(r, 180));
    }
    setSpeedtesting(false);
    soundEngine.playSuccess();
  };

  const handleSaveIpConfig = () => {
    driverMgr.updateInterfaceConfig('wlan0', {
      ip: ipAddress,
      subnet: subnetMask,
      gateway,
      dns: dnsServers,
    });
    setIpSaveSuccess(true);
    soundEngine.playSuccess();
    setTimeout(() => setIpSaveSuccess(false), 2000);
  };

  const handleToggleHotspot = () => {
    const next = !hotspot.enabled;
    driverMgr.setHotspot({ enabled: next });
    soundEngine.playClick();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-14 px-5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Wi-Fi & Wireless Network Center
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Wi-Fi 6E (802.11ax)
              </span>
            </h2>
            <span className="text-[11px] text-slate-400">
              Hardware: Intel Dual Band Wi-Fi 6 AX200 (iwlwifi driver)
            </span>
          </div>
        </div>

        {/* Global Wi-Fi Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
            {wifiEnabled ? 'Wi-Fi On' : 'Wi-Fi Off'}
          </span>
          <button
            onClick={handleToggleWifi}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              wifiEnabled ? 'bg-sky-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                wifiEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="h-10 px-5 bg-slate-900/40 border-b border-white/5 flex items-center gap-1 shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('networks')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'networks'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Wifi className="w-3.5 h-3.5 text-sky-400" />
          <span>Available Networks</span>
        </button>

        <button
          onClick={() => setActiveTab('ipconfig')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ipconfig'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>Adapter & IP Config</span>
        </button>

        <button
          onClick={() => setActiveTab('hotspot')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'hotspot'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span>Mobile Hotspot</span>
        </button>

        <button
          onClick={() => setActiveTab('speedtest')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'speedtest'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-violet-400" />
          <span>Speed & Telemetry</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {activeTab === 'networks' && (
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Current Active Connection Banner */}
            {wifiEnabled && activeSsid ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-500/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{activeSsid}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Connected, Secured
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                      <span>Band: <strong>5.0 GHz</strong></span>
                      <span>•</span>
                      <span>Signal: <strong>94% (-46 dBm)</strong></span>
                      <span>•</span>
                      <span>IP: <strong className="font-mono text-sky-300">{wlanInterface?.ip}</strong></span>
                      <span>•</span>
                      <span>Security: <strong>WPA3-Personal (SAE)</strong></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={handleDisconnect}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : null}

            {/* Network List Header */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Available Wireless Networks ({networks.length})
                </h4>
              </div>
              <button
                onClick={handleScan}
                disabled={!wifiEnabled || isScanning}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-sky-400' : ''}`} />
                <span>{isScanning ? 'Scanning Spectrum...' : 'Scan for Networks'}</span>
              </button>
            </div>

            {/* Networks Cards */}
            {!wifiEnabled ? (
              <div className="p-12 text-center rounded-2xl bg-black/20 border border-white/5 space-y-3">
                <WifiOff className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Wi-Fi is turned off</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Turn on Wi-Fi above to search for available wireless access points and connect to the internet.
                </p>
                <button
                  onClick={handleToggleWifi}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
                >
                  Turn On Wi-Fi
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {networks.map((net) => (
                  <div
                    key={net.bssid}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      net.isConnected
                        ? 'bg-sky-950/30 border-sky-500/40 shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900/90 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            net.isConnected
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          <Wifi className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white flex items-center gap-2">
                            <span>{net.ssid}</span>
                            {net.isConnected && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                            <span>{net.frequencyGhz} GHz</span>
                            <span>•</span>
                            <span>Ch {net.channel}</span>
                            <span>•</span>
                            <span>{net.signalStrength}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        {net.security === 'Open' ? (
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/5">
                          {net.security}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                      <span className="text-[10px] font-mono text-slate-500">
                        BSSID: {net.bssid}
                      </span>

                      {net.isConnected ? (
                        <button
                          onClick={handleDisconnect}
                          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium cursor-pointer transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartConnect(net)}
                          className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer shadow-sm transition-colors"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IP Config Tab */}
        {activeTab === 'ipconfig' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Wireless Interface IP Configuration</h3>
                  <p className="text-xs text-slate-400">Configure DHCP client or static IPv4 addressing</p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                  <button
                    onClick={() => setIsDhcp(true)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      isDhcp ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    DHCP (Auto)
                  </button>
                  <button
                    onClick={() => setIsDhcp(false)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      !isDhcp ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Manual Static IP
                  </button>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">IPv4 Address</label>
                  <input
                    type="text"
                    disabled={isDhcp}
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-sky-500 outline-none disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Subnet Mask</label>
                    <input
                      type="text"
                      disabled={isDhcp}
                      value={subnetMask}
                      onChange={(e) => setSubnetMask(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-sky-500 outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Default Gateway</label>
                    <input
                      type="text"
                      disabled={isDhcp}
                      value={gateway}
                      onChange={(e) => setGateway(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-sky-500 outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    DNS Nameservers (comma-separated)
                  </label>
                  <input
                    type="text"
                    disabled={isDhcp}
                    value={dnsServers.join(', ')}
                    onChange={(e) => setDnsServers(e.target.value.split(',').map((s) => s.trim()))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-sky-500 outline-none disabled:opacity-60"
                  />
                </div>

                {/* Quick DNS Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Presets:</span>
                  <button
                    onClick={() => setDnsServers(['1.1.1.1', '1.0.0.1'])}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-sky-300 cursor-pointer"
                  >
                    Cloudflare (1.1.1.1)
                  </button>
                  <button
                    onClick={() => setDnsServers(['8.8.8.8', '8.8.4.4'])}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-emerald-300 cursor-pointer"
                  >
                    Google (8.8.8.8)
                  </button>
                  <button
                    onClick={() => setDnsServers(['9.9.9.9', '149.112.112.112'])}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-amber-300 cursor-pointer"
                  >
                    Quad9 (9.9.9.9)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                {ipSaveSuccess ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Interface settings applied successfully!
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Applies to wlan0 interface</span>
                )}
                <button
                  onClick={handleSaveIpConfig}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
                >
                  Apply & Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hotspot Tab */}
        {activeTab === 'hotspot' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mobile Hotspot & Tethering</h3>
                    <p className="text-xs text-slate-400">Share your RocketOS internet connection with other devices</p>
                  </div>
                </div>

                <button
                  onClick={handleToggleHotspot}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    hotspot.enabled ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      hotspot.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Network Name (SSID)</label>
                  <input
                    type="text"
                    value={hotspot.ssid}
                    onChange={(e) => driverMgr.setHotspot({ ssid: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Network Password (WPA3)</label>
                  <input
                    type="text"
                    value={hotspot.password}
                    onChange={(e) => driverMgr.setHotspot({ password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Network Band</label>
                  <select
                    value={hotspot.band}
                    onChange={(e) => driverMgr.setHotspot({ band: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-amber-500 outline-none"
                  >
                    <option value="5.0 GHz">5.0 GHz (Fastest)</option>
                    <option value="2.4 GHz">2.4 GHz (Longest range)</option>
                    <option value="6.0 GHz">6.0 GHz (Wi-Fi 6E Low Latency)</option>
                  </select>
                </div>
              </div>

              {/* Connected Clients */}
              <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
                <span className="font-semibold text-slate-300 block">
                  Connected Client Devices ({hotspot.clients.length})
                </span>
                <div className="space-y-1.5">
                  {hotspot.clients.map((cli, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-amber-400" />
                        <span className="font-medium text-white">{cli}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        192.168.137.{10 + idx} • Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Speedtest & Telemetry Tab */}
        {activeTab === 'speedtest' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 text-center space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Network Bandwidth & Latency Telemetry</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Benchmarking wireless socket throughput against RocketOS Edge CDN
                </p>
              </div>

              {/* Live Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[11px] text-slate-400 block font-medium">Ping</span>
                  <div className="text-2xl font-bold text-sky-400 font-mono mt-1">
                    {speedResults.pingMs}
                    <span className="text-xs text-slate-400 ml-1 font-sans">ms</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[11px] text-slate-400 block font-medium">Jitter</span>
                  <div className="text-2xl font-bold text-violet-400 font-mono mt-1">
                    {speedResults.jitterMs}
                    <span className="text-xs text-slate-400 ml-1 font-sans">ms</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[11px] text-slate-400 block font-medium flex items-center justify-center gap-1">
                    <ArrowDown className="w-3 h-3 text-emerald-400" /> Download
                  </span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                    {speedResults.downloadMbps}
                    <span className="text-xs text-slate-400 ml-1 font-sans">Mbps</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[11px] text-slate-400 block font-medium flex items-center justify-center gap-1">
                    <ArrowUp className="w-3 h-3 text-amber-400" /> Upload
                  </span>
                  <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                    {speedResults.uploadMbps}
                    <span className="text-xs text-slate-400 ml-1 font-sans">Mbps</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {speedtesting && (
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-500 h-2 transition-all duration-150"
                    style={{ width: `${speedResults.progress}%` }}
                  />
                </div>
              )}

              <button
                onClick={handleRunSpeedtest}
                disabled={speedtesting}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer shadow-lg inline-flex items-center gap-2"
              >
                <Activity className={`w-4 h-4 ${speedtesting ? 'animate-spin' : ''}`} />
                <span>{speedtesting ? 'Testing Bandwidth...' : 'Run Speed Benchmark'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Modal */}
      {connectingNetwork && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs select-none">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Wifi className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Connect to {connectingNetwork.ssid}</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 font-mono">
                {connectingNetwork.security}
              </span>
            </div>

            {connectStep === 'idle' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeConnect(connectingNetwork.ssid);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Enter Wi-Fi Password:
                  </label>
                  <input
                    type="password"
                    autoFocus
                    value={connectPassword}
                    onChange={(e) => setConnectPassword(e.target.value)}
                    placeholder="WPA security key..."
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:border-sky-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConnectingNetwork(null)}
                    className="px-3.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shadow-md transition-colors"
                  >
                    Connect
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                <p className="font-semibold text-white">
                  {connectStep === 'auth'
                    ? 'Authenticating WPA3-SAE Handshake...'
                    : connectStep === 'ip'
                    ? 'Obtaining IPv4 Lease from DHCP...'
                    : 'Connected!'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
