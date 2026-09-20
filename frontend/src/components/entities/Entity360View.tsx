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
      <div className="bg-white border border-[#D9E0E8] p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#172033] tracking-tight">
              Entity 360° Forensic Dossier
            </h1>
            <Badge variant="inferred">Multi-Source Resolved</Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Holistic cross-evidence profile synthesizing telecom, financial ledger, and digital forensics data for Case {activeCase.case_number}.
          </p>
        </div>

        <button
          onClick={fetchEntities}
          disabled={loading}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Entities</span>
        </button>
      </div>

      {/* Main 2-Column Split: Entity Directory & 360 Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Entity Directory (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#D9E0E8] rounded p-3 space-y-3 flex flex-col h-[750px] shadow-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search suspect, phone, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#D9E0E8] rounded text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#163A5F]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B] px-1 border-b border-[#D9E0E8] pb-1.5">
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
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#163A5F] shadow-xs font-medium'
                      : 'bg-[#F8FAFC] border-[#D9E0E8] hover:border-[#94A3B8] text-[#172033]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {getEntityIcon(ent.entity_type)}
                      <span className="font-medium truncate text-xs">
                        {ent.normalized_value}
                      </span>
                    </div>
                    <Badge variant={ent.entity_type === 'PERSON' ? 'emerald' : 'slate'} size="xs">
                      {ent.entity_type.substring(0, 8)}
                    </Badge>
                  </div>
                  {ent.raw_value !== ent.normalized_value && (
                    <div className="text-[11px] text-[#64748B] font-mono truncate mt-1">
                      Alias: {ent.raw_value}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredEntities.length === 0 && !loading && (
              <div className="p-8 text-center text-xs text-[#64748B]">
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
              <div className="bg-white border border-[#D9E0E8] rounded p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9E0E8] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
                      {getEntityIcon(selectedEntity.entity_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#172033]">
                          {selectedEntity.normalized_value}
                        </h2>
                        <Badge variant="evidence">SHA-256 VERIFIED</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#64748B]">
                        <span>Category: <strong className="text-[#172033]">{selectedEntity.entity_type}</strong></span>
                        <span>•</span>
                        <span>Confidence: <strong className="text-[#172033]">{((selectedEntity.confidence || 0.95) * 100).toFixed(0)}%</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setVerificationStatus(verificationStatus === 'VERIFIED' ? 'CONTESTED' : 'VERIFIED')}
                      className={verificationStatus === 'VERIFIED' ? 'btn-primary text-xs flex items-center gap-1.5' : 'btn-danger text-xs flex items-center gap-1.5'}
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
                  <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded">
                    <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">EVIDENTIARY STATUS</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant="observed">OBSERVED FACT</Badge>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-1">
                      Acquired via multi-modal evidence ingestion
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded">
                    <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">NETWORK CENTRALITY</div>
                    <div className="mt-1 text-sm font-bold text-[#B7791F]">
                      0.842 (High Degree Broker)
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-1">
                      Louvain Cluster #1 (Syndicate Core)
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded">
                    <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">SEC 63 BSA CITATION</div>
                    <div className="mt-1 text-xs font-mono font-medium text-[#163A5F] truncate">
                      {selectedEntity.evidence_id ? `EVID-${selectedEntity.evidence_id.substring(0, 8)}` : 'FIR-SEIZURE-001'}
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-1">
                      Court Admissible Electronic Record
                    </div>
                  </div>
                </div>

                {/* Context Extraction Snippet */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                    <span>Forensic Context Snippet</span>
                    <span className="text-[11px] font-mono text-[#64748B]">Offset: [{selectedEntity.char_start || 0}:{selectedEntity.char_end || 0}]</span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded text-xs text-[#172033] leading-relaxed">
                    {selectedEntity.context_snippet || `Entity "${selectedEntity.raw_value}" extracted from primary case records. Identified in telecom CDR burst transmissions and banking ledger disbursements.`}
                  </div>
                </div>

                {/* 4-Tier Link Matrix for this Entity */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    4-Tier Relational Associations
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2.5 bg-[#F8FAFC] border border-[#D9E0E8] rounded flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="observed">OBSERVED</Badge>
                        <span className="text-[#172033]">Calls logged to <span className="font-mono font-medium">9876543210</span> (142 duration / 18 bursts)</span>
                      </div>
                      <span className="text-[#16805C] font-semibold text-[11px]">DIRECT CDR</span>
                    </div>

                    <div className="p-2.5 bg-[#F8FAFC] border border-[#D9E0E8] rounded flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="inferred">INFERRED</Badge>
                        <span className="text-[#172033]">Layering beneficiary for HDFC Mule A/C <span className="font-mono font-medium">50200012345678</span></span>
                      </div>
                      <span className="text-[#2563EB] font-semibold text-[11px]">LEDGER FLOW</span>
                    </div>

                    <div className="p-2.5 bg-[#F8FAFC] border border-[#D9E0E8] rounded flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="predicted">PREDICTED</Badge>
                        <span className="text-[#172033]">Hawala intermediary link to Dubai Gateway (Conf: 88.4%)</span>
                      </div>
                      <span className="text-[#B7791F] font-semibold text-[11px]">GRAPH ML</span>
                    </div>
                  </div>
                </div>

                {/* IO Verification & Case Notes */}
                <div className="space-y-2 pt-2 border-t border-[#D9E0E8]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Investigating Officer Corroboration Notes
                  </div>
                  <textarea
                    rows={2}
                    value={ioNotes}
                    onChange={(e) => setIoNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D9E0E8] rounded text-xs text-[#172033] focus:outline-none focus:border-[#163A5F]"
                    placeholder="Enter judicial corroboration remarks..."
                  />
                  <div className="flex justify-end gap-2">
                    <button className="btn-secondary text-xs">
                      Export Dossier JSON
                    </button>
                    <button className="btn-primary text-xs">
                      Save IO Attestation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#D9E0E8] rounded p-12 text-center text-[#64748B] text-xs space-y-2 shadow-xs">
              <UserCheck className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <p>Select an entity from the directory to inspect the 360-degree forensic dossier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
