import React from 'react';
import { 
  LayoutDashboard,
  FolderLock, 
  FileCheck2, 
  UserCheck, 
  Clock, 
  Network, 
  Layers, 
  Route, 
  Search, 
  Scale, 
  CheckSquare, 
  Gavel, 
  FileText, 
  History, 
  Users, 
  Cpu,
  LogOut,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

export type TabType = 
  | 'dashboard' 
  | 'cases' 
  | 'ledger'
  | 'evidence' 
  | 'ingestion'
  | 'entities'
  | 'timeline' 
  | 'graph'
  | 'relationships' 
  | 'analytics'
  | 'search'
  | 'rag'
  | 'graphrag'
  | 'hypotheses'
  | 'reasoning'
  | 'counterfactual'
  | 'priority'
  | 'resolution'
  | 'legal'
  | 'reports'
  | 'sih-demo'
  | 'audit' 
  | 'users'
  | 'health';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  evidenceCount?: number;
  entitiesCount?: number;
  hasActiveCase?: boolean;
  onLogout?: () => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: any;
  badge?: string | null;
  activeFor: string[];
  allowedRoles?: Role[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  evidenceCount = 0,
  hasActiveCase = false,
  onLogout
}) => {
  const { currentUser, logout } = useAuth();
  const userRole = currentUser?.role || 'INVESTIGATOR';

  const allNavSections: NavSection[] = [
    {
      title: 'WORKSPACE',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          activeFor: ['dashboard'],
          allowedRoles: ['INVESTIGATOR', 'SENIOR_INVESTIGATOR', 'LEGAL_ANALYST', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'cases',
          label: 'Cases',
          icon: FolderLock,
          activeFor: ['cases', 'ledger'],
          allowedRoles: ['INVESTIGATOR', 'SENIOR_INVESTIGATOR', 'LEGAL_ANALYST', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'evidence',
          label: 'Evidence',
          icon: FileCheck2,
          badge: evidenceCount > 0 ? evidenceCount.toString() : null,
          activeFor: ['evidence', 'ingestion'],
          allowedRoles: ['INVESTIGATOR', 'FORENSIC_ANALYST', 'SENIOR_INVESTIGATOR', 'LEGAL_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'entities',
          label: 'Entities',
          icon: UserCheck,
          activeFor: ['entities'],
          allowedRoles: ['INVESTIGATOR', 'FORENSIC_ANALYST', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'timeline',
          label: 'Timeline',
          icon: Clock,
          activeFor: ['timeline'],
          allowedRoles: ['INVESTIGATOR', 'FORENSIC_ANALYST', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'graph',
          label: 'Network',
          icon: Network,
          activeFor: ['graph'],
          allowedRoles: ['INVESTIGATOR', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        {
          id: 'relationships',
          label: 'Relationships',
          icon: Layers,
          activeFor: ['relationships'],
          allowedRoles: ['INVESTIGATOR', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'analytics',
          label: 'Patterns & Anomalies',
          icon: Route,
          activeFor: ['analytics'],
          allowedRoles: ['INVESTIGATOR', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'search',
          label: 'Search & Analysis',
          icon: Search,
          activeFor: ['search', 'rag', 'graphrag'],
          allowedRoles: ['INVESTIGATOR', 'INTELLIGENCE_ANALYST', 'LEGAL_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'hypotheses',
          label: 'Hypotheses',
          icon: Scale,
          activeFor: ['hypotheses', 'reasoning', 'counterfactual', 'priority'],
          allowedRoles: ['INVESTIGATOR', 'LEGAL_ANALYST', 'SENIOR_INVESTIGATOR', 'INTELLIGENCE_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
      ]
    },
    {
      title: 'REVIEW',
      items: [
        {
          id: 'resolution',
          label: 'Pending Reviews',
          icon: CheckSquare,
          activeFor: ['resolution'],
          allowedRoles: ['INVESTIGATOR', 'FORENSIC_ANALYST', 'SENIOR_INVESTIGATOR', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'legal',
          label: 'Legal Reference',
          icon: Gavel,
          activeFor: ['legal'],
          allowedRoles: ['LEGAL_ANALYST', 'SENIOR_INVESTIGATOR', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: FileText,
          activeFor: ['reports', 'sih-demo'],
          allowedRoles: ['INVESTIGATOR', 'SENIOR_INVESTIGATOR', 'LEGAL_ANALYST', 'SYSTEM_ADMINISTRATOR']
        },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'audit',
          label: 'Audit Trail',
          icon: History,
          activeFor: ['audit'],
          allowedRoles: ['SENIOR_INVESTIGATOR', 'FORENSIC_ANALYST', 'SYSTEM_ADMINISTRATOR', 'INVESTIGATOR']
        },
        {
          id: 'users',
          label: 'Users & Access',
          icon: Users,
          activeFor: ['users'],
          allowedRoles: ['SENIOR_INVESTIGATOR', 'SYSTEM_ADMINISTRATOR']
        },
        {
          id: 'health',
          label: 'System Information',
          icon: Cpu,
          activeFor: ['health'],
          allowedRoles: ['SYSTEM_ADMINISTRATOR', 'FORENSIC_ANALYST', 'INVESTIGATOR', 'SENIOR_INVESTIGATOR', 'LEGAL_ANALYST', 'INTELLIGENCE_ANALYST']
        },
      ]
    }
  ];

  // Filter sections and items based on active user's role permissions
  const filteredNavSections = allNavSections.map(sec => ({
    ...sec,
    items: sec.items.filter(item => {
      if (!item.allowedRoles) return true;
      if (currentUser?.is_superuser || userRole === 'SYSTEM_ADMINISTRATOR') return true;
      return item.allowedRoles.includes(userRole as Role);
    })
  })).filter(sec => sec.items.length > 0);

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  return (
    <aside className="w-56 border-r border-[#D9E0E8] bg-[#FFFFFF] flex flex-col justify-between p-3 select-none">
      <div className="space-y-4 overflow-y-auto">
        {filteredNavSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider text-[#64748B] font-mono">
              {sec.title}
            </div>
            <nav className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.activeFor.includes(currentTab);
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#163A5F] text-white font-semibold shadow-sm'
                        : 'text-[#334155] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          isActive
                            ? 'bg-[#0E2640] text-white'
                            : 'bg-[#E2E8F0] text-[#334155]'
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

      {/* Active User Footer Info & Logout */}
      <div className="space-y-2 pt-2 border-t border-[#D9E0E8]">
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between text-[10px] text-[#64748B]">
            <span>STATION</span>
            <span className="text-[#172033] font-medium">Cyber Crime PS</span>
          </div>
          <div className="text-[11px] text-[#163A5F] font-bold truncate">
            {currentUser?.full_name || 'Insp Rajesh Sharma'}
          </div>
          <div className="text-[9px] text-[#64748B] truncate">
            Role: {currentUser?.role || 'INVESTIGATOR'}
          </div>
        </div>

        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded bg-[#F8FAFC] hover:bg-[#FEE2E2] text-[#64748B] hover:text-[#991B1B] border border-[#CBD5E1] hover:border-[#F87171] text-xs font-mono transition-colors"
          title="Sign out of current institutional session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
