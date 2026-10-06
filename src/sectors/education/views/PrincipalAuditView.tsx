import React, { useState, useEffect } from 'react';
import type { InstitutionalAuditEvent } from '../../../types/institutional.ts';
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
import { GlassCard, Badge } from '../../../components/ui/index.ts';

interface PrincipalAuditViewProps {
  onBack: () => void;
}

export const PrincipalAuditView: React.FC<PrincipalAuditViewProps> = ({ onBack: _onBack }) => {
  const [events, setEvents] = useState<InstitutionalAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch('/api/education/institutional/audit', {
      headers: {
        'x-user-id': 'principal-1',
        'x-user-role': 'principal'
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
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>Governance & Command Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
          Institutional Command Audit Trail
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Immutable institutional audit trail of generated diagnostic commands, approvals, and curriculum actions.
        </p>
      </div>

      {/* 3. Overview Card */}
      <GlassCard className="p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cryptographically consistent audit logging active for Stark Academy</span>
        </div>
        <span className="text-cyan-300 font-semibold tabular-nums font-mono">{events.length} Verified Entries</span>
      </GlassCard>

      {/* 4. Events Timeline / Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wider text-slate-200 uppercase px-1">
          Chronological Audit Ledger
        </h2>

        <GlassCard className="divide-y divide-white/[0.06] p-0 overflow-hidden">
          {events.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No institutional audit events recorded yet.
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="p-5 hover:bg-white/[0.03] transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="cyan" className="font-mono text-[11px]">
                      {ev.action}
                    </Badge>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-slate-400 font-mono text-[11px]">{new Date(ev.executedAt).toLocaleString()}</span>
                  </div>

                  <Badge variant="success" className="self-start sm:self-center font-mono text-[11px]">
                    {ev.outcome}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-100 font-semibold flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Actor: {ev.actorName} ({ev.actorRole})</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Scope:</span> {ev.targetScope}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/[0.06]">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Source Entities:</span>{' '}
                    <span className="text-cyan-400 font-mono">{ev.sourceObjectIds.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">Generated Objects:</span>{' '}
                    <span className="text-purple-300 font-mono">{ev.generatedObjectIds.join(', ') || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
};

