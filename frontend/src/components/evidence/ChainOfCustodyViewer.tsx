import React, { useState, useEffect } from 'react';
import { History, Shield, RotateCw, Filter, Clock, User, Terminal, Lock } from 'lucide-react';
import { AuditLogItem, Case } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface ChainOfCustodyViewerProps {
  activeCase: Case | null;
}

export const ChainOfCustodyViewer: React.FC<ChainOfCustodyViewerProps> = ({ activeCase }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(activeCase?.id);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeCase?.id]);

  const getActionBadge = (action: string) => {
    if (action.includes('INGEST')) return <Badge variant="cyan">{action}</Badge>;
    if (action.includes('INTEGRITY')) return <Badge variant="emerald">{action}</Badge>;
    if (action.includes('DELETE') || action.includes('TAMPER')) return <Badge variant="rose">{action}</Badge>;
    return <Badge variant="slate">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl cyber-glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white tracking-wide">Immutable Audit Trail</h1>
            <Badge variant="emerald">Cryptographic Chain of Custody</Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Append-only tamper-evident evidentiary ledger. Every access, ingestion, verification, and transformation
            event is cryptographically sealed with a SHA-256 state digest.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-all"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Fetching cryptographic audit ledger...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center cyber-glass rounded-2xl border border-slate-800 space-y-3">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">No audit events recorded yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Audit logs are automatically generated whenever cases are registered or evidence is ingested.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl cyber-glass-card border border-slate-800/80 space-y-2.5 font-mono text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getActionBadge(log.action_type)}
                  <span className="text-slate-300 font-semibold">{log.resource_type}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <User className="w-3 h-3" />
                    {log.operator_id} ({log.operator_role})
                  </span>
                </div>
              </div>

              {/* Details JSON */}
              {log.details_json && Object.keys(log.details_json).length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-900 text-slate-400 text-[11px] overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(log.details_json, null, 2)}</pre>
                </div>
              )}

              {/* Cryptographic Entry Hash */}
              {log.entry_hash_sha256 && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate pt-1 border-t border-slate-900">
                  <Lock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  <span>Entry Digest:</span>
                  <span className="text-cyan-400/80 truncate select-all">{log.entry_hash_sha256}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
