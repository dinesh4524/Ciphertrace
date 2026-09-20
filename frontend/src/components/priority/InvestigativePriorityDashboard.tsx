import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Target, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Scale, 
  Radio, 
  CreditCard, 
  MapPin, 
  History, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  Compass, 
  ChevronRight, 
  Sliders, 
  Flame,
  Award,
  Layers,
  Search
} from 'lucide-react';
import { 
  Case, 
  InvestigativePriorityAssessmentResponse, 
  PriorityAssessmentSummaryItem,
  InvestigativePriorityLevel,
  NextBestAction
} from '../../types';
import { api } from '../../services/api';

interface InvestigativePriorityDashboardProps {
  activeCase: Case;
}

export const InvestigativePriorityDashboard: React.FC<InvestigativePriorityDashboardProps> = ({ activeCase }) => {
  const [targetEntity, setTargetEntity] = useState<string>('Vikram Sharma');
  const [leadTitle, setLeadTitle] = useState<string>('Hawala Channel & Customs Clearance Hub');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [assessment, setAssessment] = useState<InvestigativePriorityAssessmentResponse | null>(null);
  const [historyList, setHistoryList] = useState<PriorityAssessmentSummaryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'priority_breakdown' | 'next_actions' | 'evidence_balance' | 'history'>('priority_breakdown');

  useEffect(() => {
    if (activeCase?.id) {
      loadHistory(activeCase.id);
    }
  }, [activeCase?.id]);

  const loadHistory = async (caseId: string) => {
    try {
      const items = await api.getPriorityHistory(caseId);
      setHistoryList(items || []);
    } catch (err: any) {
      console.error('Failed to load priority history:', err);
    }
  };

  const handleRunAssessment = async () => {
    if (!activeCase?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.assessInvestigativePriority(activeCase.id, {
        lead_title: leadTitle.trim() || undefined,
        target_entity_name: targetEntity.trim() || undefined,
        include_next_best_actions: true
      });
      setAssessment(res);
      setActiveTab('priority_breakdown');
      loadHistory(activeCase.id);
    } catch (err: any) {
      setError(err.message || 'Failed to execute priority assessment');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (level: InvestigativePriorityLevel | string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-600">
            <Flame className="w-3.5 h-3.5 text-rose-400" /> CRITICAL PRIORITY
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> HIGH PRIORITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-sky-950/80 text-sky-300 border border-sky-600">
            <Activity className="w-3.5 h-3.5 text-sky-400" /> MEDIUM PRIORITY
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> LOW PRIORITY
          </span>
        );
      case 'DEPRIOTIZED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-slate-500 border border-slate-800">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> DEPRIORITIZED
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">IMMEDIATE</span>;
      case 'HIGH_PRIORITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH PRIORITY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">ROUTINE</span>;
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality.toUpperCase()) {
      case 'CDR':
        return <Radio className="w-4 h-4 text-sky-400" />;
      case 'FINANCIAL':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'LOCATION':
        return <MapPin className="w-4 h-4 text-amber-400" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      default:
        return <Layers className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            Phase 15 — Operational Intelligence
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Investigative Priority & Next Best Action
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Multi-attribute Bayesian priority ranking & Shannon Expected Information Gain (EIG) action roadmap.
          </p>
        </div>

        <button
          onClick={handleRunAssessment}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 text-sm transition-all disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Evaluating Priority & Actions...' : 'Assess Priority & Next Best Actions'}
        </button>
      </div>

      {/* Statutory Safeguard Doctrine Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300 uppercase tracking-wide mr-1">
            Statutory Safeguard (Section 63 BSA 2023 / BNSS 2023):
          </span>
          Investigative priority and Next Best Action (NBA) engines evaluate operational resource allocation and 
          information entropy reduction. 
          <strong className="text-amber-100 underline decoration-amber-500/50 underline-offset-2 ml-1">
            High investigative priority reflects urgency of inquiry and does NOT constitute proof of guilt, liability, or criminality.
          </strong>
        </div>
      </div>

      {/* Assessment Target Input Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Lead / Hypothesis Title
            </label>
            <input
              type="text"
              value={leadTitle}
              onChange={(e) => setLeadTitle(e.target.value)}
              placeholder="e.g. Customs Port Clearance Hawala Network"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Entity / Suspect Name
            </label>
            <input
              type="text"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              placeholder="e.g. Vikram Sharma"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('priority_breakdown')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'priority_breakdown'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          9-Factor Priority Assessment
        </button>

        <button
          onClick={() => setActiveTab('next_actions')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'next_actions'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          Next Best Actions (EIG Ranked)
          {assessment?.next_best_actions && (
            <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full font-mono">
              {assessment.next_best_actions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('evidence_balance')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'evidence_balance'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          Supporting vs Contradictory Balance
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Assessments History ({historyList.length})
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          {error}
        </div>
      )}

      {/* TAB 1: 9-FACTOR PRIORITY ASSESSMENT */}
      {activeTab === 'priority_breakdown' && (
        <div className="space-y-6">
          {!assessment && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
              <Compass className="w-12 h-12 text-indigo-400/60 mx-auto animate-pulse" />
              <h3 className="text-base font-semibold text-slate-200">No Priority Assessment Run Yet</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Click &quot;Assess Priority & Next Best Actions&quot; above to calculate the multi-attribute 9-factor score 
                and determine the operational urgency of this lead.
              </p>
            </div>
          )}

          {assessment && (
            <>
              {/* Score Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getPriorityBadge(assessment.priority_level)}
                    <span className="text-xs text-slate-400 font-mono">
                      Assessment ID: {assessment.assessment_id.slice(0, 8)}...
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">
                    {assessment.lead_title}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    Target Subject: <span className="text-slate-200 font-semibold">{assessment.target_entity_name || 'Case Entity'}</span>
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 px-6 flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Priority Score</div>
                    <div className="text-3xl font-extrabold text-slate-100 font-mono">
                      {assessment.priority_score.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ 100</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                    <div 
                      className={`absolute inset-0 rounded-full border-4 ${
                        assessment.priority_score >= 75 ? 'border-rose-500' :
                        assessment.priority_score >= 55 ? 'border-amber-500' : 'border-sky-500'
                      }`}
                      style={{ clipPath: `inset(${100 - assessment.priority_score}% 0 0 0)` }}
                    />
                    <Award className="w-7 h-7 text-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Reasons Grid */}
              {assessment.reasons.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Analytical Priority Justifications
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                    {assessment.reasons.map((r, idx) => (
                      <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9 Factors Breakdown Cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  9-Factor Multi-Attribute Evidentiary Matrix
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Factor 1 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">1. Current Evidence Strength</span>
                      <span className="font-bold text-slate-200 font-mono">
                        {assessment.score_factors.evidence_strength.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${assessment.score_factors.evidence_strength * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Mentions across case documents, records, and edges.</p>
                  </div>

                  {/* Factor 2 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">2. Temporal Correlation</span>
                      <span className="font-bold text-slate-200 font-mono">
                        {assessment.score_factors.temporal_correlation.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${assessment.score_factors.temporal_correlation * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Burst alignment and frequency shift intensity.</p>
                  </div>

                  {/* Factor 3 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">3. Network Relevance</span>
                      <span className="font-bold text-slate-200 font-mono">
                        {assessment.score_factors.network_relevance.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${assessment.score_factors.network_relevance * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Degree, betweenness centrality, and bridge edges.</p>
                  </div>

                  {/* Factor 4 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">4. Anomaly Intensity</span>
                      <span className="font-bold text-slate-200 font-mono">
                        {assessment.score_factors.anomaly_score.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${assessment.score_factors.anomaly_score * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Mule fan-in, smurfing, and clean-slate triggers.</p>
                  </div>

                  {/* Factor 5 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">5. Multi-Modal Corroboration</span>
                      <span className="font-bold text-slate-200 font-mono">
                        {assessment.score_factors.corroboration_index.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${assessment.score_factors.corroboration_index * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Convergence across phone, money, geo, and documents.</p>
                  </div>

                  {/* Factor 6 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">6. Source Reliability</span>
                      <span className="font-bold text-slate-200 font-mono">
                        {assessment.score_factors.source_reliability.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${assessment.score_factors.source_reliability * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Cryptographic SHA-256 chain of custody integrity.</p>
                  </div>

                  {/* Factor 7 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-rose-400 font-medium">7. Contradictory Evidence</span>
                      <span className="font-bold text-rose-400 font-mono">
                        -{assessment.score_factors.contradictory_penalty.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${assessment.score_factors.contradictory_penalty * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Deduction for alibi or spatiotemporal travel conflicts.</p>
                  </div>

                  {/* Factor 8 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-400 font-medium">8. Alternative Explanations</span>
                      <span className="font-bold text-amber-400 font-mono">
                        -{assessment.score_factors.alternative_explanation_discount.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${assessment.score_factors.alternative_explanation_discount * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Discount for plausible commercial or innocent theories.</p>
                  </div>

                  {/* Factor 9 */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">9. Uncertainty Penalty</span>
                      <span className="font-bold text-slate-400 font-mono">
                        -{assessment.score_factors.uncertainty_penalty.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div className="h-full bg-slate-500 rounded-full" style={{ width: `${assessment.score_factors.uncertainty_penalty * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Deduction for unverified nodes and information entropy.</p>
                  </div>
                </div>
              </div>

              {/* Recommended Verifications */}
              {assessment.recommended_verification.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Recommended Verification Protocols
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    {assessment.recommended_verification.map((v, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: NEXT BEST ACTIONS (EIG RANKED) */}
      {activeTab === 'next_actions' && assessment && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                Next Best Investigative Actions (Ranked by Expected Information Gain)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bayesian entropy reduction roadmap prioritizing actions that resolve the greatest investigative ambiguity.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {assessment.next_best_actions.length} Candidate Actions
            </div>
          </div>

          <div className="space-y-3">
            {assessment.next_best_actions.map((act) => (
              <div 
                key={act.action_id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm font-mono">
                      #{act.rank}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">
                        {act.title}
                      </h4>
                      <span className="text-[11px] text-indigo-400 font-mono">
                        {act.statutory_mandate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Expected Info Gain (EIG)</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {(act.expected_info_gain * 100).toFixed(1)}%
                      </div>
                    </div>
                    {getUrgencyBadge(act.operational_urgency)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Hypotheses Resolved */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-sky-400" />
                      Hypotheses Disambiguated
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {act.hypotheses_resolved.map((h, hIdx) => (
                        <li key={hIdx} className="bg-slate-950 p-2 rounded border border-slate-800/80">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Evidence Gaps Addressed */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Evidentiary Gaps Addressed
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {act.evidence_gaps_addressed.map((g, gIdx) => (
                        <li key={gIdx} className="bg-slate-950 p-2 rounded border border-slate-800/80">
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUPPORTING VS CONTRADICTORY BALANCE */}
      {activeTab === 'evidence_balance' && assessment && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supporting Evidence Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Supporting Multi-Modal Evidence ({assessment.supporting_evidence.length})
                </h3>
              </div>

              {assessment.supporting_evidence.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No direct corroborating evidence recorded.</p>
              ) : (
                <div className="space-y-2.5">
                  {assessment.supporting_evidence.map((s, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                          {getModalityIcon(s.modality)}
                          <span>{s.modality}</span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                          Weight: {(s.confidence_weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{s.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contradictory Evidence Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Contradictory Evidence & Conflicts ({assessment.contradictory_evidence.length})
                </h3>
              </div>

              {assessment.contradictory_evidence.length === 0 ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  No irreconcilable timeline or location contradictions detected.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {assessment.contradictory_evidence.map((c, idx) => (
                    <div key={idx} className="bg-rose-950/20 p-3 rounded-xl border border-rose-900/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-300">{c.modality} Conflict</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono">
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-xs text-rose-200/90">{c.conflict_reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Alternative Explanations */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Alternative Innocent / Benign Hypotheses
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {assessment.alternative_explanations.map((alt, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 rounded border border-slate-800">
                      {alt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-200">
              Priority Assessment Archive
            </h3>
            <span className="text-xs text-slate-400">{historyList.length} records</span>
          </div>

          {historyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No previous priority assessments logged for this case.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {historyList.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-850/50 transition-all cursor-pointer"
                  onClick={async () => {
                    try {
                      const full = await api.getPriorityAssessment(item.id);
                      if (full) {
                        setAssessment({
                          assessment_id: full.assessment_id,
                          case_id: full.case_id,
                          lead_title: full.lead_title,
                          target_entity_name: full.target_entity_name,
                          priority_level: full.priority_level,
                          priority_score: full.priority_score,
                          score_factors: full.score_factors,
                          reasons: full.reasons,
                          supporting_evidence: full.supporting_evidence,
                          contradictory_evidence: full.contradictory_evidence,
                          alternative_explanations: full.alternative_explanations,
                          uncertainty: full.uncertainty,
                          recommended_verification: full.recommended_verification,
                          next_best_actions: full.next_best_actions,
                          created_at: full.created_at,
                          legal_statutory_notice: 'Statutory Notice Section 63 BSA 2023'
                        });
                        setActiveTab('priority_breakdown');
                      }
                    } catch (e) {
                      console.error('Failed to reload assessment:', e);
                    }
                  }}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-indigo-400" />
                      {item.lead_title}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Target: <span className="text-slate-300 font-medium">{item.target_entity_name || 'Case Lead'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Evaluated by <span className="text-slate-300">{item.created_by_username || 'IO'}</span> on{' '}
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Priority Score</div>
                      <div className="text-sm font-bold text-slate-200 font-mono">
                        {item.priority_score.toFixed(1)} / 100
                      </div>
                    </div>
                    {getPriorityBadge(item.priority_level)}
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
