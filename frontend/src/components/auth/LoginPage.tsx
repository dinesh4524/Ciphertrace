import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  User, 
  AlertCircle, 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle2, 
  Fingerprint, 
  Users,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { Badge } from '../common/Badge';
import { Logo } from '../common/Logo';

interface LoginPageProps {
  onBackToLanding: () => void;
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToLanding, onLoginSuccess }) => {
  const { login, switchPersona } = useAuth();
  const [username, setUsername] = useState('investigator_sharma');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoRoles = [
    {
      id: 'investigator_sharma',
      name: 'Insp Rajesh Sharma',
      role: 'INVESTIGATOR' as Role,
      designation: 'Lead Field Investigating Officer (IO)',
      badgeNo: 'POL-CYB-8812',
      badgeVariant: 'cyan' as const,
      description: 'Cases, Evidence Locker, Entity Extraction, Timelines, Network & Case Reports'
    },
    {
      id: 'supervisor_verma',
      name: 'ACP Surender Verma',
      role: 'SENIOR_INVESTIGATOR' as Role,
      designation: 'Supervisory Officer / ACP',
      badgeNo: 'POL-HQ-4091',
      badgeVariant: 'purple' as const,
      description: 'Supervisory oversight, Review Queue, Team Roster, Case Sanctions & Audit'
    },
    {
      id: 'legal_advocate_iyer',
      name: 'Adv Priya Iyer',
      role: 'LEGAL_ANALYST' as Role,
      designation: 'Special Public Prosecutor',
      badgeNo: 'PROS-SPL-109',
      badgeVariant: 'amber' as const,
      description: 'BNS / BNSS / BSA Legal Reference, Evidentiary Corroboration & Hypotheses'
    },
    {
      id: 'forensic_dr_deshmukh',
      name: 'Dr. Anand Deshmukh',
      role: 'FORENSIC_ANALYST' as Role,
      designation: 'CFSL Digital Forensic Specialist',
      badgeNo: 'CFSL-DOC-992',
      badgeVariant: 'rose' as const,
      description: 'SHA-256 Hash Verification, Section 63 BSA Hash Certs, Metadata Extraction'
    },
    {
      id: 'intel_patel',
      name: 'Kiran Patel',
      role: 'INTELLIGENCE_ANALYST' as Role,
      designation: 'CIB Pattern & Network Analyst',
      badgeNo: 'CIB-NET-331',
      badgeVariant: 'blue' as const,
      description: 'Cytoscape Multi-Hop Graph, Centrality Metrics, Candidate Links & Clusters'
    },
    {
      id: 'admin_ciphertrace',
      name: 'System Administrator',
      role: 'SYSTEM_ADMINISTRATOR' as Role,
      designation: 'Institutional System Admin',
      badgeNo: 'SYS-SEC-001',
      badgeVariant: 'emerald' as const,
      description: 'User Access Control, System Health, Audit Trail, Platform Security'
    }
  ];

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRoleSelect = async (roleUsername: string) => {
    setLoading(true);
    setError(null);
    try {
      await switchPersona(roleUsername);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Demo authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans selection:bg-[#2563EB] selection:text-white">
      {/* Top Bar */}
      <div className="h-14 border-b border-[#D9E0E8] bg-[#FFFFFF] px-4 md:px-8 flex items-center justify-between shadow-2xs">
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-2 text-xs font-mono text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Public Overview</span>
        </button>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B]">
          <Lock className="w-3.5 h-3.5 text-[#163A5F]" />
          <span>TLS 1.3 // 256-Bit Authenticated Gateway</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        {/* Left Column: Official Institutional Login Form */}
        <div className="lg:col-span-5 workstation-card p-6 rounded-lg space-y-5 border border-[#D9E0E8] bg-[#FFFFFF] shadow-sm">
          <div className="space-y-1 pb-2 border-b border-[#E2E8F0]">
            <Logo size="md" subtitle="Investigation Intelligence Platform Sign In" />
          </div>

          <div className="p-2.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[11px] font-mono text-[#92400E] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
            <span>
              Authorized access only. All sessions and queries are recorded in the institutional audit log under Section 63 BSA.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded bg-[#FEF2F2] border border-[#F87171] text-[#991B1B] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-[#475569] mb-1 text-[11px] uppercase font-semibold">Official Email / User ID</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. investigator_sharma"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded pl-8 pr-3 py-2 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[#475569] text-[11px] uppercase font-semibold">Password</label>
                <button
                  type="button"
                  onClick={() => alert('Password reset requests must be authorized through the Departmental System Administrator.')}
                  className="text-[10px] text-[#2563EB] hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Key className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded pl-8 pr-3 py-2 text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-[#163A5F] hover:bg-[#0E2640] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow"
            >
              {loading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Workstation</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: SIH Demo Role Access Panel */}
        <div className="lg:col-span-7 workstation-panel p-6 rounded-lg space-y-4 border border-[#D9E0E8] bg-[#FFFFFF] shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#172033] font-mono">
                  DEMO ACCESS // SELECT INSTITUTIONAL ROLE
                </h2>
                <Badge variant="cyan">SIH DEMO</Badge>
              </div>
              <p className="text-[11px] text-[#64748B] font-sans mt-0.5">
                Click any pre-seeded persona to explore role-aware workstation permissions.
              </p>
            </div>
            <Fingerprint className="w-5 h-5 text-[#163A5F]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {demoRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleDemoRoleSelect(role.id)}
                disabled={loading}
                className="text-left p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-all space-y-1.5 group shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172033] group-hover:text-[#2563EB] font-mono transition-colors">
                    {role.name}
                  </span>
                  <Badge variant={role.badgeVariant} size="xs">
                    {role.role.split('_')[0]}
                  </Badge>
                </div>
                <div className="text-[10px] text-[#64748B] font-mono">
                  {role.designation} <span className="text-[#94A3B8]">• {role.badgeNo}</span>
                </div>
                <p className="text-[10px] text-[#64748B] line-clamp-2 leading-relaxed font-sans">
                  {role.description}
                </p>
              </button>
            ))}
          </div>

          <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] text-[#64748B] font-mono flex items-center justify-between">
            <span>Synthetic Demonstration Mode • Database Seeded (CTX-001)</span>
            <span className="text-[#16805C] font-bold">All 6 Roles Ready</span>
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="py-4 border-t border-[#D9E0E8] text-center text-[10px] font-mono text-[#64748B] bg-[#FFFFFF]">
        Institutional Investigation Workstation • Section 63 BSA 2023 Compliant • Restricted Law Enforcement Access
      </div>
    </div>
  );
};
