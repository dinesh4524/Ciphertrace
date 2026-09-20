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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#D9E0E8] p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-[#172033] tracking-tight">Extracted Relationship Matrix</h1>
            <span className="text-[11px] font-medium text-[#163A5F] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
              {relationships.length} Inferred & Observed Links
            </span>
          </div>
          <p className="text-xs text-[#64748B] max-w-3xl">
            Co-occurrence associations and evidentiary links inferred across suspect persons, phone numbers,
            hardware IMEIs, mule bank accounts, and criminal statutes.
          </p>
        </div>
        <button
          onClick={fetchRelationships}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Links</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-[#D9E0E8] rounded px-3 py-1.5 flex-1 max-w-md shadow-xs">
          <Search className="w-3.5 h-3.5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search source entity, target entity, or relationship..."
            className="bg-transparent border-none outline-none text-xs text-[#172033] placeholder-[#94A3B8] w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#64748B] hover:text-[#172033] text-xs">
              &times;
            </button>
          )}
        </div>

        {/* Category Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
          {relCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedRelType(cat.id)}
              className={`px-2.5 py-1 rounded transition-colors text-xs font-medium whitespace-nowrap ${
                selectedRelType === cat.id
                  ? 'bg-[#163A5F] text-white'
                  : 'bg-white text-[#64748B] hover:text-[#172033] border border-[#D9E0E8]'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Relationship Cards Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748B]">
          Reconstructing entity linkage topology...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded border border-[#D9E0E8] space-y-2 shadow-xs">
          <Network className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <p className="text-xs text-[#172033] font-medium">No extracted relationships found</p>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Process evidence documents containing co-occurring suspects, phones, or bank transfers.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((rel) => (
            <div
              key={rel.id}
              className="p-4 rounded bg-white border border-[#D9E0E8] hover:border-[#94A3B8] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs"
            >
              <div className="space-y-2 flex-1 min-w-0">
                {/* Visual Entity Link */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#172033] font-mono font-medium max-w-xs truncate">
                    {rel.source_value}
                  </span>

                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] text-[#163A5F] font-semibold">
                    {getRelIcon(rel.relationship_type)}
                    <span>{rel.relationship_type.replace(/_/g, ' ')}</span>
                    <ArrowRight className="w-3 h-3 text-[#2563EB]" />
                  </div>

                  <span className="px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#172033] font-mono font-medium max-w-xs truncate">
                    {rel.target_value}
                  </span>

                  <Badge variant={rel.relationship_nature === 'OBSERVED' ? 'observed' : 'inferred'}>
                    {rel.relationship_nature}
                  </Badge>

                  <span className="text-[11px] font-mono text-[#16805C] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                    {(rel.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                {/* Grounding Context Snippet */}
                {rel.context_snippet && (
                  <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-xs text-[#64748B]">
                    <span className="font-semibold text-[#172033]">Grounded Context: </span>
                    {rel.context_snippet}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-[#64748B] flex-shrink-0 text-right">
                <div>Method: <strong className="text-[#172033]">{rel.extraction_method}</strong></div>
                <div className="font-mono text-[10px] text-[#94A3B8]">{new Date(rel.created_at).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
