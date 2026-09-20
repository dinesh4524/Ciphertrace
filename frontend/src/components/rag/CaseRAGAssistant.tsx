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
      <div className="bg-[#FFFFFF] border border-[#D9E0E8] rounded p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <Bot className="w-5 h-5 text-[#163A5F]" />
            <h2 className="text-base font-bold text-[#172033] tracking-tight">
              Case-Aware Evidentiary Inquiry Assistant
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F8FAFC] text-[#16805C] border border-[#D9E0E8]">
              BSA 2023 SEC 63
            </span>
          </div>
          <p className="text-xs text-[#64748B] max-w-3xl leading-relaxed">
            Forensic retrieval augmented generation strictly isolated to <strong className="text-[#172033] font-semibold">{activeCase.case_number}</strong>.
            All responses are synthesized from cryptographically verified case transcripts, FIRs, and seizure ledgers with direct evidentiary citations.
          </p>
        </div>

        {/* Index Action & Telemetry */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="bg-[#F8FAFC] border border-[#D9E0E8] rounded px-3.5 py-2 text-right">
            <span className="text-[10px] text-[#64748B] block font-mono uppercase font-bold">Vector Embeddings</span>
            <div className="flex items-center justify-end space-x-1.5">
              <Database className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-sm font-bold text-[#172033] font-mono">
                {stats?.total_chunks ?? 0} Chunks
              </span>
            </div>
          </div>

          <button
            onClick={handleIndexDocuments}
            disabled={indexing}
            className="btn-primary text-xs flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${indexing ? 'animate-spin' : ''}`} />
            <span>{indexing ? 'Indexing Evidence...' : 'Re-Index Evidence'}</span>
          </button>
        </div>
      </div>

      {indexMsg && (
        <div className="p-3.5 bg-[#F8FAFC] border border-[#16805C] text-[#16805C] rounded text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {indexMsg}
          </span>
          <button onClick={() => setIndexMsg(null)} className="text-[#64748B] hover:text-[#172033]">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-[#C53030] rounded text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-[#64748B] hover:text-[#172033]">✕</button>
        </div>
      )}

      {/* SECTION 2: SEARCH CONSOLE & FORENSIC CHIPS */}
      <div className="bg-white border border-[#D9E0E8] rounded p-5 shadow-xs space-y-4">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleExecuteQuery(); }}
          className="relative flex items-center"
        >
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask an investigative inquiry across case transcripts, FIRs, and bank ledgers..."
            className="w-full bg-[#F8FAFC] border border-[#D9E0E8] focus:border-[#163A5F] rounded pl-10 pr-24 py-2.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Analyzing...' : 'Inquire'}</span>
          </button>
        </form>

        {/* Filters & Parameter Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[#64748B] font-medium text-xs">Source Scope:</span>
            {['ALL', 'INTERROGATION', 'FIR', 'PDF_DOCUMENT', 'CASE_NOTE'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSourceTypeFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                  sourceTypeFilter === st
                    ? 'bg-[#163A5F] text-white font-bold'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#D9E0E8]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#64748B] text-xs">Depth (Top-K):</span>
            {[3, 5, 10].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTopK(k)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
                  topK === k ? 'bg-[#163A5F] text-white font-bold' : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#D9E0E8]'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-[#D9E0E8]">
          <span className="text-[11px] text-[#64748B] block mb-2 font-mono uppercase font-bold">Suggested Forensic Inquiries:</span>
          <div className="flex flex-wrap gap-2">
            {quickQueries.map((qq, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(qq); handleExecuteQuery(qq); }}
                className="text-left text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] border border-[#D9E0E8] rounded px-3 py-1.5 transition flex items-center space-x-1.5"
              >
                <span>{qq}</span>
                <ArrowRight className="w-3 h-3 text-[#64748B]" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: GROUNDED SYNTHESIS & CITATIONS PANEL */}
      {ragResult && (
        <div className="space-y-6">
          <div className="bg-white border border-[#D9E0E8] rounded p-6 shadow-xs space-y-5">
            {/* Header: Grounding Status & Confidence Meter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9E0E8] pb-4">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-[#16805C]" />
                <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                  Grounded Evidentiary Synthesis
                </h3>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  ragResult.grounding_status === 'FULLY_GROUNDED'
                    ? 'bg-emerald-50 text-[#16805C] border border-emerald-200'
                    : ragResult.grounding_status === 'PARTIALLY_GROUNDED'
                    ? 'bg-amber-50 text-[#B7791F] border border-amber-200'
                    : 'bg-rose-50 text-[#C53030] border border-rose-200'
                }`}>
                  {ragResult.grounding_status}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] font-mono block">Grounding Confidence</span>
                  <span className="text-sm font-bold text-[#16805C] font-mono">
                    {(ragResult.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] font-mono block">Citations</span>
                  <span className="text-sm font-bold text-[#2563EB] font-mono">
                    {ragResult.citations.length} Sources
                  </span>
                </div>
              </div>
            </div>

            {/* Grounded Narrative Response */}
            <div className="p-4 bg-[#F8FAFC] rounded border border-[#D9E0E8] leading-relaxed text-[#172033] text-xs space-y-2.5 font-sans">
              {ragResult.answer.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Statutory Compliance Footer */}
            <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded flex items-start space-x-2 text-xs text-[#163A5F] leading-relaxed">
              <Scale className="w-4 h-4 text-[#163A5F] shrink-0 mt-0.5" />
              <span className="text-[11px]">{ragResult.statutory_safeguard}</span>
            </div>
          </div>

          {/* SECTION 4: PRIMARY EVIDENCE CITATIONS */}
          <div className="bg-white border border-[#D9E0E8] rounded p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
              <div className="flex items-center space-x-2">
                <Quote className="w-4 h-4 text-[#163A5F]" />
                <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                  Verified Source Citations ({ragResult.citations.length})
                </h4>
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">Section 63 BSA Admissible Records</span>
            </div>

            {ragResult.citations.length === 0 ? (
              <div className="p-6 text-center text-[#64748B] text-xs">
                No citations available for this inquiry.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ragResult.citations.map((cit) => (
                  <div
                    key={cit.citation_id}
                    onClick={() => setSelectedCitation(cit)}
                    className="bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#163A5F] rounded p-4 cursor-pointer transition shadow-xs space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-[#163A5F] border border-[#D9E0E8]">
                          {cit.citation_id}
                        </span>
                        <span className="text-xs font-bold text-[#172033] font-mono">
                          {cit.evidence_code || 'CASE_EVIDENCE'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#16805C] font-bold font-mono">
                        {(cit.relevance_score * 100).toFixed(1)}% match
                      </span>
                    </div>

                    <p className="text-xs text-[#172033] italic line-clamp-3 bg-white p-2.5 rounded border border-[#D9E0E8]">
                      "{cit.exact_quote}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1 font-mono">
                      <span>{cit.source_type}</span>
                      <span className="flex items-center space-x-1 text-[#2563EB] group-hover:text-[#163A5F] font-semibold">
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
            <div className="bg-white border border-[#D9E0E8] rounded p-5 shadow-xs space-y-3">
              <button
                onClick={() => setShowChunks(!showChunks)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#172033] hover:text-[#163A5F] transition"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#2563EB]" />
                  <span>Auditable Vector Chunks ({ragResult.chunks.length})</span>
                </div>
                {showChunks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showChunks && (
                <div className="space-y-3 pt-2">
                  {ragResult.chunks.map((chk, idx) => (
                    <div key={idx} className="bg-[#F8FAFC] border border-[#D9E0E8] rounded p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#163A5F] font-bold">
                          Chunk #{chk.chunk_index + 1} ({chk.source_type})
                        </span>
                        <div className="space-x-3 text-[#64748B]">
                          <span>Dense: {(chk.similarity_score * 100).toFixed(1)}%</span>
                          <span className="text-[#16805C] font-bold">Rerank: {(chk.rerank_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <p className="text-[#172033] text-xs font-mono whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded border border-[#D9E0E8]">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D9E0E8] rounded w-full max-w-lg shadow-2xl overflow-hidden space-y-4">
            <div className="p-4 border-b border-[#D9E0E8] flex items-start justify-between bg-[#F8FAFC]">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-[#163A5F] font-bold mb-1">
                  <Quote className="w-4 h-4" />
                  <span>PRIMARY EVIDENCE CITATION</span>
                </div>
                <h3 className="text-sm font-bold text-[#172033]">
                  {selectedCitation.citation_id}: {selectedCitation.evidence_code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-[#64748B] hover:text-[#172033] text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-2 space-y-4 text-xs">
              <div className="p-3.5 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-2">
                <span className="text-[10px] text-[#64748B] uppercase font-mono font-bold block">Verbatim Extracted Passage</span>
                <p className="text-[#172033] italic leading-relaxed text-xs font-serif bg-white p-3 rounded border border-[#D9E0E8]">
                  "{selectedCitation.exact_quote}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#D9E0E8]">
                  <span className="text-[#64748B] block text-[10px]">Source Format</span>
                  <span className="text-[#172033] font-bold">{selectedCitation.source_type}</span>
                </div>
                <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#D9E0E8]">
                  <span className="text-[#64748B] block text-[10px]">Relevance Match</span>
                  <span className="text-[#16805C] font-bold">{(selectedCitation.relevance_score * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#D9E0E8] col-span-2">
                  <span className="text-[#64748B] block text-[10px]">Document Source File</span>
                  <span className="text-[#163A5F] font-bold truncate block">{selectedCitation.file_name}</span>
                </div>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded text-[11px] text-[#163A5F]">
                <strong>Chain of Custody Notice: </strong>
                This excerpt is cryptographically anchored to evidence item {selectedCitation.evidence_id}.
              </div>
            </div>

            <div className="p-3 border-t border-[#D9E0E8] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setSelectedCitation(null)}
                className="btn-secondary text-xs"
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
