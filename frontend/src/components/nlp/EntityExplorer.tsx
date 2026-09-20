import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Smartphone, 
  CreditCard, 
  Car, 
  Scale, 
  MapPin, 
  Building2, 
  Search, 
  Sparkles, 
  RotateCw,
  Hash
} from 'lucide-react';
import { Case, ExtractedEntity } from '../../types';
import { api } from '../../services/api';

interface EntityExplorerProps {
  activeCase: Case;
}

export const EntityExplorer: React.FC<EntityExplorerProps> = ({ activeCase }) => {
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<ExtractedEntity | null>(null);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const typeParam = selectedType === 'ALL' ? undefined : selectedType;
      const data = await api.getCaseEntities(activeCase.id, typeParam);
      setEntities(data);
    } catch (err: any) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [activeCase.id, selectedType]);

  const filteredEntities = entities.filter(ent => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      ent.normalized_value.toLowerCase().includes(term) ||
      ent.raw_value.toLowerCase().includes(term) ||
      (ent.context_snippet && ent.context_snippet.toLowerCase().includes(term))
    );
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'PERSON':
        return <User className="w-4 h-4 text-emerald-400" />;
      case 'PHONE_NUMBER':
        return <Phone className="w-4 h-4 text-cyan-400" />;
      case 'DEVICE':
        return <Smartphone className="w-4 h-4 text-purple-400" />;
      case 'FINANCIAL_ACCOUNT':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'VEHICLE':
        return <Car className="w-4 h-4 text-rose-400" />;
      case 'LEGAL_SECTION':
        return <Scale className="w-4 h-4 text-yellow-400" />;
      case 'LOCATION':
        return <MapPin className="w-4 h-4 text-blue-400" />;
      case 'ORGANIZATION':
        return <Building2 className="w-4 h-4 text-indigo-400" />;
      default:
        return <Hash className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEntityTypeBadgeVariant = (type: string): any => {
    switch (type) {
      case 'PERSON': return 'emerald';
      case 'PHONE_NUMBER': return 'cyan';
      case 'DEVICE': return 'purple';
      case 'FINANCIAL_ACCOUNT': return 'amber';
      case 'VEHICLE': return 'rose';
      case 'LEGAL_SECTION': return 'purple';
      case 'LOCATION': return 'blue';
      case 'ORGANIZATION': return 'indigo';
      default: return 'slate';
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Entities' },
    { id: 'PERSON', label: 'Persons & Aliases' },
    { id: 'PHONE_NUMBER', label: 'Phone Numbers' },
    { id: 'DEVICE', label: 'Devices (IMEI/IMSI)' },
    { id: 'FINANCIAL_ACCOUNT', label: 'Bank / UPI / Crypto' },
    { id: 'VEHICLE', label: 'Vehicles' },
    { id: 'LEGAL_SECTION', label: 'BNS / IPC Sections' },
    { id: 'LOCATION', label: 'Locations' },
    { id: 'ORGANIZATION', label: 'Organizations' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl cyber-glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-[#172033] tracking-tight">Extracted Intelligence & Entity Fabric</h1>
            <span className="text-[11px] font-mono font-semibold text-[#163A5F] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#D9E0E8]">
              {entities.length} Grounded Entities
            </span>
          </div>
          <p className="text-xs text-[#64748B] max-w-3xl">
            Named entities parsed from FIRs, Interrogation transcripts, CDR dumps, and hawala records.
            Every entity retains exact character offset grounding linking directly to the source evidence.
          </p>
        </div>
        <button
          onClick={fetchEntities}
          className="btn-secondary text-xs flex items-center gap-2"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Graph</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white border border-[#D9E0E8] rounded px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search persons, IMEIs, UPIs, vehicles, sections..."
            className="bg-transparent border-none outline-none text-xs text-[#172033] placeholder-[#94A3B8] w-full font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#64748B] hover:text-[#172033] text-xs">
              &times;
            </button>
          )}
        </div>

        {/* Category Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedType === cat.id
                  ? 'bg-[#163A5F] text-white font-bold'
                  : 'bg-white text-[#64748B] hover:text-[#172033] border border-[#D9E0E8]'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-[#64748B]">
          Loading grounded entities from Evidence Fabric...
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded border border-[#D9E0E8] space-y-3">
          <Sparkles className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm text-[#172033] font-medium">No entities extracted matching criteria</p>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Go to the Evidence Locker and click &ldquo;Extract Intelligence / Run NLP&rdquo; on ingested documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((ent) => (
            <div
              key={ent.id}
              onClick={() => setSelectedEntity(ent)}
              className="p-4 rounded bg-white border border-[#D9E0E8] hover:border-[#163A5F] shadow-xs transition-all cursor-pointer space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[11px] font-semibold text-[#163A5F]">
                    {getEntityIcon(ent.entity_type)}
                    <span>{ent.entity_type}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#16805C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    {(ent.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-xs text-[#172033] truncate">{ent.normalized_value}</h3>
                  {ent.raw_value !== ent.normalized_value && (
                    <p className="text-[11px] text-[#64748B] font-mono truncate">Raw: {ent.raw_value}</p>
                  )}
                </div>

                {/* Grounding Context Snippet */}
                {ent.context_snippet && (
                  <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[11px] text-[#172033] font-mono line-clamp-2">
                    {ent.context_snippet}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] pt-2 border-t border-[#D9E0E8]">
                <span className="truncate">Method: {ent.extraction_method}</span>
                <span className="text-[#2563EB] flex items-center gap-1">
                  Offsets: [{ent.char_start}:{ent.char_end}]
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entity Grounding Detail Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-[#D9E0E8] rounded shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E0E8] pb-3">
              <div className="flex items-center gap-2">
                {getEntityIcon(selectedEntity.entity_type)}
                <span className="font-bold text-[#172033] text-sm">Entity Grounding Details</span>
              </div>
              <button onClick={() => setSelectedEntity(null)} className="text-[#64748B] hover:text-[#172033]">
                &times;
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] space-y-1.5">
                <div>
                  <span className="text-[#64748B]">Normalized Value: </span>
                  <span className="text-[#163A5F] font-bold">{selectedEntity.normalized_value}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Raw Mention: </span>
                  <span className="text-[#172033]">{selectedEntity.raw_value}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Entity Classification: </span>
                  <span className="text-[#2563EB] font-semibold">{selectedEntity.entity_type}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Extraction Confidence: </span>
                  <span className="text-[#16805C] font-bold">{(selectedEntity.confidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Extraction Method: </span>
                  <span className="text-[#172033]">{selectedEntity.extraction_method}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Character Spans: </span>
                  <span className="text-[#2563EB]">Offset {selectedEntity.char_start} to {selectedEntity.char_end}</span>
                </div>
              </div>

              {selectedEntity.context_snippet && (
                <div className="space-y-1">
                  <span className="text-[#172033] font-bold text-[11px]">Evidentiary Context Grounding:</span>
                  <div className="p-3 bg-[#F8FAFC] rounded border border-[#D9E0E8] text-[#172033] text-xs leading-relaxed">
                    {selectedEntity.context_snippet}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEntity(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
