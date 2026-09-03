// TaskManagerApp.tsx
// Authoritative Task & Resource Supervisor for RocketOS
// Directly coupled with ProcessManager, ServiceManager, SessionManager, and TelemetryProvider
// Exposes honest metric provenance: REAL, ESTIMATED, SIMULATED, UNAVAILABLE

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Users,
  HardDrive,
  Cpu,
  Wifi,
  Square,
  Play,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Info,
  Clock,
} from 'lucide-react';
import { ProcessManager } from '../../core/process/ProcessManager';
import { ProcessRecord, ProcessState } from '../../core/process/ProcessTypes';
import { ServiceManager } from '../../core/services/ServiceManager';
import { ServiceInstance } from '../../core/services/ServiceTypes';
import { SessionManager } from '../../core/sessions/SessionManager';
import { UserSessionRecord } from '../../core/sessions/SessionTypes';
import { TelemetryProvider } from '../../core/telemetry/TelemetryProvider';
import { MetricProvenance, TelemetrySnapshot } from '../../core/telemetry/TelemetryTypes';
import { WindowState } from '../../types';

interface TaskManagerAppProps {
  windows: WindowState[];
  onCloseWindow?: (id: string) => void;
}

export const TaskManagerApp: React.FC<TaskManagerAppProps> = ({ windows, onCloseWindow }) => {
  const [activeTab, setActiveTab] = useState<'processes' | 'services' | 'sessions' | 'telemetry'>('processes');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const procMgr = ProcessManager.getInstance();
  const svcMgr = ServiceManager.getInstance();
  const sessionMgr = SessionManager.getInstance();
  const telemetry = TelemetryProvider.getInstance();

  const [processes, setProcesses] = useState<ProcessRecord[]>(() => procMgr.getAllProcesses());
  const [services, setServices] = useState<ServiceInstance[]>(() => svcMgr.listServices());
  const [session, setSession] = useState<UserSessionRecord>(() => sessionMgr.getCurrentSession());
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(() => telemetry.getSnapshot());

  // Subscribe to updates
  useEffect(() => {
    const unsubProc = procMgr.subscribe(() => setProcesses(procMgr.getAllProcesses()));
    const unsubSvc = svcMgr.subscribe(() => setServices(svcMgr.listServices()));
    const unsubSession = sessionMgr.subscribe(() => setSession(sessionMgr.getCurrentSession()));
    const unsubTelem = telemetry.subscribe(() => setSnapshot(telemetry.getSnapshot()));

    return () => {
      unsubProc();
      unsubSvc();
      unsubSession();
      unsubTelem();
    };
  }, [procMgr, svcMgr, sessionMgr, telemetry]);

  const handleEndProcess = () => {
    if (!selectedPid) return;
    const proc = processes.find((p) => p.pid === selectedPid);
    if (!proc) return;

    if (proc.windowId && onCloseWindow) {
      onCloseWindow(proc.windowId);
    }
    procMgr.kill(selectedPid, 15);
    setSelectedPid(null);
  };

  const handleServiceAction = (action: 'start' | 'stop' | 'restart') => {
    if (!selectedServiceId) return;
    if (action === 'start') svcMgr.start(selectedServiceId);
    else if (action === 'stop') svcMgr.stop(selectedServiceId);
    else if (action === 'restart') svcMgr.restart(selectedServiceId);
  };

  const getProvenanceBadge = (prov: MetricProvenance) => {
    switch (prov) {
      case 'REAL':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">REAL</span>;
      case 'ESTIMATED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">ESTIMATED</span>;
      case 'SIMULATED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold">SIMULATED</span>;
      case 'UNAVAILABLE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/20 text-slate-400 border border-slate-500/30 font-semibold">UNAVAILABLE</span>;
    }
  };

  const getStateBadge = (state: ProcessState) => {
    switch (state) {
      case 'RUNNING':
        return <span className="text-emerald-400 font-semibold">Running</span>;
      case 'READY':
        return <span className="text-sky-400 font-semibold">Ready</span>;
      case 'SLEEPING':
        return <span className="text-slate-400">Sleeping</span>;
      case 'BLOCKED':
        return <span className="text-amber-400">Blocked</span>;
      case 'STOPPED':
        return <span className="text-rose-400">Stopped</span>;
      case 'ZOMBIE':
        return <span className="text-slate-500">Zombie</span>;
    }
  };

  const selectedProcess = processes.find((p) => p.pid === selectedPid);
  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <div id="task-manager-app" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Liquid Glass Header Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('processes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'processes' ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Processes ({processes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'services' ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Services ({snapshot.activeServiceCount}/{services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'sessions' ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Elevation</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'telemetry' ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Honest Telemetry</span>
          </button>
        </div>

        {/* Global Action Button */}
        {activeTab === 'processes' && (
          <button
            onClick={handleEndProcess}
            disabled={!selectedPid || selectedPid === 1}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedPid && selectedPid !== 1
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer'
                : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Square className="w-3 h-3 fill-current" />
            <span>End Task</span>
          </button>
        )}

        {activeTab === 'services' && selectedService && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleServiceAction('start')}
              disabled={selectedService.state === 'RUNNING'}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-3 h-3" /> Start
            </button>
            <button
              onClick={() => handleServiceAction('stop')}
              disabled={selectedService.state === 'STOPPED' || selectedService.isCritical}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Square className="w-3 h-3 fill-current" /> Stop
            </button>
            <button
              onClick={() => handleServiceAction('restart')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30"
            >
              <RotateCw className="w-3 h-3" /> Restart
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {/* ================= PROCESSES TAB ================= */}
        {activeTab === 'processes' && (
          <div className="flex flex-col h-full">
            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-white/10">
                    <th className="py-2.5 px-3">PID</th>
                    <th className="py-2.5 px-3">Name / Command</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">UID</th>
                    <th className="py-2.5 px-3 text-right">CPU</th>
                    <th className="py-2.5 px-3 text-right">Memory RSS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {processes.map((proc) => {
                    const isSelected = proc.pid === selectedPid;
                    const memMb = (proc.accounting.memoryRssBytes / (1024 * 1024)).toFixed(1);
                    const cpuPercent = (proc.accounting.cpuPercentTenth / 10).toFixed(1);

                    return (
                      <tr
                        key={proc.pid}
                        onClick={() => setSelectedPid(proc.pid)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-500/20 text-sky-200' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-slate-400">{proc.pid}</td>
                        <td className="py-2 px-3 font-medium text-slate-100 flex items-center gap-2">
                          <span>{proc.name}</span>
                          {proc.pid === 1 && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                              INIT ROOT
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {proc.isBackgroundDaemon ? 'Daemon' : 'GUI App'}
                        </td>
                        <td className="py-2 px-3">{getStateBadge(proc.state)}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{proc.uid}</td>
                        <td className="py-2 px-3 text-right font-mono">{cpuPercent}%</td>
                        <td className="py-2 px-3 text-right font-mono">{memMb} MB</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedProcess && (
              <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-white/10 text-[11px] text-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Process Details:</span>{' '}
                  <span className="font-semibold text-white">{selectedProcess.name}</span> (PID {selectedProcess.pid}, PPID {selectedProcess.ppid})
                  <span className="ml-3 text-slate-400">Virtual Memory:</span> {(selectedProcess.accounting.virtualMemoryBytes / (1024 * 1024)).toFixed(1)} MB
                </div>
                <div>
                  <span className="text-slate-400">Capabilities:</span> [
                  {Object.entries(selectedProcess.capabilities)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(', ')}
                  ]
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SERVICES TAB ================= */}
        {activeTab === 'services' && (
          <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-white/10">
                  <th className="py-2.5 px-3">Service ID</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Backing PID</th>
                  <th className="py-2.5 px-3">Restarts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {services.map((svc) => {
                  const isSelected = svc.id === selectedServiceId;
                  const isRunning = svc.state === 'RUNNING';

                  return (
                    <tr
                      key={svc.id}
                      onClick={() => setSelectedServiceId(svc.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-500/20 text-sky-200' : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-medium text-slate-100 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        {svc.id}
                        {svc.isCritical && (
                          <span className="text-[10px] text-amber-400 ml-1">(critical)</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-300">{svc.name}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            isRunning ? 'text-emerald-400' : svc.state === 'FAILED' ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {svc.state}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{svc.startupMode}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{svc.processId || '-'}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{svc.restartCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= SESSIONS TAB ================= */}
        {activeTab === 'sessions' && (
          <div className="space-y-4 max-w-3xl">
            <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  <span className="font-bold text-white text-sm">Active Session: {session.user.username}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {session.state}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <div className="text-slate-500 text-[10px]">Session ID</div>
                  <div className="font-mono font-semibold text-white">{session.sessionId}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <div className="text-slate-500 text-[10px]">User & UID</div>
                  <div className="font-mono font-semibold text-white">
                    {session.user.username} (UID {session.user.uid})
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <div className="text-slate-500 text-[10px]">Primary Group</div>
                  <div className="font-mono font-semibold text-white">GID {session.user.primaryGid}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <div className="text-slate-500 text-[10px]">Workspace</div>
                  <div className="font-mono font-semibold text-white">Workspace {session.workspaceId}</div>
                </div>
              </div>

              {/* Elevation Status Box */}
              <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {session.elevation.isElevated ? (
                    <ShieldCheck className="w-5 h-5 text-rose-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-slate-500" />
                  )}
                  <div>
                    <div className="font-semibold text-white">
                      Privilege Elevation (sudo):{' '}
                      <span className={session.elevation.isElevated ? 'text-rose-400' : 'text-slate-400'}>
                        {session.elevation.isElevated ? 'ELEVATED (UID 0 root capability active)' : 'Standard User (Unprivileged)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {session.elevation.isElevated
                        ? session.elevation.expiresAtEpochMs > 0
                          ? `Temporary grant expires in ${Math.max(0, Math.round((session.elevation.expiresAtEpochMs - Date.now()) / 1000))}s`
                          : 'Persistent root session'
                        : 'Administrative commands require authentication or sudo'}
                    </div>
                  </div>
                </div>
                {session.elevation.isElevated && (
                  <button
                    onClick={() => sessionMgr.dropElevation()}
                    className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    Drop Sudo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TELEMETRY TAB ================= */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            <div className="p-3 bg-sky-950/20 rounded-xl border border-sky-900/30 text-sky-200 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-sky-400" />
              <span>
                <strong>Platform Honesty Policy:</strong> RocketOS explicitly reports whether metrics are queried directly from the browser environment, calculated from genuine internal tables, modeled architecturally, or inaccessible in sandbox.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {snapshot.metrics.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{m.name}</span>
                    {getProvenanceBadge(m.provenance)}
                  </div>
                  <div className="text-xl font-mono font-bold text-white">{m.valueDisplay}</div>
                  <div className="text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
                    {m.provenanceNote}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
