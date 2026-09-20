import React from 'react';
import { ShieldAlert, X, AlertTriangle, Scale, Cpu, CheckCircle2 } from 'lucide-react';

interface AILimitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AILimitationsModal: React.FC<AILimitationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-700 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-950/60 border border-amber-700/80 rounded text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                AI Evidentiary Limitations & Algorithmic Disclosure
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Statutory Compliance: Section 63 BSA, 2023 & Section 65B IEA, 1872
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Critical Warning */}
          <div className="p-3.5 bg-amber-950/30 border-l-4 border-amber-500 rounded-r bg-[#12100a] text-amber-200 text-xs">
            <div className="font-semibold flex items-center gap-1.5 text-amber-300 mb-1">
              <AlertTriangle className="w-4 h-4" />
              NON-AUTONOMOUS DECISION SUPPORT SYSTEM (HITL MANDATE)
            </div>
            CIPHERTRACE X is an investigative intelligence platform designed strictly to assist sworn law enforcement officers and judicial authorities. AI inferences, link predictions, and consensus summaries do not constitute self-authenticating legal evidence and must be corroborated by investigating officers (IOs) prior to judicial filings.
          </div>

          {/* Section 1: Epistemic Categorization */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Cpu className="w-4 h-4 text-sky-400" />
              1. Epistemic Distinction of System Outputs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="p-2.5 bg-[#080c14] border border-emerald-900/60 rounded">
                <span className="text-emerald-400 font-bold">[EVIDENCE]</span>
                <p className="text-slate-400 text-[10px] mt-1 font-sans">
                  Direct extracted artifacts (CDR call logs, bank statements, seized phone transcripts) verified with SHA-256 hash chains.
                </p>
              </div>
              <div className="p-2.5 bg-[#080c14] border border-sky-900/60 rounded">
                <span className="text-sky-400 font-bold">[INFERENCE]</span>
                <p className="text-slate-400 text-[10px] mt-1 font-sans">
                  Deterministic graph queries and rule-based linkages (e.g. shared address, co-location bursts).
                </p>
              </div>
              <div className="p-2.5 bg-[#080c14] border border-amber-900/60 rounded">
                <span className="text-amber-400 font-bold">[PREDICTION]</span>
                <p className="text-slate-400 text-[10px] mt-1 font-sans">
                  Probabilistic ML link prediction and community detection (accompanied by explicit confidence %).
                </p>
              </div>
              <div className="p-2.5 bg-[#080c14] border border-purple-900/60 rounded">
                <span className="text-purple-400 font-bold">[UNCERTAINTY]</span>
                <p className="text-slate-400 text-[10px] mt-1 font-sans">
                  Identified data gaps, missing CDR records, unverified aliases, and potential spoofing risks.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Indian Legal Framework */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Scale className="w-4 h-4 text-emerald-400" />
              2. Evidentiary Admissibility (Bharatiya Sakshya Adhiniyam, 2023)
            </h4>
            <p className="text-slate-400 text-[11px]">
              Under <strong>Section 63 of the Bharatiya Sakshya Adhiniyam, 2023</strong> (and Section 65B of the Indian Evidence Act, 1872), electronic records generated or processed through CIPHERTRACE X are accompanied by automated cryptographic hash certificates, device serial metadata, and system custody logs to satisfy judicial requirements of electronic integrity.
            </p>
          </div>

          {/* Section 3: Hallucination & Confidence Bounds */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              3. Verification & Contestability Safeguards
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
              <li>Every extracted entity and relationship retains a direct pointer to source byte offsets.</li>
              <li>Counterfactual ablation testing allows investigators to remove any evidence item and verify whether hypothesis conclusions still hold.</li>
              <li>Investigating Officers possess unilateral override and contestation authority over any AI-suggested node or link.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0e1422] flex justify-end">
          <button
            onClick={onClose}
            className="btn-rect-primary"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
