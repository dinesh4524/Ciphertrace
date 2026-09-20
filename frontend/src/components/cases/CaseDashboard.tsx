import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  AlertOctagon, 
  FolderLock, 
  FileText, 
  Users, 
  ShieldAlert, 
  Clock, 
  Layers, 
  RotateCw, 
  Plus,
  ArrowRight,
  Database
} from 'lucide-react';
import { CaseDashboardStats, Case } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface CaseDashboardProps {
  onSelectCase: (c: Case) => void;
  onOpenCreateModal: () => void;
}

export const CaseDashboard: React.FC<CaseDashboardProps> = ({ onSelectCase, onOpenCreateModal }) => {
  const [stats, setStats] = useState<CaseDashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, casesData] = await Promise.all([
        api.getDashboardStats(),
        api.getCases({ status: 'ACTIVE_INVESTIGATION' })
      ]);
      setStats(statsData);
      setRecentCases(casesData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="workstation-panel p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              INVESTIGATION COMMAND & TELEMETRY
            </h1>
            <Badge variant="cyan">Active Database Live</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time telemetry across crime categories, case priority distributions, investigation stages, and supervisory caseloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            className="btn-rect-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Case</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-rect-secondary text-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg workstation-card space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <FolderLock className="w-3.5 h-3.5 text-sky-400" />
              Total Investigations
            </span>
            <Badge variant="slate" size="xs">Registry</Badge>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.total_cases || 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {stats?.active_investigations || 0} active in field
          </div>
        </div>

        <div className="p-4 rounded-lg workstation-card space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              Critical Priority
            </span>
            <Badge variant="rose" size="xs">Urgent</Badge>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {stats?.critical_priority_cases || 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            High threat syndicates
          </div>
        </div>

        <div className="p-4 rounded-lg workstation-card space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Under Supervisory Review
            </span>
            <Badge variant="amber" size="xs">Review</Badge>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {stats?.under_review_cases || 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Pending supervisor sign-off
          </div>
        </div>

        <div className="p-4 rounded-lg workstation-card space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Evidence Fabric Artifacts
            </span>
            <Badge variant="emerald" size="xs">Sec 63 BSA</Badge>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {stats?.total_evidence_artifacts || 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            100% SHA-256 sealed
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Priority Breakdown */}
        <div className="p-4 rounded-lg workstation-card space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Cases by Threat Priority
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Real-time DB</span>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'CRITICAL', count: stats?.cases_by_priority['CRITICAL'] || 0, color: 'bg-rose-500', text: 'text-rose-400' },
              { label: 'HIGH', count: stats?.cases_by_priority['HIGH'] || 0, color: 'bg-amber-500', text: 'text-amber-400' },
              { label: 'MEDIUM', count: stats?.cases_by_priority['MEDIUM'] || 0, color: 'bg-sky-500', text: 'text-sky-400' },
              { label: 'LOW', count: stats?.cases_by_priority['LOW'] || 0, color: 'bg-slate-500', text: 'text-slate-400' },
            ].map((prio) => {
              const pct = stats?.total_cases ? Math.round((prio.count / stats.total_cases) * 100) : 0;
              return (
                <div key={prio.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={prio.text}>{prio.label}</span>
                    <span className="text-slate-400">{prio.count} cases ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#080c14] h-1.5 rounded overflow-hidden">
                    <div className={`${prio.color} h-full rounded transition-all duration-300`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Workflow Progression */}
        <div className="p-4 rounded-lg workstation-card space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Investigation Lifecycle Stage
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Statutory Flow</span>
          </div>

          <div className="space-y-2">
            {[
              { label: 'PRELIMINARY_ENQUIRY', name: 'Preliminary Enquiry', count: stats?.cases_by_stage['PRELIMINARY_ENQUIRY'] || 0 },
              { label: 'FIR_REGISTERED', name: 'FIR Formally Registered', count: stats?.cases_by_stage['FIR_REGISTERED'] || 0 },
              { label: 'EVIDENCE_COLLECTION', name: 'Evidence Fabric Ingestion', count: stats?.cases_by_stage['EVIDENCE_COLLECTION'] || 0 },
              { label: 'INTERROGATION_PHASE', name: 'Interrogation & Custody', count: stats?.cases_by_stage['INTERROGATION_PHASE'] || 0 },
              { label: 'CHARGESHEET_PREPARATION', name: 'BNS Chargesheet Filing', count: stats?.cases_by_stage['CHARGESHEET_PREPARATION'] || 0 },
            ].map((stg) => (
              <div key={stg.label} className="p-2 rounded bg-[#080c14] border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">{stg.name}</span>
                <span className="px-2 py-0.2 rounded bg-slate-800 text-sky-400 font-semibold">{stg.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active High-Priority Investigations List */}
      <div className="p-4 rounded-lg workstation-card space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <FolderLock className="w-3.5 h-3.5 text-sky-400" />
            Active Field Investigations ({recentCases.length})
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">Investigator Queue</span>
        </div>

        <div className="space-y-2">
          {recentCases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c)}
              className="p-3 rounded bg-[#080c14] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-sky-400">{c.case_number}</span>
                  <Badge variant={c.priority === 'CRITICAL' ? 'rose' : 'amber'} size="xs">
                    {c.priority}
                  </Badge>
                  <span className="text-[10px] font-mono text-slate-400">{c.crime_category}</span>
                </div>
                <div className="text-xs font-medium text-slate-200">{c.title}</div>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span>STATION: {c.police_station || 'Cyber Crime PS'}</span>
                <button className="btn-rect-ghost text-sky-400">
                  <span>Open Dossier</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {recentCases.length === 0 && (
            <div className="p-6 text-center text-xs font-mono text-slate-500">
              No active investigations recorded. Click Register Case to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
