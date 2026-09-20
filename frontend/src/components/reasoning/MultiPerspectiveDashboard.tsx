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
    INVESTIGATOR: { border: 'border-[#BFDBFE]', bg: 'bg-[#EFF6FF]', text: 'text-[#163A5F]', icon: Search },
    FORENSIC: { border: 'border-[#C7D2FE]', bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]', icon: Fingerprint },
    LEGAL: { border: 'border-[#A7F3D0]', bg: 'bg-[#ECFDF5]', text: 'text-[#16805C]', icon: Scale },
    DEFENCE_ALTERNATIVE: { border: 'border-[#FDE68A]', bg: 'bg-[#FFFBEB]', text: 'text-[#B7791F]', icon: Shield },
    SUSPECT_INNOCENT: { border: 'border-[#FECACA]', bg: 'bg-[#FEF2F2]', text: 'text-[#C53030]', icon: UserCheck },
    COMMON_SENSE: { border: 'border-[#E9D5FF]', bg: 'bg-[#FAF5FF]', text: 'text-[#7E22CE]', icon: Compass }
  };

  const consensus = result?.consensus;

  return (
    <div className="space-y-4">
      {/* Header with Case Badge & Non-Culpability Guarantee */}
      <div className="bg-white border border-[#D9E0E8] rounded p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#EFF6FF] text-[#163A5F] rounded border border-[#BFDBFE]">
              <Scale className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
              Multi-Perspective Reasoning & Consensus Synthesis
            </h2>
          </div>
          <p className="text-[#64748B] text-xs mt-1">
            Structures evidentiary analysis across 6 independent viewpoints to prevent confirmation bias and prohibit unilateral guilt determinations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            <span>Past Assessments ({history.length})</span>
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-[#16805C] flex items-center gap-1 justify-end">
              <ShieldCheck className="h-3.5 w-3.5" /> Presumption of Innocence
            </span>
            <span className="text-xs text-[#64748B]">
              Case: <strong className="text-[#172033] font-mono">{activeCase.case_number}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory Statutory Non-Culpability Banner */}
      <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded text-xs text-[#163A5F] flex items-start gap-2.5 shadow-xs">
        <ShieldCheck className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#163A5F] uppercase tracking-wide">Statutory Non-Culpability Notice (Section 63 BSA 2023):</strong>
          <span className="text-[#1E3A8A] ml-1">
            Perspectives in this system are analytic tools designed to test hypotheses, identify contradictory facts, and prevent confirmation bias. 
            <strong> No perspective is permitted to independently declare guilt.</strong> Guilt can only be adjudicated by a court of law.
          </span>
        </div>
      </div>

      {/* Assessment History Drawer */}
      {showHistoryDrawer && (
        <div className="p-4 bg-white border border-[#D9E0E8] rounded space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-[#D9E0E8] pb-2">
            <span className="text-xs font-bold uppercase text-[#172033] flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-[#163A5F]" />
              Chronological Perspective Assessments for Case
            </span>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="text-xs text-[#64748B] hover:text-[#172033]"
            >
              Close
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-[#64748B] italic">No past perspective assessments recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {history.map((hItem) => (
                <button
                  key={hItem.id}
                  onClick={() => handleSelectPastAssessment(hItem.id)}
                  className="p-2.5 rounded bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#D9E0E8] text-left text-xs transition-all space-y-1"
                >
                  <div className="flex justify-between text-[11px] text-[#64748B]">
                    <span className="font-mono">{new Date(hItem.created_at).toLocaleDateString()}</span>
                    <span className="text-[#163A5F] font-semibold">{hItem.target_entity_name || 'General'}</span>
                  </div>
                  <p className="text-[#172033] font-medium line-clamp-2">{hItem.hypothesis_statement}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hypothesis & Target Inquiry Console */}
      <div className="bg-white border border-[#D9E0E8] rounded p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8">
            <label className="text-xs font-semibold text-[#172033] block mb-1">
              Investigative Hypothesis / Inquiry Statement
            </label>
            <input
              type="text"
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-1.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
              placeholder="State the hypothesis to scrutinize from all 6 perspectives..."
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis()}
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-[#172033] block mb-1">
              Target Entity (Suspect / Account / Phone)
            </label>
            <input
              type="text"
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-1.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
              placeholder="e.g. Vikram Sharma or ACC-9988"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Scenario Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D9E0E8]">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#64748B]">
            <span className="font-semibold text-[#172033]">Presets:</span>
            <button
              onClick={() => {
                setHypothesis('Suspect acted as knowing coordinator for Hawala syndicate funds');
                handleRunAnalysis('Suspect acted as knowing coordinator for Hawala syndicate funds', targetEntity);
              }}
              className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#94A3B8] text-[#172033] text-[11px]"
            >
              Hawala Coordinator
            </button>
            <button
              onClick={() => {
                setHypothesis('Entity is an unwitting mule account holder whose KYC was harvested under false pretext');
                handleRunAnalysis('Entity is an unwitting mule account holder whose KYC was harvested under false pretext', targetEntity);
              }}
              className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#94A3B8] text-[#172033] text-[11px]"
            >
              Unwitting Mule Fraud
            </button>
            <button
              onClick={() => {
                setHypothesis('Cell tower co-location represents ordinary commercial coincidence during business hours');
                handleRunAnalysis('Cell tower co-location represents ordinary commercial coincidence during business hours', targetEntity);
              }}
              className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#94A3B8] text-[#172033] text-[11px]"
            >
              Innocent Co-location
            </button>
          </div>

          <button
            onClick={() => handleRunAnalysis()}
            disabled={loading || !hypothesis.trim()}
            className="btn-primary text-xs flex items-center gap-1.5"
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
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded text-[#C53030] text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#C53030] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Workspace */}
      {result && (
        <div className="space-y-4">
          {/* Section 1: The 6 Structured Reasoning Perspectives */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-[#163A5F]" />
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
                    className={`p-3 rounded border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? `${conf.border} ${conf.bg} shadow-xs font-semibold`
                        : 'bg-white border-[#D9E0E8] hover:border-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className={`h-4 w-4 ${conf.text}`} />
                      <span className="text-[10px] font-mono uppercase px-1 py-0.5 rounded bg-[#F8FAFC] text-[#64748B] border border-[#D9E0E8]">
                        {p.certainty_level}
                      </span>
                    </div>
                    <span className={`text-xs block ${isSelected ? 'text-[#163A5F]' : 'text-[#172033]'}`}>
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
                <div className={`p-5 rounded border ${conf.border} ${conf.bg} shadow-xs space-y-4`}>
                  <div className="flex justify-between items-start border-b border-[#D9E0E8] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                        <span className={`p-1 rounded bg-white border border-[#D9E0E8] ${conf.text}`}>
                          {React.createElement(conf.icon, { className: 'h-4 w-4' })}
                        </span>
                        {current.title}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1">{current.summary}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-white border border-[#D9E0E8] text-[#172033] font-mono">
                      Certainty: <strong>{current.certainty_level}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Arguments */}
                    <div className="p-3 rounded bg-white border border-[#D9E0E8] space-y-2 shadow-xs">
                      <span className="font-bold text-[#172033] uppercase tracking-wide text-[11px] block">
                        Core Arguments
                      </span>
                      <ul className="space-y-1.5 text-[#64748B] list-disc list-inside">
                        {current.arguments.map((arg, i) => (
                          <li key={i} className="leading-relaxed">{arg}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Supporting Points */}
                    <div className="p-3 rounded bg-white border border-[#D9E0E8] space-y-2 shadow-xs">
                      <span className="font-bold text-[#16805C] uppercase tracking-wide text-[11px] block">
                        Supporting Evidentiary Points
                      </span>
                      <ul className="space-y-1.5 text-[#64748B] list-disc list-inside">
                        {current.supporting_points.map((pt, i) => (
                          <li key={i} className="leading-relaxed">{pt}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Concerns / Limitations */}
                    <div className="p-3 rounded bg-white border border-[#D9E0E8] space-y-2 shadow-xs">
                      <span className="font-bold text-[#B7791F] uppercase tracking-wide text-[11px] block">
                        Limitations & Evidentiary Gaps
                      </span>
                      <ul className="space-y-1.5 text-[#64748B] list-disc list-inside">
                        {current.concerns_or_limitations.map((c, i) => (
                          <li key={i} className="leading-relaxed">{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-white border border-[#D9E0E8] text-xs text-[#64748B] flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#16805C] shrink-0" />
                    <span>{current.non_culpability_statement}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 2: Consensus / Synthesis Engine Balance Sheet */}
          {consensus && (
            <div className="bg-white border border-[#D9E0E8] rounded p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-[#16805C]" />
                    Consensus Synthesis Balance Sheet
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Unified multi-agent synthesis balancing prosecution leads against defence counter-theories.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#172033] font-mono">
                    Uncertainty: <strong className="text-[#B7791F]">{consensus.uncertainty?.uncertainty_level || 'MODERATE'}</strong> ({((consensus.uncertainty?.uncertainty_score || 0.45) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Supporting vs. Contradictory Evidence Split View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Supporting Evidence */}
                <div className="p-4 rounded bg-[#ECFDF5] border border-[#A7F3D0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#16805C] uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-[#16805C]" />
                      Supporting Evidence ({consensus.supporting_evidence.length})
                    </span>
                    <span className="text-[11px] text-[#065F46]">Corroborated facts</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {consensus.supporting_evidence.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-white border border-[#A7F3D0] text-xs space-y-1 shadow-xs">
                        <div className="flex justify-between items-center text-[11px] text-[#16805C] font-mono">
                          <span>{item.evidence_anchor}</span>
                          <span className="text-[#64748B]">{item.corroboration_level} Corroboration</span>
                        </div>
                        <p className="text-[#172033] font-medium">{item.description}</p>
                        <div className="text-[11px] text-[#64748B]">
                          Source: <span className="text-[#172033]">{item.source}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Contradictory Evidence & Inconsistencies */}
                <div className="p-4 rounded bg-[#FEF2F2] border border-[#FECACA] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#C53030] uppercase tracking-wide flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-[#C53030]" />
                      Contradictory Evidence & Conflicts ({consensus.contradictory_evidence.length})
                    </span>
                    <span className="text-[11px] text-[#991B1B]">Points of reasonable doubt</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {consensus.contradictory_evidence.map((conf, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-white border border-[#FECACA] text-xs space-y-1 shadow-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#C53030] font-bold">{conf.title}</span>
                          <span className="text-[#B7791F] font-mono">{conf.significance} Significance</span>
                        </div>
                        <p className="text-[#172033] font-medium">{conf.description}</p>
                        <div className="text-[11px] text-[#64748B] flex gap-2">
                          <span>Clash: <strong className="text-[#172033]">{conf.perspective_a}</strong> vs <strong className="text-[#172033]">{conf.perspective_b}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Alternative Explanations */}
              <div className="p-4 rounded bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5">
                <span className="text-xs font-bold text-[#92400E] uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#B7791F]" />
                  Alternative Benign Explanations Accounting for Evidence
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {consensus.alternative_explanations.map((alt, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-white border border-[#FDE68A] text-[#172033] leading-relaxed shadow-xs">
                      {alt}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Unresolved Questions & Actionable Recommended Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unresolved Questions */}
                <div className="p-4 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-2.5">
                  <span className="text-xs font-bold text-[#172033] uppercase tracking-wide flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-[#163A5F]" />
                    Crucial Unresolved Questions
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#64748B]">
                    {consensus.unresolved_questions.map((q, idx) => (
                      <li key={idx} className="p-2 rounded bg-white border border-[#D9E0E8] flex items-start gap-2 shadow-xs">
                        <span className="text-[#163A5F] font-mono text-xs font-bold">Q{idx + 1}.</span>
                        <span className="text-[#172033]">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Verification Actions */}
                <div className="p-4 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-2.5">
                  <span className="text-xs font-bold text-[#16805C] uppercase tracking-wide flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-[#16805C]" />
                    Recommended Verification Actions Checklist
                  </span>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {consensus.recommended_verification.map((v, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-white border border-[#D9E0E8] text-xs space-y-1 shadow-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-[#172033]">{v.action_type}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            v.priority === 'HIGH' ? 'bg-[#FEF2F2] text-[#C53030] border border-[#FECACA]' : 'bg-[#F8FAFC] text-[#64748B]'
                          }`}>
                            {v.priority} PRIORITY
                          </span>
                        </div>
                        <div className="text-[#163A5F] font-medium">Target: {v.target}</div>
                        <p className="text-[#64748B] text-xs">{v.expected_outcome}</p>
                        <div className="text-[10px] text-[#94A3B8]">Mandate: {v.statutory_mandate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 63 BSA 2023 Judicial Doctrine Declaration */}
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-xs text-[#64748B] flex items-start gap-2.5">
                <Scale className="h-4 w-4 text-[#16805C] shrink-0 mt-0.5" />
                <span>{consensus.judicial_non_culpability_doctrine}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
