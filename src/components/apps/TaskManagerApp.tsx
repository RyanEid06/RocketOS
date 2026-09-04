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
  Pause,
  Plus,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Info,
  Clock,
  X,
  Radio,
  Send,
  MessageSquare,
} from 'lucide-react';
import { ProcessManager } from '../../core/process/ProcessManager';
import { ProcessPriority, ProcessRecord, ProcessState } from '../../core/process/ProcessTypes';
import { ServiceManager } from '../../core/services/ServiceManager';
import { ServiceInstance } from '../../core/services/ServiceTypes';
import { SessionManager } from '../../core/sessions/SessionManager';
import { UserSessionRecord } from '../../core/sessions/SessionTypes';
import { TelemetryProvider } from '../../core/telemetry/TelemetryProvider';
import { MetricProvenance, TelemetrySnapshot } from '../../core/telemetry/TelemetryTypes';
import { AppRegistry } from '../../core/apps/AppRegistry';
import { AppId, WindowState } from '../../types';
import { ipcManager, IPCChannelInfo, IPCMessage } from '../../core/ipc/IPCChannelManager';

interface TaskManagerAppProps {
  windows: WindowState[];
  onCloseWindow?: (id: string) => void;
  onLaunchApp?: (appId: AppId) => void;
}

export const TaskManagerApp: React.FC<TaskManagerAppProps> = ({ windows, onCloseWindow, onLaunchApp }) => {
  const [activeTab, setActiveTab] = useState<'processes' | 'services' | 'sessions' | 'telemetry' | 'ipc'>('processes');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [newTaskAppId, setNewTaskAppId] = useState<AppId>('editor');

  const procMgr = ProcessManager.getInstance();
  const svcMgr = ServiceManager.getInstance();
  const sessionMgr = SessionManager.getInstance();
  const telemetry = TelemetryProvider.getInstance();

  const [processes, setProcesses] = useState<ProcessRecord[]>(() => procMgr.getAllProcesses());
  const [services, setServices] = useState<ServiceInstance[]>(() => svcMgr.listServices());
  const [session, setSession] = useState<UserSessionRecord>(() => sessionMgr.getCurrentSession());
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(() => telemetry.getSnapshot());
  const [ipcChannels, setIpcChannels] = useState<IPCChannelInfo[]>(() => ipcManager.listChannels());
  const [ipcMessages, setIpcMessages] = useState<IPCMessage[]>(() => ipcManager.getRecentMessages());
  const [broadcastInput, setBroadcastInput] = useState<string>('Hello from Task Manager IPC test');

  // Subscribe to updates
  useEffect(() => {
    const unsubProc = procMgr.subscribe(() => setProcesses(procMgr.getAllProcesses()));
    const unsubSvc = svcMgr.subscribe(() => setServices(svcMgr.listServices()));
    const unsubSession = sessionMgr.subscribe(() => setSession(sessionMgr.getCurrentSession()));
    const unsubTelem = telemetry.subscribe(() => setSnapshot(telemetry.getSnapshot()));
    const unsubIpc = ipcManager.subscribeChanges(() => {
      setIpcChannels(ipcManager.listChannels());
      setIpcMessages(ipcManager.getRecentMessages());
    });

    return () => {
      unsubProc();
      unsubSvc();
      unsubSession();
      unsubTelem();
      unsubIpc();
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

  const handleSuspendProcess = () => {
    if (!selectedPid || selectedPid === 1) return;
    procMgr.suspend(selectedPid);
  };

  const handleResumeProcess = () => {
    if (!selectedPid) return;
    procMgr.resume(selectedPid);
  };

  const handleStartNewTask = () => {
    if (onLaunchApp) {
      onLaunchApp(newTaskAppId);
    } else {
      procMgr.spawnProcess({
        appId: newTaskAppId,
        workspaceId: 1,
      });
    }
    setIsNewTaskModalOpen(false);
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
            <span>System Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('ipc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ipc' ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>IPC Message Bus</span>
          </button>
        </div>

        {/* Process Actions Bar */}
        {activeTab === 'processes' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start New Task</span>
            </button>

            <button
              onClick={handleSuspendProcess}
              disabled={!selectedPid || selectedPid === 1 || selectedProcess?.state === 'STOPPED'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Suspend</span>
            </button>

            <button
              onClick={handleResumeProcess}
              disabled={!selectedPid || selectedProcess?.state !== 'STOPPED'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>

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
              <span>Kill</span>
            </button>
          </div>
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
                    <th className="py-2.5 px-3">Threads</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Quota</th>
                    <th className="py-2.5 px-3">Workspace</th>
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
                    const priority = proc.priority || 'NORMAL';

                    const priorityBadgeColor =
                      priority === 'REALTIME'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : priority === 'LOW'
                        ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/30';

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
                        <td className="py-2 px-3 font-mono text-slate-300">{proc.threadsCount || 1} th</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${priorityBadgeColor}`}>
                            {priority}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-400">{proc.cpuQuotaPercent ?? 100}%</td>
                        <td className="py-2 px-3 font-mono text-sky-300">WS {proc.workspaceId || 1}</td>
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
              <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-white/10 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-slate-400">Process Details:</span>{' '}
                  <span className="font-semibold text-white">{selectedProcess.name}</span> (PID {selectedProcess.pid}, PPID {selectedProcess.ppid})
                  <span className="ml-3 text-slate-400">Virtual Memory:</span> {(selectedProcess.accounting.virtualMemoryBytes / (1024 * 1024)).toFixed(1)} MB
                </div>

                {/* Scheduler Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Priority:</span>
                  <select
                    value={selectedProcess.priority || 'NORMAL'}
                    onChange={(e) => {
                      procMgr.setProcessPriority(selectedProcess.pid, e.target.value as ProcessPriority);
                      setProcesses(procMgr.getAllProcesses());
                    }}
                    className="bg-slate-800 text-xs px-2 py-1 rounded border border-white/10 text-sky-300 cursor-pointer outline-none"
                  >
                    <option value="LOW">LOW (0.4x)</option>
                    <option value="NORMAL">NORMAL (1.0x)</option>
                    <option value="HIGH">HIGH (1.8x)</option>
                    <option value="REALTIME">REALTIME (2.8x)</option>
                  </select>

                  <span className="ml-2 text-slate-400">CPU Quota:</span>
                  <select
                    value={selectedProcess.cpuQuotaPercent ?? 100}
                    onChange={(e) => {
                      procMgr.setProcessCpuQuota(selectedProcess.pid, Number(e.target.value));
                      setProcesses(procMgr.getAllProcesses());
                    }}
                    className="bg-slate-800 text-xs px-2 py-1 rounded border border-white/10 text-emerald-300 cursor-pointer outline-none"
                  >
                    <option value={100}>100% (Uncapped)</option>
                    <option value={75}>75% (3/4 Core)</option>
                    <option value={50}>50% (Half Core)</option>
                    <option value={25}>25% (Throttled)</option>
                  </select>

                  <span className="ml-2 text-slate-400">Threads:</span>
                  <button
                    type="button"
                    onClick={() => {
                      procMgr.setProcessThreads(selectedProcess.pid, Math.max(1, (selectedProcess.threadsCount || 1) - 1));
                      setProcesses(procMgr.getAllProcesses());
                    }}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-white">{selectedProcess.threadsCount || 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      procMgr.setProcessThreads(selectedProcess.pid, Math.min(32, (selectedProcess.threadsCount || 1) + 1));
                      setProcesses(procMgr.getAllProcesses());
                    }}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    +
                  </button>
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

        {/* ================= IPC MESSAGE BUS TAB ================= */}
        {activeTab === 'ipc' && (
          <div className="space-y-4">
            {/* Header / Dispatcher */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
                <span className="font-semibold text-white text-xs">RocketOS Inter-Process Message Bus</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                  {ipcChannels.length} Channels Active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={broadcastInput}
                  onChange={(e) => setBroadcastInput(e.target.value)}
                  placeholder="Broadcast message..."
                  className="px-2.5 py-1 text-xs bg-slate-950 rounded-lg border border-white/10 text-white outline-none w-64 focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (broadcastInput.trim()) {
                      ipcManager.broadcast('system:notifications', { text: broadcastInput.trim(), sender: 'TaskManager' }, 1);
                      setIpcMessages(ipcManager.getRecentMessages());
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Broadcast</span>
                </button>
              </div>
            </div>

            {/* Channels Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-md">
              <div className="px-3 py-2 bg-slate-800/80 border-b border-white/10 text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Registered Message Channels</span>
                <span className="text-[10px] text-slate-400">Owner PID / Subscribers</span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/20 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-white/5">
                    <th className="py-2 px-3">Channel Name</th>
                    <th className="py-2 px-3">Owner</th>
                    <th className="py-2 px-3 text-center">Subscribers</th>
                    <th className="py-2 px-3 text-right">Messages Delivered</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ipcChannels.map((chan) => (
                    <tr key={chan.name} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-sky-300 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>{chan.name}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400">PID {chan.ownerPid}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-400">{chan.subscribersCount}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{chan.totalMessagesSent}</td>
                      <td className="py-2 px-3 text-right">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold">
                          ONLINE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Message Stream */}
            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-md">
              <div className="px-3 py-2 bg-slate-800/80 border-b border-white/10 text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Live IPC Packet Stream</span>
                <span className="text-[10px] text-slate-400">FIFO Buffer ({ipcMessages.length} packets)</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-white/5 font-mono text-[11px]">
                {ipcMessages.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">No IPC packets dispatched yet. Click "Broadcast" to test.</div>
                ) : (
                  ipcMessages.map((msg) => (
                    <div key={msg.id} className="p-2 hover:bg-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500">{new Date(msg.timestampEpochMs).toLocaleTimeString()}</span>
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-semibold">
                          {msg.channel}
                        </span>
                        <span className="text-slate-400">PID {msg.senderPid}:</span>
                        <span className="text-slate-200 truncate">{JSON.stringify(msg.payload)}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0">{msg.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-2xl shadow-2xl p-4 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Create / Spawn Process</span>
              </div>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Select Registered Application</label>
              <select
                value={newTaskAppId}
                onChange={(e) => setNewTaskAppId(e.target.value as AppId)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {AppRegistry.getAllApps().map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.displayName} ({app.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-1">
              <div>• Spawns child process under PID {procMgr.getAllProcesses().length + 1}</div>
              <div>• Assigns default sandbox memory budget and security contract</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/10 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleStartNewTask}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20"
              >
                Launch Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
