// React Route & View Capability Guard Component (Phase P0-5)
import React from 'react';
import { can } from '../../services/authClient.ts';
import { ShieldAlert, Lock } from 'lucide-react';

interface CapabilityGuardProps {
  capability: string;
  viewName?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const CapabilityGuard: React.FC<CapabilityGuardProps> = ({
  capability,
  viewName,
  fallback,
  children
}) => {
  const isAuthorized = can(capability);

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-red-500/30 bg-slate-950/80 backdrop-blur-xl text-center space-y-4 shadow-2xl font-mono">
        <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-red-400 font-bold flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Unauthorized Workflow Boundary</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            {viewName ? `Access to ${viewName} Restricted` : 'Access Restricted'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your server-verified role credentials do not possess the authorization claim required for this operating environment.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-[11px] text-red-300 inline-block font-mono">
          Required Capability Claim: <code className="font-bold text-white">{capability}</code>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
