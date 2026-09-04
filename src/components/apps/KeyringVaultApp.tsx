import React, { useState } from 'react';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  Terminal,
  Download,
  RefreshCw,
  Search,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { rocketFS } from '../../core/filesystem/RocketFS';
import { notificationService } from '../../core/notifications/NotificationService';

type VaultTab = 'credentials' | 'generator' | 'ssh' | 'env';

interface VaultEntry {
  id: string;
  service: string;
  username: string;
  secret: string;
  category: string;
  updatedAt: string;
}

export const KeyringVaultApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VaultTab>('credentials');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Credentials State
  const [entries, setEntries] = useState<VaultEntry[]>([
    { id: '1', service: 'GitHub SSH Key', username: 'RyanEid06', secret: 'ghp_7vF9a20b080c98f821adbc4308e19', category: 'Dev', updatedAt: '2026-09-01' },
    { id: '2', service: 'Gemini API Key', username: 'google_ai_studio', secret: 'AIzaSyC984X7298B01a89F2A984021', category: 'API', updatedAt: '2026-09-02' },
    { id: '3', service: 'Rocket Package Registry', username: 'ryan', secret: 'rpk_tok_99184a8bc90021e', category: 'Dev', updatedAt: '2026-09-03' },
    { id: '4', service: 'Cloud Run Ingress Token', username: 'container_svc', secret: 'cr_sec_1098230948bafc', category: 'Infra', updatedAt: '2026-09-04' },
  ]);

  // Password Generator State
  const [genLength, setGenLength] = useState<number>(20);
  const [genUpper, setGenUpper] = useState<boolean>(true);
  const [genLower, setGenLower] = useState<boolean>(true);
  const [genDigits, setGenDigits] = useState<boolean>(true);
  const [genSymbols, setGenSymbols] = useState<boolean>(true);
  const [generatedPassword, setGeneratedPassword] = useState<string>('rK9#mX2$vL8@pQ4&zW7*');

  // SSH Key Gen State
  const [sshComment, setSshComment] = useState<string>('ryan@rocket-os.local');
  const [sshType, setSshType] = useState<'ed25519' | 'rsa'>('ed25519');
  const [sshPublicKey, setSshPublicKey] = useState<string>(
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC0B89F6aQ89k2v1rX7l1a0bC ryan@rocket-os.local'
  );
  const [sshPrivateKey, setSshPrivateKey] = useState<string>(
    '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gt\nZWQyNTUxOQAAACAtAQ8ZaQ8...==\n-----END OPENSSH PRIVATE KEY-----'
  );

  const handleGeneratePassword = () => {
    soundEngine.play('click');
    let chars = '';
    if (genUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (genDigits) chars += '0123456789';
    if (genSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    let result = '';
    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      result += chars[array[i] % chars.length];
    }
    setGeneratedPassword(result);
  };

  const handleCopy = (text: string, id: string) => {
    soundEngine.play('snap');
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateSsh = () => {
    soundEngine.play('click');
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setSshPublicKey(`ssh-${sshType} AAAAC3NzaC1${randomHex} ${sshComment}`);
    soundEngine.playSuccess();
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Header */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'credentials' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Keyring & Secrets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'generator' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Password Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ssh')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'ssh' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SSH Key Generator</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <Shield className="w-4 h-4" />
          <span className="font-mono text-[11px]">VAULT UNLOCKED (AES-256)</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* CREDENTIALS TAB */}
        {activeTab === 'credentials' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/10 text-xs w-64">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search secrets..."
                  className="bg-transparent text-white outline-none w-full"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.play('click');
                  const newEntry: VaultEntry = {
                    id: String(Date.now()),
                    service: 'New Service',
                    username: 'user',
                    secret: 'secret_token_123',
                    category: 'General',
                    updatedAt: new Date().toISOString().slice(0, 10),
                  };
                  setEntries([newEntry, ...entries]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Secret</span>
              </button>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/60 divide-y divide-white/5">
              {filteredEntries.map((entry) => {
                const isSecretShown = showSecrets[entry.id];

                return (
                  <div key={entry.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{entry.service}</span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[9px]">
                          {entry.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{entry.username}</div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <div className="bg-slate-950 px-3 py-1 rounded-lg border border-white/10 text-slate-300 min-w-44 text-center">
                        {isSecretShown ? entry.secret : '••••••••••••••••••••'}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, [entry.id]: !isSecretShown })}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                        title={isSecretShown ? 'Hide' : 'Show'}
                      >
                        {isSecretShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(entry.secret, entry.id)}
                        className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 cursor-pointer"
                        title="Copy Secret"
                      >
                        {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.play('trash');
                          setEntries(entries.filter((e) => e.id !== entry.id));
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GENERATOR TAB */}
        {activeTab === 'generator' && (
          <div className="max-w-md mx-auto space-y-6 pt-4">
            {/* Display Output */}
            <div className="p-4 bg-slate-900 rounded-xl border border-white/10 space-y-3">
              <div className="text-xs text-slate-400">Generated Entropy Secret</div>
              <div className="text-lg font-mono font-bold text-sky-300 break-all bg-slate-950 p-3 rounded-lg border border-white/10 flex items-center justify-between">
                <span>{generatedPassword}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedPassword, 'gen')}
                  className="p-1.5 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/40 cursor-pointer"
                >
                  {copiedId === 'gen' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-white/10 text-xs">
              <div className="flex justify-between items-center">
                <span>Length: <strong className="font-mono text-sky-400">{genLength} chars</strong></span>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={genLength}
                  onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                  className="cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genUpper} onChange={(e) => setGenUpper(e.target.checked)} />
                  <span>Uppercase (A-Z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genLower} onChange={(e) => setGenLower(e.target.checked)} />
                  <span>Lowercase (a-z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genDigits} onChange={(e) => setGenDigits(e.target.checked)} />
                  <span>Digits (0-9)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} />
                  <span>Symbols (!@#$)</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="w-full mt-2 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-sm shadow-sky-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate New Password</span>
              </button>
            </div>
          </div>
        )}

        {/* SSH TAB */}
        {activeTab === 'ssh' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-slate-400">Comment:</span>
                <input
                  type="text"
                  value={sshComment}
                  onChange={(e) => setSshComment(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none w-full"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateSsh}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Generate Pair
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Public Key (id_ed25519.pub)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(sshPublicKey, 'pub')}
                  className="flex items-center gap-1 text-sky-400 hover:underline cursor-pointer text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Public Key</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={2}
                value={sshPublicKey}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-emerald-300 outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Private Key (id_ed25519)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(sshPrivateKey, 'priv')}
                  className="flex items-center gap-1 text-rose-400 hover:underline cursor-pointer text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Private Key</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={sshPrivateKey}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-400 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
