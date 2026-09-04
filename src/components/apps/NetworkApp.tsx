import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Globe,
  Radio,
  Send,
  Wifi,
  ShieldCheck,
  Server,
  Terminal,
  RefreshCw,
  Play,
  Square,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

type NetworkTab = 'ping' | 'ports' | 'http' | 'interfaces';

interface PingTarget {
  name: string;
  host: string;
  history: number[];
  avg: number;
  loss: number;
  status: 'online' | 'warning' | 'offline';
}

interface PortScanResult {
  port: number;
  service: string;
  protocol: string;
  state: 'open' | 'filtered' | 'closed';
  banner?: string;
}

export const NetworkApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NetworkTab>('ping');

  // Ping State
  const [isPinging, setIsPinging] = useState<boolean>(true);
  const [targets, setTargets] = useState<PingTarget[]>([
    { name: 'Localhost Loopback', host: '127.0.0.1', history: [1, 1, 2, 1, 1, 1, 2, 1, 1], avg: 1.1, loss: 0, status: 'online' },
    { name: 'RocketOS Gateway', host: '192.168.1.1', history: [4, 5, 4, 6, 5, 4, 5, 4, 5], avg: 4.7, loss: 0, status: 'online' },
    { name: 'Rocket Package CDN', host: 'cdn.rocket-lang.org', history: [18, 22, 19, 24, 20, 21, 19, 18, 22], avg: 20.3, loss: 0, status: 'online' },
    { name: 'Public DNS (Google)', host: '8.8.8.8', history: [14, 15, 14, 16, 15, 14, 15, 16, 14], avg: 14.8, loss: 0, status: 'online' },
    { name: 'Secondary Mirror', host: 'mirror.rocket-os.net', history: [45, 52, 48, 60, 49, 44, 46, 51, 48], avg: 49.2, loss: 0, status: 'online' },
  ]);

  // Port Scan State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanHost, setScanHost] = useState<string>('127.0.0.1');
  const [ports, setPorts] = useState<PortScanResult[]>([
    { port: 22, service: 'SSH', protocol: 'TCP', state: 'closed', banner: 'Rocket SSHd disabled' },
    { port: 53, service: 'DNS', protocol: 'UDP', state: 'open', banner: 'CoreDNS v1.10.1' },
    { port: 80, service: 'HTTP', protocol: 'TCP', state: 'open', banner: 'nginx/1.24.0 (RocketOS Proxy)' },
    { port: 443, service: 'HTTPS', protocol: 'TCP', state: 'open', banner: 'TLS 1.3 / OpenSSL 3.1.2' },
    { port: 3000, service: 'Vite / Node Dev', protocol: 'TCP', state: 'open', banner: 'RocketOS Container Ingress' },
    { port: 5432, service: 'PostgreSQL', protocol: 'TCP', state: 'closed', banner: 'Postgres daemon offline' },
    { port: 6379, service: 'Redis Cache', protocol: 'TCP', state: 'filtered', banner: 'Protected by kernel firewall' },
    { port: 8080, service: 'HTTP-Alt', protocol: 'TCP', state: 'open', banner: 'Rocket Service Mesh Gateway' },
  ]);

  // HTTP Workbench State
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [httpUrl, setHttpUrl] = useState<string>('https://api.github.com/repos/RyanEid06/Rocket');
  const [httpHeaders, setHttpHeaders] = useState<string>('Accept: application/json\nUser-Agent: RocketOS-NetPulse/2.1');
  const [httpBody, setHttpBody] = useState<string>('{\n  "query": "rocket 2.1",\n  "client": "netpulse"\n}');
  const [httpResponse, setHttpResponse] = useState<any | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [httpDuration, setHttpDuration] = useState<number | null>(null);
  const [isHttpLoading, setIsHttpLoading] = useState<boolean>(false);
  const [httpCopied, setHttpCopied] = useState<boolean>(false);

  // Ping interval
  useEffect(() => {
    if (!isPinging) return;
    const timer = setInterval(() => {
      setTargets((prev) =>
        prev.map((t) => {
          const jitter = (Math.random() - 0.5) * 4;
          const newPing = Math.max(1, Math.round(t.avg + jitter));
          const history = [...t.history.slice(1), newPing];
          const avg = Number((history.reduce((a, b) => a + b, 0) / history.length).toFixed(1));
          return {
            ...t,
            history,
            avg,
          };
        })
      );
    }, 1200);
    return () => clearInterval(timer);
  }, [isPinging]);

  const handleRunPortScan = () => {
    soundEngine.play('click');
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      soundEngine.playSuccess();
    }, 1500);
  };

  const handleSendHttpRequest = async () => {
    soundEngine.play('click');
    setIsHttpLoading(true);
    setHttpResponse(null);
    setHttpStatus(null);
    setHttpDuration(null);

    const startTime = performance.now();
    try {
      // Try real fetch if public URL, or fallback gracefully
      const res = await fetch(httpUrl, {
        method: httpMethod,
        headers: {
          Accept: 'application/json',
        },
        body: httpMethod !== 'GET' ? httpBody : undefined,
      });

      const elapsed = Math.round(performance.now() - startTime);
      setHttpStatus(res.status);
      setHttpDuration(elapsed);

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      setHttpResponse(data);
      soundEngine.playSuccess();
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      // Fallback simulated response
      setHttpStatus(200);
      setHttpDuration(elapsed > 0 ? elapsed : 32);
      setHttpResponse({
        status: 'simulated_ok',
        note: 'CORS or sandbox intercept handled gracefully by RocketOS Network layer.',
        target: httpUrl,
        method: httpMethod,
        timestamp: new Date().toISOString(),
        headers: {
          server: 'RocketOS-Virtual-Gateway/2.1',
          'content-type': 'application/json',
          'x-powered-by': 'Rocket ABI v1',
        },
        data: {
          name: 'Rocket',
          version: '2.1.0',
          abi: 'Frozen 2.0 ABI v1',
          status: 'online',
          latency_ms: 18,
        },
      });
      soundEngine.playSuccess();
    } finally {
      setIsHttpLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Tab Navigation */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('ping')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'ping' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Ping & Latency</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'ports' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Port Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('http')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'http' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>HTTP Workbench</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interfaces')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'interfaces' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Interfaces (NICs)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-mono text-emerald-400">NET LINK UP (1 Gbps)</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* PING TAB */}
        {activeTab === 'ping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">Active simulated ICMP heartbeat monitors across local and remote endpoints</div>
              <button
                type="button"
                onClick={() => setIsPinging(!isPinging)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  isPinging ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isPinging ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPinging ? 'Pause Ping' : 'Resume Ping'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {targets.map((target) => (
                <div key={target.host} className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">{target.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{target.host}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-sky-400">{target.avg} ms</div>
                      <div className="text-[9px] text-slate-500 font-mono">0.0% loss</div>
                    </div>
                  </div>

                  {/* Sparkline Graph */}
                  <div className="h-10 w-full flex items-end gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    {target.history.map((val, idx) => {
                      const maxVal = Math.max(...target.history, 40);
                      const heightPercent = Math.min(100, Math.max(15, (val / maxVal) * 100));
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-sky-500 rounded-xs hover:bg-sky-300 transition-all"
                          style={{ height: `${heightPercent}%` }}
                          title={`${val} ms`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PORTS TAB */}
        {activeTab === 'ports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <span className="text-xs text-slate-400">Target:</span>
                <input
                  type="text"
                  value={scanHost}
                  onChange={(e) => setScanHost(e.target.value)}
                  className="bg-slate-900 px-3 py-1 rounded-lg border border-white/10 text-xs font-mono text-white outline-none w-full focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={handleRunPortScan}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning Ports...' : 'Scan Standard Ports'}</span>
              </button>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/30 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-white/10">
                    <th className="py-2.5 px-3">Port</th>
                    <th className="py-2.5 px-3">Protocol</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Banner / Service Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {ports.map((p) => {
                    const stateColor =
                      p.state === 'open'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : p.state === 'filtered'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

                    return (
                      <tr key={p.port} className="hover:bg-white/5">
                        <td className="py-2 px-3 font-bold text-sky-300">{p.port}</td>
                        <td className="py-2 px-3 text-slate-400">{p.protocol}</td>
                        <td className="py-2 px-3 font-medium text-white">{p.service}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${stateColor}`}>{p.state}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-xs">{p.banner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HTTP WORKBENCH */}
        {activeTab === 'http' && (
          <div className="space-y-4">
            {/* Request Bar */}
            <div className="flex gap-2">
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as any)}
                className="bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-400 outline-none cursor-pointer"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                value={httpUrl}
                onChange={(e) => setHttpUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono text-white outline-none focus:border-sky-500"
              />

              <button
                type="button"
                onClick={handleSendHttpRequest}
                disabled={isHttpLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-sm shadow-sky-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isHttpLoading ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>

            {/* Split View: Headers/Body Input vs Response */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Request Headers</div>
                  <textarea
                    rows={3}
                    value={httpHeaders}
                    onChange={(e) => setHttpHeaders(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-200 outline-none resize-none focus:border-sky-500"
                  />
                </div>

                {httpMethod !== 'GET' && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">JSON Payload Body</div>
                    <textarea
                      rows={6}
                      value={httpBody}
                      onChange={(e) => setHttpBody(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-200 outline-none resize-none focus:border-sky-500"
                    />
                  </div>
                )}
              </div>

              {/* Response Panel */}
              <div className="bg-slate-900/80 rounded-xl border border-white/10 p-3 flex flex-col h-72">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Response</span>
                    {httpStatus && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                        {httpStatus} OK
                      </span>
                    )}
                    {httpDuration && (
                      <span className="text-[10px] font-mono text-slate-400">{httpDuration} ms</span>
                    )}
                  </div>

                  {httpResponse && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(httpResponse, null, 2));
                        setHttpCopied(true);
                        setTimeout(() => setHttpCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {httpCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{httpCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-auto mt-2 font-mono text-[11px] text-slate-300">
                  {httpResponse ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(httpResponse, null, 2)}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Send a request to view headers and JSON payload output
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INTERFACES TAB */}
        {activeTab === 'interfaces' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-sky-400" />
                    <div>
                      <div className="font-bold text-xs text-white">eth0 (Primary Ethernet)</div>
                      <div className="text-[10px] text-slate-400">Virtual Ingress Adapter</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    UP / RUNNING
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>IPv4 Address:</span>
                    <span className="text-white">192.168.1.105 / 24</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>MAC Hardware:</span>
                    <span className="text-white">52:54:00:12:34:56</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>MTU:</span>
                    <span className="text-white">1500 bytes</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>RX / TX:</span>
                    <span className="text-sky-300">142.8 MB / 48.2 MB</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-xs text-white">lo0 (Loopback Adapter)</div>
                      <div className="text-[10px] text-slate-400">Inter-process loopback</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    UP / RUNNING
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>IPv4 Address:</span>
                    <span className="text-white">127.0.0.1 / 8</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IPv6 Address:</span>
                    <span className="text-white">::1 / 128</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>MTU:</span>
                    <span className="text-white">65536 bytes</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Throughput:</span>
                    <span className="text-emerald-300">1.2 GB / 1.2 GB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
