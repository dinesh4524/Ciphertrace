import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Play, 
  Layers, 
  FileText, 
  Network, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight,
  Terminal,
  RotateCw
} from 'lucide-react';
import { DirectNLPResult } from '../../types';
import { api } from '../../services/api';

interface NLPSandboxModalProps {
  onClose: () => void;
}

const SAMPLE_SYNTHETIC_INTERROGATION = `INTERROGATION TRANSCRIPT - SPECIAL CELL
Subject: Tariq Ahmed @ Tiger, son of Abdul Rehman
Arresting Unit: PS Mandir Marg, New Delhi
Date: 12-08-2026

Q: State your registered mobile numbers and handsets used.
A: I was using OnePlus Nord handset with IMEI 861234567890123 having SIM IMSI 404450123456789. The calling number is +91-9876543210 and secondary burner 9810123456.

Q: Explain the flow of funds received from the cyber complainant.
A: The amount of INR 4,50,000 was credited to State Bank of India account SBI-40291028471. I transferred 2,00,000 to Imran Khan @ Babloo via UPI handle mule.settlement@okaxis. Later converted 1,50,000 to USDT address Txyz1234567890abcdef1234567890abcde and Bitcoin wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa.

Q: How did you escape from the scene?
A: I fled in vehicle DL-01-AB-1234 towards Gurgaon after conducting talashi of the office.
Case booked under BNS Section 318(4) and IPC Section 420.`;

export const NLPSandboxModal: React.FC<NLPSandboxModalProps> = ({ onClose }) => {
  const [inputText, setInputText] = useState(SAMPLE_SYNTHETIC_INTERROGATION);
  const [result, setResult] = useState<DirectNLPResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ENTITIES' | 'RELATIONSHIPS'>('ENTITIES');

  const handleExtract = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const data = await api.extractDirectNLP(inputText);
      setResult(data);
    } catch (err: any) {
      alert(`Extraction error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#0b1329] border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden cyber-glow-cyan flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live NLP Intelligence & Entity Extraction Sandbox</h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time regex & heuristic NER testing for Indian Police documents, FIRs, and interrogation memos.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Input Textarea & Controls */}
          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                Raw Investigative Text / FIR Statement
              </label>
              <button
                onClick={() => setInputText(SAMPLE_SYNTHETIC_INTERROGATION)}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline"
              >
                Reset to Synthetic FIR
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-200 font-mono text-xs focus:border-purple-500 focus:outline-none"
              placeholder="Paste raw police statement, FIR text, or interrogation memo..."
            />
            <div className="flex justify-end">
              <button
                onClick={handleExtract}
                disabled={loading || !inputText.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{loading ? 'Processing Document...' : 'Run Extraction Pipeline'}</span>
              </button>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              {/* Language & Hinglish Diagnostics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[11px]">Detected Language</span>
                  <div className="text-purple-300 font-bold">{result.language_info.primary_language}</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[11px]">Hinglish Police Lexicon</span>
                  <div className={`font-bold ${result.language_info.is_hinglish ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {result.language_info.is_hinglish ? 'YES (Indian Police Vocabulary)' : 'STANDARD'}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[11px]">Matched Keywords</span>
                  <div className="text-cyan-300 truncate">
                    {result.language_info.matched_legal_keywords?.join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-800 gap-6 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('ENTITIES')}
                  className={`pb-2 font-semibold transition-all border-b-2 ${
                    activeTab === 'ENTITIES'
                      ? 'text-purple-400 border-purple-400'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  Extracted Entities ({result.entities_count})
                </button>
                <button
                  onClick={() => setActiveTab('RELATIONSHIPS')}
                  className={`pb-2 font-semibold transition-all border-b-2 ${
                    activeTab === 'RELATIONSHIPS'
                      ? 'text-purple-400 border-purple-400'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  Extracted Links ({result.relationships_count})
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'ENTITIES' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {result.entities.map((ent, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-cyan-300 font-bold">
                          {ent.entity_type}
                        </span>
                        <span className="text-emerald-400 text-[10px]">
                          {(ent.confidence * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <div className="text-white font-bold">{ent.normalized_value}</div>
                      {ent.raw_value !== ent.normalized_value && (
                        <div className="text-[10px] text-slate-500">Raw: {ent.raw_value}</div>
                      )}
                      <div className="text-[10px] text-slate-400 line-clamp-1 italic bg-slate-900/50 p-1 rounded">
                        {ent.context_snippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'RELATIONSHIPS' && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.relationships.map((rel, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-bold">{rel.source_value}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-[10px] text-indigo-300">
                          <span>{rel.relationship_type}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                        <span className="text-slate-200 font-bold">{rel.target_value}</span>
                      </div>
                      <span className="text-emerald-400 text-[10px]">{(rel.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-xl"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
