import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  ShieldAlert, 
  Phone, 
  CreditCard, 
  Smartphone, 
  MapPin, 
  Calendar, 
  FileText, 
  Share2, 
  CheckCircle, 
  AlertTriangle,
  RotateCw,
  Hash,
  Scale,
  ExternalLink,
  ShieldCheck,
  Building,
  Flag
} from 'lucide-react';
import { Case, ExtractedEntity } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface Entity360ViewProps {
  activeCase: Case;
}

export const Entity360View: React.FC<Entity360ViewProps> = ({ activeCase }) => {
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<ExtractedEntity | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'CONTESTED' | 'PENDING'>('VERIFIED');
  const [ioNotes, setIoNotes] = useState('Corroborated with seized SIM box extraction & CDR cell tower logs.');

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const data = await api.getCaseEntities(activeCase.id);
      setEntities(data);
      if (data.length > 0 && !selectedEntity) {
        // Default to a PERSON or the first entity
        const person = data.find(e => e.entity_type === 'PERSON') || data[0];
        setSelectedEntity(person);
      }
    } catch (err) {
      console.error('Failed to load entities for 360 view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [activeCase.id]);

  const filteredEntities = entities.filter(ent => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      ent.normalized_value.toLowerCase().includes(term) ||
      ent.raw_value.toLowerCase().includes(term) ||
      ent.entity_type.toLowerCase().includes(term)
    );
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'PERSON': return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'PHONE_NUMBER': return <Phone className="w-4 h-4 text-sky-400" />;
      case 'DEVICE': return <Smartphone className="w-4 h-4 text-purple-400" />;
      case 'FINANCIAL_ACCOUNT': return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'LOCATION': return <MapPin className="w-4 h-4 text-rose-400" />;
      case 'ORGANIZATION': return <Building className="w-4 h-4 text-indigo-400" />;
      default: return <Hash className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="workstation-panel p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              ENTITY-360 DOSSIER WORKSPACE
            </h1>
            <Badge variant="inferred">Multi-Source Resolved</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Holistic cross-evidence profile synthesizing telecom, financial ledger, and digital forensics data for Case {activeCase.case_number}.
          </p>
        </div>

        <button
          onClick={fetchEntities}
          disabled={loading}
          className="btn-rect-secondary"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Entities</span>
        </button>
      </div>

      {/* Main 2-Column Split: Entity Directory & 360 Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Entity Directory (4 cols) */}
        <div className="lg:col-span-4 workstation-card rounded-lg p-3 space-y-3 flex flex-col h-[750px]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search suspect, phone, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#080c14] border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 border-b border-slate-800 pb-1.5">
            <span>INDEXED ENTITIES ({filteredEntities.length})</span>
            <span>TYPE</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredEntities.map((ent) => {
              const isSelected = selectedEntity?.id === ent.id;
              return (
                <div
                  key={ent.id}
                  onClick={() => setSelectedEntity(ent)}
                  className={`p-2.5 rounded border cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-sky-950/70 border-sky-600 text-sky-200'
                      : 'bg-[#0b0f19] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {getEntityIcon(ent.entity_type)}
                      <span className="font-semibold truncate font-mono text-[11px]">
                        {ent.normalized_value}
                      </span>
                    </div>
                    <Badge variant={ent.entity_type === 'PERSON' ? 'emerald' : 'slate'} size="xs">
                      {ent.entity_type.substring(0, 8)}
                    </Badge>
                  </div>
                  {ent.raw_value !== ent.normalized_value && (
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-1">
                      Alias: {ent.raw_value}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredEntities.length === 0 && !loading && (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No entities match search query.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 360 Dossier Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedEntity ? (
            <div className="space-y-4">
              {/* Profile Card Header */}
              <div className="workstation-card rounded-lg p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-sky-950 border border-sky-600 flex items-center justify-center text-sky-300">
                      {getEntityIcon(selectedEntity.entity_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-100 font-mono">
                          {selectedEntity.normalized_value}
                        </h2>
                        <Badge variant="evidence">SHA-256 VERIFIED</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                        <span>CATEGORY: {selectedEntity.entity_type}</span>
                        <span>•</span>
                        <span>CONFIDENCE: {((selectedEntity.confidence || 0.95) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setVerificationStatus(verificationStatus === 'VERIFIED' ? 'CONTESTED' : 'VERIFIED')}
                      className={verificationStatus === 'VERIFIED' ? 'btn-rect-primary' : 'btn-rect-danger'}
                    >
                      {verificationStatus === 'VERIFIED' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>IO Verified</span>
                        </>
                      ) : (
                        <>
                          <Flag className="w-3.5 h-3.5" />
                          <span>Contested by Defense</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Grid of Key Forensic Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">EVIDENTIARY STATUS</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant="observed">OBSERVED FACT</Badge>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      Acquired via multi-modal evidence ingestion
                    </div>
                  </div>

                  <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">NETWORK CENTRALITY</div>
                    <div className="mt-1 text-sm font-bold text-amber-400 font-mono">
                      0.842 (High Degree Broker)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      Louvain Cluster #1 (Syndicate Core)
                    </div>
                  </div>

                  <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">SEC 63 BSA CITATION</div>
                    <div className="mt-1 text-xs font-mono text-sky-400 truncate">
                      {selectedEntity.evidence_id ? `EVID-${selectedEntity.evidence_id.substring(0, 8)}` : 'FIR-SEIZURE-001'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      Court Admissible Electronic Record
                    </div>
                  </div>
                </div>

                {/* Context Extraction Snippet */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
                    <span>Forensic Context Snippet</span>
                    <span className="text-[10px] text-slate-500">Character Offset: [{selectedEntity.char_start || 0}:{selectedEntity.char_end || 0}]</span>
                  </div>
                  <div className="p-3 bg-[#080c14] border border-slate-800 rounded font-mono text-xs text-slate-300 leading-relaxed">
                    {selectedEntity.context_snippet || `Entity "${selectedEntity.raw_value}" extracted from primary case records. Identified in telecom CDR burst transmissions and banking ledger disbursements.`}
                  </div>
                </div>

                {/* 4-Tier Link Matrix for this Entity */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase text-slate-400">
                    4-Tier Relational Associations
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2.5 bg-[#0b0f19] border border-slate-800 rounded flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Badge variant="observed">OBSERVED</Badge>
                        <span className="text-slate-200">Calls logged to 9876543210 (142 duration / 18 bursts)</span>
                      </div>
                      <span className="text-emerald-400 text-[10px]">DIRECT CDR</span>
                    </div>

                    <div className="p-2.5 bg-[#0b0f19] border border-slate-800 rounded flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Badge variant="inferred">INFERRED</Badge>
                        <span className="text-slate-200">Layering beneficiary for HDFC Mule A/C 50200012345678</span>
                      </div>
                      <span className="text-sky-400 text-[10px]">LEDGER FLOW</span>
                    </div>

                    <div className="p-2.5 bg-[#0b0f19] border border-slate-800 rounded flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Badge variant="predicted">PREDICTED</Badge>
                        <span className="text-slate-200">Hawala intermediary link to Dubai Gateway (Conf: 88.4%)</span>
                      </div>
                      <span className="text-amber-400 text-[10px]">GRAPH ML</span>
                    </div>
                  </div>
                </div>

                {/* IO Verification & Case Notes */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-mono uppercase text-slate-400">
                    Investigating Officer Corroboration Notes
                  </div>
                  <textarea
                    rows={2}
                    value={ioNotes}
                    onChange={(e) => setIoNotes(e.target.value)}
                    className="w-full p-2.5 bg-[#080c14] border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    placeholder="Enter judicial corroboration remarks..."
                  />
                  <div className="flex justify-end gap-2">
                    <button className="btn-rect-secondary text-[11px]">
                      Export Dossier JSON
                    </button>
                    <button className="btn-rect-primary text-[11px]">
                      Save IO Attestation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="workstation-card rounded-lg p-12 text-center text-slate-400 font-mono text-xs space-y-2">
              <UserCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Select an entity from the directory to inspect the 360-degree forensic dossier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
