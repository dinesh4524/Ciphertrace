import React, { useState } from 'react';
import { X, ShieldPlus, AlertCircle, Lock } from 'lucide-react';
import { CaseCreatePayload, CasePriority, CaseStage } from '../../types';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CaseCreatePayload) => Promise<void>;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CaseCreatePayload>({
    case_number: `CASE-${new Date().getFullYear()}-DEL-CYBER-0${Math.floor(100 + Math.random() * 900)}`,
    title: '',
    description: '',
    crime_category: 'ORGANIZED_CYBER_FRAUD',
    status: 'ACTIVE_INVESTIGATION',
    priority: 'HIGH',
    stage: 'EVIDENCE_COLLECTION',
    is_confidential: false,
    lead_investigator_id: 'IO-7492-INSP-SHARMA',
    investigating_agency: 'State Cyber Police Station / CID',
    police_station: 'Special Cyber Cell, Mandir Marg',
    district: 'New Delhi',
    state: 'Delhi',
    tags: ['hawala', 'mule_accounts', 'sim_box'],
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Case title is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register case');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim().toLowerCase()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tagToRemove) || [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden cyber-glow-cyan animate-in fade-in">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2 text-cyan-400">
            <ShieldPlus className="w-5 h-5" />
            <h2 className="font-semibold text-slate-100 text-sm tracking-wide">Register New Criminal Case</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Case Identifier / FIR Ref</label>
              <input
                type="text"
                value={formData.case_number}
                onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Investigation Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as CasePriority })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="CRITICAL">CRITICAL (High Threat Syndicate / Red Notice)</option>
                <option value="HIGH">HIGH (Major Cyber Laundering / Extortion)</option>
                <option value="MEDIUM">MEDIUM (Standard Financial Fraud)</option>
                <option value="LOW">LOW (Preliminary Enquiry / Petitions)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Crime Category</label>
              <select
                value={formData.crime_category}
                onChange={(e) => setFormData({ ...formData, crime_category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ORGANIZED_CYBER_FRAUD">Organized Cyber Fraud & Mule Network</option>
                <option value="HAWALA_MONEY_LAUNDERING">Hawala & Illegal Remittance Syndicate</option>
                <option value="NARCOTICS_TRAFFICKING">Narcotics Trafficking (NDPS)</option>
                <option value="CYBER_EXTORTION_RANSOMWARE">Cyber Extortion & Ransomware</option>
                <option value="TERROR_FINANCE_UAPA">Terror Financing & Subversion</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Initial Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as CaseStage })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="PRELIMINARY_ENQUIRY">Preliminary Enquiry</option>
                <option value="FIR_REGISTERED">FIR Registered</option>
                <option value="EVIDENCE_COLLECTION">Evidence Collection</option>
                <option value="INTERROGATION_PHASE">Interrogation & Custody</option>
                <option value="CHARGESHEET_PREPARATION">Chargesheet Preparation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Investigation Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Operation ShadowGrid: Trans-National Hawala & SIM-Box Operation"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Case Narrative / Scope</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of alleged conspiracy, involved entities, and preliminary findings..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="is-confidential"
              checked={formData.is_confidential}
              onChange={(e) => setFormData({ ...formData, is_confidential: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-800"
            />
            <label htmlFor="is-confidential" className="text-xs text-slate-300 font-medium cursor-pointer">
              Mark as <span className="text-rose-400 font-bold">Confidential / Classified</span> (Restricts access strictly to assigned team members and Senior IOs).
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Police Station</label>
              <input
                type="text"
                value={formData.police_station}
                onChange={(e) => setFormData({ ...formData, police_station: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg cyber-glow-cyan flex items-center gap-2"
            >
              {loading ? 'Registering...' : 'Register Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
