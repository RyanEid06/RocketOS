import React, { useState, useEffect } from 'react';
import {
  Share2,
  Laptop,
  Smartphone,
  Server,
  Radio,
  Upload,
  Download,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  FileText,
  Clock,
  Send,
  Sliders,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { UserManager } from '../../core/users/UserManager';

interface PeerDevice {
  id: string;
  name: string;
  type: 'laptop' | 'phone' | 'server';
  ip: string;
  status: 'online' | 'busy';
  os: string;
}

interface TransferSession {
  id: string;
  fileName: string;
  fileSize: string;
  peerName: string;
  progress: number;
  speed: string;
  status: 'handshake' | 'transmitting' | 'completed';
}

export const RocketDropApp: React.FC = () => {
  const [visibility, setVisibility] = useState<'everyone' | 'contacts' | 'hidden'>('everyone');
  const [selectedDevice, setSelectedDevice] = useState<PeerDevice | null>(null);
  const [transfer, setTransfer] = useState<TransferSession | null>(null);
  const [incomingFile, setIncomingFile] = useState<{ name: string; size: string; sender: string } | null>(null);

  const [peers, setPeers] = useState<PeerDevice[]>([
    {
      id: 'dev-1',
      name: 'Ryan-ThinkPad-X1',
      type: 'laptop',
      ip: '192.168.1.104',
      status: 'online',
      os: 'RocketOS 2.1 x86_64',
    },
    {
      id: 'dev-2',
      name: 'Pixel-8-Pro',
      type: 'phone',
      ip: '192.168.1.121',
      status: 'online',
      os: 'Android 15',
    },
    {
      id: 'dev-3',
      name: 'Rocket-Build-Node',
      type: 'server',
      ip: '192.168.1.200',
      status: 'online',
      os: 'RocketOS 2.1 Server',
    },
  ]);

  const [isScanning, setIsScanning] = useState<boolean>(false);

  const handleScan = () => {
    setIsScanning(true);
    soundEngine.playOpen();
    setTimeout(() => {
      setIsScanning(false);
      soundEngine.playSuccess();
    }, 1200);
  };

  const handleSendFile = (device: PeerDevice) => {
    setSelectedDevice(device);
    const newTransfer: TransferSession = {
      id: `tf-${Date.now()}`,
      fileName: 'welcome.rocket',
      fileSize: '1.2 KB',
      peerName: device.name,
      progress: 0,
      speed: '34.2 MB/s',
      status: 'handshake',
    };
    setTransfer(newTransfer);
    soundEngine.playOpen();

    let p = 0;
    const timer = setInterval(() => {
      p += 25;
      if (p >= 100) {
        clearInterval(timer);
        setTransfer((prev) => (prev ? { ...prev, progress: 100, status: 'completed' } : null));
        soundEngine.playSuccess();
      } else {
        setTransfer((prev) =>
          prev ? { ...prev, progress: p, status: 'transmitting' } : null
        );
      }
    }, 400);
  };

  const handleAcceptIncoming = () => {
    if (!incomingFile) return;
    const rfs = RocketFS.getInstance();
    const user = UserManager.getInstance().getCurrentUser();
    rfs.createFile(
      `/home/ryan/Downloads/${incomingFile.name}`,
      `# Received via RocketDrop from ${incomingFile.sender}\n# Time: ${new Date().toISOString()}\n\nfn main() -> Int:\n    print("Transfer successful")\n    return 0\n`,
      user
    );
    soundEngine.playSuccess();
    setIncomingFile(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-semibold text-xs tracking-wide">RocketDrop Network File Sharing</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
            TLS 1.3 Encrypted
          </span>
        </div>

        {/* Discovery Scan & Visibility */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400">Discoverable to:</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="everyone">Everyone on Mesh</option>
              <option value="contacts">Known Devices Only</option>
              <option value="hidden">No One (Invisible)</option>
            </select>
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Scan for nearby peers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Discovered Devices Grid */}
        <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Nearby RocketOS Peers</h2>
            <p className="text-xs text-slate-400">
              Select any device to instantly stream files over the zero-configuration local mesh network.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {peers.map((peer) => (
              <div
                key={peer.id}
                onClick={() => handleSendFile(peer)}
                className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 hover:border-sky-500/40 transition-all cursor-pointer flex flex-col gap-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {peer.type === 'laptop' && <Laptop className="w-5 h-5" />}
                    {peer.type === 'phone' && <Smartphone className="w-5 h-5" />}
                    {peer.type === 'server' && <Server className="w-5 h-5" />}
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>

                <div>
                  <div className="font-semibold text-sm text-white group-hover:text-sky-300 transition-colors">
                    {peer.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{peer.os}</div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{peer.ip}</span>
                  <span className="text-sky-400 font-medium group-hover:underline flex items-center gap-1">
                    Send File <Send className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Transfer Card (if in progress) */}
          {transfer && (
            <div className="p-4 rounded-2xl bg-black/60 border border-sky-500/30 flex flex-col gap-3 mt-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-white">Sending "{transfer.fileName}"</span>
                  <span className="text-slate-400">to {transfer.peerName}</span>
                </div>
                <span className="font-mono text-sky-400 font-semibold">
                  {transfer.status === 'completed' ? '100% (Done)' : `${transfer.progress}%`}
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Speed: {transfer.speed}</span>
                <span>Security: AES-GCM-256</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Transfer Log & Security Info */}
        <div className="w-72 border-l border-white/10 bg-slate-900/40 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Network Integrity
          </span>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Verified Local Subnet
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Files are transferred peer-to-peer over your local Wi-Fi or Ethernet subnet without uploading to external cloud servers.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-slate-300 font-semibold">Recent Transfers</span>
            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">welcome.rocket</div>
                  <div className="text-[10px] text-slate-500">To Ryan-ThinkPad-X1</div>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">liquid_aurora.png</div>
                  <div className="text-[10px] text-slate-500">From Pixel-8-Pro</div>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
