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
            <span className="text-xs text-slate-400">
              Case: <strong className="text-slate-200">{activeCase.case_number}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Query Router Architecture Visualizer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-400" />
            Multi-Engine Query Router & Evidence Fusion Pipeline
          </span>
          {classification && (
            <span className="text-xs text-indigo-300 bg-indigo-950/80 border border-indigo-800/50 px-2.5 py-0.5 rounded-md font-mono">
              Route: {classification.primary_route} | Intent: {classification.question_intent}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
          {/* Step 1: User Question */}
          <div className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center">
            <Terminal className="h-4 w-4 text-cyan-400 mb-1" />
            <span className="font-semibold text-slate-200">1. User Inquiry</span>
            <span className="text-[10px] text-slate-400">Natural language prompt</span>
          </div>

          {/* Step 2: Classifier */}
          <div className="p-2.5 rounded-lg border border-indigo-800/60 bg-indigo-950/30 flex flex-col items-center justify-center">
            <Cpu className="h-4 w-4 text-indigo-400 mb-1" />
            <span className="font-semibold text-indigo-200">2. Classifier</span>
            <span className="text-[10px] text-indigo-300/80">Entity & Intent routing</span>
          </div>

          {/* Step 3: Multi-Engine Fabric */}
          <div className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60 flex flex-col items-center justify-center col-span-1 md:col-span-1">
            <div className="flex gap-1.5 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_graph ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>Graph</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_rag ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>RAG</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_ml ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>ML</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                enginePlan?.needs_temporal ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>Time</span>
            </div>
            <span className="font-semibold text-slate-200">3. Multi-Engine</span>
            <span className="text-[10px] text-slate-400">Selective activation</span>
          </div>

          {/* Step 4: Evidence Fusion */}
          <div className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center">
            <GitBranch className="h-4 w-4 text-emerald-400 mb-1" />
            <span className="font-semibold text-slate-200">4. Evidence Fusion</span>
            <span className="text-[10px] text-slate-400">Cross-engine aggregation</span>
          </div>

          {/* Step 5: Grounded LLM Response */}
          <div className="p-2.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 flex flex-col items-center justify-center">
            <Sparkles className="h-4 w-4 text-emerald-400 mb-1" />
            <span className="font-semibold text-emerald-200">5. Grounded LLM</span>
            <span className="text-[10px] text-emerald-300/80">Dual citations + Gap alerts</span>
          </div>
        </div>
      </div>

      {/* 5 Core Question Quick-Launch Carousel */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Investigative Scenario Quick-Launch Buttons (Phase 12 Core Support)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {suggestedPrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPromptClick(item)}
              className="p-3 text-left rounded-lg bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 hover:border-indigo-500/50 transition-all shadow-sm group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300 font-semibold mb-1.5 inline-block">
                  {item.category.replace('_', ' ')}
                </span>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white line-clamp-2">
                  {item.prompt}
                </p>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 group-hover:text-indigo-300">
                Launch <ArrowRight className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Search Query Bar */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Ask an investigative question (e.g. 'How is entity X connected?', 'What changed before the incident?')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
            />
          </div>

          <div className="w-full md:w-56">
            <input
              type="text"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="Focus entity (optional)"
              value={focusEntity}
              onChange={(e) => setFocusEntity(e.target.value)}
            />
          </div>

          <button
            onClick={() => handleExecuteQuery()}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Fusing Evidence...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Ask GraphRAG</span>
              </>
            )}
          </button>
        </div>

        {/* Query Controls / Filters */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700/60 gap-3">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGaps}
                onChange={(e) => setIncludeGaps(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span className="text-slate-300">Run Evidence Gap & Deficiency Detector</span>
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <span>Radius: <strong>{maxHops} hops</strong></span>
            <span>Document Chunks: <strong>{topKChunks}</strong></span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/40 rounded-lg text-red-200 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Response Display Area */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Grounded Synthesis Narrative (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
              {/* Header Status Meter */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <span className={`p-1.5 rounded-md ${
                    result.grounding_status === 'FULLY_GROUNDED' ? 'bg-emerald-500/10 text-emerald-400' :
                    result.grounding_status === 'EVIDENCE_GAP_HIGHLIGHTED' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-cyan-500/10 text-cyan-400'
                  }`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {result.grounding_status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Confidence Score: {(result.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/70 border border-cyan-800/50 text-cyan-300 font-mono">
                    {result.graph_citations.length} Graph Citations
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/70 border border-amber-800/50 text-amber-300 font-mono">
                    {result.document_citations.length} Doc Citations
                  </span>
                  {result.evidence_gaps.length > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/70 border border-rose-800/50 text-rose-300 font-mono font-bold">
                      {result.evidence_gaps.length} Gaps Alert
                    </span>
                  )}
                </div>
              </div>

              {/* Formatted Answer Narrative */}
              <div className="text-sm text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                {result.answer}
              </div>

              {/* Statutory Grounding Notice */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <Scale className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{result.statutory_safeguard}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dual-Citation Explorer & Evidence Gaps (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-700 bg-slate-900/60 p-1">
                <button
                  onClick={() => setActiveTab('GRAPH')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'GRAPH'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  <span>Graph ({result.graph_citations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('DOCS')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'DOCS'
                      ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Documents ({result.document_citations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('GAPS')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'GAPS'
                      ? 'bg-slate-800 text-rose-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Gaps ({result.evidence_gaps.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('CLUSTERS')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'CLUSTERS'
                      ? 'bg-slate-800 text-purple-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Clusters & Time</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 max-h-[520px] overflow-y-auto space-y-3">
                {/* Tab 1: Graph Citations */}
                {activeTab === 'GRAPH' && (
                  <div className="space-y-2.5">
                    {result.graph_citations.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-6">
                        No direct topological edges matched for this specific query filter.
                      </p>
                    ) : (
                      result.graph_citations.map((cit, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                              {cit.citation_id}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              {(cit.confidence * 100).toFixed(0)}% Conf
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-200 flex items-center gap-1 flex-wrap">
                            <strong className="text-white">{cit.source_node}</strong>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                              {cit.relationship_type}
                            </span>
                            <strong className="text-white">{cit.target_node}</strong>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                            <span>Nature: <strong className="text-slate-300">{cit.relationship_nature}</strong></span>
                            <span>Status: <strong className="text-emerald-400">{cit.verification_status}</strong></span>
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
                      <p className="text-xs text-slate-500 italic text-center py-6">
                        No direct vector document chunks cited.
                      </p>
                    ) : (
                      result.document_citations.map((doc, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                              {doc.evidence_code || 'EVID'} (Chunk #{doc.chunk_index})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Score: {(doc.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <blockquote className="text-xs text-slate-300 italic border-l-2 border-amber-500/50 pl-2 py-0.5">
                            "{doc.exact_quote}"
                          </blockquote>
                          <div className="text-[10px] text-slate-400">
                            Source: <span className="text-slate-300 font-medium">{doc.source_type}</span>
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
                      <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-emerald-200 text-xs text-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                        No critical uncorroborated evidentiary gaps found for the current query.
                      </div>
                    ) : (
                      result.evidence_gaps.map((gap, idx) => (
                        <div key={idx} className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-rose-300 font-bold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
                              {gap.gap_type}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              gap.severity === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {gap.severity} PRIORITY
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-200">
                            {gap.entity_or_relationship}
                          </p>
                          <p className="text-xs text-slate-300">
                            {gap.description}
                          </p>
                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-amber-300/90 flex items-start gap-1.5 mt-1">
                            <ChevronRight className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                            <span><strong>Action:</strong> {gap.investigative_recommendation}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 4: Clusters & Temporal */}
                {activeTab === 'CLUSTERS' && (
                  <div className="space-y-3 text-xs text-slate-300">
                    {result.cross_cluster_insights && result.cross_cluster_insights.length > 0 && (
                      <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-lg space-y-2">
                        <span className="font-bold text-purple-200 block text-xs flex items-center gap-1.5">
                          <Share2 className="h-3.5 w-3.5 text-purple-400" />
                          Syndicate Modularity & Cross-Cluster Cells
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>Total Communities: <strong>{result.cross_cluster_insights[0]?.total_communities || 0}</strong></div>
                          <div>Critical Bridges: <strong>{result.cross_cluster_insights[0]?.critical_bridges_count || 0}</strong></div>
                        </div>
                      </div>
                    )}

                    {result.temporal_bursts && result.temporal_bursts.length > 0 && (
                      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
                        <span className="font-bold text-emerald-300 block text-xs flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-emerald-400" />
                          Detected Temporal Bursts
                        </span>
                        {result.temporal_bursts.slice(0, 3).map((b, bIdx) => (
                          <div key={bIdx} className="p-2 rounded bg-slate-800/80 text-[11px] space-y-1">
                            <div className="flex justify-between font-semibold text-slate-200">
                              <span>{b.entity_value || 'Entity'}</span>
                              <span className="text-amber-400 font-mono">Z: {b.z_score?.toFixed(1)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">{b.description || b.burst_type}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!result.cross_cluster_insights || result.cross_cluster_insights.length === 0) &&
                     (!result.temporal_bursts || result.temporal_bursts.length === 0) && (
                      <p className="text-xs text-slate-500 italic text-center py-6">
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
