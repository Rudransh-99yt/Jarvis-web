import React, { useState, useEffect } from 'react';
import type { InstitutionalAuditEvent } from '../../../types/institutional.ts';
import { SharedBackButton } from '../components/SharedBackButton.tsx';
import { authClient } from '../../../services/authClient.ts';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PrincipalAuditViewProps {
  onBack: () => void;
}

export const PrincipalAuditView: React.FC<PrincipalAuditViewProps> = ({ onBack }) => {
  const [events, setEvents] = useState<InstitutionalAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch('/api/education/institutional/audit', {
      headers: {
        ...authClient.getAuthHeaders()
      }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.auditEvents) {
          setEvents(data.auditEvents);
        }
      })
      .catch((err) => console.warn('Could not load institutional audit events:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-7 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* 1. Back Navigation */}
      <SharedBackButton
        onBack={onBack}
        parentLabel="Principal Home"
        currentLabel="Institutional Audit Ledger"
      />

      {/* 2. Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>Governance & Command Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Institutional Command Audit Trail
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono">
          Immutable institutional audit trail of generated diagnostic commands, approvals, and curriculum actions.
        </p>
      </div>

      {/* 3. Overview Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cryptographically consistent audit logging active for Stark Academy</span>
        </div>
        <span className="text-cyan-300 font-bold">{events.length} Verified Entries</span>
      </div>

      {/* 4. Events Timeline / Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase px-1">
          Chronological Audit Ledger
        </h2>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
          {events.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              No institutional audit events recorded yet.
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="p-5 hover:bg-slate-800/30 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30">
                      {ev.action}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{new Date(ev.executedAt).toLocaleString()}</span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold self-start sm:self-center">
                    {ev.outcome}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="text-white font-bold flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Actor: {ev.actorName} ({ev.actorRole})</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">Scope:</span> {ev.targetScope}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-slate-800/80">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Source Entities:</span>{' '}
                    <span className="text-cyan-400">{ev.sourceObjectIds.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">Generated Objects:</span>{' '}
                    <span className="text-purple-400">{ev.generatedObjectIds.join(', ') || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
