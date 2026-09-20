import React, { useState, useEffect } from 'react';
import { 
  Network, 
  ArrowRight, 
  RotateCw, 
  Search, 
  Link2, 
  PhoneForwarded, 
  ArrowRightLeft, 
  Smartphone, 
  CreditCard, 
  Scale, 
  MapPin 
} from 'lucide-react';
import { Case, ExtractedRelationship } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface RelationshipMatrixProps {
  activeCase: Case;
}

export const RelationshipMatrix: React.FC<RelationshipMatrixProps> = ({ activeCase }) => {
  const [relationships, setRelationships] = useState<ExtractedRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRelType, setSelectedRelType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRelationships = async () => {
    setLoading(true);
    try {
      const typeParam = selectedRelType === 'ALL' ? undefined : selectedRelType;
      const data = await api.getCaseRelationships(activeCase.id, typeParam);
      setRelationships(data);
    } catch (err: any) {
      console.error('Failed to fetch relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, [activeCase.id, selectedRelType]);

  const filtered = relationships.filter(rel => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      rel.source_value.toLowerCase().includes(term) ||
      rel.target_value.toLowerCase().includes(term) ||
      rel.relationship_type.toLowerCase().includes(term) ||
      (rel.context_snippet && rel.context_snippet.toLowerCase().includes(term))
    );
  });

  const getRelIcon = (type: string) => {
    switch (type) {
      case 'CALLS_TO':
        return <PhoneForwarded className="w-3.5 h-3.5 text-cyan-400" />;
      case 'TRANSFERS_FUNDS_TO':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />;
      case 'USES_PHONE_NUMBER':
        return <Link2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'OPERATES_HANDSET_DEVICE':
        return <Smartphone className="w-3.5 h-3.5 text-purple-400" />;
      case 'CONTROLS_BANK_ACCOUNT':
        return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
      case 'BOOKED_UNDER_SECTION':
        return <Scale className="w-3.5 h-3.5 text-rose-400" />;
      case 'OPERATES_IN_LOCATION':
        return <MapPin className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Network className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const relCategories = [
    { id: 'ALL', label: 'All Links' },
    { id: 'USES_PHONE_NUMBER', label: 'Uses Phone' },
    { id: 'OPERATES_HANDSET_DEVICE', label: 'Operates Handset' },
    { id: 'CONTROLS_BANK_ACCOUNT', label: 'Controls Bank Account' },
    { id: 'TRANSFERS_FUNDS_TO', label: 'Fund Transfers' },
    { id: 'BOOKED_UNDER_SECTION', label: 'Booked Under Section' },
    { id: 'OPERATES_IN_LOCATION', label: 'Location Links' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl cyber-glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white tracking-wide">Extracted Relationship Matrix</h1>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
              {relationships.length} Inferred & Observed Links
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Co-occurrence associations and evidentiary links inferred across suspect persons, phone numbers,
            hardware IMEIs, mule bank accounts, and criminal statutes.
          </p>
        </div>
        <button
          onClick={fetchRelationships}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-all"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Links</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search source entity, target entity, or relationship..."
            className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white text-xs">
              &times;
            </button>
          )}
        </div>

        {/* Category Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {relCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedRelType(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedRelType === cat.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Relationship Cards Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Reconstructing entity linkage topology...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center cyber-glass rounded-2xl border border-slate-800 space-y-3">
          <Network className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">No extracted relationships found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Process evidence documents containing co-occurring suspects, phones, or bank transfers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rel) => (
            <div
              key={rel.id}
              className="p-4 rounded-xl cyber-glass-card border border-slate-800/80 hover:border-indigo-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                {/* Visual Entity Link */}
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-bold max-w-xs truncate">
                    {rel.source_value}
                  </span>

                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800 text-[11px] text-indigo-300 font-semibold">
                    {getRelIcon(rel.relationship_type)}
                    <span>{rel.relationship_type.replace(/_/g, ' ')}</span>
                    <ArrowRight className="w-3 h-3 text-indigo-400" />
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-bold max-w-xs truncate">
                    {rel.target_value}
                  </span>

                  <Badge variant={rel.relationship_nature === 'OBSERVED' ? 'cyan' : 'purple'}>
                    {rel.relationship_nature}
                  </Badge>

                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                    {(rel.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                {/* Grounding Context Snippet */}
                {rel.context_snippet && (
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-900 text-[11px] text-slate-400 font-mono">
                    <span className="text-slate-500">Grounded Context: </span>
                    {rel.context_snippet}
                  </div>
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-500 flex-shrink-0 text-right">
                <div>Method: {rel.extraction_method}</div>
                <div>Recorded: {new Date(rel.created_at).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
