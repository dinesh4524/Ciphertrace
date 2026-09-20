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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#FEF2F2] text-[#C53030] border border-[#FECACA]">
            <Flame className="w-3.5 h-3.5 text-[#C53030]" /> CRITICAL PRIORITY
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#FFFBEB] text-[#B7791F] border border-[#FDE68A]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#B7791F]" /> HIGH PRIORITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <Activity className="w-3.5 h-3.5 text-[#2563EB]" /> MEDIUM PRIORITY
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16805C]" /> LOW PRIORITY
          </span>
        );
      case 'DEPRIOTIZED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#F8FAFC] text-[#64748B] border border-[#D9E0E8]">
            <ShieldAlert className="w-3.5 h-3.5 text-[#64748B]" /> DEPRIORITIZED
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#C53030] border border-[#FECACA]">IMMEDIATE</span>;
      case 'HIGH_PRIORITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFBEB] text-[#B7791F] border border-[#FDE68A]">HIGH PRIORITY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8FAFC] text-[#64748B] border border-[#D9E0E8]">ROUTINE</span>;
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality.toUpperCase()) {
      case 'CDR':
        return <Radio className="w-4 h-4 text-[#2563EB]" />;
      case 'FINANCIAL':
        return <CreditCard className="w-4 h-4 text-[#16805C]" />;
      case 'LOCATION':
        return <MapPin className="w-4 h-4 text-[#B7791F]" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-[#163A5F]" />;
      default:
        return <Layers className="w-4 h-4 text-[#7E22CE]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-[#D9E0E8] rounded p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#163A5F] text-xs font-semibold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            Phase 15 — Operational Intelligence
          </div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            Investigative Priority & Next Best Action
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Multi-attribute Bayesian priority ranking & Shannon Expected Information Gain (EIG) action roadmap.
          </p>
        </div>

        <button
          onClick={handleRunAssessment}
          disabled={loading}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          <span>{loading ? 'Evaluating Priority & Actions...' : 'Assess Priority & Next Best Actions'}</span>
        </button>
      </div>

      {/* Statutory Safeguard Doctrine Notice */}
      <div className="bg-[#FFFBEB] border border-[#F59E0B] rounded p-3.5 flex items-start gap-2.5 text-[#92400E] text-xs leading-relaxed shadow-xs">
        <ShieldAlert className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#92400E] uppercase tracking-wide mr-1">
            Statutory Safeguard (Section 63 BSA 2023 / BNSS 2023):
          </span>
          Investigative priority and Next Best Action (NBA) engines evaluate operational resource allocation and 
          information entropy reduction. 
          <strong className="text-[#78350F] underline ml-1">
            High investigative priority reflects urgency of inquiry and does NOT constitute proof of guilt, liability, or criminality.
          </strong>
        </div>
      </div>

      {/* Assessment Target Input Bar */}
      <div className="bg-white border border-[#D9E0E8] rounded p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#172033] mb-1">
              Lead / Hypothesis Title
            </label>
            <input
              type="text"
              value={leadTitle}
              onChange={(e) => setLeadTitle(e.target.value)}
              placeholder="e.g. Customs Port Clearance Hawala Network"
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-1.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">
              Target Entity / Suspect Name
            </label>
            <input
              type="text"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              placeholder="e.g. Vikram Sharma"
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-1.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#D9E0E8] gap-2 text-xs">
        <button
          onClick={() => setActiveTab('priority_breakdown')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === 'priority_breakdown'
              ? 'border-[#163A5F] text-[#163A5F] bg-[#EFF6FF]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>9-Factor Priority Assessment</span>
        </button>

        <button
          onClick={() => setActiveTab('next_actions')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === 'next_actions'
              ? 'border-[#163A5F] text-[#163A5F] bg-[#EFF6FF]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
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
            <div className="bg-white border border-[#D9E0E8] rounded p-10 text-center space-y-3">
              <Compass className="w-10 h-10 text-[#163A5F]/60 mx-auto" />
              <h3 className="text-sm font-semibold text-[#172033]">No Priority Assessment Run Yet</h3>
              <p className="text-xs text-[#64748B] max-w-lg mx-auto">
                Click &quot;Assess Priority & Next Best Actions&quot; above to calculate the multi-attribute 9-factor score 
                and determine the operational urgency of this lead.
              </p>
            </div>
          )}

          {assessment && (
            <>
              {/* Score Hero Banner */}
              <div className="bg-white border border-[#D9E0E8] rounded p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getPriorityBadge(assessment.priority_level)}
                    <span className="text-xs text-[#64748B] font-mono">
                      Assessment ID: {assessment.assessment_id.slice(0, 8)}...
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#172033]">
                    {assessment.lead_title}
                  </h2>
                  <p className="text-xs text-[#64748B] flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-[#163A5F]" />
                    Target Subject: <span className="text-[#172033] font-semibold">{assessment.target_entity_name || 'Case Entity'}</span>
                  </p>
                </div>

                <div className="bg-[#F8FAFC] border border-[#D9E0E8] rounded p-4 px-6 flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-[#64748B] uppercase tracking-wider font-semibold">Priority Score</div>
                    <div className="text-3xl font-extrabold text-[#172033] font-mono">
                      {assessment.priority_score.toFixed(1)} <span className="text-sm font-normal text-[#64748B]">/ 100</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 border-[#D9E0E8] flex items-center justify-center relative">
                    <div 
                      className={`absolute inset-0 rounded-full border-4 ${
                        assessment.priority_score >= 75 ? 'border-[#C53030]' :
                        assessment.priority_score >= 55 ? 'border-[#B7791F]' : 'border-[#2563EB]'
                      }`}
                      style={{ clipPath: `inset(${100 - assessment.priority_score}% 0 0 0)` }}
                    />
                    <Award className="w-6 h-6 text-[#163A5F]" />
                  </div>
                </div>
              </div>

              {/* Reasons Grid */}
              {assessment.reasons.length > 0 && (
                <div className="bg-white border border-[#D9E0E8] rounded p-4 space-y-2">
                  <span className="text-xs font-semibold text-[#172033] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#163A5F]" />
                    Analytical Priority Justifications
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#172033]">
                    {assessment.reasons.map((r, idx) => (
                      <div key={idx} className="bg-[#F8FAFC] p-2.5 rounded border border-[#D9E0E8] flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#16805C] shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9 Factors Breakdown Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#163A5F]" />
                  9-Factor Multi-Attribute Evidentiary Matrix
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Factor 1 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748B] font-medium">1. Current Evidence Strength</span>
                      <span className="font-bold text-[#172033] font-mono">
                        {assessment.score_factors.evidence_strength.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#163A5F] rounded-full" style={{ width: `${assessment.score_factors.evidence_strength * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Mentions across case documents, records, and edges.</p>
                  </div>

                  {/* Factor 2 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748B] font-medium">2. Temporal Correlation</span>
                      <span className="font-bold text-[#172033] font-mono">
                        {assessment.score_factors.temporal_correlation.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${assessment.score_factors.temporal_correlation * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Burst alignment and frequency shift intensity.</p>
                  </div>

                  {/* Factor 3 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748B] font-medium">3. Network Relevance</span>
                      <span className="font-bold text-[#172033] font-mono">
                        {assessment.score_factors.network_relevance.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#163A5F] rounded-full" style={{ width: `${assessment.score_factors.network_relevance * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Degree, betweenness centrality, and bridge edges.</p>
                  </div>

                  {/* Factor 4 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748B] font-medium">4. Anomaly Intensity</span>
                      <span className="font-bold text-[#172033] font-mono">
                        {assessment.score_factors.anomaly_score.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#B7791F] rounded-full" style={{ width: `${assessment.score_factors.anomaly_score * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Mule fan-in, smurfing, and clean-slate triggers.</p>
                  </div>

                  {/* Factor 5 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748B] font-medium">5. Multi-Modal Corroboration</span>
                      <span className="font-bold text-[#172033] font-mono">
                        {assessment.score_factors.corroboration_index.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#16805C] rounded-full" style={{ width: `${assessment.score_factors.corroboration_index * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Convergence across phone, money, geo, and documents.</p>
                  </div>

                  {/* Factor 6 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748B] font-medium">6. Source Reliability</span>
                      <span className="font-bold text-[#172033] font-mono">
                        {assessment.score_factors.source_reliability.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#16805C] rounded-full" style={{ width: `${assessment.score_factors.source_reliability * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Cryptographic SHA-256 chain of custody integrity.</p>
                  </div>

                  {/* Factor 7 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#C53030] font-medium">7. Contradictory Evidence</span>
                      <span className="font-bold text-[#C53030] font-mono">
                        -{assessment.score_factors.contradictory_penalty.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#C53030] rounded-full" style={{ width: `${assessment.score_factors.contradictory_penalty * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Deduction for alibi or spatiotemporal travel conflicts.</p>
                  </div>

                  {/* Factor 8 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#B7791F] font-medium">8. Alternative Explanations</span>
                      <span className="font-bold text-[#B7791F] font-mono">
                        -{assessment.score_factors.alternative_explanation_discount.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#B7791F] rounded-full" style={{ width: `${assessment.score_factors.alternative_explanation_discount * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Discount for plausible commercial or innocent theories.</p>
                  </div>

                  {/* Factor 9 */}
                  <div className="bg-white border border-[#D9E0E8] rounded p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748B] font-medium">9. Uncertainty Penalty</span>
                      <span className="font-bold text-[#64748B] font-mono">
                        -{assessment.score_factors.uncertainty_penalty.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-full bg-[#64748B] rounded-full" style={{ width: `${assessment.score_factors.uncertainty_penalty * 10}%` }} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">Deduction for unverified nodes and information entropy.</p>
                  </div>
                </div>
              </div>

              {/* Recommended Verifications */}
              {assessment.recommended_verification.length > 0 && (
                <div className="bg-white border border-[#D9E0E8] rounded p-4 space-y-2">
                  <span className="text-xs font-semibold text-[#163A5F] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#16805C]" />
                    Recommended Verification Protocols
                  </span>
                  <div className="space-y-1.5 text-xs text-[#172033]">
                    {assessment.recommended_verification.map((v, idx) => (
                      <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded border border-[#D9E0E8] flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#163A5F]/10 text-[#163A5F] flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
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
              <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#163A5F]" />
                Next Best Investigative Actions (Ranked by Expected Information Gain)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Bayesian entropy reduction roadmap prioritizing actions that resolve the greatest investigative ambiguity.
              </p>
            </div>
            <div className="text-xs text-[#64748B] font-mono">
              {assessment.next_best_actions.length} Candidate Actions
            </div>
          </div>

          <div className="space-y-3">
            {assessment.next_best_actions.map((act) => (
              <div 
                key={act.action_id}
                className="bg-white border border-[#D9E0E8] rounded p-4 space-y-3 hover:border-[#163A5F] transition-all shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#D9E0E8] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#F8FAFC] border border-[#D9E0E8] flex items-center justify-center font-bold text-[#163A5F] text-xs font-mono">
                      #{act.rank}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#172033]">
                        {act.title}
                      </h4>
                      <span className="text-[11px] text-[#2563EB] font-mono">
                        {act.statutory_mandate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-[#64748B] uppercase font-semibold">Expected Info Gain (EIG)</div>
                      <div className="text-xs font-bold text-[#16805C] font-mono">
                        {(act.expected_info_gain * 100).toFixed(1)}%
                      </div>
                    </div>
                    {getUrgencyBadge(act.operational_urgency)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Hypotheses Resolved */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-[#2563EB]" />
                      Hypotheses Disambiguated
                    </span>
                    <ul className="space-y-1 text-[#172033] text-[11px]">
                      {act.hypotheses_resolved.map((h, hIdx) => (
                        <li key={hIdx} className="bg-[#F8FAFC] p-2 rounded border border-[#D9E0E8]">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Evidence Gaps Addressed */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#B7791F]" />
                      Evidentiary Gaps Addressed
                    </span>
                    <ul className="space-y-1 text-[#172033] text-[11px]">
                      {act.evidence_gaps_addressed.map((g, gIdx) => (
                        <li key={gIdx} className="bg-[#F8FAFC] p-2 rounded border border-[#D9E0E8]">
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
            <div className="bg-white border border-[#D9E0E8] rounded p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
                <h3 className="text-xs font-bold text-[#16805C] flex items-center gap-2 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-[#16805C]" />
                  Supporting Multi-Modal Evidence ({assessment.supporting_evidence.length})
                </h3>
              </div>

              {assessment.supporting_evidence.length === 0 ? (
                <p className="text-xs text-[#64748B] p-4 text-center">No direct corroborating evidence recorded.</p>
              ) : (
                <div className="space-y-2.5">
                  {assessment.supporting_evidence.map((s, idx) => (
                    <div key={idx} className="bg-[#F8FAFC] p-3 rounded border border-[#D9E0E8] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172033]">
                          {getModalityIcon(s.modality)}
                          <span>{s.modality}</span>
                        </div>
                        <span className="text-[11px] text-[#16805C] font-mono font-semibold">
                          Weight: {(s.confidence_weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-[#172033]">{s.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contradictory Evidence Column */}
            <div className="bg-white border border-[#D9E0E8] rounded p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
                <h3 className="text-xs font-bold text-[#C53030] flex items-center gap-2 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-[#C53030]" />
                  Contradictory Evidence & Conflicts ({assessment.contradictory_evidence.length})
                </h3>
              </div>

              {assessment.contradictory_evidence.length === 0 ? (
                <div className="bg-[#F8FAFC] p-4 rounded border border-[#D9E0E8] text-center text-xs text-[#64748B]">
                  <CheckCircle2 className="w-5 h-5 text-[#16805C] mx-auto mb-1" />
                  No irreconcilable timeline or location contradictions detected.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {assessment.contradictory_evidence.map((c, idx) => (
                    <div key={idx} className="bg-rose-50 p-3 rounded border border-rose-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#C53030]">{c.modality} Conflict</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white text-[#C53030] border border-rose-200 font-mono">
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[#172033]">{c.conflict_reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Alternative Explanations */}
              <div className="pt-4 border-t border-[#D9E0E8] space-y-2">
                <span className="text-xs font-semibold text-[#B7791F] uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#B7791F]" />
                  Alternative Innocent / Benign Hypotheses
                </span>
                <div className="space-y-1.5 text-xs text-[#172033]">
                  {assessment.alternative_explanations.map((alt, idx) => (
                    <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded border border-[#D9E0E8]">
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
        <div className="bg-white border border-[#D9E0E8] rounded overflow-hidden">
          <div className="p-4 border-b border-[#D9E0E8] flex justify-between items-center bg-[#F8FAFC]">
            <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
              Priority Assessment Archive
            </h3>
            <span className="text-xs text-[#64748B] font-mono">{historyList.length} records</span>
          </div>

          {historyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">
              No previous priority assessments logged for this case.
            </div>
          ) : (
            <div className="divide-y divide-[#D9E0E8]">
              {historyList.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-all cursor-pointer"
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
                    <div className="text-xs font-bold text-[#172033] flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-[#163A5F]" />
                      {item.lead_title}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Target: <span className="text-[#172033] font-medium">{item.target_entity_name || 'Case Lead'}</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Evaluated by <span className="text-[#172033] font-semibold">{item.created_by_username || 'IO'}</span> on{' '}
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-[#64748B] uppercase font-semibold">Priority Score</div>
                      <div className="text-sm font-bold text-[#172033] font-mono">
                        {item.priority_score.toFixed(1)} / 100
                      </div>
                    </div>
                    {getPriorityBadge(item.priority_level)}
                    <ArrowRight className="w-4 h-4 text-[#64748B]" />
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
