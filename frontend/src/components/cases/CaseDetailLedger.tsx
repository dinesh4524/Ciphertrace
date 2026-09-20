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
  UploadCloud,
  Layers
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
  onRefreshCase,
}) => {
  const { hasPermission, hasRole } = useAuth();
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
      case 'CRITICAL': return <Badge variant="rose" size="xs">CRITICAL THREAT</Badge>;
      case 'HIGH': return <Badge variant="amber" size="xs">HIGH PRIORITY</Badge>;
      case 'MEDIUM': return <Badge variant="cyan" size="xs">MEDIUM</Badge>;
      default: return <Badge variant="slate" size="xs">LOW</Badge>;
    }
  };

  const stages = [
    { key: 'PRELIMINARY_ENQUIRY', label: '1. Preliminary Enquiry' },
    { key: 'FIR_REGISTERED', label: '2. FIR Registered' },
    { key: 'EVIDENCE_COLLECTION', label: '3. Evidence Fabric Ingest' },
    { key: 'INTERROGATION_PHASE', label: '4. Interrogation & Custody' },
    { key: 'CHARGESHEET_PREPARATION', label: '5. Chargesheet & Trial' },
  ];

  const currentStageIndex = stages.findIndex(s => s.key === activeCase.stage);

  return (
    <div className="space-y-4 font-sans">
      {/* Case Header Card */}
      <div className="workstation-panel p-4 rounded-lg space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold font-mono text-sky-400">{activeCase.case_number}</span>
              {getPriorityBadge(activeCase.priority)}
              <Badge variant="emerald" size="xs">Sec 63 BSA Certified</Badge>
            </div>
            <h1 className="text-base font-bold text-slate-100">{activeCase.title}</h1>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Category: <span className="text-slate-200">{activeCase.crime_category}</span> | Registered: <span className="text-slate-200">{new Date(activeCase.created_at).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

        {/* Stage Progression Bar */}
        <div className="pt-2 border-t border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
            {stages.map((stg, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={stg.key}
                  className={`p-2 rounded border text-center ${
                    isCurrent
                      ? 'bg-sky-950/80 border-sky-600 text-sky-200 font-bold'
                      : isPast
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                      : 'bg-[#080c14] border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="truncate">{stg.label}</div>
                  <div className="text-[9px] mt-0.5 opacity-80">
                    {isCurrent ? 'ACTIVE STAGE' : isPast ? 'COMPLETED' : 'PENDING'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Launch Workstation Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
        <button
          onClick={onNavigateToIngestion}
          className="p-3 bg-[#080c14] hover:bg-[#0d131f] border border-slate-800 hover:border-sky-600 rounded text-left space-y-1 transition-colors"
        >
          <UploadCloud className="w-4 h-4 text-sky-400" />
          <div className="font-bold text-slate-200 text-xs">Ingest Fabric</div>
          <div className="text-[10px] text-slate-500">Multi-modal data</div>
        </button>

        <button
          onClick={onNavigateToEvidence}
          className="p-3 bg-[#080c14] hover:bg-[#0d131f] border border-slate-800 hover:border-emerald-600 rounded text-left space-y-1 transition-colors"
        >
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <div className="font-bold text-slate-200 text-xs">Evidence Locker</div>
          <div className="text-[10px] text-slate-500">SHA-256 Custody</div>
        </button>

        <button
          onClick={onNavigateToEntities}
          className="p-3 bg-[#080c14] hover:bg-[#0d131f] border border-slate-800 hover:border-purple-600 rounded text-left space-y-1 transition-colors"
        >
          <UserCheck className="w-4 h-4 text-purple-400" />
          <div className="font-bold text-slate-200 text-xs">Entity-360</div>
          <div className="text-[10px] text-slate-500">Suspect Dossiers</div>
        </button>

        <button
          onClick={onNavigateToRelationships}
          className="p-3 bg-[#080c14] hover:bg-[#0d131f] border border-slate-800 hover:border-amber-600 rounded text-left space-y-1 transition-colors"
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <div className="font-bold text-slate-200 text-xs">Link Matrix</div>
          <div className="text-[10px] text-slate-500">Relational pairs</div>
        </button>

        <button
          onClick={onNavigateToResolution}
          className="p-3 bg-[#080c14] hover:bg-[#0d131f] border border-slate-800 hover:border-indigo-600 rounded text-left space-y-1 transition-colors"
        >
          <GitMerge className="w-4 h-4 text-indigo-400" />
          <div className="font-bold text-slate-200 text-xs">Resolution Hub</div>
          <div className="text-[10px] text-slate-500">Alias clustering</div>
        </button>

        <button
          onClick={onNavigateToGraph}
          className="p-3 bg-[#080c14] hover:bg-[#0d131f] border border-slate-800 hover:border-sky-500 rounded text-left space-y-1 transition-colors"
        >
          <Network className="w-4 h-4 text-sky-400" />
          <div className="font-bold text-slate-200 text-xs">Network Graph</div>
          <div className="text-[10px] text-slate-500">4-Tier Topology</div>
        </button>
      </div>

      {/* 2-Column: Team Roster & IO Journal Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Assigned Investigation Team */}
        <div className="lg:col-span-4 workstation-card rounded-lg p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              Investigation Team ({team.length})
            </span>
          </div>

          <div className="space-y-2">
            {team.map((t) => (
              <div key={t.id} className="p-2.5 bg-[#080c14] border border-slate-800 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{t.full_name || t.username || 'Officer'}</span>
                  <Badge variant="cyan" size="xs">{t.role_in_case || 'INVESTIGATOR'}</Badge>
                </div>
                <div className="text-[10px] text-slate-400">
                  Assigned at {new Date(t.assigned_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {team.length === 0 && (
              <div className="p-4 text-center text-slate-500 text-[11px]">
                No officers currently assigned.
              </div>
            )}
          </div>
        </div>

        {/* IO Case Log & Judicial Notes */}
        <div className="lg:col-span-8 workstation-card rounded-lg p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Investigator Log & Judicial Remarks ({notes.length})
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {notes.map((n) => (
              <div key={n.id} className="p-3 bg-[#080c14] border border-slate-800 rounded space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="text-sky-300 font-bold">{n.author_name || 'Investigating Officer'}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{n.content}</p>
              </div>
            ))}

            {notes.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-[11px]">
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
