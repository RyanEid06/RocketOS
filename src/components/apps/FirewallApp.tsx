import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Lock,
  Unlock,
  Plus,
  Trash2,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Ban,
  ArrowDownUp,
  Sliders,
  Filter,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { notificationService } from '../../core/notifications/NotificationService';

export interface FirewallRule {
  id: string;
  name: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  port: number | string;
  direction: 'Inbound' | 'Outbound' | 'Both';
  action: 'ALLOW' | 'BLOCK';
  enabled: boolean;
}

export interface NetworkSocket {
  pid: number;
  process: string;
  protocol: 'TCP' | 'UDP';
  localAddress: string;
  remoteAddress: string;
  state: 'LISTEN' | 'ESTABLISHED' | 'TIME_WAIT' | 'CLOSE_WAIT';
  bytesReceived: string;
  bytesSent: string;
}

const INITIAL_RULES: FirewallRule[] = [
  {
    id: 'rule-1',
    name: 'RocketOS Dev Server (Vite / Node)',
    protocol: 'TCP',
    port: 3000,
    direction: 'Inbound',
    action: 'ALLOW',
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Standard HTTPS Web Traffic',
    protocol: 'TCP',
    port: 443,
    direction: 'Both',
    action: 'ALLOW',
    enabled: true,
  },
  {
    id: 'rule-3',
    name: 'Standard HTTP Web Traffic',
    protocol: 'TCP',
    port: 80,
    direction: 'Both',
    action: 'ALLOW',
    enabled: true,
  },
  {
    id: 'rule-4',
    name: 'Secure Shell (SSH Daemon)',
    protocol: 'TCP',
    port: 22,
    direction: 'Inbound',
    action: 'ALLOW',
    enabled: true,
  },
  {
    id: 'rule-5',
    name: 'DNS Resolution Service',
    protocol: 'UDP',
    port: 53,
    direction: 'Outbound',
    action: 'ALLOW',
    enabled: true,
  },
  {
    id: 'rule-6',
    name: 'Block Unsolicited Telnet Ports',
    protocol: 'TCP',
    port: 23,
    direction: 'Inbound',
    action: 'BLOCK',
    enabled: true,
  },
];

const INITIAL_SOCKETS: NetworkSocket[] = [
  {
    pid: 104,
    process: 'node (server.ts)',
    protocol: 'TCP',
    localAddress: '0.0.0.0:3000',
    remoteAddress: '*:*',
    state: 'LISTEN',
    bytesReceived: '14.2 MB',
    bytesSent: '28.6 MB',
  },
  {
    pid: 212,
    process: 'rocket_browser',
    protocol: 'TCP',
    localAddress: '192.168.1.145:54210',
    remoteAddress: '142.250.190.46:443',
    state: 'ESTABLISHED',
    bytesReceived: '8.4 MB',
    bytesSent: '920 KB',
  },
  {
    pid: 88,
    process: 'rmaild (Mail Daemon)',
    protocol: 'TCP',
    localAddress: '127.0.0.1:993',
    remoteAddress: '*:*',
    state: 'LISTEN',
    bytesReceived: '1.2 MB',
    bytesSent: '840 KB',
  },
  {
    pid: 402,
    process: 'rocketc (LLVM LSP)',
    protocol: 'TCP',
    localAddress: '127.0.0.1:6005',
    remoteAddress: '127.0.0.1:51280',
    state: 'ESTABLISHED',
    bytesReceived: '4.8 MB',
    bytesSent: '4.1 MB',
  },
];

export const FirewallApp: React.FC = () => {
  const [firewallEnabled, setFirewallEnabled] = useState<boolean>(true);
  const [stealthMode, setStealthMode] = useState<boolean>(true);
  const [ddosProtection, setDdosProtection] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'sockets' | 'logs'>('rules');
  const [rules, setRules] = useState<FirewallRule[]>(INITIAL_RULES);
  const [sockets, setSockets] = useState<NetworkSocket[]>(INITIAL_SOCKETS);
  const [isAddingRule, setIsAddingRule] = useState<boolean>(false);

  // Form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleProto, setNewRuleProto] = useState<'TCP' | 'UDP' | 'ICMP'>('TCP');
  const [newRulePort, setNewRulePort] = useState('8080');
  const [newRuleDirection, setNewRuleDirection] = useState<'Inbound' | 'Outbound' | 'Both'>('Inbound');
  const [newRuleAction, setNewRuleAction] = useState<'ALLOW' | 'BLOCK'>('ALLOW');

  // Audit Logs
  const [logs, setLogs] = useState<string[]>([
    '[FIREWALL] Kernel packet filtering subsystem active (Netfilter ABI v1)',
    '[INBOUND] ALLOW TCP packet 192.168.1.1:54210 -> 0.0.0.0:3000 (Vite HMR)',
    '[RULE_APPLIED] Stealth mode active: dropped ICMP echo broadcast from 192.168.1.255',
    '[OUTBOUND] ALLOW TCP 192.168.1.145:54210 -> 142.250.190.46:443 (HTTPS TLSv1.3)',
    '[SECURITY] Heuristic rate limiter: 0 abusive connection attempts flagged',
  ]);

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    soundEngine.play('click');
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    soundEngine.playTrash();
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const created: FirewallRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      protocol: newRuleProto,
      port: isNaN(Number(newRulePort)) ? newRulePort : Number(newRulePort),
      direction: newRuleDirection,
      action: newRuleAction,
      enabled: true,
    };

    setRules((prev) => [...prev, created]);
    setIsAddingRule(false);
    setNewRuleName('');
    soundEngine.play('success');

    setLogs((prev) => [
      `[RULE_ADDED] ${created.action} ${created.protocol} port ${created.port} (${created.name})`,
      ...prev,
    ]);

    notificationService.notify({
      title: 'Firewall Rule Added',
      message: `${created.name}: ${created.action} port ${created.port}`,
      type: 'info',
      appId: 'firewall',
    });
  };

  const handleTerminateSocket = (pid: number) => {
    setSockets((prev) => prev.filter((s) => s.pid !== pid));
    soundEngine.playTrash();
    setLogs((prev) => [`[SOCKET_KILLED] Closed TCP stream for PID ${pid}`, ...prev]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              RocketOS Guard & Firewall
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Netfilter v2.1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Packet inspection, port routing & socket isolation</p>
          </div>
        </div>

        {/* Global Protection Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                firewallEnabled ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-semibold text-white">
              {firewallEnabled ? 'Firewall Active' : 'Protection Disabled'}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !firewallEnabled;
                setFirewallEnabled(next);
                soundEngine.play('click');
              }}
              className={`ml-2 px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-colors ${
                firewallEnabled
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
              }`}
            >
              {firewallEnabled ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Status & Navigation Bar */}
      <div className="p-4 border-b border-white/10 bg-slate-900/40 flex items-center justify-between shrink-0">
        {/* Navigation Tabs */}
        <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Port Rules ({rules.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sockets')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
              activeTab === 'sockets'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownUp className="w-4 h-4" />
            <span>Active Sockets ({sockets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Security Logs</span>
          </button>
        </div>

        {/* Feature Switches */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setStealthMode((p) => !p);
              soundEngine.play('click');
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              stealthMode
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Stealth Mode</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDdosProtection((p) => !p);
              soundEngine.play('click');
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              ddosProtection
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>DDoS Shield</span>
          </button>

          {activeTab === 'rules' && (
            <button
              type="button"
              onClick={() => setIsAddingRule(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        {activeTab === 'rules' && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
              <div className="col-span-4">Rule Description</div>
              <div className="col-span-2">Protocol & Port</div>
              <div className="col-span-2">Direction</div>
              <div className="col-span-2">Policy Action</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {rules.map((rule) => (
              <div
                key={rule.id}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/10 text-xs transition-colors"
              >
                <div className="col-span-4 font-semibold text-white truncate flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      rule.enabled
                        ? rule.action === 'ALLOW'
                          ? 'bg-emerald-400'
                          : 'bg-rose-500'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>{rule.name}</span>
                </div>

                <div className="col-span-2 font-mono text-slate-300">
                  <span className="font-bold text-sky-400">{rule.protocol}</span> / {rule.port}
                </div>

                <div className="col-span-2 text-slate-400">{rule.direction}</div>

                <div className="col-span-2">
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                      rule.action === 'ALLOW'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {rule.action}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px]"
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sockets' && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
              <div className="col-span-3">Process (PID)</div>
              <div className="col-span-1">Proto</div>
              <div className="col-span-3">Local Address</div>
              <div className="col-span-2">Remote Address</div>
              <div className="col-span-1">State</div>
              <div className="col-span-2 text-right">Terminate</div>
            </div>

            {sockets.map((sock) => (
              <div
                key={sock.pid}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/10 text-xs transition-colors"
              >
                <div className="col-span-3 font-semibold text-white truncate flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>{sock.process}</span>
                  <span className="font-mono text-slate-500 text-[10px]">({sock.pid})</span>
                </div>

                <div className="col-span-1 font-mono text-slate-300 font-bold">{sock.protocol}</div>

                <div className="col-span-3 font-mono text-sky-300 truncate">
                  {sock.localAddress}
                </div>

                <div className="col-span-2 font-mono text-slate-400 truncate">
                  {sock.remoteAddress}
                </div>

                <div className="col-span-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      sock.state === 'LISTEN'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {sock.state}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleTerminateSocket(sock.pid)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors"
                  >
                    Close Socket
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-1.5 font-mono text-xs">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-slate-300 flex items-center gap-2.5"
              >
                <span className="text-slate-500 text-[10px]">{idx + 1}</span>
                <span
                  className={
                    log.includes('ALLOW')
                      ? 'text-emerald-400'
                      : log.includes('BLOCK') || log.includes('dropped')
                      ? 'text-rose-400'
                      : 'text-sky-300'
                  }
                >
                  {log}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {isAddingRule && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                Add Firewall Port Rule
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Custom API Gateway"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Protocol</label>
                  <select
                    value={newRuleProto}
                    onChange={(e) => setNewRuleProto(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Port Number</label>
                  <input
                    type="text"
                    required
                    value={newRulePort}
                    onChange={(e) => setNewRulePort(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Direction</label>
                  <select
                    value={newRuleDirection}
                    onChange={(e) => setNewRuleDirection(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none"
                  >
                    <option value="Inbound">Inbound</option>
                    <option value="Outbound">Outbound</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Action</label>
                  <select
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none"
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="BLOCK">BLOCK</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
