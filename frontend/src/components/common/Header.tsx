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
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { AILimitationsModal } from './AILimitationsModal';
import { SecurityArchitectureModal } from './SecurityArchitectureModal';
import { LegalPrivacyTermsModal } from './LegalPrivacyTermsModal';

interface HeaderProps {
  activeCaseNumber?: string;
  activeCaseTitle?: string;
  onOpenCaseSelector?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeCaseNumber, 
  activeCaseTitle,
  onOpenCaseSelector 
}) => {
  const { currentUser, switchPersona } = useAuth();
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

  return (
    <>
      <header className="h-14 border-b border-slate-800 bg-[#0a0e17] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left: System Branding & Active Case Context */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-sky-950/80 border border-sky-600 flex items-center justify-center text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-wider text-sm text-slate-100">
                  CIPHERTRACE X
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                  LEA WORKSTATION
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Criminal Intelligence & Investigation Platform</p>
            </div>
          </div>

          {/* Active Investigation Breadcrumb */}
          {activeCaseNumber ? (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono uppercase">CASE:</span>
              <button
                onClick={onOpenCaseSelector}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-sky-300 hover:border-sky-600 transition-colors"
                title="Click to view or switch case"
              >
                <span>{activeCaseNumber}</span>
                <span className="text-slate-500 text-[10px] max-w-[180px] truncate font-sans">
                  — {activeCaseTitle}
                </span>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs text-slate-500 font-mono">
              <span>NO ACTIVE CASE SELECTED</span>
            </div>
          )}
        </div>

        {/* Right: Institutional Actions, Compliance Indicators & RBAC Persona */}
        <div className="flex items-center gap-3">
          {/* Quick Institutional Modals */}
          <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-800 pr-3">
            <button
              onClick={() => setIsLimitationsOpen(true)}
              className="btn-rect-ghost text-[11px] text-amber-300 hover:text-amber-200"
              title="View AI Evidentiary Limitations & Section 63 BSA compliance disclosure"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Limitations</span>
            </button>

            <button
              onClick={() => setIsSecurityOpen(true)}
              className="btn-rect-ghost text-[11px] text-sky-300 hover:text-sky-200"
              title="View SHA-256 Chain of Custody & Security Architecture"
            >
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Sec 63 BSA</span>
            </button>

            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="btn-rect-ghost text-[11px] text-slate-300 hover:text-slate-200"
              title="View DPDP Data Privacy Policy & Terms"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Legal Policy</span>
            </button>
          </div>

          {/* Officer Persona & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded bg-[#0f1624] hover:bg-slate-800 border border-slate-700 transition-all text-left"
            >
              <div className="w-6 h-6 rounded bg-sky-900 border border-sky-600 flex items-center justify-center text-[10px] font-bold text-sky-200 font-mono">
                {currentUser?.full_name?.substring(0, 2).toUpperCase() || 'IO'}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-200">{currentUser?.full_name || 'Officer'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(currentUser?.role || 'INVESTIGATOR')}>
                {currentUser?.role?.split('_')[0] || 'IO'}
              </Badge>
            </button>

            {/* Persona Switcher Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-[#0c121e] border border-slate-700 rounded shadow-xl p-2 z-50 space-y-1">
                <div className="px-2 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                  <span>Switch Investigation Role (RBAC)</span>
                  <Shield className="w-3 h-3 text-sky-400" />
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
                          ? 'bg-sky-950/80 border border-sky-700 text-sky-200'
                          : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.label}</div>
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
