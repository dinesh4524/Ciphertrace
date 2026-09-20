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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden cyber-glow-cyan animate-in fade-in">
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <GitCommit className="w-5 h-5" />
            <span>Case Workflow Transition</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              New Case Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ACTIVE_INVESTIGATION">Active Investigation</option>
              <option value="UNDER_REVIEW">Under Supervisory Review (ACP / SP)</option>
              <option value="CHARGESHEETED">Chargesheet Filed in Court</option>
              <option value="CLOSED">Case Closed / Disposed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Investigation Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as CaseStage)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Supervisory Reason / Transition Order
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide justification or executive directive recorded to the immutable ledger..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs rounded-lg shadow-lg cyber-glow-cyan"
            >
              {loading ? 'Transitioning...' : 'Confirm Transition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
