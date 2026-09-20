import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCw, 
  Play, 
  ShieldCheck, 
  UserCheck, 
  Search,
  Sliders
} from 'lucide-react';
import { 
  Case, 
  EntityResolutionCandidate, 
  CanonicalEntity, 
  CandidateReviewStatus 
} from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface EntityResolutionHubProps {
  activeCase: Case;
}

export const EntityResolutionHub: React.FC<EntityResolutionHubProps> = ({ activeCase }) => {
  const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'CANONICAL'>('CANDIDATES');
  const [candidates, setCandidates] = useState<EntityResolutionCandidate[]>([]);
  const [canonicalEntities, setCanonicalEntities] = useState<CanonicalEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningER, setRunningER] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [threshold, setThreshold] = useState<number>(0.70);
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<EntityResolutionCandidate | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'ACCEPTED' | 'REJECTED' | 'CHALLENGED'>('ACCEPTED');
  const [decisionReason, setDecisionReason] = useState('');
  const [mergeDirective, setMergeDirective] = useState('MERGE_AS_CANONICAL');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await api.getEntityResolutionCandidates(activeCase.id, statusParam);
      setCandidates(data);
    } catch (err: any) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCanonical = async () => {
    try {
      const data = await api.getCanonicalEntities(activeCase.id);
      setCanonicalEntities(data);
    } catch (err: any) {
      console.error('Failed to fetch canonical entities:', err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchCanonical();
  }, [activeCase.id, statusFilter]);

  const handleRunResolution = async () => {
    setRunningER(true);
    try {
      const result = await api.runEntityResolution(activeCase.id, threshold);
      alert(`Entity Resolution Completed: ${result.candidates_generated} new candidate match pairs identified for human review.`);
      fetchCandidates();
      fetchCanonical();
    } catch (err: any) {
      alert(`Resolution run failed: ${err.message}`);
    } finally {
      setRunningER(false);
    }
  };

  const handleOpenReview = (candidate: EntityResolutionCandidate, defaultDecision: 'ACCEPTED' | 'REJECTED' | 'CHALLENGED') => {
    setSelectedCandidate(candidate);
    setReviewDecision(defaultDecision);
    setDecisionReason('');
  };

  const handleSubmitReview = async () => {
    if (!selectedCandidate) return;
    if (!decisionReason.trim() || decisionReason.length < 3) {
      alert('A valid investigative justification reason is required for court audit trail.');
      return;
    }

    setSubmittingReview(true);
    try {
      await api.reviewCandidate(
        selectedCandidate.id,
        reviewDecision,
        decisionReason,
        mergeDirective
      );
      setSelectedCandidate(null);
      fetchCandidates();
      fetchCanonical();
    } catch (err: any) {
      alert(`Review submission error: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.source_value.toLowerCase().includes(q) ||
      c.target_value.toLowerCase().includes(q) ||
      c.match_type.toLowerCase().includes(q)
    );
  });

  const getStatusBadgeVariant = (status: CandidateReviewStatus): any => {
    switch (status) {
      case 'ACCEPTED': return 'emerald';
      case 'REJECTED': return 'rose';
      case 'CHALLENGED': return 'amber';
      default: return 'purple';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#D9E0E8] p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-[#172033] tracking-tight">
              Entity Resolution & Identity Hub
            </h1>
            <Badge variant="inferred">Human-in-the-Loop Verified</Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Resolution candidates across aliases, transliterations, phonetics, and hardware identifiers.
            In accordance with Indian legal standards (Section 63 BSA), uncertain matches are never silently merged without recorded investigator authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCandidates}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleRunResolution}
            disabled={runningER}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{runningER ? 'Running Pipeline...' : 'Run Resolution'}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[#D9E0E8] text-xs">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('CANDIDATES')}
            className={`pb-2.5 font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'CANDIDATES'
                ? 'text-[#163A5F] border-[#163A5F]'
                : 'text-[#64748B] border-transparent hover:text-[#172033]'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>Proposed Candidates ({candidates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CANONICAL')}
            className={`pb-2.5 font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'CANONICAL'
                ? 'text-[#163A5F] border-[#163A5F]'
                : 'text-[#64748B] border-transparent hover:text-[#172033]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Canonical Personas ({canonicalEntities.length})</span>
          </button>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="hidden sm:flex items-center gap-2 pb-2 text-xs text-[#64748B]">
          <Sliders className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Match Threshold:</span>
          <span className="font-bold text-[#163A5F]">{(threshold * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-20 accent-[#163A5F]"
          />
        </div>
      </div>

      {/* Candidates Tab */}
      {activeTab === 'CANDIDATES' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white border border-[#D9E0E8] rounded px-2.5 py-1.5 flex-1 max-w-md shadow-xs">
              <Search className="w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate source, target, or match type..."
                className="bg-transparent border-none outline-none text-xs text-[#172033] placeholder-[#94A3B8] w-full"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {['ALL', 'PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'CHALLENGED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded transition-colors text-xs font-medium ${
                    statusFilter === st
                      ? 'bg-[#163A5F] text-white'
                      : 'bg-white text-[#64748B] hover:text-[#172033] border border-[#D9E0E8]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Candidate Match Cards */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              Evaluating pairwise identity candidates...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#D9E0E8] rounded space-y-2 shadow-xs">
              <GitMerge className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <p className="text-xs text-[#172033] font-medium">No resolution candidates in this view</p>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Click &ldquo;Run Resolution&rdquo; above to generate AI-proposed entity pairings.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-4 rounded bg-white border border-[#D9E0E8] hover:border-[#94A3B8] transition-colors space-y-3 shadow-xs"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#163A5F]">
                        {cand.entity_type}
                      </span>
                      <span className="text-xs text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#D9E0E8]">
                        Strategy: <strong className="text-[#172033]">{cand.match_type}</strong>
                      </span>
                      <Badge variant={getStatusBadgeVariant(cand.review_status)}>
                        {cand.review_status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#64748B]">Confidence:</span>
                      <span className="text-[#16805C] font-bold bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                        {(cand.confidence_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1">
                      <span className="text-[#64748B] text-[10px] uppercase font-semibold">Entity Candidate A</span>
                      <div className="font-bold text-xs text-[#172033] truncate font-mono">{cand.source_value}</div>
                    </div>

                    <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1">
                      <span className="text-[#64748B] text-[10px] uppercase font-semibold">Entity Candidate B</span>
                      <div className="font-bold text-xs text-[#172033] truncate font-mono">{cand.target_value}</div>
                    </div>
                  </div>

                  {/* Feature Score Breakdown & Decision Audit */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#D9E0E8] text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-[#64748B]">
                      {Object.entries(cand.feature_scores || {}).map(([k, v]) => (
                        <span key={k} className="bg-[#F8FAFC] border border-[#D9E0E8] px-2 py-0.5 rounded text-[11px]">
                          {k}: <strong className="text-[#163A5F]">{typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : String(v)}</strong>
                        </span>
                      ))}
                    </div>

                    {/* Review Actions */}
                    {cand.review_status === 'PENDING_REVIEW' ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleOpenReview(cand, 'ACCEPTED')}
                          className="btn-primary text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept & Merge</span>
                        </button>
                        <button
                          onClick={() => handleOpenReview(cand, 'REJECTED')}
                          className="btn-danger text-xs flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleOpenReview(cand, 'CHALLENGED')}
                          className="btn-secondary text-xs text-[#B7791F] flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Challenge</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[#64748B] text-right text-xs">
                        <span>Reviewed by <strong className="text-[#172033]">{cand.reviewer_username}</strong></span>
                        {cand.decision_reason && (
                          <div className="text-[11px] text-[#64748B] italic max-w-sm truncate">
                            &ldquo;{cand.decision_reason}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Canonical Entities Tab */}
      {activeTab === 'CANONICAL' && (
        <div className="space-y-4">
          {canonicalEntities.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#D9E0E8] rounded space-y-2 shadow-xs">
              <UserCheck className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <p className="text-xs text-[#172033] font-medium">No verified canonical personas yet</p>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Review and accept AI-proposed candidate matches to establish verified canonical identity records.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {canonicalEntities.map((canon) => (
                <div
                  key={canon.id}
                  className="p-4 rounded bg-white border border-[#D9E0E8] space-y-2.5 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#163A5F] font-bold bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE] font-mono">
                      {canon.canonical_code}
                    </span>
                    <Badge variant="verified">VERIFIED CANONICAL</Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#172033]">{canon.canonical_name}</h3>
                    <p className="text-[#64748B] text-xs">Type: {canon.entity_type} | Merged Records: {canon.members_count}</p>
                  </div>

                  {/* Aliases List */}
                  {canon.aliases && canon.aliases.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[#64748B] text-[11px] font-semibold block">Known Aliases & Transliterations:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {canon.aliases.map((al, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#172033] text-xs font-mono">
                            {al}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Investigator Review Decision Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border border-[#D9E0E8] rounded shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#163A5F]" />
                <span className="font-bold text-[#172033] text-xs">Investigator Decision & Justification Audit</span>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-[#64748B] hover:text-[#172033] text-base">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1.5">
                <div className="flex justify-between text-[#64748B] text-xs">
                  <span>Match Confidence:</span>
                  <span className="text-[#16805C] font-bold">{(selectedCandidate.confidence_score * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Source: </span>
                  <span className="text-[#172033] font-bold font-mono">{selectedCandidate.source_value}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Target: </span>
                  <span className="text-[#172033] font-bold font-mono">{selectedCandidate.target_value}</span>
                </div>
              </div>

              <div>
                <label className="text-[#64748B] text-xs font-medium block mb-1">Decision Action</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ACCEPTED', 'REJECTED', 'CHALLENGED'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setReviewDecision(d)}
                      className={`py-1.5 rounded font-bold border transition-colors text-xs ${
                        reviewDecision === d
                          ? d === 'ACCEPTED'
                            ? 'bg-[#ECFDF5] border-[#16805C] text-[#16805C]'
                            : d === 'REJECTED'
                            ? 'bg-[#FEF2F2] border-[#C53030] text-[#C53030]'
                            : 'bg-[#FFFBEB] border-[#B7791F] text-[#B7791F]'
                          : 'bg-white border-[#D9E0E8] text-[#64748B] hover:border-[#94A3B8]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {reviewDecision === 'ACCEPTED' && (
                <div>
                  <label className="text-[#64748B] text-xs font-medium block mb-1">Merge Directive</label>
                  <select
                    value={mergeDirective}
                    onChange={(e) => setMergeDirective(e.target.value)}
                    className="w-full bg-white border border-[#D9E0E8] rounded px-2.5 py-1.5 text-[#172033] text-xs focus:outline-none focus:border-[#163A5F]"
                  >
                    <option value="MERGE_AS_CANONICAL">Merge as Unified Canonical Persona</option>
                    <option value="LINK_AS_ALIAS">Link as Known Alias / Alternate Identity</option>
                    <option value="LINK_AS_HARDWARE_ASSOCIATE">Link as Shared Hardware / Telecom Account</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[#64748B] text-xs font-medium block mb-1">
                  Investigative Justification Reason <span className="text-[#C53030]">*</span>
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={3}
                  placeholder="Record evidentiary basis (e.g. Alias corroborated by witness statement, or Different parentage recorded)..."
                  className="w-full bg-white border border-[#D9E0E8] rounded p-2.5 text-[#172033] text-xs focus:outline-none focus:border-[#163A5F]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E0E8]">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || !decisionReason.trim()}
                className="btn-primary text-xs"
              >
                {submittingReview ? 'Recording Decision...' : 'Confirm Decision & Log Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
