import React from 'react';
import { Lock, X, Key, Database, FileCheck2, Cpu } from 'lucide-react';

interface SecurityArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityArchitectureModal: React.FC<SecurityArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-700 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-sky-950/60 border border-sky-700/80 rounded text-sky-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                Security Architecture & Cryptographic Integrity
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Tamper-Evident Merkle Tree Chain of Custody & Zero-Trust LEA Standards
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold font-mono text-[11px] mb-1">
                <Key className="w-3.5 h-3.5" />
                SHA-256 Merkle Chain
              </div>
              <p className="text-[10px] text-slate-400">
                Every evidence ingestion produces an immutable SHA-256 hash. Handoffs and transformations are cryptographically linked in a tamper-evident audit ledger.
              </p>
            </div>

            <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[11px] mb-1">
                <Database className="w-3.5 h-3.5" />
                Air-Gapped Deployment
              </div>
              <p className="text-[10px] text-slate-400">
                All models, graph engines (Neo4j), vector stores (pgvector), and relational stores run completely on-premises with zero outbound cloud data leakage.
              </p>
            </div>

            <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold font-mono text-[11px] mb-1">
                <FileCheck2 className="w-3.5 h-3.5" />
                Section 63 BSA Hash Certs
              </div>
              <p className="text-[10px] text-slate-400">
                Automated electronic record certificates containing cryptographic digests, acquisition timestamps, and officer credentials for court submission.
              </p>
            </div>

            <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
              <div className="flex items-center gap-1.5 text-purple-400 font-semibold font-mono text-[11px] mb-1">
                <Cpu className="w-3.5 h-3.5" />
                Fine-Grained RBAC
              </div>
              <p className="text-[10px] text-slate-400">
                Multi-persona privilege isolation (Investigator, Senior IO, CFSL Forensic Analyst, Public Prosecutor, Security Admin) with automated audit logging.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#0e1422] border border-slate-800 rounded text-slate-300 font-mono text-[11px] space-y-1">
            <div className="text-sky-400 font-bold uppercase">System Integrity Verification</div>
            <div className="text-slate-400 text-[10px]">
              Platform: CIPHERTRACE X Core Engine (Build 2026.09-SIH)
              <br />
              Cryptographic Standard: FIPS PUB 180-4 (SHA-256)
              <br />
              Access Control Protocol: Attribute & Role-Based Access Control (RBAC/ABAC)
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0e1422] flex justify-end">
          <button
            onClick={onClose}
            className="btn-rect-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
