import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Search, 
  Sparkles, 
  FileText, 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  Database,
  Quote,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  Case, 
  RAGQueryResponse, 
  CitationItem, 
  RetrievedChunkItem, 
  RAGStatsResponse 
} from '../../types';
import { api } from '../../services/api';

interface CaseRAGAssistantProps {
  activeCase: Case;
}

export const CaseRAGAssistant: React.FC<CaseRAGAssistantProps> = ({ activeCase }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexMsg, setIndexMsg] = useState<string | null>(null);

  // Filter States
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('ALL');
  const [topK, setTopK] = useState<number>(5);

  // Response States
  const [ragResult, setRagResult] = useState<RAGQueryResponse | null>(null);
  const [stats, setStats] = useState<RAGStatsResponse | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const [showChunks, setShowChunks] = useState(false);

  // Quick Forensic Suggestions
  const quickQueries = [
    "Summarize all suspect admissions and co-conspirators",
    "Trace fund transfers to beneficiary mule accounts",
    "List all phone numbers and cell towers recorded in statements",
    "Identify statutory violations under BNS and IT Act"
  ];

  const fetchStats = async () => {
    try {
      const res = await api.getCaseRAGStats(activeCase.id);
      setStats(res);
    } catch (err: any) {
      console.error("Failed to load RAG stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeCase.id]);

  const handleIndexDocuments = async () => {
    setIndexing(true);
    setIndexMsg(null);
    setError(null);
    try {
      const res = await api.indexCaseDocuments(activeCase.id);
      setIndexMsg(res.message);
      fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to index case documents.");
    } finally {
      setIndexing(false);
    }
  };

  const handleExecuteQuery = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setIndexMsg(null);
    try {
      const payload = {
        query: q,
        top_k: topK,
        source_type_filter: sourceTypeFilter === 'ALL' ? undefined : [sourceTypeFilter],
        min_relevance_score: 0.15
      };
      const res = await api.queryCaseRAG(activeCase.id, payload);
      setRagResult(res);
    } catch (err: any) {
      setError(err.message || "RAG query execution failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: HEADER & STATUTORY COMPLIANCE BANNER */}
      <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <Bot className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Case-Aware Evidentiary RAG Assistant
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
              BSA 2023 SEC 63
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Autonomous forensic retrieval augmented generation strictly isolated to <strong className="text-white">{activeCase.case_number}</strong>.
            All responses are synthesized from cryptographically verified case transcripts, FIRs, and seizure ledgers with direct evidentiary citations.
          </p>
        </div>

        {/* Index Action & Telemetry */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
            <span className="text-[10px] text-slate-400 block font-mono">Vector Embeddings</span>
            <div className="flex items-center justify-end space-x-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {stats?.total_chunks ?? 0} Chunks
              </span>
            </div>
          </div>

          <button
            onClick={handleIndexDocuments}
            disabled={indexing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${indexing ? 'animate-spin' : ''}`} />
            <span>{indexing ? 'Indexing Evidence...' : 'Re-Index Evidence'}</span>
          </button>
        </div>
      </div>

      {indexMsg && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {indexMsg}
          </span>
          <button onClick={() => setIndexMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* SECTION 2: SEARCH CONSOLE & FORENSIC CHIPS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleExecuteQuery(); }}
          className="relative flex items-center"
        >
          <Search className="w-5 h-5 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask an investigative inquiry across case transcripts, FIRs, and bank ledgers..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl pl-12 pr-28 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Analyzing...' : 'Inquire'}</span>
          </button>
        </form>

        {/* Filters & Parameter Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Source Scope:</span>
            {['ALL', 'INTERROGATION', 'FIR', 'PDF_DOCUMENT', 'CASE_NOTE'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSourceTypeFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                  sourceTypeFilter === st
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Depth (Top-K):</span>
            {[3, 5, 10].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTopK(k)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  topK === k ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 block mb-2 font-mono">Suggested Forensic Questions:</span>
          <div className="flex flex-wrap gap-2">
            {quickQueries.map((qq, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(qq); handleExecuteQuery(qq); }}
                className="text-left text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-purple-300 border border-slate-800 rounded-lg px-3 py-1.5 transition flex items-center space-x-1.5"
              >
                <span>{qq}</span>
                <ArrowRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: GROUNDED SYNTHESIS & CITATIONS PANEL */}
      {ragResult && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Header: Grounding Status & Confidence Meter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Grounded Evidentiary Synthesis
                </h3>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  ragResult.grounding_status === 'FULLY_GROUNDED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : ragResult.grounding_status === 'PARTIALLY_GROUNDED'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}>
                  {ragResult.grounding_status}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono block">Grounding Confidence</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {(ragResult.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono block">Citations</span>
                  <span className="text-sm font-bold text-purple-400 font-mono">
                    {ragResult.citations.length} Sources
                  </span>
                </div>
              </div>
            </div>

            {/* Grounded Narrative Response */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800/80 leading-relaxed text-slate-200 text-sm space-y-3">
              {ragResult.answer.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Statutory Compliance Footer */}
            <div className="p-3 bg-purple-950/30 border border-purple-900/60 rounded-xl flex items-start space-x-2 text-xs text-purple-300/90 leading-relaxed">
              <Scale className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>{ragResult.statutory_safeguard}</span>
            </div>
          </div>

          {/* SECTION 4: PRIMARY EVIDENCE CITATIONS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Quote className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Verified Source Citations ({ragResult.citations.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Section 63 BSA Admissible Records</span>
            </div>

            {ragResult.citations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No citations available for this inquiry.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ragResult.citations.map((cit) => (
                  <div
                    key={cit.citation_id}
                    onClick={() => setSelectedCitation(cit)}
                    className="bg-slate-950 border border-slate-800 hover:border-purple-500/60 rounded-xl p-4 cursor-pointer transition shadow-md hover:shadow-purple-900/20 space-y-2.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          {cit.citation_id}
                        </span>
                        <span className="text-xs font-bold text-white font-mono">
                          {cit.evidence_code || 'CASE_EVIDENCE'}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {(cit.relevance_score * 100).toFixed(1)}% match
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic line-clamp-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      "{cit.exact_quote}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="font-mono">{cit.source_type}</span>
                      <span className="flex items-center space-x-1 text-purple-400 group-hover:text-purple-300 font-semibold">
                        <span>Inspect Excerpt</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: AUDITABLE CHUNKS ACCORDION */}
          {ragResult.chunks && ragResult.chunks.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <button
                onClick={() => setShowChunks(!showChunks)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Auditable Vector Chunks ({ragResult.chunks.length})</span>
                </div>
                {showChunks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showChunks && (
                <div className="space-y-3 pt-2">
                  {ragResult.chunks.map((chk, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-purple-300 font-bold">
                          Chunk #{chk.chunk_index + 1} ({chk.source_type})
                        </span>
                        <div className="space-x-3 text-slate-400">
                          <span>Dense: {(chk.similarity_score * 100).toFixed(1)}%</span>
                          <span className="text-emerald-400 font-bold">Rerank: {(chk.rerank_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <p className="text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                        {chk.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CITATION DETAIL MODAL */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/80">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 font-bold mb-1">
                  <Quote className="w-4 h-4" />
                  <span>PRIMARY EVIDENCE CITATION</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {selectedCitation.citation_id}: {selectedCitation.evidence_code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-2 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Verbatim Extracted Passage</span>
                <p className="text-slate-200 italic leading-relaxed text-sm font-serif">
                  "{selectedCitation.exact_quote}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Source Format</span>
                  <span className="text-white font-bold">{selectedCitation.source_type}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Relevance Match</span>
                  <span className="text-emerald-400 font-bold">{(selectedCitation.relevance_score * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 col-span-2">
                  <span className="text-slate-500 block">Document Source File</span>
                  <span className="text-purple-300 font-bold truncate block">{selectedCitation.file_name}</span>
                </div>
              </div>

              <div className="p-3 bg-purple-950/30 border border-purple-900/50 rounded-xl text-[11px] text-purple-300">
                <strong>Chain of Custody Notice: </strong>
                This excerpt is cryptographically anchored to evidence item {selectedCitation.evidence_id}.
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
