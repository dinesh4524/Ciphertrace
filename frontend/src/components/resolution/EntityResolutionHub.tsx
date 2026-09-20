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
    <div className="space-y-6">
      {/* Header */}
      <div className="workstation-panel p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              ENTITY RESOLUTION & IDENTITY HUB
            </h1>
            <Badge variant="inferred">Human-in-the-Loop Verified</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            AI-proposed entity resolution candidates across aliases, transliterations, phonetics, and hardware identifiers.
            In accordance with Indian legal standards (Section 63 BSA), uncertain matches are never silently merged without recorded investigator authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCandidates}
            className="btn-rect-secondary text-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleRunResolution}
            disabled={runningER}
            className="btn-rect-primary text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{runningER ? 'Running Pipeline...' : 'Run Resolution'}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 text-xs font-mono">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('CANDIDATES')}
            className={`pb-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'CANDIDATES'
                ? 'text-purple-400 border-purple-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>AI Proposed Candidates ({candidates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CANONICAL')}
            className={`pb-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'CANONICAL'
                ? 'text-purple-400 border-purple-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Resolved Canonical Personas ({canonicalEntities.length})</span>
          </button>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="hidden sm:flex items-center gap-2 pb-2 text-[11px] text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-purple-400" />
          <span>Match Threshold:</span>
          <span className="font-bold text-cyan-300">{(threshold * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-20 accent-purple-500"
          />
        </div>
      </div>

      {/* Candidates Tab */}
      {activeTab === 'CANDIDATES' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate source, target, or match type..."
                className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
              {['ALL', 'PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'CHALLENGED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === st
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Candidate Match Cards */}
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-500">
              Evaluating pairwise identity candidates...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center cyber-glass rounded-2xl border border-slate-800 space-y-3">
              <GitMerge className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No resolution candidates in this view</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click &ldquo;Run Resolution&rdquo; above to generate AI-proposed entity pairings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-5 rounded-xl cyber-glass-card border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-cyan-300">
                        {cand.entity_type}
                      </span>
                      <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Match Strategy: <strong className="text-purple-300">{cand.match_type}</strong>
                      </span>
                      <Badge variant={getStatusBadgeVariant(cand.review_status)}>
                        {cand.review_status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">Match Confidence:</span>
                      <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                        {(cand.confidence_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[10px] uppercase">Entity Candidate A</span>
                      <div className="font-bold text-sm text-slate-100 truncate">{cand.source_value}</div>
                    </div>

                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[10px] uppercase">Entity Candidate B</span>
                      <div className="font-bold text-sm text-slate-100 truncate">{cand.target_value}</div>
                    </div>
                  </div>

                  {/* Feature Score Breakdown & Decision Audit */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                    <div className="flex flex-wrap items-center gap-3 text-slate-400">
                      {Object.entries(cand.feature_scores || {}).map(([k, v]) => (
                        <span key={k} className="bg-slate-900 px-2 py-0.5 rounded">
                          {k}: <strong className="text-cyan-400">{typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : String(v)}</strong>
                        </span>
                      ))}
                    </div>

                    {/* Review Actions */}
                    {cand.review_status === 'PENDING_REVIEW' ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleOpenReview(cand, 'ACCEPTED')}
                          className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg flex items-center gap-1 font-semibold transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Accept & Merge</span>
                        </button>
                        <button
                          onClick={() => handleOpenReview(cand, 'REJECTED')}
                          className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg flex items-center gap-1 font-semibold transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleOpenReview(cand, 'CHALLENGED')}
                          className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded-lg flex items-center gap-1 font-semibold transition-all"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Challenge</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-right">
                        <span>Reviewed by <strong className="text-slate-200">{cand.reviewer_username}</strong></span>
                        {cand.decision_reason && (
                          <div className="text-[10px] text-slate-500 italic max-w-sm truncate">
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
            <div className="p-12 text-center cyber-glass rounded-2xl border border-slate-800 space-y-3">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No verified canonical personas yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Review and accept AI-proposed candidate matches to establish verified canonical identity records.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {canonicalEntities.map((canon) => (
                <div
                  key={canon.id}
                  className="p-5 rounded-xl cyber-glass-card border border-purple-500/30 space-y-3 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400 font-bold bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                      {canon.canonical_code}
                    </span>
                    <Badge variant="emerald">VERIFIED CANONICAL</Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{canon.canonical_name}</h3>
                    <p className="text-slate-500 text-[11px]">Type: {canon.entity_type} | Merged Records: {canon.members_count}</p>
                  </div>

                  {/* Aliases List */}
                  {canon.aliases && canon.aliases.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[11px] block">Known Aliases & Transliterations:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {canon.aliases.map((al, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-[11px]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0b1329] border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden cyber-glow-cyan p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-white text-sm">Investigator Decision & Justification Audit</span>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Match Confidence:</span>
                  <span className="text-emerald-400 font-bold">{(selectedCandidate.confidence_score * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-slate-500">Source: </span>
                  <span className="text-slate-200 font-bold">{selectedCandidate.source_value}</span>
                </div>
                <div>
                  <span className="text-slate-500">Target: </span>
                  <span className="text-slate-200 font-bold">{selectedCandidate.target_value}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Decision Action</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ACCEPTED', 'REJECTED', 'CHALLENGED'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setReviewDecision(d)}
                      className={`py-2 rounded-lg font-bold border transition-all text-xs ${
                        reviewDecision === d
                          ? d === 'ACCEPTED'
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                            : d === 'REJECTED'
                            ? 'bg-rose-950 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                            : 'bg-amber-950 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {reviewDecision === 'ACCEPTED' && (
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Merge Directive</label>
                  <select
                    value={mergeDirective}
                    onChange={(e) => setMergeDirective(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-purple-500 focus:outline-none font-mono"
                  >
                    <option value="MERGE_AS_CANONICAL">Merge as Unified Canonical Persona</option>
                    <option value="LINK_AS_ALIAS">Link as Known Alias / Alternate Identity</option>
                    <option value="LINK_AS_HARDWARE_ASSOCIATE">Link as Shared Hardware / Telecom Account</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">
                  Investigative Justification Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={3}
                  placeholder="Record evidentiary basis (e.g. Alias corroborated by witness statement, or Different parentage recorded)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || !decisionReason.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-purple-900/50"
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
