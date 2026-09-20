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
    <div className="space-y-4">
      <div className="bg-white border border-[#D9E0E8] p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-[#172033] tracking-tight">Immutable Audit Trail</h1>
            <Badge variant="verified">Cryptographic Chain of Custody</Badge>
          </div>
          <p className="text-xs text-[#64748B] max-w-3xl">
            Append-only tamper-evident evidentiary ledger. Every access, ingestion, verification, and transformation
            event is cryptographically sealed with a SHA-256 state digest.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748B]">
          Fetching cryptographic audit ledger...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded border border-[#D9E0E8] space-y-2 shadow-xs">
          <History className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <p className="text-xs text-[#172033] font-medium">No audit events recorded yet</p>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Audit logs are automatically generated whenever cases are registered or evidence is ingested.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded bg-white border border-[#D9E0E8] hover:border-[#94A3B8] transition-colors space-y-2 text-xs shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getActionBadge(log.action_type)}
                  <span className="text-[#172033] font-semibold">{log.resource_type}</span>
                </div>
                <div className="flex items-center gap-3 text-[#64748B] text-[11px]">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-[#172033]">
                    <User className="w-3 h-3 text-[#64748B]" />
                    {log.operator_id} ({log.operator_role})
                  </span>
                </div>
              </div>

              {/* Details JSON */}
              {log.details_json && Object.keys(log.details_json).length > 0 && (
                <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#172033] text-xs overflow-x-auto font-mono">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(log.details_json, null, 2)}</pre>
                </div>
              )}

              {/* Cryptographic Entry Hash */}
              {log.entry_hash_sha256 && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] truncate pt-1 border-t border-[#D9E0E8]">
                  <Lock className="w-3 h-3 text-[#163A5F] flex-shrink-0" />
                  <span className="font-semibold">Entry Digest:</span>
                  <span className="text-[#163A5F] font-mono truncate select-all">{log.entry_hash_sha256}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
