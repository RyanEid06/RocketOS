import React, { useState } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Star,
  FileText,
  Archive,
  Trash2,
  Search,
  Plus,
  Reply,
  Forward,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  MoreVertical,
  ShieldCheck,
  User,
  Clock,
  ChevronDown,
  X,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { notificationService } from '../../core/notifications/NotificationService';

export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';
  isRead: boolean;
  isStarred: boolean;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentSize?: string;
  avatarColor: string;
}

const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'mail-1',
    sender: 'Rocket Build Bot',
    senderEmail: 'ci-daemon@rocket-lang.org',
    recipient: 'ryan@rocket.os',
    subject: 'Rocket 2.1 Compiler Testsuite: 100% Green on LLVM 22.1.6',
    preview: 'All 842 regression tests passed with zero runtime diagnostics. ARC graph promotion verified...',
    body: `Hello Ryan,

The automated Rocket Continuous Integration runner has concluded test suite execution for commit #f89a2b:

  - Compiler: rocketc (LLVM 22.1.6 Backend)
  - Architecture: x86_64 Long Mode & AArch64
  - Results: 842 passed, 0 failed, 0 regressions
  - ARC Memory Audit: Thread-confined ARC promotion graph verified safe
  - Standard Library: std.string, std.collections, std.math, std.task, rocket.raylib

Binary packages have been generated and pushed to /packages/stage0-bootstrap.tar.gz.

Regards,
Rocket CI Subsystem`,
    timestamp: '10:42 AM',
    folder: 'inbox',
    isRead: false,
    isStarred: true,
    hasAttachment: true,
    attachmentName: 'build_report_llvm22.log',
    attachmentSize: '48 KB',
    avatarColor: '#38bdf8',
  },
  {
    id: 'mail-2',
    sender: 'RocketOS System',
    senderEmail: 'postmaster@rocket.os',
    recipient: 'ryan@rocket.os',
    subject: 'Welcome to RocketOS Mail Daemon (v2.1)',
    preview: 'Your local mail spool has been successfully initialized with Unix Domain Sockets...',
    body: `Welcome to RocketOS Mail Daemon (rmaild v2.1)!

Your local mailbox is located at /var/spool/mail/ryan. 
Key features enabled:
  - Local Unix socket transport
  - End-to-end sandbox verification
  - Native RocketFS attachment integration
  - Offline-first cache & instant search

You can send intra-system mail to root@rocket.os or any daemon account directly.

Happy coding!
The RocketOS Core Team`,
    timestamp: '09:15 AM',
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    avatarColor: '#a855f7',
  },
  {
    id: 'mail-3',
    sender: 'Elena Vance (Security)',
    senderEmail: 'elena.vance@security.rocket.org',
    recipient: 'ryan@rocket.os',
    subject: 'Security Audit: Deterministic ARC Promotion Safe in Multi-thread Task Pool',
    preview: 'Reviewed the concurrency model in std.task and atomic promotions. Results look clean...',
    body: `Hi Ryan,

I just finished the static analysis of std.task's thread boundary promotions. 
The copy-on-write array bounds checks and explicit Task[T] handle lifespans completely prevent data races without requiring a heavy global lock.

I have attached the formal proof and model checker trace for your review.

Best,
Elena Vance
Lead Security Auditor`,
    timestamp: 'Yesterday',
    folder: 'inbox',
    isRead: true,
    isStarred: true,
    hasAttachment: true,
    attachmentName: 'arc_formal_proof.pdf',
    attachmentSize: '1.2 MB',
    avatarColor: '#34d399',
  },
  {
    id: 'mail-4',
    sender: 'rockpm Registry',
    senderEmail: 'notifications@rockpm.io',
    recipient: 'ryan@rocket.os',
    subject: 'New package published: std.networking v1.2',
    preview: 'The package std.networking v1.2 has been published by contributor "kernel_dev"...',
    body: `Package Update Alert:

  - Package: std.networking
  - Version: 1.2.0
  - Checksum: sha256:d8a94bc12...
  - Description: High performance non-blocking TCP/UDP sockets and HTTP/1.1 client for Rocket 2.1

Run "rockpm install std.networking" in Terminal to fetch and verify dependencies.`,
    timestamp: 'Yesterday',
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    avatarColor: '#f59e0b',
  },
  {
    id: 'mail-5',
    sender: 'Ryan Eid',
    senderEmail: 'ryan@rocket.os',
    recipient: 'team@rocket-lang.org',
    subject: 'Rocket 2.1 Release Candidate notes',
    preview: 'Drafting notes for the 2.1 release. Included indentation tokenizer fixes...',
    body: `Team,

Here is our changelog draft for Rocket 2.1:
  - Stricter 4-space indentation enforcement with tabs diagnostic
  - Enhanced rocketc compiler pipeline with LLVM 22.1.6
  - Native Raylib 2D UI bindings
  - Deterministic ARC runtime promotion

Let me know your thoughts before Friday's ABI freeze.`,
    timestamp: 'Sep 3',
    folder: 'sent',
    isRead: true,
    isStarred: false,
    avatarColor: '#6366f1',
  },
];

export const MailApp: React.FC = () => {
  const [emails, setEmails] = useState<EmailMessage[]>(INITIAL_EMAILS);
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'archive' | 'trash'>('inbox');
  const [selectedMailId, setSelectedMailId] = useState<string | null>('mail-1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachment, setComposeAttachment] = useState<string | null>(null);

  const selectedMail = emails.find((m) => m.id === selectedMailId);

  // Folder filtered emails
  const folderEmails = emails.filter((mail) => {
    if (mail.folder !== activeFolder) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      mail.subject.toLowerCase().includes(q) ||
      mail.sender.toLowerCase().includes(q) ||
      mail.body.toLowerCase().includes(q)
    );
  });

  const unreadCount = emails.filter((m) => m.folder === 'inbox' && !m.isRead).length;

  const handleSelectMail = (mail: EmailMessage) => {
    setSelectedMailId(mail.id);
    if (!mail.isRead) {
      setEmails((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, isRead: true } : m))
      );
    }
    soundEngine.play('click');
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: !m.isStarred } : m))
    );
    soundEngine.play('click');
  };

  const handleDeleteMail = (id: string) => {
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, folder: 'trash' } : m))
    );
    if (selectedMailId === id) setSelectedMailId(null);
    soundEngine.playTrash();
  };

  const handleSendMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim()) return;

    const newMail: EmailMessage = {
      id: `mail-${Date.now()}`,
      sender: 'Ryan Eid',
      senderEmail: 'ryan@rocket.os',
      recipient: composeTo.trim(),
      subject: composeSubject.trim(),
      preview: composeBody.slice(0, 80) + '...',
      body: composeBody,
      timestamp: 'Just now',
      folder: 'sent',
      isRead: true,
      isStarred: false,
      hasAttachment: !!composeAttachment,
      attachmentName: composeAttachment || undefined,
      avatarColor: '#38bdf8',
    };

    setEmails((prev) => [newMail, ...prev]);
    setIsComposing(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachment(null);
    soundEngine.play('success');

    notificationService.notify({
      title: 'Email Sent',
      message: `Message sent to ${newMail.recipient}`,
      type: 'info',
      appId: 'mail',
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Rocket Mail
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                rmaild v2.1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">ryan@rocket.os (Local Spool Active)</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search mail by sender, subject, text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              notificationService.notify({
                title: 'Mail Sync',
                message: 'All mailboxes are up to date.',
                type: 'info',
                appId: 'mail',
              });
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Refresh Mailbox"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsComposing(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Compose</span>
          </button>
        </div>
      </div>

      {/* Main Mail Window Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Folders */}
        <div className="w-56 border-r border-white/10 bg-slate-900/40 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
              Mailboxes
            </div>
            {[
              { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
              { id: 'sent', label: 'Sent', icon: Send },
              { id: 'drafts', label: 'Drafts', icon: FileText },
              { id: 'archive', label: 'Archive', icon: Archive },
              { id: 'trash', label: 'Trash', icon: Trash2 },
            ].map((folder) => {
              const Icon = folder.icon;
              const isActive = activeFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setActiveFolder(folder.id as any);
                    soundEngine.play('click');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{folder.label}</span>
                  </div>
                  {folder.count && folder.count > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500 text-white font-bold">
                      {folder.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Account Indicator */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              R
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">Ryan Eid</div>
              <div className="text-[10px] text-slate-400 truncate">ryan@rocket.os</div>
            </div>
          </div>
        </div>

        {/* Middle Column: Email List */}
        <div className="w-80 border-r border-white/10 bg-slate-950/70 flex flex-col shrink-0 overflow-hidden">
          <div className="h-10 px-3 border-b border-white/10 flex items-center justify-between text-xs text-slate-400 bg-slate-900/30 shrink-0">
            <span className="capitalize font-semibold">{activeFolder}</span>
            <span className="font-mono text-[11px]">{folderEmails.length} messages</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
            {folderEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No messages in {activeFolder}.
              </div>
            ) : (
              folderEmails.map((mail) => {
                const isSelected = selectedMailId === mail.id;
                return (
                  <div
                    key={mail.id}
                    onClick={() => handleSelectMail(mail)}
                    className={`p-3.5 transition-all cursor-pointer text-left relative group ${
                      isSelected
                        ? 'bg-blue-600/15 border-l-4 border-blue-500 shadow-sm'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: mail.isRead ? 'transparent' : '#38bdf8',
                          }}
                        />
                        <span
                          className={`text-xs truncate ${
                            mail.isRead ? 'text-slate-300 font-normal' : 'text-white font-bold'
                          }`}
                        >
                          {mail.sender}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                        {mail.timestamp}
                      </span>
                    </div>

                    <div
                      className={`text-xs truncate mb-1 ${
                        mail.isRead ? 'text-slate-300' : 'text-white font-medium'
                      }`}
                    >
                      {mail.subject}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {mail.preview}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.03]">
                      <div className="flex items-center gap-2">
                        {mail.hasAttachment && (
                          <Paperclip className="w-3 h-3 text-slate-500" />
                        )}
                        {mail.isStarred && (
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(mail.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-400 transition-opacity"
                        title="Star / Unstar"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Email Detail Reading Pane */}
        <div className="flex-1 flex flex-col bg-slate-950 min-w-0 overflow-hidden">
          {selectedMail ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Message Header */}
              <div className="p-6 border-b border-white/10 bg-slate-900/40 space-y-4 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                    {selectedMail.subject}
                  </h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposing(true);
                        setComposeTo(selectedMail.senderEmail);
                        setComposeSubject(`Re: ${selectedMail.subject}`);
                        setComposeBody(`\n\n--- Original Message ---\nFrom: ${selectedMail.sender}\n${selectedMail.body}`);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Reply"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposing(true);
                        setComposeSubject(`Fwd: ${selectedMail.subject}`);
                        setComposeBody(`\n\n--- Forwarded Message ---\nFrom: ${selectedMail.sender}\n${selectedMail.body}`);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Forward"
                    >
                      <Forward className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMail(selectedMail.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sender Info Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-sm"
                      style={{ backgroundColor: selectedMail.avatarColor }}
                    >
                      {selectedMail.sender.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {selectedMail.sender}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          &lt;{selectedMail.senderEmail}&gt;
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        To: <span className="text-slate-300">{selectedMail.recipient}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{selectedMail.timestamp}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-sans flex items-center gap-1 justify-end mt-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      SPF/DKIM Verified
                    </span>
                  </div>
                </div>

                {/* Attachment Badge */}
                {selectedMail.hasAttachment && selectedMail.attachmentName && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {selectedMail.attachmentName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {selectedMail.attachmentSize} • Verified Secure
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.play('success');
                        notificationService.notify({
                          title: 'Attachment Saved',
                          message: `Saved ${selectedMail.attachmentName} to /Downloads`,
                          type: 'info',
                          appId: 'mail',
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                    >
                      Download
                    </button>
                  </div>
                )}
              </div>

              {/* Message Body */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-w-3xl">
                  {selectedMail.body}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
              <Mail className="w-12 h-12 stroke-1 text-slate-600 mb-3" />
              <span>Select an email from the list to read</span>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {isComposing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/20 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                New Message
              </h3>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMail} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">To</label>
                <input
                  type="email"
                  required
                  placeholder="recipient@rocket.os or developer@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Subject line"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Message</label>
                <textarea
                  rows={8}
                  required
                  placeholder="Write your email here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400 resize-none font-sans leading-relaxed"
                />
              </div>

              {composeAttachment && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attached: {composeAttachment}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComposeAttachment(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'rocket_patch_v2.1.patch';
                    setComposeAttachment(sample);
                    soundEngine.play('click');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Attach File</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
