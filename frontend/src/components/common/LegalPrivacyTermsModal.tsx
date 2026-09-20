import React from 'react';
import { Scale, X, Shield, FileText } from 'lucide-react';

interface LegalPrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalPrivacyTermsModal: React.FC<LegalPrivacyTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D9E0E8] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded text-[#16805C]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172033] uppercase tracking-wide">
                Institutional Privacy, Terms & Data Sovereignty
              </h3>
              <p className="text-[11px] font-mono text-[#64748B]">
                Digital Personal Data Protection (DPDP) Act, 2023 & Law Enforcement Compliance
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#334155] leading-relaxed font-sans">
          <div className="space-y-1.5">
            <h4 className="font-semibold text-[#172033] flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Shield className="w-3.5 h-3.5 text-[#163A5F]" />
              1. Law Enforcement Data Governance
            </h4>
            <p className="text-[#64748B] text-[11px]">
              All case materials, digital forensics, telecom CDR files, and financial statements uploaded to CIPHERTRACE X are processed exclusively for criminal investigation, intelligence collation, and judicial prosecution under statutory police powers.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-[#172033] flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <FileText className="w-3.5 h-3.5 text-[#16805C]" />
              2. Chain of Custody & Retention
            </h4>
            <p className="text-[#64748B] text-[11px]">
              Data retention adheres to standard state police records retention manuals and National Crime Records Bureau (NCRB) guidelines. All evidentiary mutations, entity merges, and investigator notes are permanently recorded in the immutable SHA-256 audit ledger.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-[#172033] flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Scale className="w-3.5 h-3.5 text-[#B7791F]" />
              3. Synthetic Universe & Demonstration Notice
            </h4>
            <p className="text-[#64748B] text-[11px]">
              The pre-seeded records (Case CTX-001: Operation Shadow Exchange, FIR references, phone numbers, IMEI values, bank transactions) are entirely synthetic constructs engineered for evaluation and benchmark demonstration purposes.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#D9E0E8] bg-[#F8FAFC] flex justify-between items-center text-[11px] font-mono">
          <span className="text-[#64748B]">State Police CID Cyber Wing Standards</span>
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
