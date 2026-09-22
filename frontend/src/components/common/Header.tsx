import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  ChevronDown, 
  LogOut,
  ShieldAlert, 
  FileCheck2, 
  Scale, 
  Info, 
  Layers,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { Logo } from './Logo';
import { AILimitationsModal } from './AILimitationsModal';
import { SecurityArchitectureModal } from './SecurityArchitectureModal';
import { LegalPrivacyTermsModal } from './LegalPrivacyTermsModal';

interface HeaderProps {
  activeCaseNumber?: string;
  activeCaseTitle?: string;
  currentTab?: string;
  onOpenCaseSelector?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToCases?: () => void;
  onNavigateToActiveCase?: () => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeCaseNumber, 
  activeCaseTitle,
  currentTab,
  onOpenCaseSelector,
  onNavigateToDashboard,
  onNavigateToCases,
  onNavigateToActiveCase,
  onNavigateBack,
  onNavigateForward,
  onLogout
}) => {
  const { currentUser, switchPersona, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Modals state
  const [isLimitationsOpen, setIsLimitationsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const personas = [
    { username: 'investigator_sharma', name: 'Insp Rajesh Sharma', role: 'INVESTIGATOR', label: 'Field IO / Lead' },
    { username: 'supervisor_verma', name: 'ACP Surender Verma', role: 'SENIOR_INVESTIGATOR', label: 'Senior IO / Supervisor' },
    { username: 'legal_advocate_iyer', name: 'Adv Priya Iyer', role: 'LEGAL_ANALYST', label: 'Public Prosecutor' },
    { username: 'forensic_dr_deshmukh', name: 'Dr. Anand Deshmukh', role: 'FORENSIC_ANALYST', label: 'CFSL Forensic Lead' },
    { username: 'intel_patel', name: 'Kiran Patel', role: 'INTELLIGENCE_ANALYST', label: 'CIB Pattern Analyst' },
    { username: 'admin_ciphertrace', name: 'System Administrator', role: 'SYSTEM_ADMINISTRATOR', label: 'Security Admin' },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SENIOR_INVESTIGATOR': return 'purple';
      case 'INVESTIGATOR': return 'cyan';
      case 'LEGAL_ANALYST': return 'amber';
      case 'FORENSIC_ANALYST': return 'rose';
      case 'INTELLIGENCE_ANALYST': return 'blue';
      default: return 'emerald';
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.history.back();
    }
  };

  const handleForward = () => {
    if (onNavigateForward) {
      onNavigateForward();
    } else {
      window.history.forward();
    }
  };

  const formatTabName = (tab?: string) => {
    if (!tab) return '';
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'cases': return 'Case Registry';
      case 'ledger': return 'Case Ledger';
      case 'evidence': return 'Evidence Locker';
      case 'ingestion': return 'Evidence Ingestion';
      case 'entities': return 'Entity 360';
      case 'timeline': return 'Investigation Timeline';
      case 'graph': return 'Knowledge Graph';
      case 'relationships': return 'Relationship Matrix';
      case 'analytics': return 'Graph Centrality';
      case 'search': return 'Semantic Search';
      case 'rag': return 'Case RAG';
      case 'graphrag': return 'Graph RAG';
      case 'hypotheses': return 'Hypotheses';
      case 'reasoning': return 'Multi-Perspective';
      case 'counterfactual': return 'Ablation Analysis';
      case 'priority': return 'Investigative Priority';
      case 'resolution': return 'Entity Resolution';
      case 'legal': return 'Legal Reference';
      case 'reports': return 'Court Dossiers';
      case 'sih-demo': return 'Benchmark Dossier';
      case 'audit': return 'Chain of Custody';
      case 'users': return 'User Directory';
      case 'health': return 'System Health';
      default: return tab.toUpperCase();
    }
  };

  return (
    <>
      <header className="h-14 border-b border-[#D9E0E8] bg-[#FFFFFF] px-3 md:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-sm">
        {/* Left: System Branding, History Controls & Case Context */}
        <div className="flex items-center gap-3 md:gap-4">
          <Logo size="sm" subtitle="Investigation Intelligence Platform" />

          {/* History Back / Forward Controls */}
          <div className="flex items-center gap-1 border-l border-[#D9E0E8] pl-3">
            <button
              onClick={handleBack}
              className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#172033] border border-[#CBD5E1] transition-colors flex items-center gap-1 text-xs font-mono"
              title="Navigate Back (Alt + Left Arrow)"
              aria-label="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-bold">BACK</span>
            </button>
            <button
              onClick={handleForward}
              className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#172033] border border-[#CBD5E1] transition-colors flex items-center text-xs font-mono"
              title="Navigate Forward (Alt + Right Arrow)"
              aria-label="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Investigation & Tab Breadcrumb */}
          {activeCaseNumber ? (
            <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-[#D9E0E8] text-xs font-mono">
              <button
                onClick={onNavigateToCases}
                className="text-[#64748B] hover:text-[#163A5F] hover:underline transition-colors uppercase text-[10px]"
                title="Go to Case Registry"
              >
                CASES
              </button>
              <span className="text-[#94A3B8]">/</span>
              <button
                onClick={onNavigateToActiveCase || onOpenCaseSelector}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono text-[#163A5F] font-bold hover:bg-[#F1F5F9] transition-colors"
                title="View Case Ledger"
              >
                <span>{activeCaseNumber}</span>
              </button>
              {currentTab && currentTab !== 'ledger' && (
                <>
                  <span className="text-[#94A3B8]">/</span>
                  <span className="text-[#163A5F] font-bold uppercase text-[11px]">
                    {formatTabName(currentTab)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#D9E0E8] text-xs text-[#64748B] font-mono">
              <button
                onClick={onOpenCaseSelector || onNavigateToCases}
                className="text-[#2563EB] hover:underline"
              >
                SELECT ACTIVE CASE
              </button>
            </div>
          )}
        </div>

        {/* Right: Institutional Actions, Compliance Indicators & RBAC Persona */}
        <div className="flex items-center gap-3">
          {/* Quick Institutional Modals */}
          <div className="hidden lg:flex items-center gap-1.5 border-r border-[#D9E0E8] pr-3">
            <button
              onClick={() => setIsLimitationsOpen(true)}
              className="btn-rect-ghost text-[11px] text-[#B7791F] hover:text-[#92400E]"
              title="View AI Evidentiary Limitations & Section 63 BSA compliance disclosure"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#B7791F]" />
              <span>AI Limitations</span>
            </button>

            <button
              onClick={() => setIsSecurityOpen(true)}
              className="btn-rect-ghost text-[11px] text-[#163A5F] hover:text-[#0E2640]"
              title="View SHA-256 Chain of Custody & Security Architecture"
            >
              <Lock className="w-3.5 h-3.5 text-[#163A5F]" />
              <span>Sec 63 BSA</span>
            </button>

            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="btn-rect-ghost text-[11px] text-[#16805C] hover:text-[#065F46]"
              title="View DPDP Data Privacy Policy & Terms"
            >
              <Scale className="w-3.5 h-3.5 text-[#16805C]" />
              <span>Legal Policy</span>
            </button>
          </div>

          {/* Officer Persona & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] transition-all text-left"
            >
              <div className="w-6 h-6 rounded bg-[#163A5F] flex items-center justify-center text-[10px] font-bold text-white font-mono">
                {currentUser?.full_name?.substring(0, 2).toUpperCase() || 'IO'}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-[#172033]">{currentUser?.full_name || 'Officer'}</span>
                  <ChevronDown className="w-3 h-3 text-[#64748B]" />
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(currentUser?.role || 'INVESTIGATOR')}>
                {currentUser?.role?.split('_')[0] || 'IO'}
              </Badge>
            </button>

            {/* Persona Switcher Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-[#FFFFFF] border border-[#D9E0E8] rounded shadow-lg p-2 z-50 space-y-1">
                <div className="px-2 py-1.5 text-[10px] font-mono text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] flex items-center justify-between">
                  <span>Switch Role (RBAC)</span>
                  <Shield className="w-3 h-3 text-[#163A5F]" />
                </div>
                <div className="space-y-1 py-1 max-h-72 overflow-y-auto">
                  {personas.map((p) => (
                    <button
                      key={p.username}
                      onClick={() => {
                        switchPersona(p.username);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                        currentUser?.username === p.username
                          ? 'bg-[#EFF6FF] border border-[#2563EB] text-[#1E40AF]'
                          : 'text-[#334155] hover:bg-[#F8FAFC] border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-[#172033]">{p.name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">{p.label}</div>
                      </div>
                      <Badge variant={getRoleBadgeVariant(p.role)}>
                        {p.role.split('_')[0]}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Sign Out */}
          <button
            onClick={handleLogoutClick}
            className="p-1.5 rounded bg-[#F8FAFC] hover:bg-[#FEE2E2] text-[#64748B] hover:text-[#991B1B] border border-[#CBD5E1] hover:border-[#F87171] transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Compliance Modals */}
      <AILimitationsModal
        isOpen={isLimitationsOpen}
        onClose={() => setIsLimitationsOpen(false)}
      />
      <SecurityArchitectureModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />
      <LegalPrivacyTermsModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </>
  );
};
