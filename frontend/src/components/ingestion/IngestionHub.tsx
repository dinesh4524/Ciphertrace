import React, { useState } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  FileSpreadsheet, 
  PhoneCall, 
  Landmark, 
  FileText, 
  MessageSquareText, 
  CheckCircle2, 
  AlertCircle,
  Database
} from 'lucide-react';
import { Case } from '../../types';
import { EvidenceUploader } from '../evidence/EvidenceUploader';
import { Badge } from '../common/Badge';

interface IngestionHubProps {
  activeCase: Case | null;
  onIngestSuccess: () => void;
}

export const IngestionHub: React.FC<IngestionHubProps> = ({ activeCase, onIngestSuccess }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'interrogation' | 'demo'>('upload');
  
  // Interrogation form state
  const [suspectName, setSuspectName] = useState('');
  const [roleInCase, setRoleInCase] = useState('SUSPECT');
  const [interrogator, setInterrogator] = useState('IO Insp Sharma');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInterrogationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    if (!suspectName.trim() || !transcript.trim()) {
      setErrorMsg('Suspect name and transcript are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('raw_transcript', transcript);

      const query = new URLSearchParams({
        case_id: activeCase.id,
        suspect_name: suspectName,
        role_in_case: roleInCase,
        interrogating_officer: interrogator,
      });

      const res = await fetch(`/api/v1/ingest/interrogation?${query.toString()}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Interrogation ingestion failed: ${res.statusText}`);
      const data = await res.json();
      setSuccessMsg(`Interrogation statement for ${suspectName} registered into Evidence Fabric (SHA-256: ${data.data.file_hash_sha256.substring(0, 16)}...)`);
      setSuspectName('');
      setTranscript('');
      onIngestSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoDataset = async (type: 'cdr' | 'financial' | 'fir' | 'interrogation') => {
    if (!activeCase) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let endpoint = '';
      let filename = '';
      let content = '';
      let mimeType = 'text/csv';

      if (type === 'cdr') {
        endpoint = '/api/v1/ingest/cdr/upload';
        filename = 'sample_cdr_delhi_telecom.csv';
        content = `calling_number,called_number,imei,imsi,call_type,start_time,duration_sec,cell_tower_id,latitude,longitude,provider
+919876543210,+919811122233,864321045678901,404450123456789,VOICE_CALL,2026-03-10 14:22:15,184,TOWER_DEL_CONN_042,28.6328,77.2197,Airtel
+919811122233,+919844455566,864321045678902,404450123456790,VOICE_CALL,2026-03-10 14:45:02,320,TOWER_NOI_SEC62_018,28.6280,77.3649,Jio
+919844455566,+919700011122,864321045678903,404450123456791,SMS,2026-03-10 15:10:40,0,TOWER_GUR_CYBER_105,28.4986,77.0878,Vi
+919876543210,+919999988888,864321045678901,404450123456789,VOICE_CALL,2026-03-10 16:02:11,540,TOWER_DEL_CONN_042,28.6328,77.2197,Airtel`;
      } else if (type === 'financial') {
        endpoint = '/api/v1/ingest/financial/upload';
        filename = 'sample_mule_transactions.csv';
        content = `sender_account,receiver_account,sender_bank,receiver_bank,amount,txn_type,utr_reference,timestamp,channel,remarks
HDFC-99210045,SBI-44332211,HDFC Bank,State Bank of India,250000.00,IMPS,UTR20260310HDFC001,2026-03-10 14:30:00,MOBILE_BANKING,Settlement batch alpha
SBI-44332211,ICICI-11009988,State Bank of India,ICICI Bank,120000.00,UPI,UTR20260310SBI002,2026-03-10 14:50:00,UPI_APP,Token disbursement
SBI-44332211,AXIS-88776655,State Bank of India,Axis Bank,125000.00,NEFT,UTR20260310SBI003,2026-03-10 15:05:00,NET_BANKING,Consignment remittance`;
      } else if (type === 'fir') {
        endpoint = '/api/v1/ingest/fir/upload';
        filename = 'sample_cyber_fir_001.json';
        mimeType = 'application/json';
        content = JSON.stringify({
          fir_number: "FIR/2026/CYBER-DEL/0142",
          police_station: "Special Cyber Cell, Mandir Marg",
          district: "New Delhi",
          state: "Delhi",
          sections_invoked: ["BNS Section 318(4)", "BNS Section 111", "IT Act Section 66D"],
          incident_date: "2026-03-08 11:30:00",
          filing_date: "2026-03-09 10:15:00",
          informant_narrative: "Victim reported corporate treasury spoofing and siphon to multiple mule accounts."
        }, null, 2);
      }

      const file = new File([content], filename, { type: mimeType });
      const formData = new FormData();
      formData.append('case_id', activeCase.id);
      formData.append('evidence_category', 'CURRENT_CASE_OBSERVED');
      formData.append('file', file);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Demo dataset injection failed: ${res.statusText}`);
      const data = await res.json();
      setSuccessMsg(`Demo ${type.toUpperCase()} dataset successfully ingested and anchored with SHA-256 hash!`);
      onIngestSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeCase) {
    return (
      <div className="p-12 text-center bg-white rounded border border-[#D9E0E8] space-y-2 shadow-xs">
        <Database className="w-8 h-8 text-[#94A3B8] mx-auto" />
        <p className="text-xs text-[#172033] font-medium">No Case Selected</p>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Please select or register a case from the Case Registry before ingesting evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-nav tabs */}
      <div className="flex border-b border-[#D9E0E8] gap-4 text-xs">
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'upload'
              ? 'border-[#163A5F] text-[#163A5F]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>File Ingestion Portal</span>
        </button>
        <button
          onClick={() => setActiveTab('interrogation')}
          className={`pb-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'interrogation'
              ? 'border-[#163A5F] text-[#163A5F]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <MessageSquareText className="w-4 h-4" />
          <span>Interrogation / Deposition Memo</span>
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`pb-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'demo'
              ? 'border-[#163A5F] text-[#163A5F]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#163A5F]" />
          <span>Synthetic / Demo Injector</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded bg-[#ECFDF5] border border-[#16805C] text-[#16805C] text-xs flex items-center gap-2 shadow-xs font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#16805C]" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#C53030] text-xs flex items-center gap-2 shadow-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#C53030]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeTab === 'upload' && (
        <EvidenceUploader activeCase={activeCase} onUploadSuccess={onIngestSuccess} />
      )}

      {activeTab === 'interrogation' && (
        <div className="p-5 rounded bg-white border border-[#D9E0E8] space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-[#172033]">Record Interrogation or Witness Statement</h2>
            <p className="text-xs text-[#64748B]">
              Preserves verbatim statements, admissions, and named co-conspirators in the evidentiary fabric.
            </p>
          </div>

          <form onSubmit={handleInterrogationSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#172033] mb-1">Suspect / Witness Name</label>
                <input
                  type="text"
                  value={suspectName}
                  onChange={(e) => setSuspectName(e.target.value)}
                  placeholder="e.g., Tariq Ahmed @ Tiger"
                  className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-1.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#172033] mb-1">Role in Case</label>
                <select
                  value={roleInCase}
                  onChange={(e) => setRoleInCase(e.target.value)}
                  className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
                >
                  <option value="SUSPECT">Suspect / Accused</option>
                  <option value="CO_ACCUSED">Co-Accused</option>
                  <option value="WITNESS">Witness / Deponent</option>
                  <option value="INFORMANT">Confidential Informant</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#172033] mb-1">Interrogating Officer</label>
                <input
                  type="text"
                  value={interrogator}
                  onChange={(e) => setInterrogator(e.target.value)}
                  className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-1.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#172033] mb-1">Verbatim Statement / Transcript</label>
              <textarea
                rows={6}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Enter suspect disclosure, admitted bank accounts, phone numbers used, and meeting locations..."
                className="w-full bg-white border border-[#D9E0E8] rounded p-3 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F] resize-none font-mono"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs"
              >
                {loading ? 'Anchoring...' : 'Anchor Statement to Fabric'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'demo' && (
        <div className="p-5 rounded bg-white border border-[#D9E0E8] space-y-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#163A5F]" />
              <h2 className="text-base font-bold text-[#172033]">1-Click Synthetic Demo Dataset Injector</h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Inject realistic multi-source synthetic criminal intelligence data into Case{' '}
              <span className="font-mono text-[#163A5F] font-semibold">{activeCase.case_number}</span> to test
              parsers, SHA-256 cryptographic verification, and the Evidence Fabric.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#2563EB] text-xs font-semibold mb-1">
                  <PhoneCall className="w-4 h-4" />
                  <span>Delhi CDR Swarm (4 Calls)</span>
                </div>
                <p className="text-xs text-[#64748B]">
                  Call records with IMEIs, IMSIs, cell tower IDs, and Delhi/Noida/Gurgaon coordinates.
                </p>
              </div>
              <button
                onClick={() => handleLoadDemoDataset('cdr')}
                disabled={loading}
                className="btn-secondary text-xs w-full"
              >
                Inject CDR Dataset
              </button>
            </div>

            <div className="p-4 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#16805C] text-xs font-semibold mb-1">
                  <Landmark className="w-4 h-4" />
                  <span>Mule & Hawala Flow (3 Txns)</span>
                </div>
                <p className="text-xs text-[#64748B]">
                  Bank transaction records showing multi-hop layering between HDFC, SBI, and Axis mule accounts.
                </p>
              </div>
              <button
                onClick={() => handleLoadDemoDataset('financial')}
                disabled={loading}
                className="btn-secondary text-xs w-full"
              >
                Inject Banking Ledger
              </button>
            </div>

            <div className="p-4 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#163A5F] text-xs font-semibold mb-1">
                  <FileText className="w-4 h-4" />
                  <span>BNS / IT Act FIR JSON</span>
                </div>
                <p className="text-xs text-[#64748B]">
                  Structured FIR document invoking BNS Section 318(4) [Cheating] & 111 [Organized Crime].
                </p>
              </div>
              <button
                onClick={() => handleLoadDemoDataset('fir')}
                disabled={loading}
                className="btn-secondary text-xs w-full"
              >
                Inject FIR Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
