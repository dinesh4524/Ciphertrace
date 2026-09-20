import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Search, 
  Sparkles, 
  Layers, 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  GitBranch, 
  Cpu, 
  Clock, 
  FileText, 
  ExternalLink, 
  HelpCircle, 
  CheckCircle2, 
  Compass, 
  Zap, 
  Terminal,
  Activity,
  Share2,
  AlertCircle,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  Case, 
  GraphRAGQueryResponse, 
  GraphCitationItem, 
  CitationItem, 
  EvidenceGapItem, 
  SuggestedPromptItem 
} from '../../types';
import { api } from '../../services/api';

interface GraphRAGDashboardProps {
  activeCase: Case;
}

export const GraphRAGDashboard: React.FC<GraphRAGDashboardProps> = ({ activeCase }) => {
  const [query, setQuery] = useState('');
  const [focusEntity, setFocusEntity] = useState('');
  const [maxHops, setMaxHops] = useState<number>(2);
  const [topKChunks, setTopKChunks] = useState<number>(5);
  const [includeGaps, setIncludeGaps] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<GraphRAGQueryResponse | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedPromptItem[]>([]);
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'DOCS' | 'GAPS' | 'CLUSTERS'>('GRAPH');

  // Load suggested prompts on case load
  useEffect(() => {
    if (activeCase?.id) {
      loadSuggestedPrompts(activeCase.id);
    }
  }, [activeCase?.id]);

  const loadSuggestedPrompts = async (caseId: string) => {
    try {
      const res = await api.getSuggestedGraphRAGPrompts(caseId);
      if (res && res.prompts) {
        setSuggestedPrompts(res.prompts);
      }
    } catch (err: any) {
      console.warn('Failed to fetch suggested GraphRAG prompts:', err);
    }
  };

  const handleExecuteQuery = async (customQuery?: string, customFocus?: string) => {
    const q = customQuery !== undefined ? customQuery : query;
    if (!q || q.trim().length < 2) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.queryCaseGraphRAG(activeCase.id, {
        query: q,
        focus_entity: customFocus !== undefined ? customFocus : (focusEntity.trim() || undefined),
        include_evidence_gaps: includeGaps,
        max_graph_hops: maxHops,
        top_k_chunks: topKChunks
      });
      setResult(response);
      if (response.evidence_gaps?.length > 0 && response.classification.question_intent === 'MISSING_EVIDENCE') {
        setActiveTab('GAPS');
      } else if (response.graph_citations?.length > 0) {
        setActiveTab('GRAPH');
      } else if (response.document_citations?.length > 0) {
        setActiveTab('DOCS');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute GraphRAG query.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPromptClick = (p: SuggestedPromptItem) => {
    setQuery(p.prompt);
    if (p.focus_entity) {
      setFocusEntity(p.focus_entity);
    }
    handleExecuteQuery(p.prompt, p.focus_entity || undefined);
  };

  const classification = result?.classification;
  const enginePlan = classification?.engine_plan;

  return (
    <div className="space-y-6">
      {/* Header with Case Context & Statutory Badge */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Network className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              GraphRAG Intelligence Engine
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                Phase 12
              </span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Combines Neo4j knowledge graph topology, vector document RAG, and ML link analytics into an explainable, dual-grounded query router.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 justify-end">
              <ShieldCheck className="h-3.5 w-3.5" /> Section 63 BSA 2023 Compliant
            </span>
            <span className="text-xs text-[#64748B]">
              Case: <strong className="text-[#172033]">{activeCase.case_number}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Query Router Architecture Visualizer */}
      <div className="bg-white border border-[#D9E0E8] rounded p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-[#D9E0E8] pb-2">
          <span className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#163A5F]" />
            Multi-Engine Query Router & Evidence Fusion Pipeline
          </span>
          {classification && (
            <span className="text-xs text-[#163A5F] bg-[#F8FAFC] border border-[#D9E0E8] px-2.5 py-0.5 rounded font-mono font-semibold">
              Route: {classification.primary_route} | Intent: {classification.question_intent}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
          {/* Step 1: User Question */}
          <div className="p-2.5 rounded border border-[#D9E0E8] bg-[#F8FAFC] flex flex-col items-center justify-center">
            <Terminal className="h-4 w-4 text-[#2563EB] mb-1" />
            <span className="font-bold text-[#172033]">1. User Inquiry</span>
            <span className="text-[10px] text-[#64748B]">Natural language prompt</span>
          </div>

          {/* Step 2: Classifier */}
          <div className="p-2.5 rounded border border-[#D9E0E8] bg-[#F8FAFC] flex flex-col items-center justify-center">
            <Cpu className="h-4 w-4 text-[#163A5F] mb-1" />
            <span className="font-bold text-[#172033]">2. Classifier</span>
            <span className="text-[10px] text-[#64748B]">Entity & Intent routing</span>
          </div>

          {/* Step 3: Multi-Engine Fabric */}
          <div className="p-2.5 rounded border border-[#D9E0E8] bg-[#F8FAFC] flex flex-col items-center justify-center col-span-1 md:col-span-1">
            <div className="flex gap-1 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_graph ? 'bg-blue-50 text-[#2563EB] border-blue-200 font-bold' : 'bg-white text-[#94A3B8] border-[#D9E0E8]'
              }`}>Graph</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_rag ? 'bg-amber-50 text-[#B7791F] border-amber-200 font-bold' : 'bg-white text-[#94A3B8] border-[#D9E0E8]'
              }`}>RAG</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_ml ? 'bg-indigo-50 text-[#163A5F] border-indigo-200 font-bold' : 'bg-white text-[#94A3B8] border-[#D9E0E8]'
              }`}>ML</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_temporal ? 'bg-emerald-50 text-[#16805C] border-emerald-200 font-bold' : 'bg-white text-[#94A3B8] border-[#D9E0E8]'
              }`}>Time</span>
            </div>
            <span className="font-bold text-[#172033]">3. Multi-Engine</span>
            <span className="text-[10px] text-[#64748B]">Selective activation</span>
          </div>

          {/* Step 4: Evidence Fusion */}
          <div className="p-2.5 rounded border border-[#D9E0E8] bg-[#F8FAFC] flex flex-col items-center justify-center">
            <GitBranch className="h-4 w-4 text-[#16805C] mb-1" />
            <span className="font-bold text-[#172033]">4. Evidence Fusion</span>
            <span className="text-[10px] text-[#64748B]">Cross-engine aggregation</span>
          </div>

          {/* Step 5: Grounded LLM Response */}
          <div className="p-2.5 rounded border border-[#D9E0E8] bg-[#F8FAFC] flex flex-col items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#16805C] mb-1" />
            <span className="font-bold text-[#172033]">5. Grounded LLM</span>
            <span className="text-[10px] text-[#64748B]">Dual citations + Gap alerts</span>
          </div>
        </div>
      </div>

      {/* 5 Core Question Quick-Launch Carousel */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-[#B7791F]" />
          Investigative Scenario Quick-Launch Buttons (Phase 12 Core Support)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {suggestedPrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPromptClick(item)}
              className="p-3 text-left rounded bg-white hover:bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#163A5F] transition-all shadow-xs group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#163A5F] font-bold mb-1.5 inline-block">
                  {item.category.replace('_', ' ')}
                </span>
                <p className="text-xs font-semibold text-[#172033] group-hover:text-[#163A5F] line-clamp-2">
                  {item.prompt}
                </p>
              </div>
              <span className="text-[10px] text-[#64748B] mt-2 flex items-center gap-1 group-hover:text-[#163A5F]">
                Launch <ArrowRight className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Search Query Bar */}
      <div className="bg-white border border-[#D9E0E8] rounded p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              className="w-full bg-[#F8FAFC] border border-[#D9E0E8] rounded pl-10 pr-4 py-2 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
              placeholder="Ask an investigative question (e.g. 'How is entity X connected?', 'What changed before the incident?')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
            />
          </div>

          <div className="w-full md:w-56">
            <input
              type="text"
              className="w-full bg-[#F8FAFC] border border-[#D9E0E8] rounded px-3 py-2 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
              placeholder="Focus entity (optional)"
              value={focusEntity}
              onChange={(e) => setFocusEntity(e.target.value)}
            />
          </div>

          <button
            onClick={() => handleExecuteQuery()}
            disabled={loading || !query.trim()}
            className="btn-primary text-xs flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Fusing Evidence...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask GraphRAG</span>
              </>
            )}
          </button>
        </div>

        {/* Query Controls / Filters */}
        <div className="flex flex-wrap items-center justify-between text-xs text-[#64748B] pt-1 border-t border-[#D9E0E8] gap-3">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGaps}
                onChange={(e) => setIncludeGaps(e.target.checked)}
                className="rounded border-[#D9E0E8] text-[#163A5F] focus:ring-0"
              />
              <span className="text-[#172033]">Run Evidence Gap & Deficiency Detector</span>
            </label>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span>Radius: <strong className="text-[#172033]">{maxHops} hops</strong></span>
            <span>Document Chunks: <strong className="text-[#172033]">{topKChunks}</strong></span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-[#C53030] text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#C53030] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Response Display Area */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Grounded Synthesis Narrative (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#D9E0E8] rounded p-5 shadow-xs space-y-4">
              {/* Header Status Meter */}
              <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
                <div className="flex items-center space-x-2">
                  <span className={`p-1.5 rounded ${
                    result.grounding_status === 'FULLY_GROUNDED' ? 'bg-emerald-50 text-[#16805C]' :
                    result.grounding_status === 'EVIDENCE_GAP_HIGHLIGHTED' ? 'bg-amber-50 text-[#B7791F]' :
                    'bg-blue-50 text-[#2563EB]'
                  }`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                      {result.grounding_status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-[#64748B] block font-mono">
                      Confidence Score: {(result.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#2563EB]">
                    {result.graph_citations.length} Graph Citations
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#B7791F]">
                    {result.document_citations.length} Doc Citations
                  </span>
                  {result.evidence_gaps.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-[#C53030] font-bold">
                      {result.evidence_gaps.length} Gaps Alert
                    </span>
                  )}
                </div>
              </div>

              {/* Formatted Answer Narrative */}
              <div className="text-xs text-[#172033] leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                {result.answer}
              </div>

              {/* Statutory Grounding Notice */}
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[11px] text-[#64748B] flex items-start gap-2">
                <Scale className="h-4 w-4 text-[#16805C] shrink-0 mt-0.5" />
                <span>{result.statutory_safeguard}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dual-Citation Explorer & Evidence Gaps (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#D9E0E8] rounded overflow-hidden shadow-xs flex flex-col">
              {/* Tab Navigation */}
              <div className="flex border-b border-[#D9E0E8] bg-[#F8FAFC] p-1 gap-1 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('GRAPH')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'GRAPH'
                      ? 'bg-white text-[#163A5F] shadow-xs border border-[#D9E0E8] font-bold'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  <span>Graph ({result.graph_citations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('DOCS')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'DOCS'
                      ? 'bg-white text-[#B7791F] shadow-xs border border-[#D9E0E8] font-bold'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Docs ({result.document_citations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('GAPS')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'GAPS'
                      ? 'bg-white text-[#C53030] shadow-xs border border-[#D9E0E8] font-bold'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Gaps ({result.evidence_gaps.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('CLUSTERS')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'CLUSTERS'
                      ? 'bg-white text-[#163A5F] shadow-xs border border-[#D9E0E8] font-bold'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Clusters</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 max-h-[520px] overflow-y-auto space-y-3">
                {/* Tab 1: Graph Citations */}
                {activeTab === 'GRAPH' && (
                  <div className="space-y-2.5">
                    {result.graph_citations.length === 0 ? (
                      <p className="text-xs text-[#64748B] italic text-center py-6">
                        No direct topological edges matched for this specific query filter.
                      </p>
                    ) : (
                      result.graph_citations.map((cit, idx) => (
                        <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#2563EB] font-bold bg-white px-1.5 py-0.5 rounded border border-[#D9E0E8]">
                              {cit.citation_id}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#64748B] border border-[#D9E0E8] font-mono font-semibold">
                              {(cit.confidence * 100).toFixed(0)}% Conf
                            </span>
                          </div>
                          <div className="text-xs font-medium text-[#172033] flex items-center gap-1 flex-wrap font-mono">
                            <strong className="text-[#172033]">{cit.source_node}</strong>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white text-[#163A5F] border border-[#D9E0E8]">
                              {cit.relationship_type}
                            </span>
                            <strong className="text-[#172033]">{cit.target_node}</strong>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1 font-mono">
                            <span>Nature: <strong className="text-[#172033]">{cit.relationship_nature}</strong></span>
                            <span>Status: <strong className="text-[#16805C]">{cit.verification_status}</strong></span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Document Citations */}
                {activeTab === 'DOCS' && (
                  <div className="space-y-2.5">
                    {result.document_citations.length === 0 ? (
                      <p className="text-xs text-[#64748B] italic text-center py-6">
                        No direct vector document chunks cited.
                      </p>
                    ) : (
                      result.document_citations.map((doc, idx) => (
                        <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#B7791F] font-bold bg-white px-1.5 py-0.5 rounded border border-[#D9E0E8]">
                              {doc.evidence_code || 'EVID'} (Chunk #{doc.chunk_index})
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono font-semibold">
                              Score: {(doc.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <blockquote className="text-xs text-[#172033] italic border-l-2 border-[#B7791F] pl-2 py-0.5 bg-white p-2 rounded">
                            "{doc.exact_quote}"
                          </blockquote>
                          <div className="text-[10px] text-[#64748B] font-mono">
                            Source: <span className="text-[#172033] font-semibold">{doc.source_type}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 3: Evidence Gaps */}
                {activeTab === 'GAPS' && (
                  <div className="space-y-2.5">
                    {result.evidence_gaps.length === 0 ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-[#16805C] text-xs text-center font-semibold">
                        <CheckCircle2 className="h-5 w-5 text-[#16805C] mx-auto mb-1" />
                        No critical uncorroborated evidentiary gaps found for the current query.
                      </div>
                    ) : (
                      result.evidence_gaps.map((gap, idx) => (
                        <div key={idx} className="p-3 bg-rose-50/50 border border-rose-200 rounded space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#C53030] font-bold bg-white px-1.5 py-0.5 rounded border border-rose-200">
                              {gap.gap_type}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                              gap.severity === 'HIGH' ? 'bg-rose-100 text-[#C53030] border border-rose-300' : 'bg-amber-100 text-[#B7791F] border border-amber-300'
                            }`}>
                              {gap.severity} PRIORITY
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#172033]">
                            {gap.entity_or_relationship}
                          </p>
                          <p className="text-xs text-[#172033]">
                            {gap.description}
                          </p>
                          <div className="p-2 rounded bg-white border border-[#D9E0E8] text-[11px] text-[#B7791F] flex items-start gap-1.5 mt-1">
                            <ChevronRight className="h-3 w-3 text-[#B7791F] shrink-0 mt-0.5" />
                            <span><strong>Action:</strong> {gap.investigative_recommendation}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 4: Clusters & Temporal */}
                {activeTab === 'CLUSTERS' && (
                  <div className="space-y-3 text-xs text-[#172033]">
                    {result.cross_cluster_insights && result.cross_cluster_insights.length > 0 && (
                      <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded space-y-2">
                        <span className="font-bold text-[#163A5F] block text-xs flex items-center gap-1.5 uppercase tracking-wider">
                          <Share2 className="h-3.5 w-3.5 text-[#163A5F]" />
                          Syndicate Modularity & Cross-Cluster Cells
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div>Total Communities: <strong>{result.cross_cluster_insights[0]?.total_communities || 0}</strong></div>
                          <div>Critical Bridges: <strong>{result.cross_cluster_insights[0]?.critical_bridges_count || 0}</strong></div>
                        </div>
                      </div>
                    )}

                    {result.temporal_bursts && result.temporal_bursts.length > 0 && (
                      <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded space-y-2">
                        <span className="font-bold text-[#16805C] block text-xs flex items-center gap-1.5 uppercase tracking-wider">
                          <Clock className="h-3.5 w-3.5 text-[#16805C]" />
                          Detected Temporal Bursts
                        </span>
                        {result.temporal_bursts.slice(0, 3).map((b, bIdx) => (
                          <div key={bIdx} className="p-2 rounded bg-white border border-[#D9E0E8] text-[11px] space-y-1">
                            <div className="flex justify-between font-semibold text-[#172033]">
                              <span>{b.entity_value || 'Entity'}</span>
                              <span className="text-[#B7791F] font-mono">Z: {b.z_score?.toFixed(1)}</span>
                            </div>
                            <div className="text-[10px] text-[#64748B]">{b.description || b.burst_type}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!result.cross_cluster_insights || result.cross_cluster_insights.length === 0) &&
                     (!result.temporal_bursts || result.temporal_bursts.length === 0) && (
                      <p className="text-xs text-[#64748B] italic text-center py-6">
                        No cross-cluster bridges or temporal bursts active for this query.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
