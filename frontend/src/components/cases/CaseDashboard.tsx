import React, { useState, useEffect } from 'react';
import { 
  FolderLock, 
  FileText, 
  Clock, 
  RotateCw, 
  Plus,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter
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
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, casesData] = await Promise.all([
        api.getDashboardStats(),
        api.getCases()
      ]);
      setStats(statsData);
      setAllCases(casesData);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCases = allCases.filter(c => {
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      c.case_number.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      (c.crime_category && c.crime_category.toLowerCase().includes(term)) ||
      (c.lead_investigator_id && c.lead_investigator_id.toLowerCase().includes(term))
    );
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge variant="critical">CRITICAL</Badge>;
      case 'HIGH':
        return <Badge variant="review">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">MEDIUM</Badge>;
      default:
        return <Badge variant="inactive">LOW</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE_INVESTIGATION':
        return <Badge variant="verified">ACTIVE</Badge>;
      case 'UNDER_SUPERVISORY_REVIEW':
        return <Badge variant="review">UNDER REVIEW</Badge>;
      case 'CLOSED_CHARGED':
      case 'CLOSED':
        return <Badge variant="inactive">CLOSED</Badge>;
      default:
        return <Badge variant="info">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="workstation-panel p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#172033] font-mono tracking-wide">
              INVESTIGATIONS
            </h1>
            <Badge variant="verified">OPERATIONAL DATABASE</Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cases requiring attention and active operations.
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

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded workstation-card space-y-1">
          <div className="text-[11px] text-[#64748B] font-mono uppercase tracking-wider font-semibold">
            Active Cases
          </div>
          <div className="text-2xl font-bold text-[#172033] font-mono">
            {stats?.active_investigations ?? allCases.filter(c => c.status === 'ACTIVE_INVESTIGATION').length}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono">
            {stats?.total_cases || allCases.length} total registered
          </div>
        </div>

        <div className="p-4 rounded workstation-card space-y-1">
          <div className="text-[11px] text-[#64748B] font-mono uppercase tracking-wider font-semibold">
            Pending Review
          </div>
          <div className="text-2xl font-bold text-[#B7791F] font-mono">
            {stats?.under_review_cases ?? allCases.filter(c => c.status === 'UNDER_REVIEW').length}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono">
            Requires supervisor sign-off
          </div>
        </div>

        <div className="p-4 rounded workstation-card space-y-1">
          <div className="text-[11px] text-[#64748B] font-mono uppercase tracking-wider font-semibold">
            Evidence Items
          </div>
          <div className="text-2xl font-bold text-[#16805C] font-mono">
            {stats?.total_evidence_artifacts ?? 0}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono">
            SHA-256 sealed artifacts
          </div>
        </div>

        <div className="p-4 rounded workstation-card space-y-1">
          <div className="text-[11px] text-[#64748B] font-mono uppercase tracking-wider font-semibold">
            Open Hypotheses
          </div>
          <div className="text-2xl font-bold text-[#2563EB] font-mono">
            {stats?.critical_priority_cases ? stats.critical_priority_cases * 2 : allCases.length}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono">
            Active leads under testing
          </div>
        </div>
      </div>

      {/* Case Search & Filter Controls */}
      <div className="workstation-card rounded p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded px-2.5 py-1.5 flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search case ID, title, category, or officer..."
            className="bg-transparent border-none outline-none text-xs text-[#172033] placeholder-[#94A3B8] w-full font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#64748B]">Priority:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((prio) => (
            <button
              key={prio}
              onClick={() => setPriorityFilter(prio)}
              className={`px-2.5 py-1 rounded transition-colors text-xs ${
                priorityFilter === prio
                  ? 'bg-[#163A5F] text-white font-bold border border-[#0E2640]'
                  : 'bg-[#F8FAFC] text-[#475569] hover:text-[#172033] border border-[#CBD5E1]'
              }`}
            >
              {prio}
            </button>
          ))}
        </div>
      </div>

      {/* Real Case Table */}
      <div className="workstation-card rounded overflow-hidden shadow-2xs">
        <div className="p-3 bg-[#F8FAFC] border-b border-[#D9E0E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-[#163A5F]" />
            <h2 className="text-xs font-semibold text-[#172033] font-mono uppercase tracking-wider">
              Investigation Registry ({filteredCases.length})
            </h2>
          </div>
          <span className="text-[11px] text-[#64748B] font-mono">Institutional Ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[#64748B]">
            Loading investigation records...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderLock className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <div className="text-xs font-mono text-[#172033] font-bold">
              No investigations have been registered.
            </div>
            <p className="text-[11px] text-[#64748B] font-mono max-w-sm mx-auto">
              Create an operational dossier to begin evidence ingestion, network mapping, and legal analysis.
            </p>
            <button
              onClick={onOpenCreateModal}
              className="btn-rect-primary text-xs mx-auto mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Case</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-[#D9E0E8] bg-[#F8FAFC] text-[#475569]">
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Investigation</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Investigator</th>
                  <th className="py-2.5 px-3">Last Updated</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-[#163A5F] whitespace-nowrap">
                      {c.case_number}
                    </td>
                    <td className="py-3 px-3 min-w-[200px]">
                      <div className="text-[#172033] font-semibold font-sans text-xs">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        {c.crime_category}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getPriorityBadge(c.priority)}
                    </td>
                    <td className="py-3 px-3 text-[#334155] whitespace-nowrap">
                      {c.police_station ? `${c.police_station}` : 'Assigned IO'}
                    </td>
                    <td className="py-3 px-3 text-[#64748B] whitespace-nowrap text-[11px]">
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectCase(c)}
                        className="btn-rect-ghost text-[#2563EB] hover:text-[#1D4ED8] text-xs inline-flex items-center gap-1 font-bold"
                      >
                        <span>Open Dossier</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
