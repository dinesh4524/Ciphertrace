import React, { useState } from 'react';
import { 
  Clock, 
  Phone, 
  CreditCard, 
  FileText, 
  Smartphone, 
  MapPin, 
  Filter, 
  ShieldCheck, 
  Calendar,
  Layers,
  ArrowRight,
  Download
} from 'lucide-react';
import { Case } from '../../types';
import { Badge } from '../common/Badge';

interface InvestigationTimelineProps {
  activeCase: Case;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  category: 'TELECOM' | 'FINANCIAL' | 'POLICE_ACTION' | 'DIGITAL_FORENSICS';
  tier: 'observed' | 'inferred';
  title: string;
  description: string;
  actors: string[];
  evidenceRef: string;
  hash: string;
}

export const InvestigationTimeline: React.FC<InvestigationTimelineProps> = ({ activeCase }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const mockTimelineEvents: TimelineEvent[] = [
    {
      id: 'EVT-001',
      timestamp: '2026-03-12 09:14:22 IST',
      category: 'POLICE_ACTION',
      tier: 'observed',
      title: 'FIR Registration & Cyber Crime Complaint',
      description: 'Complainant lodged formal complaint regarding unauthorized debit of INR 8.4 Lakhs via spoofed netbanking portal.',
      actors: ['Victim (Ramesh Rao)', 'Cyber Crime PS'],
      evidenceRef: 'FIR-2026-CYB-0084',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    {
      id: 'EVT-002',
      timestamp: '2026-03-12 09:18:45 IST',
      category: 'FINANCIAL',
      tier: 'observed',
      title: 'Layer 1 Rapid Micro-Disbursement (RTGS)',
      description: 'INR 8,40,000 fragmented into 4 mule accounts (HDFC 5020001234, ICICI 001928374, SBI 39281729, AXIS 91827364).',
      actors: ['Victim A/C', 'Mule Cluster Alpha'],
      evidenceRef: 'FIN-TXN-LEDGER-01',
      hash: '4a6f8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a'
    },
    {
      id: 'EVT-003',
      timestamp: '2026-03-12 09:22:10 IST',
      category: 'TELECOM',
      tier: 'observed',
      title: 'High-Frequency CDR Burst Transmission',
      description: '18 consecutive calls between +91 9876543210 (Field Operator) and +971 50 123 4567 (Dubai Gateway). Cell tower: Hitec City Node 4.',
      actors: ['Vikram Sharma @ Vicky', 'Dubai Gateway Handler'],
      evidenceRef: 'CDR-TELCO-STREAM-04',
      hash: '8f9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f'
    },
    {
      id: 'EVT-004',
      timestamp: '2026-03-12 10:05:00 IST',
      category: 'FINANCIAL',
      tier: 'inferred',
      title: 'Layer 2 Hawala Cash Extraction & ATM Drain',
      description: 'Simultaneous ATM cash withdrawals across 6 terminals in Secunderabad transit corridor matching cell tower hops.',
      actors: ['Mule Operative B', 'Cash Runner 1'],
      evidenceRef: 'ATM-LOGS-SECUND-09',
      hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b'
    },
    {
      id: 'EVT-005',
      timestamp: '2026-03-13 14:30:00 IST',
      category: 'POLICE_ACTION',
      tier: 'observed',
      title: 'Seizure of 16-Channel SIM Box & Burner Devices',
      description: 'Raid conducted at commercial apartment unit. Seized 16 active GSM SIMs, 4 burner Android handsets, and 12 ATM debit cards.',
      actors: ['IO Insp Rajesh Sharma', 'Raid Team Alpha'],
      evidenceRef: 'SEIZURE-PANCHNAMA-002',
      hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b'
    },
    {
      id: 'EVT-006',
      timestamp: '2026-03-14 11:00:00 IST',
      category: 'DIGITAL_FORENSICS',
      tier: 'observed',
      title: 'Digital Forensic Telegram Extraction',
      description: 'Extraction of encrypted chat channel "Hawala Express VIP" revealing hawala drop coordinates and token code "VIP-789".',
      actors: ['CFSL Forensic Lead', 'Mule Handler Mobile'],
      evidenceRef: 'CFSL-FORENSIC-REP-01',
      hash: '5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a'
    }
  ];

  const filteredEvents = mockTimelineEvents.filter(evt => {
    if (selectedCategory === 'ALL') return true;
    return evt.category === selectedCategory;
  });

  const getCategoryIcon = (cat: TimelineEvent['category']) => {
    switch (cat) {
      case 'TELECOM': return <Phone className="w-3.5 h-3.5 text-[#0369A1]" />;
      case 'FINANCIAL': return <CreditCard className="w-3.5 h-3.5 text-[#B7791F]" />;
      case 'POLICE_ACTION': return <ShieldCheck className="w-3.5 h-3.5 text-[#16805C]" />;
      case 'DIGITAL_FORENSICS': return <Smartphone className="w-3.5 h-3.5 text-[#7C3AED]" />;
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header Bar */}
      <div className="workstation-panel p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#172033] font-mono tracking-wide">
              FORENSIC INVESTIGATION TIMELINE
            </h1>
            <Badge variant="cyan">Multi-Stream Chronology</Badge>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Synchronized event stream linking FIR registration, telecom CDR call bursts, banking micro-transfers, and physical seizures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-rect-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>Export Chronology</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E2E8F0]">
        {[
          { id: 'ALL', label: 'All Forensic Streams' },
          { id: 'TELECOM', label: 'Telecom CDR Bursts' },
          { id: 'FINANCIAL', label: 'Banking Ledger' },
          { id: 'POLICE_ACTION', label: 'FIR & Seizures' },
          { id: 'DIGITAL_FORENSICS', label: 'Device Forensics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              selectedCategory === tab.id
                ? 'bg-[#163A5F] text-white font-bold'
                : 'bg-[#FFFFFF] text-[#475569] hover:text-[#172033] border border-[#CBD5E1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chronological Event Stream */}
      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D9E0E8]">
        {filteredEvents.map((evt) => (
          <div key={evt.id} className="relative group">
            {/* Timeline Dot */}
            <div className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 ${
              evt.tier === 'observed' 
                ? 'bg-[#16805C] border-[#FFFFFF]' 
                : 'bg-[#2563EB] border-[#FFFFFF]'
            }`} />

            {/* Event Card */}
            <div className="workstation-card rounded-lg p-4 space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    {getCategoryIcon(evt.category)}
                  </div>
                  <span className="font-mono text-xs font-bold text-[#172033]">
                    {evt.title}
                  </span>
                  <Badge variant={evt.tier === 'observed' ? 'observed' : 'inferred'} size="xs">
                    {evt.tier.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B]">
                  <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>{evt.timestamp}</span>
                </div>
              </div>

              <p className="text-xs text-[#334155] font-sans leading-relaxed">
                {evt.description}
              </p>

              {/* Actors and Evidence Citations */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] text-[11px] font-mono">
                <div className="flex items-center gap-2 text-[#64748B]">
                  <span>ACTORS:</span>
                  <span className="text-[#172033] font-semibold">{evt.actors.join(' ↔ ')}</span>
                </div>

                <div className="flex items-center gap-3 text-[#64748B]">
                  <span>REF: <span className="text-[#163A5F] font-bold">{evt.evidenceRef}</span></span>
                  <span className="font-mono text-[10px]">
                    SHA-256: <span className="text-[#16805C] font-semibold">{evt.hash.substring(0, 12)}...</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
