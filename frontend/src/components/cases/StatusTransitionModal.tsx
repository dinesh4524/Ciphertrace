import React, { useState } from 'react';
import { X, GitCommit, AlertCircle, ShieldCheck } from 'lucide-react';
import { Case, CaseStatus, CaseStage } from '../../types';
import { api } from '../../services/api';

interface StatusTransitionModalProps {
  isOpen: boolean;
  activeCase: Case;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export const StatusTransitionModal: React.FC<StatusTransitionModalProps> = ({
  isOpen,
  activeCase,
  onClose,
  onStatusUpdated,
}) => {
  const [status, setStatus] = useState<CaseStatus>(activeCase.status);
  const [stage, setStage] = useState<CaseStage>(activeCase.stage);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.updateCaseStatus(activeCase.id, status, stage, reason);
      onStatusUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update case status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white border border-[#D9E0E8] rounded shadow-2xl overflow-hidden animate-in fade-in">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#D9E0E8] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#163A5F] font-semibold text-sm">
            <GitCommit className="w-4 h-4" />
            <span>Case Workflow Transition</span>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#172033]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-rose-50 border border-rose-200 text-[#C53030] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-[#64748B] mb-1">
              New Case Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
            >
              <option value="ACTIVE_INVESTIGATION">Active Investigation</option>
              <option value="UNDER_REVIEW">Under Supervisory Review (ACP / SP)</option>
              <option value="CHARGESHEETED">Chargesheet Filed in Court</option>
              <option value="CLOSED">Case Closed / Disposed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#64748B] mb-1">
              Investigation Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as CaseStage)}
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
            >
              <option value="PRELIMINARY_ENQUIRY">Preliminary Enquiry</option>
              <option value="FIR_REGISTERED">FIR Formally Registered</option>
              <option value="EVIDENCE_COLLECTION">Evidence Fabric Collection & Ingestion</option>
              <option value="INTERROGATION_PHASE">Custodial Questioning & Interrogation</option>
              <option value="CHARGESHEET_PREPARATION">Chargesheet Preparation & Final Report</option>
              <option value="TRIAL">Trial in Session Court</option>
              <option value="CLOSED">Disposed / Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#64748B] mb-1">
              Supervisory Reason / Transition Order
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide justification or executive directive recorded to the immutable ledger..."
              className="w-full bg-white border border-[#D9E0E8] rounded p-3 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#163A5F] resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#D9E0E8]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs"
            >
              {loading ? 'Transitioning...' : 'Confirm Transition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
