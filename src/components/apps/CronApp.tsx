import React, { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Plus,
  Trash2,
  RotateCcw,
  Activity,
  Terminal,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface CronJob {
  id: string;
  name: string;
  expression: string;
  scheduleLabel: string;
  command: string;
  lastRun: string;
  nextRun: string;
  status: 'active' | 'paused';
  runCount: number;
}

interface DaemonService {
  id: string;
  name: string;
  description: string;
  pid: number;
  status: 'running' | 'idle' | 'stopped';
  memoryMb: number;
}

export const CronApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cron' | 'daemons' | 'logs'>('cron');

  const [cronJobs, setCronJobs] = useState<CronJob[]>([
    {
      id: 'job-1',
      name: 'Automated Snapshot Backup',
      expression: '0 0 * * *',
      scheduleLabel: 'Daily at Midnight',
      command: 'rkt-backup --snapshot /home/ryan',
      lastRun: '13 hours ago',
      nextRun: 'in 11 hours',
      status: 'active',
      runCount: 42,
    },
    {
      id: 'job-2',
      name: 'Zero-Copy Filesystem Indexer',
      expression: '*/15 * * * *',
      scheduleLabel: 'Every 15 minutes',
      command: 'rocketc --reindex-symbols /pkg',
      lastRun: '4 mins ago',
      nextRun: 'in 11 mins',
      status: 'active',
      runCount: 184,
    },
    {
      id: 'job-3',
      name: 'ARC Thread-Confined Memory GC Rebalance',
      expression: '0 * * * *',
      scheduleLabel: 'Hourly',
      command: 'sys.gc --clean-zombies',
      lastRun: '22 mins ago',
      nextRun: 'in 38 mins',
      status: 'active',
      runCount: 96,
    },
  ]);

  const [daemons, setDaemons] = useState<DaemonService[]>([
    {
      id: 'd1',
      name: 'rkt-cron-scheduler',
      description: 'Authoritative system event loop and timer runner',
      pid: 104,
      status: 'running',
      memoryMb: 12.4,
    },
    {
      id: 'd2',
      name: 'rkt-meshsync-daemon',
      description: 'P2P RocketDrop subnet packet listener',
      pid: 118,
      status: 'running',
      memoryMb: 18.2,
    },
    {
      id: 'd3',
      name: 'rkt-notification-bus',
      description: 'Desktop IPC notification dispatcher',
      pid: 142,
      status: 'running',
      memoryMb: 8.6,
    },
  ]);

  const [logs, setLogs] = useState<string[]>([
    '[13:00:00] [CRON] rkt-backup-snapshot: job executed successfully in 142ms',
    '[13:15:00] [CRON] rkt-reindex-symbols: scanned 218 source symbols in pkg/raylib',
    '[13:30:00] [CRON] sys.gc: thread-confined ARC rebalanced 14 nodes (0 leaks)',
  ]);

  // Form for new cron job
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newJobName, setNewJobName] = useState<string>('');
  const [newJobExpr, setNewJobExpr] = useState<string>('*/5 * * * *');
  const [newJobCmd, setNewJobCmd] = useState<string>('print("Scheduled ping")');

  const toggleJobStatus = (id: string) => {
    setCronJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, status: j.status === 'active' ? 'paused' : 'active' } : j
      )
    );
    soundEngine.playClick();
  };

  const handleRunNow = (job: CronJob) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      `[${timestamp}] [MANUAL] Triggered: ${job.name} (${job.command}) -> exit 0 (OK)`,
      ...prev,
    ]);
    setCronJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? {
              ...j,
              lastRun: 'Just now',
              runCount: j.runCount + 1,
            }
          : j
      )
    );
    soundEngine.playSuccess();
  };

  const handleDeleteJob = (id: string) => {
    setCronJobs((prev) => prev.filter((j) => j.id !== id));
    soundEngine.playClick();
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim() || !newJobCmd.trim()) return;

    const newJob: CronJob = {
      id: `job-${Date.now()}`,
      name: newJobName.trim(),
      expression: newJobExpr,
      scheduleLabel: newJobExpr === '*/5 * * * *' ? 'Every 5 mins' : 'Custom Interval',
      command: newJobCmd.trim(),
      lastRun: 'Never',
      nextRun: 'in 5 mins',
      status: 'active',
      runCount: 0,
    };

    setCronJobs([...cronJobs, newJob]);
    setShowAddModal(false);
    setNewJobName('');
    setNewJobCmd('');
    soundEngine.playSuccess();
  };

  const toggleDaemon = (id: string) => {
    setDaemons((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: d.status === 'running' ? 'stopped' : 'running' }
          : d
      )
    );
    soundEngine.playClick();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">
            Rocket Task Scheduler & Cron Daemons
          </span>
        </div>

        {/* Tab Selector & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveTab('cron')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'cron'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Cron Jobs ({cronJobs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('daemons')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'daemons'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Daemons ({daemons.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Daemon Logs</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>New Job</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {activeTab === 'cron' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div>
              <h2 className="text-sm font-semibold text-white">Scheduled Tasks</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated background executions synchronized via the kernel timer tick.
              </p>
            </div>

            <div className="space-y-3">
              {cronJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{job.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            job.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {job.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                          {job.expression}
                        </span>
                        <span>{job.scheduleLabel}</span>
                        <span>•</span>
                        <span>Last: {job.lastRun}</span>
                        <span>•</span>
                        <span className="text-slate-500">Run count: {job.runCount}</span>
                      </div>
                      <div className="mt-2 text-xs font-mono text-slate-300 bg-black/40 px-2 py-1 rounded-lg border border-white/5 inline-block">
                        $ {job.command}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleRunNow(job)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors border border-white/5"
                    >
                      <Play className="w-3 h-3" />
                      <span>Run Now</span>
                    </button>
                    <button
                      onClick={() => toggleJobStatus(job.id)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title={job.status === 'active' ? 'Pause job' : 'Resume job'}
                    >
                      {job.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                      title="Delete scheduled job"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'daemons' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div>
              <h2 className="text-sm font-semibold text-white">System Daemons & Supervisors</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Core persistent background listeners running under PID 1 (rocket-init).
              </p>
            </div>

            <div className="space-y-3">
              {daemons.map((daemon) => (
                <div
                  key={daemon.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{daemon.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">PID: {daemon.pid}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            daemon.status === 'running'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {daemon.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{daemon.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-400">{daemon.memoryMb} MB</span>
                    <button
                      onClick={() => toggleDaemon(daemon.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                        daemon.status === 'running'
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {daemon.status === 'running' ? 'Stop Daemon' : 'Start Daemon'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3 max-w-4xl mx-auto flex flex-col h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Execution Stream Logs</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time stdout/stderr from background timers and scheduled routines.
                </p>
              </div>
              <button
                onClick={() => setLogs([])}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer"
              >
                Clear Logs
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs text-emerald-400 space-y-1.5 overflow-y-auto max-h-[400px] custom-scrollbar shadow-inner">
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-slate-600 italic">Logs are currently empty.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Cron Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateJob}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-semibold text-sm text-white">Create New Scheduled Task</span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300">Task Name</label>
                <input
                  type="text"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="e.g. Clean Temporary Build Artifacts"
                  required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300">Cron Schedule Expression</label>
                <input
                  type="text"
                  value={newJobExpr}
                  onChange={(e) => setNewJobExpr(e.target.value)}
                  placeholder="*/5 * * * *"
                  required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300">Execution Command</label>
                <input
                  type="text"
                  value={newJobCmd}
                  onChange={(e) => setNewJobCmd(e.target.value)}
                  placeholder="rocketc --check /pkg"
                  required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-white outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
