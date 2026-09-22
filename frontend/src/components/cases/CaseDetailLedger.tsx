import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Plus, 
  Clock, 
  GitCommit, 
  FileCheck2, 
  RotateCw, 
  UserCheck, 
  Network, 
  GitMerge,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Layers,
  ChevronRight,
  ShieldAlert,
  Route,
  Scale,
  CheckSquare
} from 'lucide-react';
import { Case, CaseNote, CaseAssignment } from '../../types';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AssignTeamModal } from './AssignTeamModal';
import { AddNoteModal } from './AddNoteModal';
import { StatusTransitionModal } from './StatusTransitionModal';

interface CaseDetailLedgerProps {
  activeCase: Case;
  onNavigateToIngestion: () => void;
  onNavigateToEvidence: () => void;
  onNavigateToEntities: () => void;
  onNavigateToRelationships: () => void;
  onNavigateToResolution: () => void;
  onNavigateToGraph: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToCases?: () => void;
  onRefreshCase: () => void;
}

export const CaseDetailLedger: React.FC<CaseDetailLedgerProps> = ({
  activeCase,
  onNavigateToIngestion,
  onNavigateToEvidence,
  onNavigateToEntities,
  onNavigateToRelationships,
  onNavigateToResolution,
  onNavigateToGraph,
  onNavigateToAnalytics,
  onNavigateToCases,
  onRefreshCase,
}) => {
  const { hasPermission } = useAuth();
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [team, setTeam] = useState<CaseAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const loadCaseDetails = async () => {
    setLoading(true);
    try {
      const [notesData, teamData] = await Promise.all([
        api.getCaseNotes(activeCase.id),
        api.getCaseTeam(activeCase.id)
      ]);
      setNotes(notesData);
      setTeam(teamData);
    } catch (err) {
      console.error('Failed to load case ledger details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseDetails();
  }, [activeCase.id]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return <Badge variant="critical">CRITICAL</Badge>;
      case 'HIGH': return <Badge variant="review">HIGH</Badge>;
      case 'MEDIUM': return <Badge variant="info">MEDIUM</Badge>;
      default: return <Badge variant="inactive">LOW</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE_INVESTIGATION': return <Badge variant="verified">ACTIVE INVESTIGATION</Badge>;
      case 'UNDER_REVIEW': return <Badge variant="review">UNDER REVIEW</Badge>;
      case 'CHARGESHEETED': return <Badge variant="verified">CHARGESHEETED</Badge>;
      case 'CLOSED': return <Badge variant="inactive">CLOSED</Badge>;
      default: return <Badge variant="info">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  const workflowBreadcrumbs = [
    { label: '← ALL CASES', onClick: onNavigateToCases || (() => {}) },
    { label: 'CASE OVERVIEW', onClick: () => {} },
    { label: 'EVIDENCE', onClick: onNavigateToEvidence },
    { label: 'ENTITIES', onClick: onNavigateToEntities },
    { label: 'RELATIONSHIPS', onClick: onNavigateToRelationships },
    { label: 'NETWORK', onClick: onNavigateToGraph },
    { label: 'RESOLUTION', onClick: onNavigateToResolution },
    { label: 'ANALYTICS', onClick: onNavigateToAnalytics || (() => {}) },
  ];

  return (
    <div className="space-y-4 font-sans">
      {/* Workflow Breadcrumb Strip */}
      <div className="workstation-card rounded px-3 py-2 flex items-center gap-2 overflow-x-auto text-xs font-mono shadow-2xs">
        <span className="text-[#64748B] uppercase text-[10px] font-bold">WORKFLOW:</span>
        {workflowBreadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.label}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />}
            <button
              onClick={crumb.onClick}
              className={`px-2.5 py-0.5 rounded transition-colors whitespace-nowrap text-xs ${
                idx === 1
                  ? 'bg-[#163A5F] text-white font-bold'
                  : idx === 0
                  ? 'text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] font-semibold'
                  : 'text-[#475569] hover:text-[#172033] hover:bg-[#F1F5F9]'
              }`}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Case Header & Actions */}
      <div className="workstation-panel p-4 rounded space-y-3 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {onNavigateToCases && (
                <button
                  onClick={onNavigateToCases}
                  className="mr-1 p-1 rounded hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#172033] transition-colors"
                  title="Back to Case Registry"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-base font-bold font-mono text-[#163A5F]">{activeCase.case_number}</span>
              {getPriorityBadge(activeCase.priority)}
              {getStatusBadge(activeCase.status)}
              <Badge variant="verified">SEC 63 BSA COMPLIANT</Badge>
            </div>
            <h1 className="text-base font-bold text-[#172033]">{activeCase.title}</h1>
            <p className="text-xs text-[#64748B] font-mono mt-0.5">
              Category: <span className="text-[#172033] font-semibold">{activeCase.crime_category}</span> | Registered: <span className="text-[#172033] font-semibold">{new Date(activeCase.created_at).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToCases && (
              <button
                onClick={onNavigateToCases}
                className="btn-rect-secondary text-xs flex items-center gap-1.5"
                title="Return to investigation case registry"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Cases</span>
              </button>
            )}

            {hasPermission('CASE_CHANGE_STATUS') && (
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="btn-rect-primary text-xs"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Advance Stage</span>
              </button>
            )}

            {hasPermission('CASE_ASSIGN') && (
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="btn-rect-secondary text-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Assign Team</span>
              </button>
            )}

            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="btn-rect-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add IO Note</span>
            </button>
          </div>
        </div>

        {/* Case Metadata Summary Attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#E2E8F0] text-xs font-mono">
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] text-[10px] uppercase block">Investigating Agency</span>
            <span className="text-[#172033] font-semibold">{activeCase.investigating_agency || 'State Police Cyber Cell'}</span>
          </div>
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] text-[10px] uppercase block">Police Station</span>
            <span className="text-[#172033] font-semibold">{activeCase.police_station || 'Cyber Crime PS'}</span>
          </div>
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] text-[10px] uppercase block">Stage in Law</span>
            <span className="text-[#163A5F] font-bold">{activeCase.stage ? activeCase.stage.replace(/_/g, ' ') : 'PRELIMINARY ENQUIRY'}</span>
          </div>
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] text-[10px] uppercase block">Last Updated</span>
            <span className="text-[#172033] font-semibold">{new Date(activeCase.updated_at || activeCase.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Workstation Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
        <button
          onClick={onNavigateToIngestion}
          className="p-3 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#163A5F] rounded text-left space-y-1 transition-all shadow-2xs"
        >
          <UploadCloud className="w-4 h-4 text-[#163A5F]" />
          <div className="font-bold text-[#172033] text-xs">Ingest Evidence</div>
          <div className="text-[10px] text-[#64748B]">Multi-modal upload</div>
        </button>

        <button
          onClick={onNavigateToEvidence}
          className="p-3 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#16805C] rounded text-left space-y-1 transition-all shadow-2xs"
        >
          <FileCheck2 className="w-4 h-4 text-[#16805C]" />
          <div className="font-bold text-[#172033] text-xs">Evidence Locker</div>
          <div className="text-[10px] text-[#64748B]">SHA-256 Custody</div>
        </button>

        <button
          onClick={onNavigateToEntities}
          className="p-3 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#2563EB] rounded text-left space-y-1 transition-all shadow-2xs"
        >
          <UserCheck className="w-4 h-4 text-[#2563EB]" />
          <div className="font-bold text-[#172033] text-xs">Entity-360</div>
          <div className="text-[10px] text-[#64748B]">Suspect Dossiers</div>
        </button>

        <button
          onClick={onNavigateToRelationships}
          className="p-3 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#B7791F] rounded text-left space-y-1 transition-all shadow-2xs"
        >
          <Layers className="w-4 h-4 text-[#B7791F]" />
          <div className="font-bold text-[#172033] text-xs">Link Matrix</div>
          <div className="text-[10px] text-[#64748B]">Relational pairs</div>
        </button>

        <button
          onClick={onNavigateToResolution}
          className="p-3 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#2563EB] rounded text-left space-y-1 transition-all shadow-2xs"
        >
          <GitMerge className="w-4 h-4 text-[#2563EB]" />
          <div className="font-bold text-[#172033] text-xs">Resolution Hub</div>
          <div className="text-[10px] text-[#64748B]">Alias clustering</div>
        </button>

        <button
          onClick={onNavigateToGraph}
          className="p-3 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#163A5F] rounded text-left space-y-1 transition-all shadow-2xs"
        >
          <Network className="w-4 h-4 text-[#163A5F]" />
          <div className="font-bold text-[#172033] text-xs">Network Graph</div>
          <div className="text-[10px] text-[#64748B]">4-Tier Topology</div>
        </button>
      </div>

      {/* 2-Column: Team Roster & IO Journal Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Assigned Investigation Team */}
        <div className="lg:col-span-4 workstation-card rounded p-4 space-y-3 font-mono text-xs shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="font-bold text-[#172033] flex items-center gap-1.5 uppercase">
              <Users className="w-3.5 h-3.5 text-[#163A5F]" />
              Investigation Team ({team.length})
            </span>
          </div>

          <div className="space-y-2">
            {team.map((t) => (
              <div key={t.id} className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172033]">{t.full_name || t.username || 'Officer'}</span>
                  <Badge variant="info" size="xs">{t.role_in_case || 'INVESTIGATOR'}</Badge>
                </div>
                <div className="text-[10px] text-[#64748B]">
                  Assigned at {new Date(t.assigned_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {team.length === 0 && (
              <div className="p-4 text-center text-[#94A3B8] text-[11px]">
                No officers currently assigned.
              </div>
            )}
          </div>
        </div>

        {/* IO Case Log & Judicial Notes */}
        <div className="lg:col-span-8 workstation-card rounded p-4 space-y-3 font-mono text-xs shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="font-bold text-[#172033] flex items-center gap-1.5 uppercase">
              <FileText className="w-3.5 h-3.5 text-[#16805C]" />
              Investigator Log & Remarks ({notes.length})
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {notes.map((n) => (
              <div key={n.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                  <span className="text-[#163A5F] font-bold">{n.author_name || 'Investigating Officer'}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#334155] font-sans leading-relaxed">{n.content}</p>
              </div>
            ))}

            {notes.length === 0 && (
              <div className="p-6 text-center text-[#94A3B8] text-[11px]">
                No entries in case log yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAssignModalOpen && (
        <AssignTeamModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          activeCase={activeCase}
          onAssigned={loadCaseDetails}
        />
      )}

      {isNoteModalOpen && (
        <AddNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          activeCase={activeCase}
          onNoteAdded={loadCaseDetails}
        />
      )}

      {isStatusModalOpen && (
        <StatusTransitionModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          activeCase={activeCase}
          onStatusUpdated={() => {
            onRefreshCase();
            loadCaseDetails();
          }}
        />
      )}
    </div>
  );
};
