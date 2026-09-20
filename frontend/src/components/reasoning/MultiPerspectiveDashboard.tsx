import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Search, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Sliders, 
  History, 
  FileText, 
  Fingerprint, 
  UserCheck, 
  Shield, 
  Compass, 
  CheckSquare, 
  Clock, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { 
  Case, 
  MultiPerspectiveAnalysisResponse, 
  PerspectiveReport, 
  PerspectiveType, 
  PerspectiveAssessmentSummary 
} from '../../types';
import { api } from '../../services/api';

interface MultiPerspectiveDashboardProps {
  activeCase: Case;
}

export const MultiPerspectiveDashboard: React.FC<MultiPerspectiveDashboardProps> = ({ activeCase }) => {
  const [hypothesis, setHypothesis] = useState<string>('Suspect operated as a knowing coordinator for Hawala syndicate funds');
  const [targetEntity, setTargetEntity] = useState<string>('Vikram Sharma');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activePerspective, setActivePerspective] = useState<PerspectiveType>('INVESTIGATOR');
  const [result, setResult] = useState<MultiPerspectiveAnalysisResponse | null>(null);
  const [history, setHistory] = useState<PerspectiveAssessmentSummary[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (activeCase?.id) {
      loadHistory(activeCase.id);
    }
  }, [activeCase?.id]);

  const loadHistory = async (caseId: string) => {
    try {
      const res = await api.getPerspectiveHistory(caseId);
      if (res && res.assessments) {
        setHistory(res.assessments);
      }
    } catch (err: any) {
      console.warn('Failed to load perspective assessment history:', err);
    }
  };

  const handleRunAnalysis = async (customHypothesis?: string, customEntity?: string) => {
    const h = customHypothesis !== undefined ? customHypothesis : hypothesis;
    const e = customEntity !== undefined ? customEntity : targetEntity;
    if (!h.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.runMultiPerspectiveAnalysis(activeCase.id, {
        hypothesis: h,
        target_entity: e.trim() || undefined,
        include_historical_records: true
      });
      setResult(response);
      loadHistory(activeCase.id);
    } catch (err: any) {
      setError(err.message || 'Failed to execute multi-perspective reasoning.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPastAssessment = async (assessmentId: string) => {
    setLoading(true);
    try {
      const full = await api.getPerspectiveAssessment(assessmentId);
      setResult(full);
      setHypothesis(full.hypothesis);
      if (full.target_entity) setTargetEntity(full.target_entity);
      setShowHistoryDrawer(false);
    } catch (err: any) {
      setError('Failed to fetch historical assessment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const perspectiveColorMap: Record<PerspectiveType, { border: string; bg: string; text: string; icon: any }> = {
    INVESTIGATOR: { border: 'border-cyan-500/40', bg: 'bg-cyan-950/20', text: 'text-cyan-400', icon: Search },
    FORENSIC: { border: 'border-indigo-500/40', bg: 'bg-indigo-950/20', text: 'text-indigo-400', icon: Fingerprint },
    LEGAL: { border: 'border-emerald-500/40', bg: 'bg-emerald-950/20', text: 'text-emerald-400', icon: Scale },
    DEFENCE_ALTERNATIVE: { border: 'border-amber-500/40', bg: 'bg-amber-950/20', text: 'text-amber-400', icon: Shield },
    SUSPECT_INNOCENT: { border: 'border-rose-500/40', bg: 'bg-rose-950/20', text: 'text-rose-400', icon: UserCheck },
    COMMON_SENSE: { border: 'border-purple-500/40', bg: 'bg-purple-950/20', text: 'text-purple-400', icon: Compass }
  };

  const consensus = result?.consensus;

  return (
    <div className="space-y-6">
      {/* Header with Case Badge & Non-Culpability Guarantee */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Scale className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Multi-Perspective Reasoning & Consensus Synthesis
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                Phase 13
              </span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Structures evidentiary analysis across 6 independent viewpoints to prevent confirmation bias and prohibit unilateral guilt determinations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 flex items-center gap-1.5 transition-all"
          >
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span>Past Assessments ({history.length})</span>
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 justify-end">
              <ShieldCheck className="h-3.5 w-3.5" /> Presumption of Innocence
            </span>
            <span className="text-xs text-slate-400">
              Case: <strong className="text-slate-200">{activeCase.case_number}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory Statutory Non-Culpability Banner */}
      <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-emerald-200 uppercase tracking-wide">Statutory Non-Culpability Notice (Section 63 BSA 2023):</strong>
          <span className="text-emerald-300/90 ml-1">
            Perspectives in this system are analytic tools designed to test hypotheses, identify contradictory facts, and prevent confirmation bias. 
            <strong> No perspective is permitted to independently declare guilt.</strong> Guilt can only be adjudicated by a court of law.
          </span>
        </div>
      </div>

      {/* Assessment History Drawer */}
      {showHistoryDrawer && (
        <div className="p-4 bg-slate-900/90 border border-slate-700 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-indigo-400" />
              Chronological Perspective Assessments for Case
            </span>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No past perspective assessments recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {history.map((hItem) => (
                <button
                  key={hItem.id}
                  onClick={() => handleSelectPastAssessment(hItem.id)}
                  className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left text-xs transition-all space-y-1"
                >
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{new Date(hItem.created_at).toLocaleDateString()}</span>
                    <span className="text-indigo-300 font-mono">{hItem.target_entity_name || 'General'}</span>
                  </div>
                  <p className="text-slate-200 font-medium line-clamp-2">{hItem.hypothesis_statement}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hypothesis & Target Inquiry Console */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-md space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Investigative Hypothesis / Inquiry Statement
            </label>
            <input
              type="text"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              placeholder="State the hypothesis to scrutinize from all 6 perspectives..."
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis()}
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Target Entity (Suspect / Account / Phone)
            </label>
            <input
              type="text"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Vikram Sharma or ACC-9988"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Scenario Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-500">Presets:</span>
            <button
              onClick={() => {
                setHypothesis('Suspect acted as knowing coordinator for Hawala syndicate funds');
                handleRunAnalysis('Suspect acted as knowing coordinator for Hawala syndicate funds', targetEntity);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-[11px]"
            >
              Hawala Coordinator
            </button>
            <button
              onClick={() => {
                setHypothesis('Entity is an unwitting mule account holder whose KYC was harvested under false pretext');
                handleRunAnalysis('Entity is an unwitting mule account holder whose KYC was harvested under false pretext', targetEntity);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-[11px]"
            >
              Unwitting Mule Fraud
            </button>
            <button
              onClick={() => {
                setHypothesis('Cell tower co-location represents ordinary commercial coincidence during business hours');
                handleRunAnalysis('Cell tower co-location represents ordinary commercial coincidence during business hours', targetEntity);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-[11px]"
            >
              Innocent Co-location
            </button>
          </div>

          <button
            onClick={() => handleRunAnalysis()}
            disabled={loading || !hypothesis.trim()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Evaluating 6 Viewpoints...</span>
              </>
            ) : (
              <>
                <Scale className="h-3.5 w-3.5" />
                <span>Synthesize Perspectives</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/40 rounded-lg text-red-200 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Workspace */}
      {result && (
        <div className="space-y-6">
          {/* Section 1: The 6 Structured Reasoning Perspectives */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-indigo-400" />
              6-Perspective Analytical Matrix
            </span>

            {/* Viewpoint Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {result.perspectives.map((p) => {
                const conf = perspectiveColorMap[p.perspective];
                const IconComponent = conf.icon;
                const isSelected = activePerspective === p.perspective;
                return (
                  <button
                    key={p.perspective}
                    onClick={() => setActivePerspective(p.perspective)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? `${conf.border} ${conf.bg} shadow-md ring-1 ring-emerald-500/30`
                        : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className={`h-4 w-4 ${conf.text}`} />
                      <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-900/80 text-slate-400 border border-slate-700">
                        {p.certainty_level}
                      </span>
                    </div>
                    <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {p.perspective.replace('_', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Perspective Detailed Breakdown Card */}
            {(() => {
              const current = result.perspectives.find((p) => p.perspective === activePerspective);
              if (!current) return null;
              const conf = perspectiveColorMap[current.perspective];

              return (
                <div className={`p-5 rounded-xl border ${conf.border} ${conf.bg} bg-slate-900/90 shadow-lg space-y-4`}>
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span className={`p-1 rounded bg-slate-800 border border-slate-700 ${conf.text}`}>
                          {React.createElement(conf.icon, { className: 'h-4 w-4' })}
                        </span>
                        {current.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">{current.summary}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                      Certainty: <strong>{current.certainty_level}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Arguments */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                      <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] block">
                        Core Arguments
                      </span>
                      <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                        {current.arguments.map((arg, i) => (
                          <li key={i} className="leading-relaxed">{arg}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Supporting Points */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                      <span className="font-bold text-emerald-300 uppercase tracking-wide text-[11px] block">
                        Supporting Evidentiary Points
                      </span>
                      <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                        {current.supporting_points.map((pt, i) => (
                          <li key={i} className="leading-relaxed">{pt}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Concerns / Limitations */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                      <span className="font-bold text-amber-300 uppercase tracking-wide text-[11px] block">
                        Limitations & Evidentiary Gaps
                      </span>
                      <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                        {current.concerns_or_limitations.map((c, i) => (
                          <li key={i} className="leading-relaxed">{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{current.non_culpability_statement}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 2: Consensus / Synthesis Engine Balance Sheet */}
          {consensus && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                    Consensus Synthesis Balance Sheet
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unified multi-agent synthesis balancing prosecution leads against defence counter-theories.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                    Uncertainty: <strong className="text-amber-400">{consensus.uncertainty?.uncertainty_level || 'MODERATE'}</strong> ({((consensus.uncertainty?.uncertainty_score || 0.45) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Supporting vs. Contradictory Evidence Split View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Supporting Evidence */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Supporting Evidence ({consensus.supporting_evidence.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Corroborated facts</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {consensus.supporting_evidence.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-slate-800/70 border border-slate-700/80 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono">
                          <span>{item.evidence_anchor}</span>
                          <span className="text-slate-400">{item.corroboration_level} Corroboration</span>
                        </div>
                        <p className="text-slate-200">{item.description}</p>
                        <div className="text-[10px] text-slate-400">
                          Source: <span className="text-slate-300">{item.source}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Contradictory Evidence & Inconsistencies */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                      Contradictory Evidence & Conflicts ({consensus.contradictory_evidence.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Points of reasonable doubt</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {consensus.contradictory_evidence.map((conf, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-slate-800/70 border border-slate-700/80 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-rose-400 font-bold">{conf.title}</span>
                          <span className="text-amber-400 font-mono">{conf.significance} Significance</span>
                        </div>
                        <p className="text-slate-300">{conf.description}</p>
                        <div className="text-[10px] text-slate-400 flex gap-2">
                          <span>Clash: <strong className="text-slate-300">{conf.perspective_a}</strong> vs <strong className="text-slate-300">{conf.perspective_b}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Alternative Explanations */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-800/40 space-y-2.5">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-amber-400" />
                  Alternative Benign Explanations Accounting for Evidence
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {consensus.alternative_explanations.map((alt, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-200 leading-relaxed">
                      {alt}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Unresolved Questions & Actionable Recommended Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unresolved Questions */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-cyan-400" />
                    Crucial Unresolved Questions
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {consensus.unresolved_questions.map((q, idx) => (
                      <li key={idx} className="p-2 rounded bg-slate-800/60 border border-slate-700/60 flex items-start gap-2">
                        <span className="text-cyan-400 font-mono text-[11px] font-bold">Q{idx + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Verification Actions */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                    Recommended Verification Actions Checklist
                  </span>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {consensus.recommended_verification.map((v, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-slate-800/70 border border-slate-700/80 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-200">{v.action_type}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            v.priority === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {v.priority} PRIORITY
                          </span>
                        </div>
                        <div className="text-emerald-300/90 font-medium">Target: {v.target}</div>
                        <p className="text-slate-400 text-[11px]">{v.expected_outcome}</p>
                        <div className="text-[10px] text-slate-500">Mandate: {v.statutory_mandate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 63 BSA 2023 Judicial Doctrine Declaration */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <Scale className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{consensus.judicial_non_culpability_doctrine}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
