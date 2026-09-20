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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white border border-[#D9E0E8] rounded shadow-2xl overflow-hidden animate-in fade-in">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#D9E0E8] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#163A5F] font-semibold text-sm">
            <UserPlus className="w-4 h-4" />
            <span>Assign Investigation Team Member</span>
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
              Select Officer / Analyst
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role} - {u.badge_number || u.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#64748B] mb-1">
              Designation in this Case
            </label>
            <select
              value={roleInCase}
              onChange={(e) => setRoleInCase(e.target.value)}
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
            >
              <option value="LEAD_INVESTIGATOR">Lead Investigating Officer (IO)</option>
              <option value="ASSISTANT_IO">Assistant Investigating Officer</option>
              <option value="FORENSIC_LEAD">Digital Forensics & CDR Specialist</option>
              <option value="LEGAL_COUNSEL">Prosecution & Legal Reviewer</option>
              <option value="INTELLIGENCE_OFFICER">Crime Pattern & Intelligence Analyst</option>
            </select>
          </div>

          <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#163A5F] text-xs font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#16805C]" />
            <span>Grants Case-Level Access & Write Privileges for {activeCase.case_number}.</span>
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
              {loading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
