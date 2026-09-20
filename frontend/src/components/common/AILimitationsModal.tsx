import React from 'react';
import { ShieldAlert, X, AlertTriangle, Scale, Cpu, CheckCircle2 } from 'lucide-react';

interface AILimitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AILimitationsModal: React.FC<AILimitationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D9E0E8] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#FFFBEB] border border-[#FDE68A] rounded text-[#B7791F]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172033] uppercase tracking-wide">
                AI Evidentiary Limitations & Algorithmic Disclosure
              </h3>
              <p className="text-[11px] font-mono text-[#64748B]">
                Statutory Compliance: Section 63 BSA, 2023 & Section 65B IEA, 1872
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#334155] leading-relaxed">
          {/* Critical Warning */}
          <div className="p-3.5 bg-[#FFFBEB] border-l-4 border-[#B7791F] rounded-r text-[#92400E] text-xs">
            <div className="font-semibold flex items-center gap-1.5 text-[#B7791F] mb-1">
              <AlertTriangle className="w-4 h-4" />
              NON-AUTONOMOUS DECISION SUPPORT SYSTEM (HITL MANDATE)
            </div>
            CIPHERTRACE X is an investigative intelligence platform designed strictly to assist sworn law enforcement officers and judicial authorities. AI inferences, link predictions, and consensus summaries do not constitute self-authenticating legal evidence and must be corroborated by investigating officers (IOs) prior to judicial filings.
          </div>

          {/* Section 1: Epistemic Categorization */}
          <div className="space-y-2">
            <h4 className="font-semibold text-[#172033] flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Cpu className="w-4 h-4 text-[#163A5F]" />
              1. Epistemic Distinction of System Outputs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="p-2.5 bg-[#F8FAFC] border border-[#D9E0E8] rounded">
                <span className="text-[#16805C] font-bold">[EVIDENCE]</span>
                <p className="text-[#64748B] text-[10px] mt-1 font-sans">
                  Direct extracted artifacts (CDR call logs, bank statements, seized phone transcripts) verified with SHA-256 hash chains.
                </p>
              </div>
              <div className="p-2.5 bg-[#F8FAFC] border border-[#D9E0E8] rounded">
                <span className="text-[#2563EB] font-bold">[INFERENCE]</span>
                <p className="text-[#64748B] text-[10px] mt-1 font-sans">
                  Synthesized linkages derived from multi-hop graph traversals and pattern correlation across distinct cases.
                </p>
              </div>
              <div className="p-2.5 bg-[#F8FAFC] border border-[#D9E0E8] rounded">
                <span className="text-[#B7791F] font-bold">[PREDICTION]</span>
                <p className="text-[#64748B] text-[10px] mt-1 font-sans">
                  Link-prediction embeddings identifying probable hidden associations requiring human verification.
                </p>
              </div>
              <div className="p-2.5 bg-[#F8FAFC] border border-[#D9E0E8] rounded">
                <span className="text-[#7C3AED] font-bold">[UNCERTAINTY]</span>
                <p className="text-[#64748B] text-[10px] mt-1 font-sans">
                  Explicit counterfactual gaps, missing CDR nodes, and conflicting witness testimonies.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Evidentiary Admissibility */}
          <div className="space-y-2">
            <h4 className="font-semibold text-[#172033] flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Scale className="w-4 h-4 text-[#16805C]" />
              2. Section 63 BSA / Section 65B IEA Admissibility Protocol
            </h4>
            <p className="text-[11px] text-[#64748B]">
              Under Bharatiya Sakshya Adhiniyam, 2023 (BSA §63), electronic records require proof of cryptographic integrity, unbroken chain of custody, and human oversight. Automated outputs from CIPHERTRACE X provide evidentiary pointers and provenance graphs to support the mandatory electronic evidence certificate.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#D9E0E8] bg-[#F8FAFC] flex justify-between items-center text-[11px] font-mono">
          <span className="text-[#64748B]">Section 63 BSA Compliant Disclosures</span>
          <button
            onClick={onClose}
            className="btn-rect-primary text-xs"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
