import React from 'react';
import { Lock, X, Key, Database, FileCheck2, Cpu } from 'lucide-react';

interface SecurityArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityArchitectureModal: React.FC<SecurityArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D9E0E8] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded text-[#2563EB]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172033] uppercase tracking-wide">
                Security Architecture & Cryptographic Integrity
              </h3>
              <p className="text-[11px] font-mono text-[#64748B]">
                Tamper-Evident Chain of Custody & Zero-Trust LEA Standards
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded shadow-2xs">
              <div className="flex items-center gap-1.5 text-[#163A5F] font-semibold font-mono text-[11px] mb-1">
                <Key className="w-3.5 h-3.5" />
                SHA-256 Merkle Chain
              </div>
              <p className="text-[10px] text-[#64748B]">
                Every evidence ingestion produces an immutable SHA-256 hash. Handoffs and transformations are cryptographically linked in a tamper-evident audit ledger.
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded shadow-2xs">
              <div className="flex items-center gap-1.5 text-[#16805C] font-semibold font-mono text-[11px] mb-1">
                <Database className="w-3.5 h-3.5" />
                Air-Gapped Deployment
              </div>
              <p className="text-[10px] text-[#64748B]">
                All models, graph engines, vector stores, and relational stores run completely on-premises with zero outbound cloud data leakage.
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded shadow-2xs">
              <div className="flex items-center gap-1.5 text-[#2563EB] font-semibold font-mono text-[11px] mb-1">
                <Cpu className="w-3.5 h-3.5" />
                Deterministic Provenance
              </div>
              <p className="text-[10px] text-[#64748B]">
                Every graph node, extracted entity, and inference contains direct back-pointers to specific page numbers, timestamps, and row indices of seized exhibits.
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded shadow-2xs">
              <div className="flex items-center gap-1.5 text-[#B7791F] font-semibold font-mono text-[11px] mb-1">
                <FileCheck2 className="w-3.5 h-3.5" />
                Granular RBAC Matrix
              </div>
              <p className="text-[10px] text-[#64748B]">
                Sworn IOs, senior supervisors, legal counsel, and forensic specialists operate within strictly isolated permission scopes.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#D9E0E8] bg-[#F8FAFC] flex justify-between items-center text-[11px] font-mono">
          <span className="text-[#64748B]">Section 63 BSA & IT Act Compliant</span>
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
