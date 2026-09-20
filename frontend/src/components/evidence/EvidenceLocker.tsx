import React, { useState } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  AlertOctagon, 
  HardDrive, 
  Clock, 
  User, 
  RotateCw, 
  Lock, 
  CheckCircle2, 
  PhoneCall, 
  Landmark, 
  FileText, 
  Search, 
  Eye, 
  Terminal,
  Shield,
  FileCode
} from 'lucide-react';
import { EvidenceItem, IntegrityCheckResult, Case } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';
import { EvidenceDetailModal } from './EvidenceDetailModal';
import { NLPSandboxModal } from '../nlp/NLPSandboxModal';

interface EvidenceLockerProps {
  activeCase: Case;
  evidenceList: EvidenceItem[];
  onRefresh: () => void;
  loading: boolean;
}

export const EvidenceLocker: React.FC<EvidenceLockerProps> = ({
  activeCase,
  evidenceList,
  onRefresh,
  loading,
}) => {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [processingNLPId, setProcessingNLPId] = useState<string | null>(null);
  const [verificationModalData, setVerificationModalData] = useState<IntegrityCheckResult | null>(null);
  const [selectedEvidenceForDetail, setSelectedEvidenceForDetail] = useState<EvidenceItem | null>(null);
  const [showNLPSandbox, setShowNLPSandbox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleVerifyIntegrity = async (evidenceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVerifyingId(evidenceId);
    try {
      const result = await api.verifyEvidenceIntegrity(evidenceId);
      setVerificationModalData(result);
      onRefresh();
    } catch (err: any) {
      alert(`Integrity verification failed: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRunNLP = async (evidenceId: string) => {
    setProcessingNLPId(evidenceId);
    try {
      const result = await api.processEvidenceNLP(evidenceId);
      alert(`Entities Extracted: ${result.entities_count} Entities & ${result.relationships_count} Relationships linked.`);
      onRefresh();
      if (selectedEvidenceForDetail && selectedEvidenceForDetail.id === evidenceId) {
        const updated = await api.getEvidenceDetails(evidenceId);
        setSelectedEvidenceForDetail(updated);
      }
    } catch (err: any) {
      alert(`NLP Extraction failed: ${err.message}`);
    } finally {
      setProcessingNLPId(null);
    }
  };

  const filteredEvidence = evidenceList.filter(item => {
    if (statusFilter !== 'ALL' && item.evidence_status !== statusFilter) return false;
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      item.file_name.toLowerCase().includes(term) ||
      (item.evidence_code && item.evidence_code.toLowerCase().includes(term)) ||
      (item.seizing_officer && item.seizing_officer.toLowerCase().includes(term)) ||
      (item.place_of_seizure && item.place_of_seizure.toLowerCase().includes(term))
    );
  });

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'CDR': return <PhoneCall className="w-4 h-4 text-[#0369A1]" />;
      case 'FINANCIAL': return <Landmark className="w-4 h-4 text-[#16805C]" />;
      case 'FIR': return <FileText className="w-4 h-4 text-[#2563EB]" />;
      case 'INTERROGATION': return <User className="w-4 h-4 text-[#4338CA]" />;
      case 'PDF_DOCUMENT': return <FileText className="w-4 h-4 text-[#7C3AED]" />;
      default: return <FileCheck2 className="w-4 h-4 text-[#475569]" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'CURRENT_CASE_OBSERVED':
        return <Badge variant="observed">OBSERVED FACT</Badge>;
      case 'CURRENT_CASE_INFERRED':
        return <Badge variant="inferred">INFERRED LINK</Badge>;
      case 'HISTORICAL_RECORD':
        return <Badge variant="predicted">PRIOR MO</Badge>;
      default:
        return <Badge variant="slate">RAW RECORD</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED_BY_NLP':
        return <Badge variant="purple">NLP INDEXED</Badge>;
      case 'VERIFIED':
        return <Badge variant="emerald">VALID CUSTODY</Badge>;
      case 'CHALLENGED_IN_COURT':
        return <Badge variant="rose">CONTESTED</Badge>;
      case 'INADMISSIBLE':
        return <Badge variant="rose">INADMISSIBLE</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header Info */}
      <div className="workstation-panel p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#172033] font-mono tracking-wide">
              EVIDENCE FABRIC & CHAIN OF CUSTODY
            </h1>
            <Badge variant="cyan">Case {activeCase.case_number}</Badge>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Cryptographic storage locker compliant with Section 63 BSA, 2023 & Section 65B IEA.
            Every artifact is indexed with immutable SHA-256 signatures, byte offset pointers, and custody logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNLPSandbox(true)}
            className="btn-rect-secondary text-xs"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>NLP Sandbox</span>
          </button>
          <button
            onClick={onRefresh}
            className="btn-rect-secondary text-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Sync Locker</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded px-2.5 py-1.5 flex-1 max-w-md shadow-2xs">
          <Search className="w-3.5 h-3.5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence code, file, seizing officer, or location..."
            className="bg-transparent border-none outline-none text-xs text-[#172033] placeholder-[#94A3B8] w-full font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#64748B]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FFFFFF] border border-[#CBD5E1] rounded px-2.5 py-1 text-[#334155] focus:outline-none shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PROCESSED_BY_NLP">Processed by NLP</option>
            <option value="CHALLENGED_IN_COURT">Challenged in Court</option>
            <option value="INADMISSIBLE">Inadmissible</option>
          </select>
        </div>
      </div>

      {/* Evidence Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-[#64748B]">
          Auditing evidence locker artifacts...
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="p-12 text-center workstation-card rounded-lg space-y-3">
          <HardDrive className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <p className="text-xs text-[#172033] font-mono font-bold">No matching evidence found in locker</p>
          <p className="text-[11px] text-[#64748B] max-w-md mx-auto font-mono">
            Use the Multi-Modal Ingestion portal to ingest FIRs, CDR streams, or financial ledgers.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEvidence.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedEvidenceForDetail(item)}
              className="p-4 rounded-lg workstation-card border border-[#D9E0E8] hover:border-[#CBD5E1] transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-[#163A5F] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE] font-bold">
                    {item.evidence_code || 'EVID-SEC-63'}
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#334155]">
                    {getSourceIcon(item.source_type)}
                    <span>{item.source_type}</span>
                  </div>
                  {getCategoryBadge(item.evidence_category)}
                  {getStatusBadge(item.evidence_status)}
                  <Badge variant={item.integrity_status === 'VERIFIED' ? 'emerald' : 'rose'}>
                    {item.integrity_status === 'VERIFIED' ? 'SHA-256 INTACT' : 'TAMPER ALERT'}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-xs text-[#172033] truncate font-mono">{item.file_name}</span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    ({(item.file_size_bytes / 1024).toFixed(1)} KB)
                  </span>
                </div>

                {/* Cryptographic SHA-256 Digest */}
                <div className="flex items-center gap-2 bg-[#F8FAFC] px-2.5 py-1 rounded border border-[#E2E8F0] text-[10px] font-mono">
                  <Lock className="w-3 h-3 text-[#163A5F] flex-shrink-0" />
                  <span className="text-[#64748B]">SHA-256:</span>
                  <span className="text-[#163A5F] font-bold truncate select-all">{item.file_hash_sha256}</span>
                </div>

                {/* Seizure Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[#64748B]">
                  <span>IO: <span className="text-[#172033] font-semibold">{item.seizing_officer || 'Insp Rajesh Sharma'}</span></span>
                  <span>•</span>
                  <span>LOCATION: <span className="text-[#172033] font-semibold">{item.place_of_seizure || 'Cyber Crime PS'}</span></span>
                  <span>•</span>
                  <span>DATE: <span className="text-[#172033] font-semibold">{new Date(item.ingestion_timestamp).toLocaleDateString()}</span></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setSelectedEvidenceForDetail(item)}
                  className="btn-rect-secondary text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect & BSA Cert</span>
                </button>
                <button
                  onClick={(e) => handleVerifyIntegrity(item.id, e)}
                  disabled={verifyingId === item.id}
                  className="btn-rect-primary text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{verifyingId === item.id ? 'Checking...' : 'Verify Hash'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Detail Modal */}
      {selectedEvidenceForDetail && (
        <EvidenceDetailModal
          evidence={selectedEvidenceForDetail}
          onClose={() => setSelectedEvidenceForDetail(null)}
          onEvidenceUpdated={onRefresh}
          onRunNLP={handleRunNLP}
          isProcessingNLP={processingNLPId === selectedEvidenceForDetail.id}
        />
      )}

      {/* NLP Sandbox Modal */}
      {showNLPSandbox && (
        <NLPSandboxModal
          onClose={() => setShowNLPSandbox(false)}
        />
      )}
    </div>
  );
};
