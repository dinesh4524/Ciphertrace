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
            <h1 className="text-xl font-bold text-white tracking-wide">Extracted Intelligence & Entity Fabric</h1>
            <span className="text-[11px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
              {entities.length} Extracted Entities Grounded
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Named entities parsed from FIRs, Interrogation transcripts, CDR dumps, and hawala records.
            Every entity retains exact character offset grounding linking directly to the source evidence.
          </p>
        </div>
        <button
          onClick={fetchEntities}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-all"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Graph</span>
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
            placeholder="Search persons, IMEIs, UPIs, vehicles, sections..."
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
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedType === cat.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Loading grounded entities from Evidence Fabric...
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="p-12 text-center cyber-glass rounded-2xl border border-slate-800 space-y-3">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">No entities extracted matching criteria</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Go to the Evidence Locker and click &ldquo;Extract Intelligence / Run NLP&rdquo; on ingested documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((ent) => (
            <div
              key={ent.id}
              onClick={() => setSelectedEntity(ent)}
              className="p-4 rounded-xl cyber-glass-card border border-slate-800/80 hover:border-purple-500/50 transition-all cursor-pointer space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-200">
                    {getEntityIcon(ent.entity_type)}
                    <span>{ent.entity_type}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                    {(ent.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-100 truncate">{ent.normalized_value}</h3>
                  {ent.raw_value !== ent.normalized_value && (
                    <p className="text-[11px] text-slate-500 font-mono truncate">Raw: {ent.raw_value}</p>
                  )}
                </div>

                {/* Grounding Context Snippet */}
                {ent.context_snippet && (
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-900 text-[11px] text-slate-400 font-mono line-clamp-2">
                    {ent.context_snippet}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                <span className="truncate">Method: {ent.extraction_method}</span>
                <span className="text-cyan-400 flex items-center gap-1">
                  Offsets: [{ent.char_start}:{ent.char_end}]
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entity Grounding Detail Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0b1329] border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden cyber-glow-cyan p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {getEntityIcon(selectedEntity.entity_type)}
                <span className="font-bold text-white text-sm">Entity Grounding Details</span>
              </div>
              <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div>
                  <span className="text-slate-500">Normalized Value: </span>
                  <span className="text-purple-300 font-bold">{selectedEntity.normalized_value}</span>
                </div>
                <div>
                  <span className="text-slate-500">Raw Mention: </span>
                  <span className="text-slate-200">{selectedEntity.raw_value}</span>
                </div>
                <div>
                  <span className="text-slate-500">Entity Classification: </span>
                  <span className="text-cyan-400">{selectedEntity.entity_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Extraction Confidence: </span>
                  <span className="text-emerald-400 font-bold">{(selectedEntity.confidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-slate-500">Extraction Method: </span>
                  <span className="text-slate-300">{selectedEntity.extraction_method}</span>
                </div>
                <div>
                  <span className="text-slate-500">Character Spans: </span>
                  <span className="text-cyan-300">Offset {selectedEntity.char_start} to {selectedEntity.char_end}</span>
                </div>
              </div>

              {selectedEntity.context_snippet && (
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold text-[11px]">Evidentiary Context Grounding:</span>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 text-xs leading-relaxed">
                    {selectedEntity.context_snippet}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEntity(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-xl"
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
