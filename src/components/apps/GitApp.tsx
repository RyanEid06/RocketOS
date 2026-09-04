import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Plus,
  Check,
  RotateCcw,
  Clock,
  FileCode,
  Folder,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Tag,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { UserManager } from '../../core/users/UserManager';

interface CommitItem {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: string;
  branch: string;
  filesChanged: number;
}

interface ChangedFile {
  id: string;
  path: string;
  status: 'modified' | 'added' | 'deleted';
  staged: boolean;
  diffOld: string[];
  diffNew: string[];
}

export const GitApp: React.FC = () => {
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [branches, setBranches] = useState<string[]>(['main', 'feature/abi-v1', 'patch/simd-json']);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [showNewBranchInput, setShowNewBranchInput] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'changes' | 'history' | 'branches'>('changes');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('file-1');

  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([
    {
      id: 'file-1',
      path: 'src/main.rocket',
      status: 'modified',
      staged: false,
      diffOld: [
        'fn main() -> Int:',
        '    print("Initializing RocketOS...")',
        '    let status = 0',
        '    return status',
      ],
      diffNew: [
        'fn main() -> Int:',
        '    print("Initializing RocketOS 2.1 ABI v1...")',
        '    # Thread-confined memory allocation',
        '    let status = 0',
        '    return status',
      ],
    },
    {
      id: 'file-2',
      path: 'pkg/raylib.rocket',
      status: 'modified',
      staged: true,
      diffOld: [
        'import rocket.raylib',
        'fn render() -> Unit:',
        '    raylib.clear_background(0x101216)',
      ],
      diffNew: [
        'import rocket.raylib',
        'import rocket.motion',
        'fn render() -> Unit:',
        '    let t = motion.ease_in_out_cubic(0.5)',
        '    raylib.clear_background(0x0f172a)',
      ],
    },
    {
      id: 'file-3',
      path: 'config/rockpm.toml',
      status: 'added',
      staged: false,
      diffOld: [],
      diffNew: [
        '[package]',
        'name = "my_app"',
        'version = "2.1.0"',
        'abi = "v1"',
        '[dependencies]',
        'rocket.raylib = "6.0.2"',
        'rocket.json = "2.0.0"',
      ],
    },
  ]);

  const [commits, setCommits] = useState<CommitItem[]>([
    {
      hash: 'a78d2b998cfb61e2908f',
      shortHash: 'a78d2b9',
      message: 'feat: add SIMD json acceleration and zero-copy string slicing',
      author: 'RyanEid06',
      timestamp: '2 hours ago',
      branch: 'main',
      filesChanged: 4,
    },
    {
      hash: '5e41c08e54736f33910c',
      shortHash: '5e41c08',
      message: 'fix: conform ARC deallocator to frozen 2.0 ABI v1 specs',
      author: 'RyanEid06',
      timestamp: 'Yesterday',
      branch: 'main',
      filesChanged: 2,
    },
    {
      hash: '1b893f412401dc2280aa',
      shortHash: '1b893f4',
      message: 'chore: initial bootstrap of Rocket compiler runtime',
      author: 'RyanEid06',
      timestamp: '3 days ago',
      branch: 'main',
      filesChanged: 18,
    },
  ]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const selectedFile = changedFiles.find((f) => f.id === selectedFileId) || changedFiles[0];

  const toggleStage = (id: string) => {
    setChangedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, staged: !f.staged } : f))
    );
    soundEngine.playClick();
  };

  const stageAll = (stage: boolean) => {
    setChangedFiles((prev) => prev.map((f) => ({ ...f, staged: stage })));
    soundEngine.playClick();
  };

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    const staged = changedFiles.filter((f) => f.staged);
    if (staged.length === 0) return;

    const newHash = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const newCommit: CommitItem = {
      hash: newHash,
      shortHash: newHash.substring(0, 7),
      message: commitMessage.trim(),
      author: 'Ryan (ryan@rocketos)',
      timestamp: 'Just now',
      branch: currentBranch,
      filesChanged: staged.length,
    };

    setCommits([newCommit, ...commits]);
    setChangedFiles((prev) => prev.filter((f) => !f.staged));
    setCommitMessage('');
    soundEngine.playSuccess();
  };

  const handleSync = () => {
    setIsSyncing(true);
    soundEngine.playClick();
    setTimeout(() => {
      setIsSyncing(false);
      soundEngine.playSuccess();
    }, 1000);
  };

  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;
    const clean = newBranchName.trim().replace(/\s+/g, '-');
    if (!branches.includes(clean)) {
      setBranches([...branches, clean]);
      setCurrentBranch(clean);
      setNewBranchName('');
      setShowNewBranchInput(false);
      soundEngine.playSuccess();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header & Toolbar */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">Rocket Git & Source Control</span>

          {/* Branch Selector Dropdown */}
          <div className="relative flex items-center gap-1.5 ml-2">
            <span className="text-[11px] text-slate-400">Branch:</span>
            <select
              value={currentBranch}
              onChange={(e) => setCurrentBranch(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-sky-300 font-mono outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Tabs & Sync */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveTab('changes')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'changes'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitPullRequest className="w-3 h-3" />
              <span>Changes ({changedFiles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>History ({commits.length})</span>
            </button>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
            title="Fetch and rebase with upstream repository"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-orange-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'changes' ? (
          <>
            {/* Left Sidebar: Staged & Unstaged Files + Commit Box */}
            <div className="w-80 border-r border-white/10 bg-slate-900/40 flex flex-col justify-between shrink-0 overflow-hidden">
              {/* File Lists */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                {/* Staged Section */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>Staged Changes ({changedFiles.filter((f) => f.staged).length})</span>
                    <button
                      onClick={() => stageAll(false)}
                      className="text-orange-400 hover:underline cursor-pointer lowercase font-normal"
                    >
                      unstage all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {changedFiles
                      .filter((f) => f.staged)
                      .map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFileId(file.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition-all ${
                            selectedFileId === file.id
                              ? 'bg-orange-500/20 border-orange-500/40 text-white'
                              : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-emerald-400 font-mono text-[10px] font-bold">
                              {file.status === 'modified' ? 'M' : file.status === 'added' ? 'A' : 'D'}
                            </span>
                            <span className="truncate font-mono">{file.path}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStage(file.id);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Unstage file"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    {changedFiles.filter((f) => f.staged).length === 0 && (
                      <div className="text-[11px] text-slate-500 italic p-1.5">
                        No changes staged for commit.
                      </div>
                    )}
                  </div>
                </div>

                {/* Changes / Unstaged Section */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>Working Tree Changes ({changedFiles.filter((f) => !f.staged).length})</span>
                    <button
                      onClick={() => stageAll(true)}
                      className="text-orange-400 hover:underline cursor-pointer lowercase font-normal"
                    >
                      stage all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {changedFiles
                      .filter((f) => !f.staged)
                      .map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFileId(file.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition-all ${
                            selectedFileId === file.id
                              ? 'bg-orange-500/20 border-orange-500/40 text-white'
                              : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-amber-400 font-mono text-[10px] font-bold">
                              {file.status === 'modified' ? 'M' : file.status === 'added' ? 'A' : 'D'}
                            </span>
                            <span className="truncate font-mono">{file.path}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStage(file.id);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Stage file"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Commit Message Box */}
              <div className="p-3 border-t border-white/10 bg-slate-900/80 space-y-2 shrink-0">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message (e.g. feat: update ARC memory layout)..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-orange-500/50 resize-none font-mono"
                />
                <button
                  onClick={handleCommit}
                  disabled={!commitMessage.trim() || changedFiles.filter((f) => f.staged).length === 0}
                  className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>Commit to {currentBranch}</span>
                </button>
              </div>
            </div>

            {/* Right: Visual Diff Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              {/* Diff Header */}
              <div className="h-10 px-4 border-b border-white/10 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <FileCode className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-white">{selectedFile?.path}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {selectedFile?.status}
                  </span>
                </div>
                <button
                  onClick={() => selectedFile && toggleStage(selectedFile.id)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 cursor-pointer transition-colors"
                >
                  {selectedFile?.staged ? 'Unstage Diff' : 'Stage Diff'}
                </button>
              </div>

              {/* Code Diff Canvas */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed custom-scrollbar space-y-1">
                {selectedFile?.diffOld.map((line, idx) => (
                  <div key={`old-${idx}`} className="flex items-center px-2 py-0.5 bg-rose-500/15 text-rose-300 rounded">
                    <span className="w-8 text-rose-400/60 select-none text-[10px]">-</span>
                    <span className="flex-1">{line}</span>
                  </div>
                ))}
                {selectedFile?.diffNew.map((line, idx) => (
                  <div key={`new-${idx}`} className="flex items-center px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded">
                    <span className="w-8 text-emerald-400/60 select-none text-[10px]">+</span>
                    <span className="flex-1">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Commit History Timeline Tab */
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white mb-1">Commit History Graph</h2>
              <p className="text-xs text-slate-400">
                Audit commits, tags, and verified cryptographic signatures across the repository tree.
              </p>
            </div>

            <div className="space-y-3">
              {commits.map((commit, idx) => (
                <div
                  key={commit.hash}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                      <GitCommit className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white">{commit.message}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                          {commit.shortHash}
                        </span>
                        <span>{commit.author}</span>
                        <span>•</span>
                        <span>{commit.timestamp}</span>
                        <span>•</span>
                        <span className="text-slate-500">{commit.filesChanged} files changed</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(commit.hash);
                        soundEngine.playSuccess();
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                      title="Copy full commit SHA"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
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
