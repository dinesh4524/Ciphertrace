import React, { useState } from 'react';
import { 
  FolderLock, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  FileText, 
  ShieldAlert,
  Users,
  Lock,
  Bookmark,
  ArrowRight
} from 'lucide-react';
import { Case, CasePriority } from '../../types';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';

interface CaseListProps {
  cases: Case[];
  activeCase: Case | null;
  onSelectCase: (c: Case) => void;
  onOpenCreateModal: () => void;
  loading: boolean;
}

export const CaseList: React.FC<CaseListProps> = ({
  cases,
  activeCase,
  onSelectCase,
  onOpenCreateModal,
  loading,
}) => {
  const { hasPermission, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [myCasesOnly, setMyCasesOnly] = useState<boolean>(false);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = filterCategory === 'ALL' || c.crime_category === filterCategory;
    const matchesPrio = filterPriority === 'ALL' || c.priority === filterPriority;
    const matchesMyCases = !myCasesOnly || (
      c.assigned_lead_user_id === currentUser?.id ||
      c.assigned_team?.some(t => t.user_id === currentUser?.id)
    );
    return matchesSearch && matchesCat && matchesPrio && matchesMyCases;
  });

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'CRITICAL': return <Badge variant="rose" size="xs">CRITICAL</Badge>;
      case 'HIGH': return <Badge variant="amber" size="xs">HIGH</Badge>;
      case 'MEDIUM': return <Badge variant="cyan" size="xs">MEDIUM</Badge>;
      default: return <Badge variant="slate" size="xs">LOW</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="workstation-panel p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              INVESTIGATION CASE REGISTRY
            </h1>
            <Badge variant="cyan">RBAC Enforced</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Institutional case ledger with threat priority classification, lifecycle tracking, and officer assignment permissions.
          </p>
        </div>
        {hasPermission('CASE_CREATE') && (
          <button
            onClick={onOpenCreateModal}
            className="btn-rect-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Investigation</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 font-mono text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case ID, title, syndicate name, or suspect tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#080c14] border border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#080c14] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="CYBER_CRIME">Cyber Crime</option>
            <option value="FINANCIAL_FRAUD">Financial Fraud / Hawala</option>
            <option value="TELECOM_FRAUD">Telecom / SIM Box</option>
            <option value="ORGANIZED_CRIME">Organized Syndicate</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#080c14] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            onClick={() => setMyCasesOnly(!myCasesOnly)}
            className={`px-2.5 py-1.5 rounded text-xs transition-colors border ${
              myCasesOnly
                ? 'bg-sky-950 text-sky-200 border-sky-600 font-bold'
                : 'bg-[#080c14] border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Assigned to Me
          </button>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Querying secure case registry...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center workstation-card rounded-lg space-y-2">
          <FolderLock className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-300 font-mono">No matching cases in registry</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCases.map((c) => {
            const isActive = activeCase?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c)}
                className={`p-4 rounded-lg workstation-card border cursor-pointer transition-colors space-y-2.5 ${
                  isActive
                    ? 'border-sky-600 bg-sky-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-sky-400">{c.case_number}</span>
                      {getPriorityBadge(c.priority)}
                      <Badge variant="slate" size="xs">{c.crime_category}</Badge>
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 line-clamp-1">{c.title}</h3>
                  </div>

                  {isActive && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-700 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {c.description || 'Investigation dossier containing telecom CDR linkages and banking ledger evidence.'}
                </p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{c.police_station || 'Cyber Crime PS'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>STAGE: <span className="text-sky-300">{c.stage.replace(/_/g, ' ')}</span></span>
                    <ArrowRight className="w-3 h-3 text-sky-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
