import React, { useState, useMemo } from 'react';
import {
  Database,
  Table,
  Play,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  FileJson,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { notificationService } from '../../core/notifications/NotificationService';

interface TableSchema {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
}

export const DatabaseStudioApp: React.FC = () => {
  const [tables, setTables] = useState<TableSchema[]>([
    {
      name: 'users',
      columns: ['id', 'username', 'email', 'role', 'status', 'created_at'],
      rows: [
        { id: 1, username: 'ryan', email: 'ryan.eid@rocket.dev', role: 'admin', status: 'ACTIVE', created_at: '2026-08-01' },
        { id: 2, username: 'antigravity', email: 'agent@deepmind.google', role: 'system', status: 'ACTIVE', created_at: '2026-08-10' },
        { id: 3, username: 'guest', email: 'guest@rocket-os.org', role: 'user', status: 'SUSPENDED', created_at: '2026-08-25' },
        { id: 4, username: 'buildbot', email: 'ci@rocket-os.net', role: 'service', status: 'ACTIVE', created_at: '2026-09-01' },
      ],
    },
    {
      name: 'system_logs',
      columns: ['id', 'facility', 'level', 'message', 'timestamp'],
      rows: [
        { id: 101, facility: 'KERNEL', level: 'INFO', message: 'RocketOS 2.1 ABI v1 kernel initialized', timestamp: '14:00:01' },
        { id: 102, facility: 'VFS', level: 'INFO', message: 'Mounted root filesystem / (IndexedDB backend)', timestamp: '14:00:02' },
        { id: 103, facility: 'SCHEDULER', level: 'INFO', message: 'CPU scheduling ticks started with 4 cores', timestamp: '14:00:03' },
        { id: 104, facility: 'NET', level: 'WARN', message: 'Interface eth0 DHCP lease renewed', timestamp: '14:05:22' },
        { id: 105, facility: 'AUTH', level: 'INFO', message: 'User ryan authenticated via local PAM', timestamp: '14:07:10' },
      ],
    },
    {
      name: 'app_preferences',
      columns: ['key', 'value', 'type', 'synced'],
      rows: [
        { key: 'ui.theme', value: 'liquid-aurora', type: 'string', synced: true },
        { key: 'system.volume', value: '85', type: 'number', synced: true },
        { key: 'terminal.font', value: 'JetBrains Mono', type: 'string', synced: true },
        { key: 'dev.rocketc_opt', value: '-O3 -flto', type: 'string', synced: false },
        { key: 'window.blur_effects', value: 'true', type: 'boolean', synced: true },
      ],
    },
  ]);

  const [activeTableName, setActiveTableName] = useState<string>('users');
  const [queryText, setQueryText] = useState<string>('SELECT * FROM users WHERE status = "ACTIVE"');
  const [queryResult, setQueryResult] = useState<Record<string, any>[] | null>(null);
  const [queryTimeMs, setQueryTimeMs] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>('');

  const currentTable = tables.find((t) => t.name === activeTableName) || tables[0];

  const handleRunQuery = () => {
    soundEngine.play('click');
    setQueryError(null);
    const start = performance.now();

    try {
      const q = queryText.trim().toLowerCase();
      if (!q.startsWith('select')) {
        throw new Error('Only SELECT statements are supported in Query Studio.');
      }

      // Simple mock SQL parser
      let matchedRows = [...currentTable.rows];
      if (q.includes('where')) {
        const whereClause = queryText.split(/where/i)[1]?.trim();
        if (whereClause) {
          if (whereClause.includes('=')) {
            const [field, rawVal] = whereClause.split('=').map((s) => s.trim().replace(/['"]/g, ''));
            matchedRows = matchedRows.filter((r) => String(r[field]).toLowerCase() === rawVal.toLowerCase());
          }
        }
      }

      const elapsed = Number((performance.now() - start).toFixed(2));
      setQueryTimeMs(elapsed > 0 ? elapsed : 0.45);
      setQueryResult(matchedRows);
      soundEngine.playSuccess();
    } catch (err: any) {
      setQueryError(err.message);
      setQueryResult(null);
    }
  };

  const handleExportCsv = () => {
    soundEngine.play('snap');
    const headers = currentTable.columns.join(',');
    const rows = currentTable.rows.map((r) => currentTable.columns.map((c) => JSON.stringify(r[c] ?? '')).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentTable.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notificationService.sendNotification({
      title: 'Database Exported',
      body: `Saved ${currentTable.name}.csv with ${currentTable.rows.length} rows`,
      severity: 'info',
      sourceAppId: 'db-studio',
    });
  };

  const displayRows = queryResult || currentTable.rows;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-xs text-white">DataStore Studio</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
            SQLite / In-Memory
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer border border-white/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tables Sidebar */}
        <div className="w-56 border-r border-white/10 bg-slate-900/50 p-2.5 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 py-1">
            Schema Tables ({tables.length})
          </div>
          {tables.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => {
                soundEngine.play('click');
                setActiveTableName(t.name);
                setQueryResult(null);
                setQueryText(`SELECT * FROM ${t.name}`);
              }}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                activeTableName === t.name ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Table className="w-3.5 h-3.5" />
                <span>{t.name}</span>
              </div>
              <span className={`text-[10px] font-mono ${activeTableName === t.name ? 'text-slate-900' : 'text-slate-500'}`}>
                {t.rows.length}
              </span>
            </button>
          ))}
        </div>

        {/* Query & Data View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query Console */}
          <div className="p-3 bg-slate-900/80 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">SQL Query Console</span>
              {queryTimeMs && (
                <span className="text-emerald-400 font-mono text-[10px]">
                  Executed in {queryTimeMs} ms • {displayRows.length} rows returned
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-sky-300 outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleRunQuery}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm shadow-emerald-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </button>
            </div>

            {queryError && <div className="text-xs text-rose-400 font-mono">{queryError}</div>}
          </div>

          {/* Data Table Grid */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-black/30 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-white/10 sticky top-0 backdrop-blur-md">
                  {currentTable.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {displayRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    {currentTable.columns.map((col) => (
                      <td key={col} className="py-2 px-3 text-slate-200">
                        {typeof row[col] === 'boolean' ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              row[col] ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {String(row[col])}
                          </span>
                        ) : (
                          String(row[col] ?? '')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
