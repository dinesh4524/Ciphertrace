import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  FileText, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  Info,
  HelpCircle,
  Hash,
  Database,
  Lock,
  GitBranch,
  FileCheck,
  Send,
  Zap,
  Check,
  X
} from 'lucide-react';
import { 
  Case, 
  LegalStatuteItem, 
  LegalSectionItem, 
  EvidenceToLawResponse, 
  EvidenceLawChainStep, 
  LegalRAGQueryResponse, 
  LegalGraphResponse,
  LegalComplianceStatus
} from '../../types';
import { api } from '../../services/api';

interface LegalIntelligenceDashboardProps {
  activeCase: Case;
}

export const LegalIntelligenceDashboard: React.FC<LegalIntelligenceDashboardProps> = ({ activeCase }) => {
  const [activeTab, setActiveTab] = useState<'alignment' | 'rag' | 'explorer' | 'graph'>('alignment');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Alignment State
  const [alignmentData, setAlignmentData] = useState<EvidenceToLawResponse | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Legal RAG State
  const [ragQuery, setRagQuery] = useState<string>('What are the statutory conditions to admit WhatsApp chat records and electronic logs under BSA 2023?');
  const [ragResponse, setRagResponse] = useState<LegalRAGQueryResponse | null>(null);
  const [selectedStatutes, setSelectedStatutes] = useState<string[]>(['BNS', 'BNSS', 'BSA']);
  const [ragLoading, setRagLoading] = useState<boolean>(false);

  // Statute Explorer State
  const [statutes, setStatutes] = useState<LegalStatuteItem[]>([]);
  const [selectedStatuteFilter, setSelectedStatuteFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSection, setActiveSection] = useState<LegalSectionItem | null>(null);

  // Legal Graph State
  const [graphData, setGraphData] = useState<LegalGraphResponse | null>(null);

  // Load initial data
  useEffect(() => {
    loadStatutes();
    if (activeCase?.id) {
      loadEvidenceAlignment();
    }
  }, [activeCase?.id]);

  const loadStatutes = async () => {
    try {
      const data = await api.getStatutes();
      setStatutes(data);
    } catch (err: any) {
      console.error('Failed to load statutes:', err);
    }
  };

  const loadEvidenceAlignment = async () => {
    if (!activeCase?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.mapCaseEvidenceToLaw(activeCase.id);
      setAlignmentData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to map case evidence to law.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunRAGQuery = async (queryText?: string) => {
    if (!activeCase?.id) return;
    const query = queryText || ragQuery;
    if (!query.trim()) return;

    setRagLoading(true);
    setError(null);
    try {
      const data = await api.queryLegalRAG(activeCase.id, {
        query,
        statute_filter: selectedStatutes.length > 0 ? selectedStatutes : undefined,
        include_case_evidence: true,
        include_legacy_concordance: true,
      });
      setRagResponse(data);
    } catch (err: any) {
      setError(err.message || 'Legal RAG query failed.');
    } finally {
      setRagLoading(false);
    }
  };

  const loadLegalGraph = async () => {
    setLoading(true);
    try {
      const data = await api.getLegalGraph();
      setGraphData(data);
    } catch (err: any) {
      console.error('Failed to load legal graph:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quick Prompt Prompts
  const quickPrompts = [
    {
      title: 'Electronic Evidence (BSA §63)',
      prompt: 'What are the mandatory certificate and hash integrity conditions under BSA Section 63 for CDR and banking logs?',
    },
    {
      title: 'Organised Crime (BNS §111)',
      prompt: 'What are the statutory ingredients for continuing unlawful activity under Section 111 of BNS 2023?',
    },
    {
      title: 'Requisition Summons (BNSS §91)',
      prompt: 'How to summon banking ledgers and server logs from intermediary entities under BNSS Section 91?',
    },
    {
      title: 'Attachment of Proceeds (BNSS §107)',
      prompt: 'What is the procedure for attachment and provisional freezing of criminal proceeds under Section 107 of BNSS 2023?',
    },
    {
      title: 'Criminal Conspiracy (BNS §61)',
      prompt: 'What evidence satisfies the meeting of minds and agreement requirement for Criminal Conspiracy under BNS Section 61?',
    },
  ];

  // Filtered Chains for Evidence Alignment
  const filteredChains = (alignmentData?.chains || []).filter((chain) => {
    if (selectedStatusFilter === 'ALL') return true;
    return chain.status === selectedStatusFilter;
  });

  const getStatusBadge = (status: LegalComplianceStatus) => {
    switch (status) {
      case 'MET':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]">
            <Check className="w-3 h-3 mr-1" /> CONDITION MET
          </span>
        );
      case 'PARTIALLY_MET':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FFFBEB] text-[#B7791F] border border-[#FDE68A]">
            <AlertTriangle className="w-3 h-3 mr-1" /> PARTIALLY MET
          </span>
        );
      case 'UNMET':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FEF2F2] text-[#C53030] border border-[#FECACA]">
            <X className="w-3 h-3 mr-1" /> UNMET / GAP
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#F8FAFC] text-[#64748B] border border-[#D9E0E8]">
            {status}
          </span>
        );
    }
  };

  const getStatuteColor = (statute: string) => {
    if (statute.includes('BNS') || statute.includes('Nyaya')) return 'text-[#163A5F] border-[#BFDBFE] bg-[#EFF6FF]';
    if (statute.includes('BNSS') || statute.includes('Nagarik')) return 'text-[#2563EB] border-[#BFDBFE] bg-[#EFF6FF]';
    return 'text-[#7E22CE] border-[#E9D5FF] bg-[#FAF5FF]';
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded bg-white border border-[#D9E0E8] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <div className="p-2 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[#163A5F]">
                <Scale className="w-5 h-5" />
              </div>
              <h1 className="text-base font-bold text-[#172033] tracking-tight">
                Indian Legal Intelligence <span className="text-xs px-2 py-0.5 rounded bg-[#EFF6FF] text-[#163A5F] border border-[#BFDBFE] ml-2 font-mono">BNS • BNSS • BSA (2023)</span>
              </h1>
            </div>
            <p className="text-xs text-[#64748B] max-w-3xl">
              Authoritative statutory grounding across the three criminal codes enacted in 2023. Enforces the strict 7-step evidence-to-law chain reasoning and procedural admissibility compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadEvidenceAlignment()}
              disabled={loading}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-evaluate Case Law</span>
            </button>
          </div>
        </div>

        {/* Mandatory Non-Culpability Notice */}
        <div className="mt-4 p-3 rounded bg-[#FFFBEB] border border-[#F59E0B] flex items-start space-x-2.5 text-xs text-[#92400E] leading-relaxed shadow-xs">
          <ShieldAlert className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#92400E] uppercase tracking-wide">Statutory Decision Support Doctrine: </span>
            This module operates strictly as investigative decision support under the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA). It does NOT act as an autonomous judge, nor does it make judicial findings or automatically determine criminal guilt. All conclusions require judicial evaluation and legal scrutiny.
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-[#D9E0E8] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('alignment')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
            activeTab === 'alignment'
              ? 'bg-[#163A5F] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#172033] bg-[#F8FAFC] border border-[#D9E0E8]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>7-Step Evidence-to-Law Chains</span>
        </button>

        <button
          onClick={() => setActiveTab('rag')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
            activeTab === 'rag'
              ? 'bg-[#163A5F] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#172033] bg-[#F8FAFC] border border-[#D9E0E8]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Statutory QA & Case Precedents</span>
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
            activeTab === 'explorer'
              ? 'bg-[#163A5F] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#172033] bg-[#F8FAFC] border border-[#D9E0E8]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Statute Code Explorer</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('graph');
            if (!graphData) loadLegalGraph();
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
            activeTab === 'graph'
              ? 'bg-[#163A5F] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#172033] bg-[#F8FAFC] border border-[#D9E0E8]'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Legal Knowledge Topology</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: EVIDENCE-TO-LAW ALIGNMENT (7-STEP CHAIN) */}
      {activeTab === 'alignment' && (
        <div className="space-y-6">
          {/* Statutory Summary Cards */}
          {alignmentData?.statutory_summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* BNS Summary */}
              <div className="p-5 rounded bg-white border border-[#D9E0E8] shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[#163A5F]" />
                    <h3 className="font-bold text-[#172033] text-xs uppercase tracking-wider">BNS 2023 (Substantive)</h3>
                  </div>
                  <span className="text-xs text-[#2563EB] font-mono">Offenses</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 font-mono">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                    <div className="text-base font-bold text-[#16805C]">{alignmentData.statutory_summary.BNS.met}</div>
                    <div className="text-[#64748B] text-[10px]">Met</div>
                  </div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-200">
                    <div className="text-base font-bold text-[#B7791F]">{alignmentData.statutory_summary.BNS.partially_met}</div>
                    <div className="text-[#64748B] text-[10px]">Partial</div>
                  </div>
                  <div className="p-2 rounded bg-rose-50 border border-rose-200">
                    <div className="text-base font-bold text-[#C53030]">{alignmentData.statutory_summary.BNS.unmet}</div>
                    <div className="text-[#64748B] text-[10px]">Gaps</div>
                  </div>
                </div>
              </div>

              {/* BNSS Summary */}
              <div className="p-5 rounded bg-white border border-[#D9E0E8] shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                    <h3 className="font-bold text-[#172033] text-xs uppercase tracking-wider">BNSS 2023 (Procedure)</h3>
                  </div>
                  <span className="text-xs text-[#2563EB] font-mono">Procedure</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 font-mono">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                    <div className="text-base font-bold text-[#16805C]">{alignmentData.statutory_summary.BNSS.met}</div>
                    <div className="text-[#64748B] text-[10px]">Met</div>
                  </div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-200">
                    <div className="text-base font-bold text-[#B7791F]">{alignmentData.statutory_summary.BNSS.partially_met}</div>
                    <div className="text-[#64748B] text-[10px]">Partial</div>
                  </div>
                  <div className="p-2 rounded bg-rose-50 border border-rose-200">
                    <div className="text-base font-bold text-[#C53030]">{alignmentData.statutory_summary.BNSS.unmet}</div>
                    <div className="text-[#64748B] text-[10px]">Gaps</div>
                  </div>
                </div>
              </div>

              {/* BSA Summary */}
              <div className="p-5 rounded bg-white border border-[#D9E0E8] shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[#16805C]" />
                    <h3 className="font-bold text-[#172033] text-xs uppercase tracking-wider">BSA 2023 (Evidence)</h3>
                  </div>
                  <span className="text-xs text-[#16805C] font-mono">Admissibility</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 font-mono">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                    <div className="text-base font-bold text-[#16805C]">{alignmentData.statutory_summary.BSA.met}</div>
                    <div className="text-[#64748B] text-[10px]">Met</div>
                  </div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-200">
                    <div className="text-base font-bold text-[#B7791F]">{alignmentData.statutory_summary.BSA.partially_met}</div>
                    <div className="text-[#64748B] text-[10px]">Partial</div>
                  </div>
                  <div className="p-2 rounded bg-rose-50 border border-rose-200">
                    <div className="text-base font-bold text-[#C53030]">{alignmentData.statutory_summary.BSA.unmet}</div>
                    <div className="text-[#64748B] text-[10px]">Gaps</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Procedural Safeguard Callouts */}
          {alignmentData?.procedural_safeguards && alignmentData.procedural_safeguards.length > 0 && (
            <div className="p-4 rounded bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#B7791F] tracking-wide uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Procedural Compliance & Admissibility Alerts</span>
              </div>
              <ul className="space-y-1 text-xs text-[#172033] pl-6 list-disc">
                {alignmentData.procedural_safeguards.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-white p-3 rounded border border-[#D9E0E8]">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#64748B] font-medium">Compliance Filter:</span>
              {(['ALL', 'MET', 'PARTIALLY_MET', 'UNMET'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    selectedStatusFilter === st
                      ? 'bg-[#163A5F] text-white font-bold'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#D9E0E8]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="text-xs text-[#64748B]">
              Showing <span className="text-[#172033] font-semibold">{filteredChains.length}</span> statutory condition chains
            </div>
          </div>

          {/* Strict 7-Step Evidence-to-Law Chain Cards */}
          <div className="space-y-4">
            {filteredChains.map((chain, index) => (
              <div 
                key={index}
                className="rounded bg-white border border-[#D9E0E8] overflow-hidden shadow-xs transition hover:border-[#163A5F]"
              >
                {/* Header: LAW, PROVISION, STATUS */}
                <div className="p-4 bg-[#F8FAFC] border-b border-[#D9E0E8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getStatuteColor(chain.law)}`}>
                      1. LAW: {chain.law.split(',')[0]}
                    </span>
                    <h4 className="text-xs font-bold text-[#172033] tracking-wide">
                      2. PROVISION: {chain.provision}
                    </h4>
                  </div>
                  <div>
                    {getStatusBadge(chain.status)}
                  </div>
                </div>

                {/* 7-Step Pipeline Body */}
                <div className="p-5 space-y-4 text-xs font-sans">
                  {/* Step 3: CONDITION */}
                  <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                    <div className="text-[11px] font-bold text-[#163A5F] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>3. Statutory Condition / Essential Ingredient</span>
                    </div>
                    <div className="text-xs text-[#172033] font-medium">{chain.condition}</div>
                  </div>

                  {/* Step 4: AVAILABLE EVIDENCE */}
                  <div>
                    <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>4. Corroborated Case Evidence</span>
                    </div>
                    {chain.available_evidence && chain.available_evidence.length > 0 ? (
                      <div className="space-y-1">
                        {chain.available_evidence.map((ev, evIdx) => (
                          <div key={evIdx} className="text-xs text-[#172033] bg-[#F8FAFC] p-2.5 rounded border border-[#D9E0E8] flex items-start space-x-2">
                            <span className="text-[#2563EB] font-mono font-bold">•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#64748B] italic p-2.5 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                        No corroborated evidence item currently meets this specific statutory condition in case dossier.
                      </div>
                    )}
                  </div>

                  {/* Step 5: RELEVANCE */}
                  <div>
                    <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#16805C]" />
                      <span>5. Legal & Evidentiary Relevance</span>
                    </div>
                    <div className="text-xs text-[#172033] bg-emerald-50/50 border border-emerald-200 p-2.5 rounded leading-relaxed">
                      {chain.relevance}
                    </div>
                  </div>

                  {/* Grid for Steps 6 and 7: Missing Information & Verification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {/* Step 6: MISSING INFORMATION */}
                    <div className="p-3 rounded bg-amber-50/60 border border-amber-200">
                      <div className="text-[11px] font-bold text-[#B7791F] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#B7791F]" />
                        <span>6. Evidentiary Gap / Missing Information</span>
                      </div>
                      <div className="text-xs text-[#172033] leading-relaxed">
                        {chain.missing_information}
                      </div>
                    </div>

                    {/* Step 7: VERIFICATION */}
                    <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                      <div className="text-[11px] font-bold text-[#163A5F] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-[#163A5F]" />
                        <span>7. Actionable Statutory Verification</span>
                      </div>
                      <div className="text-xs text-[#172033] leading-relaxed font-medium">
                        {chain.verification}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LEGAL RAG ASSISTANT */}
      {activeTab === 'rag' && (
        <div className="space-y-6">
          {/* Query Input Card */}
          <div className="p-6 rounded bg-white border border-[#D9E0E8] shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-[#163A5F] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Ask Indian Statutory Intelligence (BNS / BNSS / BSA 2023)</span>
            </div>

            <div className="relative">
              <textarea
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Ask about offenses, conditions of electronic admissibility, summons procedures, or search powers..."
                rows={3}
                className="w-full px-4 py-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F] text-xs resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3 text-xs text-[#172033]">
                <span className="text-[#64748B]">Statute Focus:</span>
                {['BNS', 'BNSS', 'BSA'].map((code) => (
                  <label key={code} className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatutes.includes(code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatutes([...selectedStatutes, code]);
                        } else {
                          setSelectedStatutes(selectedStatutes.filter((c) => c !== code));
                        }
                      }}
                      className="rounded border-[#D9E0E8] text-[#163A5F] focus:ring-0"
                    />
                    <span className="font-mono text-xs">{code}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => handleRunRAGQuery()}
                disabled={ragLoading || !ragQuery.trim()}
                className="btn-primary text-xs flex items-center space-x-1.5"
              >
                <Send className={`w-3.5 h-3.5 ${ragLoading ? 'animate-spin' : ''}`} />
                <span>{ragLoading ? 'Analyzing Statutory Corpus...' : 'Query Legal Intelligence'}</span>
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="pt-2 border-t border-[#D9E0E8]">
              <div className="text-[11px] text-[#64748B] font-medium mb-2 uppercase font-bold">Pre-configured Statutory Queries:</div>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((qp, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => {
                      setRagQuery(qp.prompt);
                      handleRunRAGQuery(qp.prompt);
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#D9E0E8] text-[#172033] transition text-left"
                  >
                    {qp.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RAG Query Output */}
          {ragResponse && (
            <div className="space-y-6">
              {/* Grounded Narrative Response */}
              <div className="p-6 rounded bg-white border border-[#D9E0E8] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
                  <div className="flex items-center space-x-2 text-[#16805C] text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authoritative Statutory Answer</span>
                  </div>
                  <span className="text-xs text-[#64748B] font-mono">Case-Grounded</span>
                </div>

                <p className="text-xs text-[#172033] leading-relaxed font-sans">
                  {ragResponse.answer}
                </p>

                {/* Cited Provisions */}
                {ragResponse.cited_sections && ragResponse.cited_sections.length > 0 && (
                  <div className="pt-3 border-t border-[#D9E0E8]">
                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Authoritative Sections Cited:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ragResponse.cited_sections.map((sec, secIdx) => (
                        <div key={secIdx} className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] flex items-start space-x-3">
                          <div className="p-2 rounded bg-white text-[#163A5F] border border-[#D9E0E8] font-mono text-xs font-bold">
                            §{sec.section_number}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#172033]">{sec.statute_code} §{sec.section_number}: {sec.section_title}</div>
                            {sec.punishment && (
                              <div className="text-[11px] text-[#64748B] mt-0.5">{sec.punishment}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy Concordance Table */}
                {ragResponse.legacy_concordance && ragResponse.legacy_concordance.length > 0 && (
                  <div className="pt-3 border-t border-[#D9E0E8]">
                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Statutory Concordance (New Code ↔ Legacy IPC / CrPC / IEA)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-[#D9E0E8] text-[#64748B] font-mono">
                            <th className="py-2 px-3">New Provision (2023)</th>
                            <th className="py-2 px-3">Legacy Provision (1860 / 1973 / 1872)</th>
                            <th className="py-2 px-3">Subject Title</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D9E0E8] text-[#172033]">
                          {ragResponse.legacy_concordance.map((conc, cIdx) => (
                            <tr key={cIdx} className="hover:bg-[#F8FAFC]">
                              <td className="py-2 px-3 font-semibold text-[#163A5F]">{conc.new_code}</td>
                              <td className="py-2 px-3 font-mono text-[#B7791F]">{conc.legacy_code}</td>
                              <td className="py-2 px-3 text-[#172033]">{conc.title}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* RAG Generated 7-Step Chains */}
              {ragResponse.chains && ragResponse.chains.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#163A5F]" />
                    <span>Mandatory 7-Step Evidence-to-Law Pipelines:</span>
                  </h3>
                  <div className="space-y-3">
                    {ragResponse.chains.map((chain, chainIdx) => (
                      <div key={chainIdx} className="p-4 rounded bg-white border border-[#D9E0E8] space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#163A5F]">{chain.provision} ({chain.law.split(',')[0]})</span>
                          {getStatusBadge(chain.status)}
                        </div>
                        <div className="text-xs text-[#172033]"><span className="font-semibold text-[#64748B]">Condition:</span> {chain.condition}</div>
                        <div className="text-xs text-[#172033]"><span className="font-semibold text-[#64748B]">Relevance:</span> {chain.relevance}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                          <div className="p-2 rounded bg-amber-50 text-[#B7791F] border border-amber-200">
                            <span className="font-bold">Missing:</span> {chain.missing_information}
                          </div>
                          <div className="p-2 rounded bg-[#F8FAFC] text-[#163A5F] border border-[#D9E0E8]">
                            <span className="font-bold">Verification:</span> {chain.verification}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STATUTE EXPLORER & CONCORDANCE */}
      {activeTab === 'explorer' && (
        <div className="space-y-6">
          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded border border-[#D9E0E8]">
            <div className="flex items-center space-x-2">
              {(['ALL', 'BNS', 'BNSS', 'BSA'] as const).map((code) => (
                <button
                  key={code}
                  onClick={() => setSelectedStatuteFilter(code)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                    selectedStatuteFilter === code
                      ? 'bg-[#163A5F] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#D9E0E8]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Section, IPC legacy, Cheating, Summons..."
                className="w-full pl-9 pr-3 py-1.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
              />
            </div>
          </div>

          {/* Statutes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statutes
              .filter((s) => selectedStatuteFilter === 'ALL' || s.code === selectedStatuteFilter)
              .map((statute) => (
                <div key={statute.id} className="p-5 rounded bg-white border border-[#D9E0E8] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-[#F8FAFC] text-[#163A5F] border border-[#D9E0E8]">
                      {statute.code} (2023)
                    </span>
                    <span className="text-xs text-[#64748B] font-mono">{statute.sections_count} gazetted provisions</span>
                  </div>

                  <h3 className="text-sm font-bold text-[#172033]">{statute.title}</h3>
                  <div className="text-xs text-[#64748B] leading-relaxed">
                    Replaces: <span className="text-[#B7791F] font-semibold">{statute.statute_metadata?.replaces || 'Legacy Code'}</span>
                  </div>

                  <div className="pt-2 text-xs text-[#64748B] border-t border-[#D9E0E8] flex justify-between font-mono text-[11px]">
                    <span>Effective: {statute.effective_date}</span>
                    <span>Version: {statute.version}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Interactive Authoritative Sections Repository */}
          <div className="p-5 rounded bg-white border border-[#D9E0E8] space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#163A5F]" />
              <span>Authoritative Gazetted Catalog & Conditions</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { statute: 'BNS', sec: '61', title: 'Criminal Conspiracy', legacy: 'IPC 120B' },
                { statute: 'BNS', sec: '111', title: 'Organised Crime', legacy: 'MCOCA / IPC 387' },
                { statute: 'BNS', sec: '112', title: 'Petty Organised Crime', legacy: 'IPC 379/420' },
                { statute: 'BNS', sec: '308', title: 'Extortion', legacy: 'IPC 383/384' },
                { statute: 'BNS', sec: '316', title: 'Criminal Breach of Trust', legacy: 'IPC 405/406' },
                { statute: 'BNS', sec: '318', title: 'Cheating & Dishonest Inducement', legacy: 'IPC 415/420' },
                { statute: 'BNS', sec: '336', title: 'Forgery', legacy: 'IPC 463/465' },
                { statute: 'BNS', sec: '340', title: 'Using as Genuine Forged Record', legacy: 'IPC 471' },
                { statute: 'BNSS', sec: '35', title: 'Arrest Without Warrant & Grounds', legacy: 'CrPC 41' },
                { statute: 'BNSS', sec: '91', title: 'Summons to Produce Document / Bank Ledgers', legacy: 'CrPC 91' },
                { statute: 'BNSS', sec: '92', title: 'Procedure for Telecom & Letters', legacy: 'CrPC 92' },
                { statute: 'BNSS', sec: '107', title: 'Attachment & Freezing Proceeds of Crime', legacy: 'CrPC 105 / PMLA 5' },
                { statute: 'BNSS', sec: '173', title: 'FIR Recording & e-FIR Signature', legacy: 'CrPC 154' },
                { statute: 'BNSS', sec: '193', title: 'Chargesheet Final Police Report', legacy: 'CrPC 173' },
                { statute: 'BSA', sec: '3', title: 'Documentary & Electronic Evidence Definitions', legacy: 'IEA 3' },
                { statute: 'BSA', sec: '6', title: 'Facts Forming Part of Same Transaction (Res Gestae)', legacy: 'IEA 6' },
                { statute: 'BSA', sec: '39', title: 'Opinion of Examiner of Electronic Evidence', legacy: 'IEA 45A' },
                { statute: 'BSA', sec: '63', title: 'Mandatory Certificate for Electronic Evidence', legacy: 'IEA 65B' },
                { statute: 'BSA', sec: '104', title: 'Burden of Proof Beyond Reasonable Doubt', legacy: 'IEA 101' },
                { statute: 'BSA', sec: '106', title: 'Burden of Proving Fact Especially Within Knowledge', legacy: 'IEA 106' },
              ]
                .filter((item) => {
                  if (selectedStatuteFilter !== 'ALL' && item.statute !== selectedStatuteFilter) return false;
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    item.sec.includes(q) ||
                    item.title.toLowerCase().includes(q) ||
                    item.legacy.toLowerCase().includes(q) ||
                    item.statute.toLowerCase().includes(q)
                  );
                })
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#163A5F] transition flex items-center justify-between cursor-pointer shadow-xs"
                    onClick={async () => {
                      try {
                        const sec = await api.getSectionDetails(item.statute, item.sec);
                        setActiveSection(sec);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[#163A5F] text-xs">{item.statute} §{item.sec}</span>
                        <span className="text-xs font-bold text-[#172033]">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-[#B7791F] font-mono mt-0.5">
                        Legacy Concordance: {item.legacy}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#64748B]" />
                  </div>
                ))}
            </div>
          </div>

          {/* Modal / Drawer for Section Details */}
          {activeSection && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="w-full max-w-2xl rounded bg-white border border-[#D9E0E8] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
                  <div>
                    <span className="text-xs font-mono text-[#163A5F] font-bold">{activeSection.statute_code} SECTION {activeSection.section_number}</span>
                    <h3 className="text-base font-bold text-[#172033]">{activeSection.section_title}</h3>
                  </div>
                  <button onClick={() => setActiveSection(null)} className="p-1 text-[#64748B] hover:text-[#172033] rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                    <div className="text-[#64748B] text-[10px]">Category</div>
                    <div className="font-bold text-[#172033]">{activeSection.category}</div>
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                    <div className="text-[#64748B] text-[10px]">Offense Type</div>
                    <div className="font-bold text-[#172033]">{activeSection.offense_type || 'N/A'}</div>
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                    <div className="text-[#64748B] text-[10px]">Bailable</div>
                    <div className="font-bold text-[#172033]">{activeSection.bailable === true ? 'Yes' : activeSection.bailable === false ? 'No' : 'Procedural'}</div>
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                    <div className="text-[#64748B] text-[10px]">Legacy Concordance</div>
                    <div className="font-bold text-[#B7791F] font-mono">{activeSection.legacy_code_mapping?.act} §{activeSection.legacy_code_mapping?.section}</div>
                  </div>
                </div>

                {activeSection.punishment_text && (
                  <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-xs">
                    <span className="font-bold text-[#64748B] uppercase tracking-wider block mb-1">Punishment / Procedural Power:</span>
                    <span className="text-[#172033]">{activeSection.punishment_text}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">Full Statutory Text:</span>
                  <div className="text-xs text-[#172033] bg-[#F8FAFC] p-3 rounded border border-[#D9E0E8] leading-relaxed font-serif">
                    {activeSection.full_text}
                  </div>
                </div>

                {activeSection.conditions && activeSection.conditions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">Essential Statutory Conditions / Ingredients:</span>
                    <div className="space-y-1.5">
                      {activeSection.conditions.map((c: any, cIdx: number) => (
                        <div key={cIdx} className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-xs">
                          <div className="font-semibold text-[#163A5F]">{c.text}</div>
                          {c.description && <div className="text-[#64748B] mt-0.5">{c.description}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LEGAL KNOWLEDGE GRAPH */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <div className="p-6 rounded bg-white border border-[#D9E0E8] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
              <div className="flex items-center space-x-2">
                <GitBranch className="w-5 h-5 text-[#163A5F]" />
                <h3 className="font-bold text-[#172033] text-sm uppercase tracking-wider">Indian Legal Knowledge Graph Schema</h3>
              </div>
              <div className="flex items-center space-x-3 text-xs text-[#64748B] font-mono">
                <span>Nodes: <strong className="text-[#172033]">{graphData?.total_nodes || 0}</strong></span>
                <span>Links: <strong className="text-[#172033]">{graphData?.total_links || 0}</strong></span>
              </div>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Connects substantive offenses under BNS 2023 with investigative procedural powers under BNSS 2023 and evidentiary admissibility requirements under BSA 2023 (e.g. BSA Section 63 Electronic Records Certificate mandate).
            </p>

            {/* Graph Node Summary Types */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                <div className="font-bold text-[#163A5F] text-sm">3</div>
                <div className="text-[#64748B] text-[11px]">Primary Statutes</div>
              </div>
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                <div className="font-bold text-[#2563EB] text-sm">20</div>
                <div className="text-[#64748B] text-[11px]">Key Provisions</div>
              </div>
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                <div className="font-bold text-[#16805C] text-sm">45+</div>
                <div className="text-[#64748B] text-[11px]">Legal Conditions</div>
              </div>
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8]">
                <div className="font-bold text-[#16805C] text-sm">100%</div>
                <div className="text-[#64748B] text-[11px]">Gazetted Grounding</div>
              </div>
            </div>

            {/* Visual Node List */}
            {graphData && (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Indexed Knowledge Nodes:</div>
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-2">
                  {graphData.nodes.slice(0, 15).map((node) => (
                    <div key={node.id} className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#163A5F]" />
                        <span className="text-[#172033] font-medium">{node.label}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white text-[#64748B] border border-[#D9E0E8] font-mono">{node.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
