import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, AlertCircle, ShieldCheck } from 'lucide-react';
import { User, Case } from '../../types';
import { api } from '../../services/api';

interface AssignTeamModalProps {
  isOpen: boolean;
  activeCase: Case;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignTeamModal: React.FC<AssignTeamModalProps> = ({
  isOpen,
  activeCase,
  onClose,
  onAssigned
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [roleInCase, setRoleInCase] = useState<string>('ASSISTANT_IO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.listUsers().then((data) => {
        setUsers(data);
        if (data.length > 0) setSelectedUserId(data[0].id);
      }).catch((err) => setError(err.message));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select an officer to assign.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.assignTeamMember(activeCase.id, selectedUserId, roleInCase);
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden cyber-glow-cyan animate-in fade-in">
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <UserPlus className="w-5 h-5" />
            <span>Assign Investigation Team Member</span>
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
              Select Officer / Analyst
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role} - {u.badge_number || u.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Designation in this Case
            </label>
            <select
              value={roleInCase}
              onChange={(e) => setRoleInCase(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="LEAD_INVESTIGATOR">Lead Investigating Officer (IO)</option>
              <option value="ASSISTANT_IO">Assistant Investigating Officer</option>
              <option value="FORENSIC_LEAD">Digital Forensics & CDR Specialist</option>
              <option value="LEGAL_COUNSEL">Prosecution & Legal Reviewer</option>
              <option value="INTELLIGENCE_OFFICER">Crime Pattern & Intelligence Analyst</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/60 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-cyan-400" />
            <span>Grants Case-Level Access & Write Privileges for {activeCase.case_number}.</span>
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
              {loading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
