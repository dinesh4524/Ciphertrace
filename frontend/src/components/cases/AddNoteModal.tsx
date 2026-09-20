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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0f172a] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden cyber-glow-cyan animate-in fade-in">
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <MessageSquarePlus className="w-5 h-5" />
            <span>Record Case Ledger Note / Directive</span>
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
              Note Category / Nature
            </label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Note Headline / Subject
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Section 91 Notices Served to Nodal Banks"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Narrative & Evidence Cross-References
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter investigative details, suspect admissions, account freeze references, or next step milestones..."
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
              {loading ? 'Recording...' : 'Record to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
