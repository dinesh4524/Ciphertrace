import React from 'react';
import { Scale, X, Shield, FileText } from 'lucide-react';

interface LegalPrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalPrivacyTermsModal: React.FC<LegalPrivacyTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-700 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-950/60 border border-emerald-700/80 rounded text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                Institutional Privacy, Terms & Data Sovereignty
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Digital Personal Data Protection (DPDP) Act, 2023 & Law Enforcement Exemptions
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <div className="space-y-1.5">
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              1. Law Enforcement Data Governance
            </h4>
            <p className="text-slate-400 text-[11px]">
              All case materials, digital forensics, telecom CDR files, and financial statements uploaded to CIPHERTRACE X are processed exclusively for criminal investigation, intelligence collation, and judicial prosecution under statutory police powers.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              2. Chain of Custody & Retention
            </h4>
            <p className="text-slate-400 text-[11px]">
              Data retention adheres to standard state police records retention manuals and National Crime Records Bureau (NCRB) guidelines. All evidentiary mutations, entity merges, and investigator notes are permanently recorded in the immutable SHA-256 audit ledger.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 uppercase font-mono text-[11px]">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              3. Terms of System Use
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
              <li>Authorized access is restricted to credentialed law enforcement and prosecution personnel.</li>
              <li>Unauthorized export, alteration, or disclosure of case files is punishable under the Bharatiya Nyaya Sanhita, 2023 and Information Technology Act, 2000.</li>
              <li>System administrators maintain real-time audit logs of all search queries, GraphRAG retrievals, and report exports.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0e1422] flex justify-end">
          <button
            onClick={onClose}
            className="btn-rect-primary"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
