import React, { useState } from 'react';
import { 
  X, 
  ShieldPlus, 
  AlertCircle, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Users, 
  Shield, 
  UploadCloud,
  FileCheck2
} from 'lucide-react';
import { CaseCreatePayload, CasePriority, CaseStage } from '../../types';
import { Badge } from '../common/Badge';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CaseCreatePayload) => Promise<void>;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<CaseCreatePayload>({
    case_number: `CTX-${new Date().getFullYear()}-CYB-0${Math.floor(100 + Math.random() * 900)}`,
    title: '',
    description: '',
    crime_category: 'ORGANIZED_CYBER_FRAUD',
    status: 'ACTIVE_INVESTIGATION',
    priority: 'HIGH',
    stage: 'EVIDENCE_COLLECTION',
    is_confidential: false,
    lead_investigator_id: 'IO-7492-INSP-SHARMA',
    investigating_agency: 'State Cyber Police Station / CID',
    police_station: 'Special Cyber Crime PS, Mandir Marg',
    district: 'New Delhi',
    state: 'Delhi',
    tags: ['hawala', 'mule_accounts', 'sim_box'],
  });

  // Step 2 state: Initial Evidence
  const [initialEvidenceName, setInitialEvidenceName] = useState('FIR_Primary_Complaint.pdf');
  const [initialEvidenceType, setInitialEvidenceType] = useState('FIR_DOCUMENT');
  const [initialEvidenceNotes, setInitialEvidenceNotes] = useState('Initial FIR filed regarding illegal trans-border Hawala syndicate & SIM-box routing.');

  // Step 3 state: Assigned Access
  const [assignedTeam, setAssignedTeam] = useState<string[]>([
    'investigator_sharma',
    'forensic_dr_deshmukh',
    'legal_advocate_iyer'
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1) {
      if (!formData.title.trim()) {
        setError('Case title is required to register an investigation.');
        return;
      }
    }
    setError(null);
    setStep((prev) => (prev < 4 ? ((prev + 1) as any) : prev));
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register investigation case.');
    } finally {
      setLoading(false);
    }
  };

  const teamOptions = [
    { id: 'investigator_sharma', name: 'Insp Rajesh Sharma', role: 'Lead IO' },
    { id: 'supervisor_verma', name: 'ACP Surender Verma', role: 'Supervisory ACP' },
    { id: 'legal_advocate_iyer', name: 'Adv Priya Iyer', role: 'Legal Prosecutor' },
    { id: 'forensic_dr_deshmukh', name: 'Dr. Anand Deshmukh', role: 'Forensic Lead' },
    { id: 'intel_patel', name: 'Kiran Patel', role: 'Intel Analyst' },
  ];

  const toggleTeamMember = (id: string) => {
    if (assignedTeam.includes(id)) {
      setAssignedTeam(assignedTeam.filter(t => t !== id));
    } else {
      setAssignedTeam([...assignedTeam, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg shadow-xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-[#D9E0E8] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2 text-[#163A5F] font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldPlus className="w-4 h-4" />
            <span>Register New Investigation Case</span>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#172033] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-2.5 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded font-bold ${step === 1 ? 'bg-[#163A5F] text-white' : 'text-[#64748B]'}`}>
              1. Case Info
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span className={`px-2.5 py-0.5 rounded font-bold ${step === 2 ? 'bg-[#163A5F] text-white' : 'text-[#64748B]'}`}>
              2. Initial Evidence
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span className={`px-2.5 py-0.5 rounded font-bold ${step === 3 ? 'bg-[#163A5F] text-white' : 'text-[#64748B]'}`}>
              3. Access & Team
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span className={`px-2.5 py-0.5 rounded font-bold ${step === 4 ? 'bg-[#163A5F] text-white' : 'text-[#64748B]'}`}>
              4. Review Summary
            </span>
          </div>
          <span className="text-[#64748B]">Step {step} of 4</span>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-[#FEF2F2] border border-[#F87171] text-[#991B1B] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
          {/* STEP 1: CASE INFORMATION */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Case ID / Reference</label>
                  <input
                    type="text"
                    value={formData.case_number}
                    onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#163A5F] font-bold focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Investigation Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as CasePriority })}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="CRITICAL">CRITICAL (Red Notice / Major Syndicate)</option>
                    <option value="HIGH">HIGH (Major Cyber Hawala / Siphoning)</option>
                    <option value="MEDIUM">MEDIUM (Standard Financial Fraud)</option>
                    <option value="LOW">LOW (Preliminary Petition)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Investigation Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Operation Shadow Exchange — Transnational Siphoning Network"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Crime Category</label>
                  <select
                    value={formData.crime_category}
                    onChange={(e) => setFormData({ ...formData, crime_category: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="ORGANIZED_CYBER_FRAUD">Organized Cyber Fraud & Mule Network</option>
                    <option value="HAWALA_MONEY_LAUNDERING">Hawala & Illegal Remittance Syndicate</option>
                    <option value="TELECOM_FRAUD">Telecom / SIM Box Operation</option>
                    <option value="CYBER_EXTORTION_RANSOMWARE">Cyber Extortion & Ransomware</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Assigned Lead Investigator</label>
                  <input
                    type="text"
                    value={formData.lead_investigator_id}
                    onChange={(e) => setFormData({ ...formData, lead_investigator_id: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Case Narrative / Brief</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of allegations, preliminary intelligence, and scope of inquiry..."
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] resize-none font-sans"
                />
              </div>
            </div>
          )}

          {/* STEP 2: INITIAL EVIDENCE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-2">
                <div className="flex items-center gap-2 text-[#163A5F] text-xs font-bold uppercase">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Attach Initial Evidence Document</span>
                </div>
                <p className="text-[11px] text-[#64748B] font-sans">
                  Attach initial FIR complaint or CDR intake report. An automated SHA-256 hash stamp will be registered under Section 63 BSA upon case initialization.
                </p>
              </div>

              <div>
                <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Evidence Artifact Title</label>
                <input
                  type="text"
                  value={initialEvidenceName}
                  onChange={(e) => setInitialEvidenceName(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Evidence Type</label>
                  <select
                    value={initialEvidenceType}
                    onChange={(e) => setInitialEvidenceType(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="FIR_DOCUMENT">FIR / Police Complaint PDF</option>
                    <option value="CDR_EXCEL">Telecom CDR Records (.csv/.xlsx)</option>
                    <option value="BANK_STATEMENT">Bank Statement Ledger (.csv)</option>
                    <option value="LOCATION_LOG">Cell Tower Location Dump</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Integrity Hashing</label>
                  <div className="px-3 py-2 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] text-[#16805C] font-bold">
                    Auto SHA-256 Hash Digest
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#475569] uppercase text-[10px] mb-1 font-semibold">Evidence Notes / Source Provenance</label>
                <textarea
                  rows={2}
                  value={initialEvidenceNotes}
                  onChange={(e) => setInitialEvidenceNotes(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#2563EB] resize-none font-sans"
                />
              </div>
            </div>
          )}

          {/* STEP 3: ACCESS & ROLES */}
          {step === 3 && (
            <div className="space-y-3.5">
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-1">
                <div className="flex items-center gap-2 text-[#163A5F] text-xs font-bold uppercase">
                  <Users className="w-4 h-4" />
                  <span>Assign Authorized Investigation Team</span>
                </div>
                <p className="text-[11px] text-[#64748B] font-sans">
                  Select personnel authorized to access, process, and challenge evidence within this case ledger.
                </p>
              </div>

              <div className="space-y-2">
                {teamOptions.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => toggleTeamMember(member.id)}
                    className={`p-2.5 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                      assignedTeam.includes(member.id)
                        ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1E40AF]'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-[#172033]">{member.name}</div>
                      <div className="text-[10px] text-[#64748B]">{member.role}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={assignedTeam.includes(member.id)}
                      readOnly
                      className="rounded border-[#CBD5E1] text-[#2563EB]"
                    />
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confidential-check"
                  checked={formData.is_confidential}
                  onChange={(e) => setFormData({ ...formData, is_confidential: e.target.checked })}
                  className="rounded border-[#CBD5E1] text-[#2563EB]"
                />
                <label htmlFor="confidential-check" className="text-xs text-[#334155] font-medium cursor-pointer font-sans">
                  Restricted / Classified Case (Strict Isolation Mode)
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] space-y-3">
                <div className="text-xs font-bold text-[#172033] font-mono uppercase pb-2 border-b border-[#E2E8F0]">
                  Investigation Registration Dossier
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748B]">Case Identifier:</span>
                    <div className="text-[#163A5F] font-bold">{formData.case_number}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Priority:</span>
                    <div className="text-[#B7791F] font-bold">{formData.priority}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#64748B]">Title:</span>
                    <div className="text-[#172033] font-sans font-semibold">{formData.title}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Initial Evidence:</span>
                    <div className="text-[#16805C] font-bold">1 Document Attached</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Authorized Personnel:</span>
                    <div className="text-[#172033] font-bold">{assignedTeam.length} Officers Assigned</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#16805C] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Ready to register in secure institutional ledger. You will be redirected to Case Detail.</span>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="btn-rect-secondary text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="btn-rect-ghost text-xs"
              >
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-rect-primary text-xs flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-rect-primary text-xs flex items-center gap-2"
              >
                <ShieldPlus className="w-3.5 h-3.5" />
                <span>{loading ? 'Registering Case...' : 'Create Case & Open Detail'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
