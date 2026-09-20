import React, { useState } from 'react';
import { X, FileEdit, AlertCircle, MessageSquarePlus } from 'lucide-react';
import { Case } from '../../types';
import { api } from '../../services/api';

interface AddNoteModalProps {
  isOpen: boolean;
  activeCase: Case;
  onClose: () => void;
  onNoteAdded: () => void;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  activeCase,
  onClose,
  onNoteAdded,
}) => {
  const [noteType, setNoteType] = useState('FIELD_REPORT');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.addCaseNote(activeCase.id, noteType, title, content);
      onNoteAdded();
      onClose();
      setTitle('');
      setContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to record case note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border border-[#D9E0E8] rounded shadow-2xl overflow-hidden animate-in fade-in">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#D9E0E8] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#163A5F] font-semibold text-sm">
            <MessageSquarePlus className="w-4 h-4" />
            <span>Record Case Ledger Note / Directive</span>
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
              Note Category / Nature
            </label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
            >
              <option value="FIELD_REPORT">Investigator Field Report / Raid Memo</option>
              <option value="SUPERVISORY_DIRECTIVE">Supervisory Directive / ACP Order</option>
              <option value="HYPOTHESIS">Investigative Hypothesis / Theory</option>
              <option value="LEGAL_OPINION">Legal & Statutory Provision Review</option>
              <option value="FORENSIC_MEMO">Digital Forensics / CDR Finding Memo</option>
              <option value="GENERAL">General Operational Note</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#64748B] mb-1">
              Note Headline / Subject
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Section 91 Notices Served to Nodal Banks"
              className="w-full bg-white border border-[#D9E0E8] rounded px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#64748B] mb-1">
              Narrative & Evidence Cross-References
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter investigative details, suspect admissions, account freeze references, or next step milestones..."
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
              {loading ? 'Recording...' : 'Record to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
