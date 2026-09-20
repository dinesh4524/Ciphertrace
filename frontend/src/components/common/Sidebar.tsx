import React from 'react';
import { 
  BarChart3,
  FolderLock, 
  BookOpen,
  UploadCloud, 
  FileCheck2, 
  History, 
  Cpu, 
  Scale, 
  Sparkles,
  Network,
  GitMerge,
  Route,
  GitFork,
  Zap,
  Gavel,
  Clock,
  UserCheck,
  Shield,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TabType = 
  | 'sih-demo'
  | 'dashboard' 
  | 'cases' 
  | 'ledger' 
  | 'ingestion' 
  | 'evidence' 
  | 'entities'
  | 'timeline' 
  | 'relationships' 
  | 'resolution'
  | 'graph'
  | 'analytics'
  | 'rag'
  | 'graphrag'
  | 'reasoning'
  | 'counterfactual'
  | 'priority'
  | 'legal'
  | 'audit' 
  | 'health';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  evidenceCount?: number;
  entitiesCount?: number;
  hasActiveCase?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  evidenceCount = 0,
  hasActiveCase = false 
}) => {
  const { currentUser } = useAuth();

  const navSections = [
    {
      title: 'Operational Command',
      items: [
        {
          id: 'sih-demo' as const,
          label: 'SIH Mission Control',
          icon: Sparkles,
          badge: 'DEMO',
          highlight: true
        },
        {
          id: 'dashboard' as const,
          label: 'Command Dashboard',
          icon: BarChart3,
          badge: null,
          highlight: false
        },
        {
          id: 'cases' as const,
          label: 'Case Registry & RBAC',
          icon: FolderLock,
          badge: null,
          highlight: false
        },
        {
          id: 'ledger' as const,
          label: 'Case Detail Ledger',
          icon: BookOpen,
          badge: hasActiveCase ? 'Active' : null,
          highlight: false
        },
      ]
    },
    {
      title: 'Evidence & Forensics',
      items: [
        {
          id: 'ingestion' as const,
          label: 'Multi-Modal Ingest',
          icon: UploadCloud,
          badge: null,
          highlight: false
        },
        {
          id: 'evidence' as const,
          label: 'Evidence Locker & Custody',
          icon: FileCheck2,
          badge: evidenceCount > 0 ? evidenceCount.toString() : null,
          highlight: false
        },
        {
          id: 'entities' as const,
          label: 'Entity-360 Dossier',
          icon: UserCheck,
          badge: 'NER/360',
          highlight: false
        },
        {
          id: 'timeline' as const,
          label: 'Forensic Timeline',
          icon: Clock,
          badge: 'Time',
          highlight: false
        },
        {
          id: 'relationships' as const,
          label: 'Relationship Matrix',
          icon: Layers,
          badge: null,
          highlight: false
        },
        {
          id: 'resolution' as const,
          label: 'Entity Resolution Hub',
          icon: GitMerge,
          badge: 'ER',
          highlight: false
        },
      ]
    },
    {
      title: 'Network Intelligence',
      items: [
        {
          id: 'graph' as const,
          label: 'Network Graph Workstation',
          icon: Network,
          badge: '4-Tier',
          highlight: false
        },
        {
          id: 'analytics' as const,
          label: 'Graph ML & Anomalies',
          icon: Route,
          badge: null,
          highlight: false
        },
        {
          id: 'rag' as const,
          label: 'Document RAG & Search',
          icon: BookOpen,
          badge: null,
          highlight: false
        },
        {
          id: 'graphrag' as const,
          label: 'GraphRAG Intelligence',
          icon: Network,
          badge: 'Hybrid',
          highlight: false
        },
      ]
    },
    {
      title: 'Reasoning & Legal AI',
      items: [
        {
          id: 'reasoning' as const,
          label: 'Multi-Perspective AI',
          icon: Scale,
          badge: 'Consensus',
          highlight: false
        },
        {
          id: 'counterfactual' as const,
          label: 'Counterfactual Ablation',
          icon: GitFork,
          badge: null,
          highlight: false
        },
        {
          id: 'priority' as const,
          label: 'Priority & Next Actions',
          icon: Zap,
          badge: 'NBA',
          highlight: false
        },
        {
          id: 'legal' as const,
          label: 'Indian Legal AI (BNS/BSA)',
          icon: Gavel,
          badge: 'Sec 63',
          highlight: false
        },
      ]
    },
    {
      title: 'Assurance & System',
      items: [
        {
          id: 'audit' as const,
          label: 'Audit Trail (SHA-256)',
          icon: History,
          badge: 'Merkle',
          highlight: false
        },
        {
          id: 'health' as const,
          label: 'System Infrastructure',
          icon: Cpu,
          badge: 'Live',
          highlight: false
        },
      ]
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#080c14] flex flex-col justify-between p-3.5 h-[calc(100vh-3.5rem)] select-none">
      <div className="space-y-4 overflow-y-auto pr-1">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              {sec.title}
            </div>
            <nav className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-950 text-sky-200 border border-sky-600 font-semibold'
                        : item.highlight
                        ? 'bg-sky-950/40 text-sky-300 border border-sky-900/60 hover:bg-sky-950/70'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive || item.highlight ? 'text-sky-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                          item.highlight
                            ? 'bg-sky-900 text-sky-200 border border-sky-600'
                            : isActive
                            ? 'bg-sky-900 text-sky-200 border border-sky-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Active User Footer Info */}
      <div className="p-2.5 rounded bg-[#0d131f] border border-slate-800 text-slate-400 space-y-1 text-xs">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-500 uppercase">Station / Division</span>
          <span className="text-sky-400 font-bold">CYBER CRIME PS</span>
        </div>
        <div className="text-[10px] text-slate-400 truncate font-mono">
          IO: {currentUser?.full_name || 'Insp Rajesh Sharma'}
        </div>
      </div>
    </aside>
  );
};
