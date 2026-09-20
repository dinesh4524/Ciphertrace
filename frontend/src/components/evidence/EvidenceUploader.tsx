import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  PhoneCall, 
  Landmark, 
  FileCheck2, 
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { SourceType, EvidenceCategory, Case } from '../../types';
import { api } from '../../services/api';

interface EvidenceUploaderProps {
  activeCase: Case;
  onUploadSuccess: () => void;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({ activeCase, onUploadSuccess }) => {
  const [sourceType, setSourceType] = useState<SourceType>('CDR');
  const [evidenceCategory, setEvidenceCategory] = useState<EvidenceCategory>('CURRENT_CASE_OBSERVED');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Provenance fields
  const [seizingOfficer, setSeizingOfficer] = useState('');
  const [placeOfSeizure, setPlaceOfSeizure] = useState('');
  const [witnessDetails, setWitnessDetails] = useState('');
  const [forensicTool, setForensicTool] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a file to ingest.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadResult(null);

    const provenance = {
      seizing_officer: seizingOfficer || undefined,
      place_of_seizure: placeOfSeizure || undefined,
      witness_details: witnessDetails || undefined,
      forensic_extraction_tool: forensicTool || undefined,
      device_serial_or_imei: deviceSerial || undefined,
    };

    try {
      let result;
      if (sourceType === 'CDR') {
        result = await api.uploadCDR(activeCase.id, file, evidenceCategory);
      } else if (sourceType === 'FINANCIAL') {
        result = await api.uploadFinancial(activeCase.id, file, evidenceCategory);
      } else if (sourceType === 'FIR') {
        result = await api.uploadFIR(activeCase.id, file, evidenceCategory);
      } else {
        result = await api.uploadGenericEvidence(activeCase.id, sourceType, file, evidenceCategory, provenance);
      }

      setUploadResult(result);
      setFile(null);
      setSeizingOfficer('');
      setPlaceOfSeizure('');
      setWitnessDetails('');
      setForensicTool('');
      setDeviceSerial('');
      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ingestion failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl cyber-glass border border-slate-800">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-cyan-400" />
          Evidence Fabric Ingestion & Provenance Portal
        </h2>
        <p className="text-xs text-slate-400">
          Anchor digital, telecom, financial, or documentary artifacts to Case{' '}
          <span className="font-mono text-cyan-400 font-semibold">{activeCase.case_number}</span>.
          Every byte is cryptographically hashed with SHA-256 upon ingress.
        </p>

        <form onSubmit={handleUpload} className="mt-6 space-y-5">
          {/* Source Type Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
              Select Evidence Source Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'CDR' as const, label: 'Call Records (CDR/IPDR)', icon: PhoneCall },
                { id: 'FINANCIAL' as const, label: 'Bank / Hawala Ledger', icon: Landmark },
                { id: 'FIR' as const, label: 'FIR / Complaint (JSON/TXT)', icon: FileText },
                { id: 'PDF_DOCUMENT' as const, label: 'PDF Document / Report', icon: FileText },
                { id: 'DIGITAL_FORENSICS' as const, label: 'Device / UFED Image', icon: Smartphone },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = sourceType === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setSourceType(item.id);
                      setUploadResult(null);
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 cyber-glow-cyan'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ethical Evidence Classification */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase text-slate-300 font-semibold">
                Evidentiary Classification & Category
              </label>
              <span className="text-[11px] font-mono text-slate-500">Legal Boundary Safeguard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                {
                  id: 'CURRENT_CASE_OBSERVED' as const,
                  title: 'Observed Evidence',
                  desc: 'Direct facts from current case CDRs, bank statements, seizure memos',
                  color: 'border-cyan-800 bg-cyan-950/30 text-cyan-300',
                },
                {
                  id: 'CURRENT_CASE_INFERRED' as const,
                  title: 'Inferred Analysis',
                  desc: 'Analytically derived links or intelligence deductions',
                  color: 'border-purple-800 bg-purple-950/30 text-purple-300',
                },
                {
                  id: 'HISTORICAL_RECORD' as const,
                  title: 'Historical Record',
                  desc: 'Prior dossier / MO comparison ONLY (Never presumed current guilt)',
                  color: 'border-amber-800 bg-amber-950/30 text-amber-300',
                },
                {
                  id: 'OSINT_UNVERIFIED' as const,
                  title: 'OSINT Unverified',
                  desc: 'Open source or public web leads requiring corroboration',
                  color: 'border-slate-700 bg-slate-800/40 text-slate-300',
                },
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setEvidenceCategory(cat.id)}
                  className={`p-3 rounded-lg border text-left space-y-1 transition-all ${
                    evidenceCategory === cat.id
                      ? `border-cyan-400 ${cat.color} ring-1 ring-cyan-500`
                      : 'border-slate-800/80 bg-slate-900/30 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{cat.title}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 63 BSA Provenance Details Inputs */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Chain of Custody & Seizure Details (Section 63 BSA 2023)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Seizing Officer</label>
                <input
                  type="text"
                  value={seizingOfficer}
                  onChange={(e) => setSeizingOfficer(e.target.value)}
                  placeholder="e.g. Inspector Imran Khan"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Place of Seizure</label>
                <input
                  type="text"
                  value={placeOfSeizure}
                  onChange={(e) => setPlaceOfSeizure(e.target.value)}
                  placeholder="e.g. Sector 62, Cyber Hub, Noida"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Extraction Tool</label>
                <input
                  type="text"
                  value={forensicTool}
                  onChange={(e) => setForensicTool(e.target.value)}
                  placeholder="e.g. Cellebrite UFED / EnCase"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Device IMEI / Serial</label>
                <input
                  type="text"
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                  placeholder="e.g. 861234567890123"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 text-[11px] block mb-1">Witness & Panchnama Details</label>
                <input
                  type="text"
                  value={witnessDetails}
                  onChange={(e) => setWitnessDetails(e.target.value)}
                  placeholder="e.g. Witness 1, Witness 2 with Badge/Aadhaar IDs"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-xl p-8 text-center bg-slate-900/30 transition-all">
            <input
              type="file"
              id="evidence-file-input"
              className="hidden"
              onChange={handleFileChange}
              accept=".csv,.json,.txt,.log,.pdf"
            />
            <label htmlFor="evidence-file-input" className="cursor-pointer block space-y-2">
              <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto" />
              <div className="text-xs text-slate-200">
                {file ? (
                  <span className="font-mono text-cyan-300 font-semibold">{file.name}</span>
                ) : (
                  <>
                    <span className="text-cyan-400 underline">Click to select</span> or drag evidence file here
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Supported: CSV (CDRs/Transactions), JSON (FIR/OSINT), TXT/PDF (Interrogations/Documents)
              </p>
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs rounded-xl shadow-lg cyber-glow-cyan flex items-center gap-2 transition-all"
            >
              {isUploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Hashing & Anchoring Evidence...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  <span>Ingest & Anchor to Fabric</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Ingestion Result Card */}
        {uploadResult && (
          <div className="mt-6 p-4 rounded-xl bg-cyan-950/30 border border-cyan-700/60 text-slate-200 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Evidence Artifact Ingested & Anchored Successfully</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-cyan-900/60">
              <div>
                <span className="text-slate-500">Evidence Code: </span>
                <span className="text-cyan-300 font-bold">{uploadResult.evidence_code || uploadResult.id}</span>
              </div>
              <div>
                <span className="text-slate-500">Source: </span>
                <span className="text-cyan-300">{uploadResult.source_type}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">SHA-256 Hash: </span>
                <span className="text-emerald-400 break-all">{uploadResult.file_hash_sha256}</span>
              </div>
              {uploadResult.extracted_records_count !== undefined && (
                <div>
                  <span className="text-slate-500">Extracted Records: </span>
                  <span className="text-cyan-300 font-bold">{uploadResult.extracted_records_count} rows</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
