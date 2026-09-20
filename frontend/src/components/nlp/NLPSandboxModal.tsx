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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white border border-[#D9E0E8] rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#D9E0E8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-white border border-[#D9E0E8] text-[#163A5F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172033]">Live NLP Intelligence & Entity Extraction Sandbox</h2>
              <p className="text-xs text-[#64748B] font-mono">
                Real-time regex & heuristic NER testing for Indian Police documents, FIRs, and interrogation memos.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#172033] p-1.5 rounded hover:bg-[#F1F5F9]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 bg-white">
          {/* Input Textarea & Controls */}
          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <label className="text-[#172033] text-xs font-semibold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#163A5F]" />
                Raw Investigative Text / FIR Statement
              </label>
              <button
                onClick={() => setInputText(SAMPLE_SYNTHETIC_INTERROGATION)}
                className="text-[11px] text-[#2563EB] hover:text-[#163A5F] underline"
              >
                Reset to Synthetic FIR
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              className="w-full bg-[#F8FAFC] border border-[#D9E0E8] rounded p-3 text-[#172033] font-mono text-xs focus:border-[#163A5F] focus:outline-none"
              placeholder="Paste raw police statement, FIR text, or interrogation memo..."
            />
            <div className="flex justify-end">
              <button
                onClick={handleExtract}
                disabled={loading || !inputText.trim()}
                className="btn-primary text-xs flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{loading ? 'Processing Document...' : 'Run Extraction Pipeline'}</span>
              </button>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 pt-3 border-t border-[#D9E0E8]">
              {/* Language & Hinglish Diagnostics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1">
                  <span className="text-[#64748B] text-[11px]">Detected Language</span>
                  <div className="text-[#163A5F] font-bold">{result.language_info.primary_language}</div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1">
                  <span className="text-[#64748B] text-[11px]">Hinglish Police Lexicon</span>
                  <div className={`font-bold ${result.language_info.is_hinglish ? 'text-[#16805C]' : 'text-[#64748B]'}`}>
                    {result.language_info.is_hinglish ? 'YES (Indian Police Vocabulary)' : 'STANDARD'}
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1">
                  <span className="text-[#64748B] text-[11px]">Matched Keywords</span>
                  <div className="text-[#2563EB] truncate font-semibold">
                    {result.language_info.matched_legal_keywords?.join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-[#D9E0E8] gap-6 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('ENTITIES')}
                  className={`pb-2 font-semibold transition-all border-b-2 ${
                    activeTab === 'ENTITIES'
                      ? 'text-[#163A5F] border-[#163A5F]'
                      : 'text-[#64748B] border-transparent hover:text-[#172033]'
                  }`}
                >
                  Extracted Entities ({result.entities_count})
                </button>
                <button
                  onClick={() => setActiveTab('RELATIONSHIPS')}
                  className={`pb-2 font-semibold transition-all border-b-2 ${
                    activeTab === 'RELATIONSHIPS'
                      ? 'text-[#163A5F] border-[#163A5F]'
                      : 'text-[#64748B] border-transparent hover:text-[#172033]'
                  }`}
                >
                  Extracted Links ({result.relationships_count})
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'ENTITIES' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {result.entities.map((ent, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-white border border-[#D9E0E8] text-[10px] text-[#2563EB] font-bold">
                          {ent.entity_type}
                        </span>
                        <span className="text-[#16805C] font-semibold text-[10px]">
                          {(ent.confidence * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <div className="text-[#172033] font-bold">{ent.normalized_value}</div>
                      {ent.raw_value !== ent.normalized_value && (
                        <div className="text-[10px] text-[#64748B]">Raw: {ent.raw_value}</div>
                      )}
                      <div className="text-[10px] text-[#64748B] line-clamp-1 italic bg-white p-1 rounded border border-[#D9E0E8]">
                        {ent.context_snippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'RELATIONSHIPS' && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.relationships.map((rel, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[#172033] font-bold">{rel.source_value}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#D9E0E8] text-[10px] text-[#163A5F]">
                          <span>{rel.relationship_type}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                        <span className="text-[#172033] font-bold">{rel.target_value}</span>
                      </div>
                      <span className="text-[#16805C] font-semibold text-[10px]">{(rel.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#D9E0E8] flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
