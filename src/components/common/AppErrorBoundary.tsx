// AppErrorBoundary.tsx
// Per-app crash isolation and recovery boundary for RocketOS windows

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, X, FileText, ChevronDown, ChevronRight, ShieldAlert } from 'lucide-react';
import { AppId } from '../../types';
import { CrashRecoveryService, DirtyDocumentSnapshot } from '../../core/recovery/CrashRecoveryService';

interface Props {
  appId: AppId;
  windowId: string;
  onCloseWindow?: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  recoverableDrafts: DirtyDocumentSnapshot[];
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      recoverableDrafts: [],
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { appId, windowId } = this.props;

    // Log isolated crash into authoritative CrashRecoveryService
    CrashRecoveryService.getInstance().logCrash(
      appId,
      windowId,
      'APP_CRASH',
      error,
      errorInfo.componentStack || undefined
    );

    const drafts = CrashRecoveryService.getInstance().getRecoverableDrafts(appId);
    this.setState({ errorInfo, recoverableDrafts: drafts });
  }

  private handleRelaunch = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private handleClose = () => {
    if (this.props.onCloseWindow) {
      this.props.onCloseWindow();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const { appId } = this.props;
      const { error, showDetails, recoverableDrafts } = this.state;

      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-950 text-slate-100 font-sans text-xs select-none">
          <div className="max-w-md w-full p-5 rounded-2xl bg-slate-900 border border-rose-500/30 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Application Halted</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono">
                    ISOLATED
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  An unhandled exception occurred in <strong className="text-slate-200">{appId}</strong>. The rest of RocketOS remains fully operational.
                </p>
              </div>
            </div>

            {/* Error message snippet */}
            <div className="p-3 rounded-xl bg-black/50 border border-slate-800 text-rose-300 font-mono text-[11px] break-all">
              {error?.message || 'Unknown runtime error'}
            </div>

            {/* Recoverable drafts notification if present */}
            {recoverableDrafts.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-xs">
                    {recoverableDrafts.length} unsaved draft session(s) detected in journal
                  </span>
                </div>
              </div>
            )}

            {/* Collapsible Error Stack Details */}
            <div>
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-[11px] cursor-pointer"
              >
                {showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Technical Details & Stack</span>
              </button>

              {showDetails && (
                <pre className="mt-2 p-3 rounded-xl bg-black/60 border border-slate-800 text-slate-400 font-mono text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {error?.stack || 'No stack trace available'}
                </pre>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={this.handleClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Window</span>
              </button>
              <button
                onClick={this.handleRelaunch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-lg shadow-sky-950 transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Relaunch App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
