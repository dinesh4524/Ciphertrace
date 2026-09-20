import React, { useState, useRef } from 'react';
import { 
  Shield, 
  Lock, 
  ArrowRight, 
  FileCheck2, 
  UserCheck, 
  Network, 
  Scale, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  FileText, 
  Key, 
  Eye, 
  Database,
  Building2,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  Search,
  CheckSquare,
  History,
  FolderLock,
  Radio,
  Box,
  Compass,
  Zap,
  Activity,
  Maximize2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AILimitationsModal } from '../common/AILimitationsModal';
import { SecurityArchitectureModal } from '../common/SecurityArchitectureModal';
import { LegalPrivacyTermsModal } from '../common/LegalPrivacyTermsModal';
import { Logo } from '../common/Logo';

interface LandingPageProps {
  onSignInClick: () => void;
  onDemoClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignInClick, onDemoClick }) => {
  const [isLimitationsOpen, setIsLimitationsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  
  // Interactive 3D & Animation State
  const [selectedNetworkNode, setSelectedNetworkNode] = useState<string>('ravi');
  const [isIsometricView, setIsIsometricView] = useState<boolean>(false);
  const [isRadarScanning, setIsRadarScanning] = useState<boolean>(true);
  const [isCubeAutoRotating, setIsCubeAutoRotating] = useState<boolean>(true);
  const [cubeActiveFace, setCubeActiveFace] = useState<number>(0);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);
  const [graph3DAngle, setGraph3DAngle] = useState<'flat' | 'isometric' | 'steep'>('isometric');

  // Mouse Parallax 3D Tilt for Hero Workstation Card
  const heroCardRef = useRef<HTMLDivElement>(null);
  const [heroTilt, setHeroTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isIsometricView || !heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Max 8 deg tilt
    const rotateY = ((x - centerX) / centerX) * 8;
    const rotateX = -((y - centerY) / centerY) * 8;
    setHeroTilt({ x: rotateX, y: rotateY });
  };

  const handleHeroMouseLeave = () => {
    setHeroTilt({ x: 0, y: 0 });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const workflowSteps = [
    { num: '01', title: 'Evidence', sub: 'Hash Ledger', desc: 'Ingest FIRs, CDR files, bank records with SHA-256 stamp.', icon: FileCheck2, color: '#16805C' },
    { num: '02', title: 'Entities', sub: 'Multi-Modal NER', desc: 'Extract suspect identities, IMEI devices, accounts, vehicles.', icon: UserCheck, color: '#2563EB' },
    { num: '03', title: 'Timeline', sub: 'Temporal Events', desc: 'Reconstruct chronological sequences across calls and transfers.', icon: Clock, color: '#163A5F' },
    { num: '04', title: 'Network', sub: 'Graph Topology', desc: 'Map multi-hop connections, bridge nodes, community clusters.', icon: Network, color: '#2563EB' },
    { num: '05', title: 'Analysis', sub: 'Epistemic Reasoning', desc: 'Formulate hypotheses and evaluate candidate hidden links.', icon: Search, color: '#B7791F' },
    { num: '06', title: 'Review', sub: 'Human Decision', desc: 'Resolve candidate identity matches with audit reasons.', icon: CheckSquare, color: '#16805C' },
    { num: '07', title: 'Report', sub: 'Court Dossier', desc: 'Generate Section 63 BSA certified investigative dossiers.', icon: FileText, color: '#163A5F' }
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col font-sans selection:bg-[#2563EB] selection:text-white overflow-x-hidden">
      {/* 1. INSTITUTIONAL HEADER */}
      <header className="h-16 border-b border-[#D9E0E8] bg-[#FFFFFF]/95 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between shadow-xs">
        <Logo size="sm" subtitle="Investigation Intelligence Platform" />

        {/* Public Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-[#475569] font-medium">
          <button onClick={() => scrollToSection('overview')} className="hover:text-[#163A5F] transition-colors">Overview</button>
          <button onClick={() => scrollToSection('workflow')} className="hover:text-[#163A5F] transition-colors">Workflow</button>
          <button onClick={() => scrollToSection('tactical-3d')} className="hover:text-[#163A5F] transition-colors flex items-center gap-1">
            <span>3D Tactical</span>
            <span className="text-[8px] font-mono font-bold px-1 py-0.2 bg-[#EFF6FF] text-[#2563EB] rounded border border-[#93C5FD]">3D</span>
          </button>
          <button onClick={() => scrollToSection('network')} className="hover:text-[#163A5F] transition-colors">Network Analysis</button>
          <button onClick={() => scrollToSection('provenance')} className="hover:text-[#163A5F] transition-colors">Provenance</button>
          <button onClick={() => scrollToSection('security')} className="hover:text-[#163A5F] transition-colors">Security & Access</button>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onDemoClick}
            className="px-3.5 py-1.5 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#172033] text-xs font-semibold font-mono transition-all hover:shadow-xs active:scale-95"
          >
            Explore Demo
          </button>
          <button
            onClick={onSignInClick}
            className="px-4 py-1.5 rounded bg-[#163A5F] hover:bg-[#0E2640] text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION WITH 3D PERSPECTIVE PARALLAX & ISOMETRIC PREVIEW */}
      <section id="overview" className="border-b border-[#D9E0E8] py-12 md:py-20 px-4 md:px-8 max-w-7xl mx-auto w-full relative">
        {/* Subtle Ambient Institutional Depth Glows */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#16805C]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading & Positioning */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#FFFFFF] border border-[#CBD5E1] text-[11px] font-mono text-[#163A5F] font-semibold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16805C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16805C]"></span>
              </span>
              <span>INSTITUTIONAL INTELLIGENCE ENGINE</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#172033] font-sans leading-[1.15]">
                Turn fragmented case evidence into connected intelligence.
              </h1>
            </div>

            <p className="text-sm md:text-base text-[#475569] leading-relaxed font-sans">
              Organize evidence, examine multi-modal entities, reconstruct chronologies and explore complex syndicates with 3D topology visualization from a single workspace.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onDemoClick}
                className="px-5 py-2.5 rounded bg-[#163A5F] hover:bg-[#0E2640] text-white text-xs font-bold font-mono transition-all flex items-center gap-2 shadow hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Explore Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onSignInClick}
                className="px-5 py-2.5 rounded bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] text-xs font-semibold font-mono transition-all flex items-center gap-2 shadow-2xs hover:shadow hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Sign In</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
              </button>
            </div>

            {/* 3D View Mode Controls */}
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center gap-2 text-xs font-mono text-[#64748B]">
              <span className="text-[10px] uppercase font-bold text-[#163A5F]">Interactive 3D View:</span>
              <button
                onClick={() => setIsIsometricView(false)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  !isIsometricView 
                    ? 'bg-[#163A5F] text-white shadow-xs' 
                    : 'bg-[#FFFFFF] border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                Parallax Tilt (Move Mouse)
              </button>
              <button
                onClick={() => setIsIsometricView(true)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  isIsometricView 
                    ? 'bg-[#163A5F] text-white shadow-xs' 
                    : 'bg-[#FFFFFF] border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                3D Isometric Layer
              </button>
            </div>
          </div>

          {/* Right Column: Realistic 3D Workstation Preview with Multi-Layer Parallax */}
          <div className="lg:col-span-7 perspective-1500">
            <div
              ref={heroCardRef}
              onMouseMove={handleHeroMouseMove}
              onMouseLeave={handleHeroMouseLeave}
              style={{
                transform: isIsometricView 
                  ? 'rotateX(14deg) rotateY(-14deg) rotateZ(2deg) translateY(-8px)' 
                  : `rotateX(${heroTilt.x}deg) rotateY(${heroTilt.y}deg)`,
                transition: isIsometricView || (heroTilt.x === 0 && heroTilt.y === 0) ? 'transform 0.5s ease-out, box-shadow 0.5s ease' : 'transform 0.1s ease-out',
                transformStyle: 'preserve-3d'
              }}
              className="relative workstation-card rounded-lg border border-[#D9E0E8] bg-[#FFFFFF] shadow-2xl overflow-visible font-sans cursor-pointer group"
            >
              {/* Floating 3D Badge 1 (Top-Right Depth Tag) */}
              <div 
                className="absolute -top-3.5 -right-3.5 z-30 px-2.5 py-1 rounded bg-[#163A5F] text-white text-[10px] font-mono font-bold shadow-lg border border-[#0E2640] flex items-center gap-1.5 animate-float-slow"
                style={{ transform: 'translateZ(45px)' }}
              >
                <span className="w-2 h-2 rounded-full bg-[#16805C] animate-pulse"></span>
                <span>3D TOPOLOGY // CTX-001</span>
              </div>

              {/* Floating 3D Badge 2 (Bottom-Left Depth Tag) */}
              <div 
                className="absolute -bottom-3 -left-3 z-30 px-2.5 py-1 rounded bg-[#FFFFFF] text-[#16805C] text-[10px] font-mono font-bold shadow-md border border-[#A7F3D0] flex items-center gap-1.5 animate-float-medium"
                style={{ transform: 'translateZ(40px)' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16805C]" />
                <span>SHA-256 AUDIT: 100% SECURE</span>
              </div>

              {/* Workspace Top Bar (Layer 1: TranslateZ 15px) */}
              <div 
                className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#D9E0E8] flex items-center justify-between text-xs font-mono rounded-t-lg"
                style={{ transform: 'translateZ(15px)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]"></span>
                  </div>
                  <span className="text-[#475569] pl-2 border-l border-[#CBD5E1] font-semibold">CASE CTX-001 // Operation Shadow Exchange</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#C53030] border border-[#F87171] text-[10px] font-bold">
                    PRIORITY: HIGH
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0] text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Workspace Module Tabs */}
              <div className="px-4 py-2 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center gap-4 text-[11px] font-mono overflow-x-auto">
                <span className="text-[#64748B] hover:text-[#172033] cursor-pointer">Overview</span>
                <span className="text-[#64748B] hover:text-[#172033] cursor-pointer">Evidence (14)</span>
                <span className="text-[#64748B] hover:text-[#172033] cursor-pointer">Entities (28)</span>
                <span className="text-[#64748B] hover:text-[#172033] cursor-pointer">Timeline</span>
                <span className="text-[#163A5F] font-bold border-b-2 border-[#163A5F] pb-0.5 cursor-pointer flex items-center gap-1">
                  <span>Network Graph</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></span>
                </span>
                <span className="text-[#64748B] hover:text-[#172033] cursor-pointer">Hypotheses</span>
                <span className="text-[#64748B] hover:text-[#172033] cursor-pointer">Report</span>
              </div>

              {/* Workspace Split Body */}
              <div className="grid grid-cols-1 sm:grid-cols-12 p-3 gap-3 bg-[#F8FAFC] rounded-b-lg">
                {/* Left Mini Ledger (5 cols - TranslateZ 25px) */}
                <div 
                  className="sm:col-span-5 space-y-2 font-mono text-[10px]"
                  style={{ transform: 'translateZ(25px)' }}
                >
                  <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#E2E8F0] space-y-1 shadow-2xs hover:border-[#CBD5E1] transition-all">
                    <div className="text-[#64748B] uppercase text-[9px] flex items-center justify-between">
                      <span>Primary Suspect Node</span>
                      <span className="text-[#16805C] font-bold">Observed</span>
                    </div>
                    <div className="text-xs font-bold text-[#172033] font-sans">Ravi Kumar</div>
                    <div className="text-[#64748B] text-[10px]">Alias: "RK Hawala" • 3 Devices</div>
                    <div className="text-[9px] text-[#2563EB] font-bold">Betweenness Centrality: 0.84</div>
                  </div>

                  <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#E2E8F0] space-y-1 shadow-2xs">
                    <div className="text-[#64748B] uppercase text-[9px] flex items-center justify-between">
                      <span>Linked Evidence Items</span>
                      <span className="text-[8px] font-mono text-[#16805C] font-bold">LOCKED</span>
                    </div>
                    <div className="space-y-1 text-[#334155]">
                      <div className="flex items-center justify-between truncate">
                        <span className="truncate">EVID-CDR-2026-001.csv</span>
                        <span className="text-[#16805C] font-bold ml-1">SHA-256 ✓</span>
                      </div>
                      <div className="flex items-center justify-between truncate">
                        <span className="truncate">BANK-MULE-TRANSFER.xlsx</span>
                        <span className="text-[#16805C] font-bold ml-1">SHA-256 ✓</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#E2E8F0] space-y-1 shadow-2xs">
                    <div className="text-[#64748B] uppercase text-[9px]">Timeline Sequence</div>
                    <div className="space-y-0.5 text-[9px] text-[#334155]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#2563EB] font-bold">09:10</span>
                        <span>Call to +91 98110 24819</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#B7791F] font-bold">09:31</span>
                        <span>INR 45L Transfer (HDFC)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#16805C] font-bold">10:02</span>
                        <span>Tower: CP Mandir Marg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Miniature Network Graph with Animated Flowing Edges (7 cols - TranslateZ 35px) */}
                <div 
                  className="sm:col-span-7 bg-[#FFFFFF] border border-[#E2E8F0] rounded p-2 relative flex flex-col justify-between min-h-[220px] shadow-2xs overflow-hidden"
                  style={{ transform: 'translateZ(35px)' }}
                >
                  {/* Subtle Background Grid */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#163A5F_1px,transparent_1px)] [background-size:12px_12px]"></div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-[#64748B] z-10">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16805C] animate-ping"></span>
                      <span>CYTOSCAPE MULTI-HOP GRAPH</span>
                    </span>
                    <span className="text-[#163A5F] font-bold">8 Nodes • 11 Edges</span>
                  </div>

                  {/* SVG Graph Visualization with Traveling Pulse Packets */}
                  <svg className="w-full h-44 z-10" viewBox="0 0 320 180">
                    {/* Observed Edges (Solid Green) */}
                    <line x1="160" y1="90" x2="80" y2="50" stroke="#16805C" strokeWidth="2.5" />
                    <line x1="160" y1="90" x2="80" y2="130" stroke="#16805C" strokeWidth="2.5" />
                    <line x1="160" y1="90" x2="240" y2="50" stroke="#16805C" strokeWidth="2.5" />
                    
                    {/* Inferred Edges (Dashed Blue) with animated dash-flow */}
                    <line x1="240" y1="50" x2="260" y2="130" stroke="#2563EB" strokeWidth="2" strokeDasharray="4,4" className="animate-edge-flow" />
                    <line x1="80" y1="50" x2="80" y2="130" stroke="#2563EB" strokeWidth="2" strokeDasharray="4,4" className="animate-edge-flow" />

                    {/* Predicted Edges (Dotted Amber) */}
                    <line x1="160" y1="90" x2="260" y2="130" stroke="#B7791F" strokeWidth="1.5" strokeDasharray="2,2" />

                    {/* Animated Data Packets (Pulsing SVG circles) */}
                    <circle r="3" fill="#16805C">
                      <animateMotion path="M 160 90 L 80 50" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3" fill="#2563EB">
                      <animateMotion path="M 240 50 L 260 130" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3" fill="#B7791F">
                      <animateMotion path="M 160 90 L 260 130" dur="3s" repeatCount="indefinite" />
                    </circle>

                    {/* Center: Ravi Kumar (Person) with Pulse Rings */}
                    <circle cx="160" cy="90" r="22" fill="#163A5F" opacity="0.15" className="animate-radar-pulse" />
                    <circle cx="160" cy="90" r="16" fill="#163A5F" stroke="#0E2640" strokeWidth="2" />
                    <text x="160" y="93" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="monospace">RAVI</text>
                    <text x="160" y="116" textAnchor="middle" fill="#334155" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Suspect IO</text>

                    {/* Node 1: Phone */}
                    <circle cx="80" cy="50" r="12" fill="#ECFDF5" stroke="#16805C" strokeWidth="2" />
                    <text x="80" y="53" textAnchor="middle" fill="#16805C" fontSize="7" fontWeight="bold" fontFamily="monospace">PHONE</text>
                    <text x="80" y="32" textAnchor="middle" fill="#475569" fontSize="7" fontFamily="sans-serif">+91-9811</text>

                    {/* Node 2: Account */}
                    <circle cx="80" cy="130" r="12" fill="#FFFBEB" stroke="#B7791F" strokeWidth="2" />
                    <text x="80" y="133" textAnchor="middle" fill="#B7791F" fontSize="7" fontWeight="bold" fontFamily="monospace">BANK</text>
                    <text x="80" y="152" textAnchor="middle" fill="#475569" fontSize="7" fontFamily="sans-serif">Mule Account</text>

                    {/* Node 3: Org */}
                    <circle cx="240" cy="50" r="13" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2" />
                    <text x="240" y="53" textAnchor="middle" fill="#2563EB" fontSize="7" fontWeight="bold" fontFamily="monospace">ORG</text>
                    <text x="240" y="32" textAnchor="middle" fill="#475569" fontSize="7" fontFamily="sans-serif">ShadowTech</text>

                    {/* Node 4: Associate Vikram */}
                    <circle cx="260" cy="130" r="12" fill="#F1F5F9" stroke="#163A5F" strokeWidth="2" />
                    <text x="260" y="133" textAnchor="middle" fill="#163A5F" fontSize="7" fontWeight="bold" fontFamily="monospace">VIKRAM</text>
                    <text x="260" y="152" textAnchor="middle" fill="#475569" fontSize="7" fontFamily="sans-serif">Associate</text>
                  </svg>

                  {/* Micro Graph Legend */}
                  <div className="flex items-center justify-between text-[8px] font-mono text-[#64748B] border-t border-[#E2E8F0] pt-1 z-10">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-[#16805C] inline-block"></span> Observed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-[#2563EB] inline-block border-b border-dashed"></span> Inferred
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-[#B7791F] inline-block border-b border-dotted"></span> Predicted
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2: FROM EVIDENCE TO INVESTIGATION (3D Stepped Pipeline with Light Beam Shimmer) */}
      <section id="workflow" className="border-b border-[#D9E0E8] py-16 px-4 md:px-8 bg-[#FFFFFF] relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#163A5F] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Structured Analytical Pipeline</span>
              </div>
              <h2 className="text-xl md:text-3xl font-bold text-[#172033] font-sans">
                FROM EVIDENCE TO INVESTIGATION
              </h2>
              <p className="text-xs text-[#64748B] max-w-2xl">
                A 7-stage verifiable progression converting heterogeneous seized records into court-ready intelligence.
              </p>
            </div>

            {/* Quick Interactive Step Progress Indicator */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1.5 rounded border border-[#E2E8F0] text-[10px] font-mono">
              <span className="text-[#64748B] px-1">Pipeline Step:</span>
              <span className="font-bold text-[#163A5F] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#CBD5E1]">
                {workflowSteps[activeWorkflowStep].num} // {workflowSteps[activeWorkflowStep].title}
              </span>
            </div>
          </div>

          {/* Connected Step Cards with 3D Depth on Hover */}
          <div className="relative">
            {/* Animated Traveling Shimmer Beam along Top */}
            <div className="hidden lg:block absolute -top-2 left-0 right-0 h-0.5 bg-[#E2E8F0] overflow-hidden">
              <div className="h-full w-48 bg-gradient-to-r from-transparent via-[#2563EB] to-transparent animate-[beam-slide_3s_linear_infinite]"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 font-sans text-xs">
              {workflowSteps.map((step, idx) => {
                const IconComponent = step.icon;
                const isActive = activeWorkflowStep === idx;
                return (
                  <div 
                    key={step.num}
                    onClick={() => setActiveWorkflowStep(idx)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer card-3d-interactive flex flex-col justify-between ${
                      isActive 
                        ? 'bg-[#FFFFFF] border-[#163A5F] shadow-md -translate-y-1 ring-1 ring-[#163A5F]/20' 
                        : 'bg-[#F8FAFC] border-[#D9E0E8] shadow-2xs hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                        <span className={`font-mono text-[10px] font-bold ${isActive ? 'text-[#2563EB]' : 'text-[#163A5F]'}`}>
                          {step.num}
                        </span>
                        <IconComponent className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                      </div>
                      <div className="font-bold text-[#172033] mt-2 text-sm font-sans flex items-center gap-1">
                        <span>{step.title}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#16805C] animate-pulse"></span>}
                      </div>
                      <p className="text-[#64748B] text-[11px] leading-relaxed mt-1">
                        {step.desc}
                      </p>
                    </div>
                    <div className="text-[10px] font-mono pt-2 border-t border-[#E2E8F0] font-bold flex items-center justify-between" style={{ color: step.color }}>
                      <span>→ {step.sub}</span>
                      {isActive && <ChevronRight className="w-3 h-3 text-[#163A5F]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. NEW SECTION: 3D TACTICAL RADAR & FORENSIC INTEGRITY VAULT */}
      <section id="tactical-3d" className="border-b border-[#D9E0E8] py-16 px-4 md:px-8 bg-[#F5F7FA] relative">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-1">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#163A5F] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Institutional 3D Intelligence Modules</span>
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-[#172033] font-sans">
              TACTICAL RADAR & FORENSIC VAULT
            </h2>
            <p className="text-xs text-[#64748B] max-w-2xl">
              Real-time multi-dimensional intelligence scanning combined with a 3D cryptographic proof engine for Section 63 BSA evidence compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: 3D Tactical Radar Scanner (6 cols) */}
            <div className="lg:col-span-6 workstation-card p-6 rounded-lg border border-[#D9E0E8] bg-[#FFFFFF] shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#16805C] animate-pulse" />
                  <span className="font-bold text-[#172033]">TACTICAL SYNDICATE RADAR</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRadarScanning(!isRadarScanning)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold border transition-colors bg-[#F8FAFC] border-[#CBD5E1] text-[#163A5F] hover:bg-[#F1F5F9]"
                  >
                    {isRadarScanning ? 'Pause Sweep' : 'Resume Sweep'}
                  </button>
                  <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#16805C] text-[10px] font-bold border border-[#A7F3D0]">
                    24/7 LIVE
                  </span>
                </div>
              </div>

              {/* Radar Screen Visualizer */}
              <div className="relative w-full h-72 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] overflow-hidden flex items-center justify-center">
                {/* Tactical Concentric Radar Rings */}
                <div className="absolute w-60 h-60 rounded-full border border-[#CBD5E1] opacity-70"></div>
                <div className="absolute w-44 h-44 rounded-full border border-[#CBD5E1] opacity-70"></div>
                <div className="absolute w-28 h-28 rounded-full border border-[#CBD5E1] opacity-70"></div>
                <div className="absolute w-12 h-12 rounded-full border border-[#CBD5E1] opacity-70"></div>

                {/* Crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#CBD5E1] opacity-60"></div>
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#CBD5E1] opacity-60"></div>

                {/* Sweeping Sonar Conical Beam */}
                {isRadarScanning && (
                  <div 
                    className="absolute w-64 h-64 rounded-full pointer-events-none animate-radar-sweep"
                    style={{
                      background: 'conic-gradient(from 0deg, rgba(37, 99, 235, 0.25) 0deg, rgba(22, 128, 92, 0.05) 60deg, transparent 90deg, transparent 360deg)'
                    }}
                  ></div>
                )}

                {/* Target Blip 1 (Center IO Suspect) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#163A5F] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#163A5F] border-2 border-white"></span>
                  </span>
                  <span className="mt-1 text-[8px] font-mono font-bold text-[#163A5F] bg-[#FFFFFF] px-1 rounded shadow-2xs border border-[#CBD5E1]">
                    TARGET: RAVI
                  </span>
                </div>

                {/* Target Blip 2 (Burner SIM Tower - CP Mandir Marg) */}
                <div className="absolute top-1/4 left-1/3 flex flex-col items-center group cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16805C] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#16805C] border-2 border-white"></span>
                  </span>
                  <span className="mt-1 text-[8px] font-mono text-[#16805C] font-bold bg-[#ECFDF5] px-1 rounded border border-[#A7F3D0]">
                    TOWER PING
                  </span>
                </div>

                {/* Target Blip 3 (Mule Account Wire Transfer) */}
                <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center group cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B7791F] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#B7791F] border-2 border-white"></span>
                  </span>
                  <span className="mt-1 text-[8px] font-mono text-[#B7791F] font-bold bg-[#FFFBEB] px-1 rounded border border-[#FDE68A]">
                    INR 45L WIRE
                  </span>
                </div>

                {/* Tactical Info Overlay */}
                <div className="absolute bottom-2 left-2 text-[9px] font-mono text-[#64748B] bg-white/90 px-2 py-1 rounded border border-[#E2E8F0]">
                  <span>RANGE: 50KM • SECTOR: NCR NORTH • BLIPS: 3 ACTIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[9px] text-[#64748B]">CONFIRMED NODES</div>
                  <div className="text-sm font-bold text-[#16805C]">14 Verified</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[9px] text-[#64748B]">PREDICTED LINKS</div>
                  <div className="text-sm font-bold text-[#B7791F]">4 Candidate</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[9px] text-[#64748B]">CLUSTER DENSITY</div>
                  <div className="text-sm font-bold text-[#2563EB]">0.78 High</div>
                </div>
              </div>
            </div>

            {/* Right: 3D Rotating Forensic Integrity Vault (6 cols) */}
            <div className="lg:col-span-6 workstation-card p-6 rounded-lg border border-[#D9E0E8] bg-[#FFFFFF] shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#2563EB]" />
                  <span className="font-bold text-[#172033]">3D FORENSIC INTEGRITY CUBE</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCubeAutoRotating(!isCubeAutoRotating)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold border transition-colors bg-[#F8FAFC] border-[#CBD5E1] text-[#163A5F] hover:bg-[#F1F5F9]"
                  >
                    {isCubeAutoRotating ? 'Pause Orbit' : 'Auto Rotate'}
                  </button>
                  <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold border border-[#93C5FD]">
                    SEC 63 BSA
                  </span>
                </div>
              </div>

              {/* 3D Isometric Forensic Wafer / Cube Viewport */}
              <div className="h-72 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] flex items-center justify-center perspective-1000 overflow-hidden relative">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[linear-gradient(to_right,#163A5F_1px,transparent_1px),linear-gradient(to_bottom,#163A5F_1px,transparent_1px)] bg-[size:16px_16px]"></div>

                {/* 3D Cube Container */}
                <div 
                  className={`w-32 h-32 relative preserve-3d ${isCubeAutoRotating ? 'animate-spin-cube' : ''}`}
                  style={{
                    transform: isCubeAutoRotating ? undefined : `rotateX(-20deg) rotateY(${cubeActiveFace * 90}deg)`
                  }}
                >
                  {/* Face 1: SHA-256 Digest */}
                  <div className="cube-face-front absolute inset-0 bg-[#FFFFFF] border-2 border-[#16805C] rounded-lg p-2.5 flex flex-col justify-between shadow-lg text-[9px] font-mono backface-hidden">
                    <div className="flex justify-between items-center text-[#16805C] font-bold">
                      <span>SHA-256</span>
                      <FileCheck2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[7px] text-[#475569] truncate font-mono bg-[#F8FAFC] p-1 rounded">
                      7f83b1657ff1...
                    </div>
                    <div className="text-[8px] text-[#16805C] font-bold">TAMPER PROOF</div>
                  </div>

                  {/* Face 2: Section 63 BSA */}
                  <div className="cube-face-right absolute inset-0 bg-[#FFFFFF] border-2 border-[#163A5F] rounded-lg p-2.5 flex flex-col justify-between shadow-lg text-[9px] font-mono backface-hidden">
                    <div className="flex justify-between items-center text-[#163A5F] font-bold">
                      <span>SEC 63 BSA</span>
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[8px] text-[#475569]">LEGAL INTEGRITY</div>
                    <div className="text-[8px] text-[#163A5F] font-bold">COURT READY</div>
                  </div>

                  {/* Face 3: Custody Seal */}
                  <div className="cube-face-back absolute inset-0 bg-[#FFFFFF] border-2 border-[#2563EB] rounded-lg p-2.5 flex flex-col justify-between shadow-lg text-[9px] font-mono backface-hidden">
                    <div className="flex justify-between items-center text-[#2563EB] font-bold">
                      <span>CUSTODY</span>
                      <FolderLock className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[8px] text-[#475569]">OFFICER STAMP</div>
                    <div className="text-[8px] text-[#2563EB] font-bold">IMMUTABLE</div>
                  </div>

                  {/* Face 4: Temporal Timestamp */}
                  <div className="cube-face-left absolute inset-0 bg-[#FFFFFF] border-2 border-[#B7791F] rounded-lg p-2.5 flex flex-col justify-between shadow-lg text-[9px] font-mono backface-hidden">
                    <div className="flex justify-between items-center text-[#B7791F] font-bold">
                      <span>TIMESTAMP</span>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[8px] text-[#475569]">NTP SYNCHRONIZED</div>
                    <div className="text-[8px] text-[#B7791F] font-bold">09:10:44 UTC</div>
                  </div>

                  {/* Face 5: Top */}
                  <div className="cube-face-top absolute inset-0 bg-[#F1F5F9] border-2 border-[#CBD5E1] rounded-lg p-2 flex items-center justify-center font-mono font-bold text-[#163A5F] text-[9px]">
                    CIPHERTRACE
                  </div>

                  {/* Face 6: Bottom */}
                  <div className="cube-face-bottom absolute inset-0 bg-[#F1F5F9] border-2 border-[#CBD5E1] rounded-lg p-2 flex items-center justify-center font-mono font-bold text-[#163A5F] text-[9px]">
                    VERIFIED
                  </div>
                </div>

                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  {[0, 1, 2, 3].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsCubeAutoRotating(false);
                        setCubeActiveFace(idx);
                      }}
                      className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all ${
                        cubeActiveFace === idx && !isCubeAutoRotating
                          ? 'bg-[#163A5F] text-white'
                          : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-sans text-[#475569] flex items-center justify-between">
                <span>Cryptographic verification guarantee with deterministic hashing at data ingestion.</span>
                <span className="font-mono text-[10px] font-bold text-[#16805C] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                  VALIDATED
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION 3: ONE INVESTIGATION WORKSPACE (Six 3D Interactive Capabilities) */}
      <section className="border-b border-[#D9E0E8] py-16 px-4 md:px-8 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-1">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#163A5F]">
              Operational Modules
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-[#172033] font-sans">
              ONE INVESTIGATION WORKSPACE
            </h2>
            <p className="text-xs text-[#64748B] max-w-2xl">
              Consolidate multi-source evidentiary analysis into a unified institutional workspace with 3D interactive drill-down.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
            {/* 1. Evidence */}
            <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] space-y-3 shadow-2xs card-3d-interactive group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[#163A5F]">
                  <FileCheck2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <h3 className="text-sm font-bold text-[#172033] font-mono">Evidence</h3>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]">
                  SHA-256
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Raw data ingestion, file integrity verification with SHA-256 hashes, metadata extraction, and multi-source record support (PDF, CSV, JSON, CDR).
              </p>
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#64748B] space-y-1 group-hover:border-[#CBD5E1] transition-colors">
                <div className="flex justify-between text-[#172033] font-semibold">
                  <span>EVID-2026-CDR-001.csv</span>
                  <span className="text-[#16805C]">SHA-256 Verified</span>
                </div>
                <div className="text-[#64748B] truncate">7f83b1657ff1fc53b92dc18148a1d65d...</div>
              </div>
            </div>

            {/* 2. Entity 360 */}
            <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] space-y-3 shadow-2xs card-3d-interactive group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[#163A5F]">
                  <UserCheck className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <h3 className="text-sm font-bold text-[#172033] font-mono">Entity 360</h3>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#93C5FD]">
                  DOSSIER
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Comprehensive entity dossiers mapping suspect identities, aliases, associated mobile numbers, IMEI devices, vehicles, bank accounts, and case references.
              </p>
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#64748B] space-y-1 group-hover:border-[#CBD5E1] transition-colors">
                <div className="flex justify-between text-[#172033] font-semibold">
                  <span>Ravi Kumar (Suspect)</span>
                  <span className="text-[#2563EB]">3 Phone • 2 Bank</span>
                </div>
                <div className="text-[#64748B]">Cross-case linkages: CTX-001, CTX-004</div>
              </div>
            </div>

            {/* 3. Timeline */}
            <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] space-y-3 shadow-2xs card-3d-interactive group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[#163A5F]">
                  <Clock className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <h3 className="text-sm font-bold text-[#172033] font-mono">Timeline</h3>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#B7791F] border border-[#FDE68A]">
                  TEMPORAL
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Multi-stream chronological reconstruction uniting communications, banking transfers, tower relocations, and incident events in unified sequence.
              </p>
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#64748B] space-y-1 group-hover:border-[#CBD5E1] transition-colors">
                <div className="flex justify-between text-[#172033] font-semibold">
                  <span>09:31 Financial Transfer</span>
                  <span className="text-[#B7791F]">INR 45,00,000</span>
                </div>
                <div className="text-[#64748B]">Correlated with Call at 09:10 (12m delta)</div>
              </div>
            </div>

            {/* 4. Network Analysis */}
            <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] space-y-3 shadow-2xs card-3d-interactive group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[#163A5F]">
                  <Network className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <h3 className="text-sm font-bold text-[#172033] font-mono">Network Analysis</h3>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#93C5FD]">
                  CYTOSCAPE
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Graph metrics, degree & betweenness centrality, community detection, bridge node identification, shortest paths, and candidate link predictions.
              </p>
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#64748B] space-y-1 group-hover:border-[#CBD5E1] transition-colors">
                <div className="flex justify-between text-[#172033] font-semibold">
                  <span>Betweenness: 0.84 (Bridge)</span>
                  <span className="text-[#2563EB]">K-Core: 4</span>
                </div>
                <div className="text-[#64748B]">Connects Hawala Cluster A to Mule Ring B</div>
              </div>
            </div>

            {/* 5. Analysis & Review */}
            <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] space-y-3 shadow-2xs card-3d-interactive group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[#163A5F]">
                  <Scale className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <h3 className="text-sm font-bold text-[#172033] font-mono">Analysis & Review</h3>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]">
                  EPISTEMIC
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Hypothesis formulation with multi-perspective analysis, counterfactual ablations, candidate entity resolution, and strict epistemic tagging.
              </p>
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#64748B] space-y-1 group-hover:border-[#CBD5E1] transition-colors">
                <div className="flex justify-between text-[#172033]">
                  <span className="text-[#16805C] font-bold">[EVIDENCE] CDR Match</span>
                  <span className="text-[#2563EB] font-bold">[INFERENCE]</span>
                </div>
                <div className="text-[#64748B]">Uncertainty: Device ownership unverified</div>
              </div>
            </div>

            {/* 6. Reports */}
            <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] space-y-3 shadow-2xs card-3d-interactive group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[#163A5F]">
                  <FileText className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <h3 className="text-sm font-bold text-[#172033] font-mono">Reports</h3>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#163A5F] border border-[#CBD5E1]">
                  DOSSIER
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Court-ready case dossier generation compiling overview, evidence catalog, entity dossiers, timeline breakdown, graph findings, and full audit logs.
              </p>
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#64748B] space-y-1 group-hover:border-[#CBD5E1] transition-colors">
                <div className="flex justify-between text-[#172033] font-semibold">
                  <span>Case Dossier CTX-001</span>
                  <span className="text-[#16805C]">Ready to Export</span>
                </div>
                <div className="text-[#64748B]">Includes Section 63 BSA Hash Certifications</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 4: UNDERSTAND THE NETWORK (Centerpiece Light Graph with 3D Depth Toggles) */}
      <section id="network" className="border-b border-[#D9E0E8] py-16 px-4 md:px-8 bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#163A5F]">
                Scientific Data Visualization
              </div>
              <h2 className="text-xl md:text-3xl font-bold text-[#172033] font-sans">
                UNDERSTAND THE NETWORK
              </h2>
              <p className="text-xs text-[#64748B] max-w-2xl">
                Interactive relationship visualization across suspects, communication devices, bank accounts, front companies, and physical locations with 4-tier semantic edge classification.
              </p>
            </div>

            {/* 3D Perspective Controls for Network */}
            <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1.5 rounded-lg border border-[#D9E0E8] text-xs font-mono shadow-2xs">
              <span className="text-[#64748B] text-[10px] font-bold px-1">Graph Angle:</span>
              <button
                onClick={() => setGraph3DAngle('flat')}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  graph3DAngle === 'flat' ? 'bg-[#163A5F] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                2D Orthographic
              </button>
              <button
                onClick={() => setGraph3DAngle('isometric')}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  graph3DAngle === 'isometric' ? 'bg-[#163A5F] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                3D Isometric
              </button>
              <button
                onClick={() => setGraph3DAngle('steep')}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  graph3DAngle === 'steep' ? 'bg-[#163A5F] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                3D Angled Depth
              </button>
            </div>
          </div>

          {/* Large Realistic Network Workstation Container */}
          <div className="workstation-card rounded-lg border border-[#D9E0E8] bg-[#FFFFFF] shadow-md p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0] text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-[#172033] font-bold">CASE CTX-001: SYNTHETIC SYNDICATE TOPOLOGY</span>
                <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#93C5FD] text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></span>
                  <span>CYTOSCAPE VIEW</span>
                </span>
              </div>

              {/* Edge Semantics Legend */}
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#16805C] inline-block"></span>
                  <span className="text-[#334155] font-medium">Observed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2563EB] inline-block border-b border-dashed"></span>
                  <span className="text-[#334155] font-medium">Inferred</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#B7791F] inline-block border-b border-dotted"></span>
                  <span className="text-[#334155] font-medium">Predicted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#C53030] inline-block"></span>
                  <span className="text-[#334155] font-medium">Contested</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Center Graph Canvas (8 Cols) */}
              <div className="lg:col-span-8 bg-[#F8FAFC] border border-[#D9E0E8] rounded-lg p-4 relative min-h-[400px] flex items-center justify-center perspective-1000 overflow-hidden">
                {/* Tactical grid background */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#163A5F_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <div 
                  className="w-full transition-all duration-500 ease-out"
                  style={{
                    transform: 
                      graph3DAngle === 'isometric' ? 'rotateX(16deg) rotateY(-10deg) scale(0.96)' :
                      graph3DAngle === 'steep' ? 'rotateX(25deg) rotateY(-18deg) scale(0.92)' : 'none',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <svg className="w-full h-84" viewBox="0 0 500 300">
                    {/* Observed Edges (Solid Green #16805C) */}
                    <line x1="250" y1="150" x2="130" y2="80" stroke="#16805C" strokeWidth="2.5" />
                    <line x1="250" y1="150" x2="130" y2="220" stroke="#16805C" strokeWidth="2.5" />
                    <line x1="250" y1="150" x2="370" y2="80" stroke="#16805C" strokeWidth="2.5" />
                    <line x1="130" y1="80" x2="60" y2="150" stroke="#16805C" strokeWidth="2" />

                    {/* Inferred Edges (Dashed Blue #2563EB) */}
                    <line x1="370" y1="80" x2="420" y2="180" stroke="#2563EB" strokeWidth="2" strokeDasharray="6,4" className="animate-edge-flow" />
                    <line x1="130" y1="220" x2="250" y2="260" stroke="#2563EB" strokeWidth="2" strokeDasharray="6,4" className="animate-edge-flow" />

                    {/* Predicted Edges (Dotted Amber #B7791F) */}
                    <line x1="250" y1="150" x2="420" y2="180" stroke="#B7791F" strokeWidth="2" strokeDasharray="3,3" />

                    {/* Contested Edges (Red #C53030) */}
                    <line x1="370" y1="80" x2="250" y2="260" stroke="#C53030" strokeWidth="2" strokeDasharray="4,2" />

                    {/* Traveling Data Packets */}
                    <circle r="3.5" fill="#16805C">
                      <animateMotion path="M 250 150 L 130 80" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3.5" fill="#2563EB">
                      <animateMotion path="M 370 80 L 420 180" dur="2.8s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3.5" fill="#B7791F">
                      <animateMotion path="M 250 150 L 420 180" dur="3.2s" repeatCount="indefinite" />
                    </circle>

                    {/* Node 1: Ravi Kumar (Center - Person) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedNetworkNode('ravi')}>
                      <circle cx="250" cy="150" r="28" fill="#163A5F" opacity="0.15" className="animate-radar-pulse" />
                      <circle cx="250" cy="150" r="22" fill="#163A5F" stroke="#0E2640" strokeWidth={selectedNetworkNode === 'ravi' ? 3.5 : 1.5} className="transition-all group-hover:scale-110" />
                      <text x="250" y="154" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">RAVI</text>
                      <text x="250" y="184" textAnchor="middle" fill="#172033" fontSize="9" fontWeight="bold">Ravi Kumar (IO)</text>
                      <text x="250" y="195" textAnchor="middle" fill="#64748B" fontSize="8">Bridge Node</text>
                    </g>

                    {/* Node 2: Burner Phone */}
                    <g className="cursor-pointer group" onClick={() => setSelectedNetworkNode('phone')}>
                      <circle cx="130" cy="80" r="16" fill="#ECFDF5" stroke="#16805C" strokeWidth={selectedNetworkNode === 'phone' ? 3.5 : 2} className="transition-all group-hover:scale-110" />
                      <text x="130" y="83" textAnchor="middle" fill="#16805C" fontSize="8" fontWeight="bold" fontFamily="monospace">PHONE</text>
                      <text x="130" y="58" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="medium">+91 98110 24819</text>
                    </g>

                    {/* Node 3: Mule Bank Account */}
                    <g className="cursor-pointer group" onClick={() => setSelectedNetworkNode('account')}>
                      <circle cx="130" cy="220" r="16" fill="#FFFBEB" stroke="#B7791F" strokeWidth={selectedNetworkNode === 'account' ? 3.5 : 2} className="transition-all group-hover:scale-110" />
                      <text x="130" y="223" textAnchor="middle" fill="#B7791F" fontSize="8" fontWeight="bold" fontFamily="monospace">BANK</text>
                      <text x="130" y="246" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="medium">HDFC Mule #4819</text>
                    </g>

                    {/* Node 4: Front Organization */}
                    <g className="cursor-pointer group" onClick={() => setSelectedNetworkNode('org')}>
                      <circle cx="370" cy="80" r="17" fill="#EFF6FF" stroke="#2563EB" strokeWidth={selectedNetworkNode === 'org' ? 3.5 : 2} className="transition-all group-hover:scale-110" />
                      <text x="370" y="83" textAnchor="middle" fill="#2563EB" fontSize="8" fontWeight="bold" fontFamily="monospace">ORG</text>
                      <text x="370" y="58" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="medium">ShadowTech Global</text>
                    </g>

                    {/* Node 5: Associate Vikram */}
                    <g className="cursor-pointer group" onClick={() => setSelectedNetworkNode('vikram')}>
                      <circle cx="420" cy="180" r="16" fill="#F1F5F9" stroke="#163A5F" strokeWidth={selectedNetworkNode === 'vikram' ? 3.5 : 2} className="transition-all group-hover:scale-110" />
                      <text x="420" y="183" textAnchor="middle" fill="#163A5F" fontSize="8" fontWeight="bold" fontFamily="monospace">VIKRAM</text>
                      <text x="420" y="206" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="medium">Vikram Malhotra</text>
                    </g>

                    {/* Node 6: Tower Location */}
                    <g className="cursor-pointer group" onClick={() => setSelectedNetworkNode('location')}>
                      <circle cx="60" cy="150" r="14" fill="#F8FAFC" stroke="#64748B" strokeWidth={selectedNetworkNode === 'location' ? 3.5 : 2} className="transition-all group-hover:scale-110" />
                      <text x="60" y="153" textAnchor="middle" fill="#475569" fontSize="7" fontWeight="bold" fontFamily="monospace">TOWER</text>
                      <text x="60" y="172" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="medium">Mandir Marg</text>
                    </g>

                    {/* Node 7: Offshore Remittance */}
                    <g className="cursor-pointer group" onClick={() => setSelectedNetworkNode('remittance')}>
                      <circle cx="250" cy="260" r="14" fill="#FFFBEB" stroke="#B7791F" strokeWidth={selectedNetworkNode === 'remittance' ? 3.5 : 2} className="transition-all group-hover:scale-110" />
                      <text x="250" y="263" textAnchor="middle" fill="#B7791F" fontSize="7" fontWeight="bold" fontFamily="monospace">SWISS</text>
                      <text x="250" y="285" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="medium">Alpine Bank Geneva</text>
                    </g>
                  </svg>
                </div>

                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-[#64748B] bg-white/90 px-2 py-1 rounded border border-[#E2E8F0]">
                  Click any node to inspect analytical signals
                </div>
              </div>

              {/* Right Side Node Inspector (4 Cols) */}
              <div className="lg:col-span-4 workstation-panel p-4 rounded-lg space-y-4 font-mono text-xs bg-[#F8FAFC] border border-[#D9E0E8]">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <span className="text-[#64748B] uppercase text-[10px]">Entity Inspector</span>
                  <span className="text-[#163A5F] text-[10px] font-bold">NODE DOSSIER</span>
                </div>

                {selectedNetworkNode === 'ravi' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-bold text-[#172033] font-sans">Ravi Kumar</div>
                      <div className="text-[11px] text-[#64748B]">Classification: PRIMARY_SUSPECT</div>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-[#334155]">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Degree Centrality:</span>
                        <span className="text-[#163A5F] font-bold">0.84 (High)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Betweenness Centrality:</span>
                        <span className="text-[#163A5F] font-bold">0.72 (Bridge Node)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Confirmed Relations:</span>
                        <span className="text-[#16805C] font-bold">4 Observed</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Predicted Links:</span>
                        <span className="text-[#B7791F] font-bold">1 Candidate</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#E2E8F0] text-[10px] text-[#475569] space-y-1 shadow-2xs">
                      <div className="text-[#163A5F] font-bold">Analytical Note:</div>
                      <p className="font-sans leading-relaxed">
                        Acts as structural bridge between local SIM-box infrastructure and overseas Hawala ledger.
                      </p>
                    </div>
                  </div>
                )}

                {selectedNetworkNode === 'phone' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-bold text-[#172033] font-sans">+91 98110 24819</div>
                      <div className="text-[11px] text-[#64748B]">Type: MOBILE_CDR_RECORD</div>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-[#334155]">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Telecom Provider:</span>
                        <span className="text-[#172033]">Airtel Delhi</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Call Volume:</span>
                        <span className="text-[#172033]">142 Calls (30 Days)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Verification:</span>
                        <span className="text-[#16805C] font-bold">CDR Seized</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedNetworkNode !== 'ravi' && selectedNetworkNode !== 'phone' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-bold text-[#172033] font-sans">Entity Selected</div>
                      <div className="text-[11px] text-[#64748B]">Institutional Knowledge Graph Record</div>
                    </div>
                    <p className="text-[11px] text-[#64748B] font-sans leading-relaxed">
                      Every graph entity maintains real linkbacks to source CDRs, bank statements, or location logs.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 5: TRACE EVERY FINDING (3D Connected Provenance Chain) */}
      <section id="provenance" className="border-b border-[#D9E0E8] py-16 px-4 md:px-8 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-1">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#163A5F]">
              Evidentiary Traceability
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-[#172033] font-sans">
              TRACE EVERY FINDING
            </h2>
            <p className="text-xs text-[#64748B] max-w-2xl">
              Analytical findings remain strictly traceable to source evidence with cryptographic verifiability.
            </p>
          </div>

          {/* Connected Traceability Chain with 3D Card Hover */}
          <div className="p-6 rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] space-y-6 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 card-3d-interactive">
                <div className="text-[#163A5F] font-bold text-[10px]">01 // SEIZED EVIDENCE</div>
                <div className="text-[#172033] font-semibold">CDR-2026-DEL.csv</div>
                <div className="text-[10px] text-[#16805C] font-bold">SHA-256 Stamped</div>
              </div>

              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 card-3d-interactive">
                <div className="text-[#163A5F] font-bold text-[10px]">02 // EXTRACTED ENTITY</div>
                <div className="text-[#172033] font-semibold">+91 98110 24819</div>
                <div className="text-[10px] text-[#64748B]">Linked to IMEI 8612..</div>
              </div>

              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 card-3d-interactive">
                <div className="text-[#163A5F] font-bold text-[10px]">03 // RELATIONSHIP</div>
                <div className="text-[#172033] font-semibold">CALLED (142x)</div>
                <div className="text-[10px] text-[#16805C] font-bold">Observed Direct Link</div>
              </div>

              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 card-3d-interactive">
                <div className="text-[#163A5F] font-bold text-[10px]">04 // ANALYSIS</div>
                <div className="text-[#172033] font-semibold">Communication Burst</div>
                <div className="text-[10px] text-[#B7791F] font-bold">Pre-Transfer Delta</div>
              </div>

              <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 card-3d-interactive">
                <div className="text-[#163A5F] font-bold text-[10px]">05 // HUMAN REVIEW</div>
                <div className="text-[#172033] font-semibold">IO Verified</div>
                <div className="text-[10px] text-[#16805C] font-bold">Signed in Ledger</div>
              </div>
            </div>

            <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between font-mono">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#16805C]" />
                <span>Section 63 BSA 2023 Electronic Evidence Standard</span>
              </span>
              <span className="text-[#16805C] font-bold">Cryptographically Grounded</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SECTION 6: DESIGNED FOR HUMAN REVIEW */}
      <section className="border-b border-[#D9E0E8] py-16 px-4 md:px-8 bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#163A5F]">
              Decision Support
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-[#172033] font-sans">
              DESIGNED FOR HUMAN REVIEW
            </h2>
            <p className="text-xs text-[#475569] leading-relaxed font-sans">
              The system operates as an analytical decision-support tool. It presents evidence, inferences, and uncertainties with clear classification — but never determines guilt or replaces investigator judgment.
            </p>
            <div className="space-y-2 text-xs text-[#475569] font-sans">
              <div className="flex items-start gap-2">
                <span className="text-[#163A5F] font-bold font-mono">▸</span>
                <span><strong className="text-[#172033]">Epistemic Tagging:</strong> Explicit classification of all analytical statements.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#163A5F] font-bold font-mono">▸</span>
                <span><strong className="text-[#172033]">No Black-Box Scoring:</strong> No automated percentages claiming citizen guilt.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#163A5F] font-bold font-mono">▸</span>
                <span><strong className="text-[#172033]">Investigator Validation:</strong> All candidate entity merges and link predictions require human signoff.</span>
              </div>
            </div>
          </div>

          {/* Epistemic Badges Preview */}
          <div className="lg:col-span-6 workstation-card p-5 rounded-lg border border-[#D9E0E8] bg-[#FFFFFF] space-y-3 font-mono text-xs shadow-2xs card-3d-interactive">
            <div className="text-[#64748B] uppercase text-[10px] pb-2 border-b border-[#E2E8F0]">
              Epistemic Classification Framework
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#A7F3D0] flex items-start gap-2 shadow-2xs">
                <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#16805C] font-bold text-[10px] shrink-0 border border-[#16805C]">
                  [EVIDENCE]
                </span>
                <span className="text-[#334155] text-[11px] font-sans">
                  Direct primary record: Location log places Device X at CP Tower at 09:10.
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#93C5FD] flex items-start gap-2 shadow-2xs">
                <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] font-bold text-[10px] shrink-0 border border-[#2563EB]">
                  [INFERENCE]
                </span>
                <span className="text-[#334155] text-[11px] font-sans">
                  Temporal correlation: Call occurred 12 minutes prior to the Hawala siphoning transaction.
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#FDE68A] flex items-start gap-2 shadow-2xs">
                <span className="px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#B7791F] font-bold text-[10px] shrink-0 border border-[#B7791F]">
                  [UNCERTAINTY]
                </span>
                <span className="text-[#334155] text-[11px] font-sans">
                  Ownership gap: SIM was registered under unverified identity; physical recovery pending.
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#6EE7B7] flex items-start gap-2 shadow-2xs">
                <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#047857] font-bold text-[10px] shrink-0 border border-[#059669]">
                  [HUMAN VERIFIED]
                </span>
                <span className="text-[#334155] text-[11px] font-sans">
                  Senior IO approved finding for inclusion in chargesheet dossier.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. SECTION 7: SECURITY & ACCESS */}
      <section id="security" className="border-b border-[#D9E0E8] py-16 px-4 md:px-8 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-1">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#163A5F]">
              Institutional Governance
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-[#172033] font-sans">
              SECURITY & ACCESS
            </h2>
            <p className="text-xs text-[#64748B] max-w-2xl">
              Strict access controls, auditability, and data integrity safeguards designed for sensitive investigations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans text-xs">
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] space-y-2 shadow-2xs card-3d-interactive">
              <div className="flex items-center gap-2 text-[#163A5F] font-mono font-bold">
                <Lock className="w-4 h-4" />
                <span>Role-Based Access (RBAC)</span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                6 institutional tiers: Investigator, Supervisor, Legal Analyst, Forensic Analyst, Intel Analyst, and Admin.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] space-y-2 shadow-2xs card-3d-interactive">
              <div className="flex items-center gap-2 text-[#163A5F] font-mono font-bold">
                <FileCheck2 className="w-4 h-4" />
                <span>Evidence Integrity</span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                Deterministic SHA-256 digests stamped on all raw files at intake to prevent and detect tampering.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] space-y-2 shadow-2xs card-3d-interactive">
              <div className="flex items-center gap-2 text-[#163A5F] font-mono font-bold">
                <History className="w-4 h-4" />
                <span>Immutable Audit Trail</span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                Every file access, entity merge, candidate rejection, and report generation is logged with officer stamp.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] space-y-2 shadow-2xs card-3d-interactive">
              <div className="flex items-center gap-2 text-[#163A5F] font-mono font-bold">
                <FolderLock className="w-4 h-4" />
                <span>Controlled Access</span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                Granular case-level permissions, classified investigation boundaries, and strict team roster segregation.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] space-y-2 shadow-2xs card-3d-interactive">
              <div className="flex items-center gap-2 text-[#163A5F] font-mono font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Privacy & DPDP Safeguards</span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                Data protection handling aligned with national statutory privacy standards and need-to-know protocols.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E0E8] space-y-2 shadow-2xs card-3d-interactive">
              <div className="flex items-center gap-2 text-[#163A5F] font-mono font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>System Limitations</span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                Explicit operational disclosures preventing reliance on uncorroborated analytical suggestions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. SECTION 8: EXPLORE THE DEMONSTRATION (Clear CTA) */}
      <section className="py-20 px-4 md:px-8 bg-[#F5F7FA] text-center border-b border-[#D9E0E8] relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-mono text-[#163A5F] font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#16805C] animate-pulse"></span>
            <span>SYNTHETIC DEMO DATASET (CTX-001)</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-[#172033] font-sans tracking-tight">
            EXPLORE THE DEMONSTRATION
          </h2>

          <p className="text-sm md:text-base text-[#64748B] font-sans leading-relaxed max-w-xl mx-auto">
            Follow a complete synthetic investigation from evidence ingestion to 3D network analysis and court dossier generation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onDemoClick}
              className="px-6 py-3 rounded bg-[#163A5F] hover:bg-[#0E2640] text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Explore Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onSignInClick}
              className="px-6 py-3 rounded bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] font-mono font-semibold text-xs transition-all shadow-2xs hover:shadow hover:-translate-y-0.5 active:translate-y-0"
            >
              Sign In to Workstation
            </button>
          </div>
        </div>
      </section>

      {/* 11. INSTITUTIONAL FOOTER */}
      <footer className="mt-auto border-t border-[#D9E0E8] bg-[#FFFFFF] py-10 px-4 md:px-8 text-xs text-[#64748B] font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="space-y-2 md:col-span-2">
            <Logo size="sm" subtitle="Investigation Intelligence Platform" />
            <p className="text-[#64748B] text-xs max-w-md leading-relaxed">
              Investigation Intelligence Platform for organizing case evidence, analyzing entity networks, and generating explainable investigative dossiers.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <div className="text-[#172033] font-mono uppercase text-[11px] font-bold">Platform</div>
            <ul className="space-y-1.5 text-xs text-[#64748B]">
              <li><button onClick={() => scrollToSection('overview')} className="hover:text-[#172033]">Overview</button></li>
              <li><button onClick={() => scrollToSection('workflow')} className="hover:text-[#172033]">Capabilities</button></li>
              <li><button onClick={() => scrollToSection('tactical-3d')} className="hover:text-[#172033]">3D Tactical</button></li>
              <li><button onClick={() => scrollToSection('network')} className="hover:text-[#172033]">Network Analysis</button></li>
              <li><button onClick={() => scrollToSection('provenance')} className="hover:text-[#172033]">Provenance</button></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <div className="text-[#172033] font-mono uppercase text-[11px] font-bold">Compliance & System</div>
            <ul className="space-y-1.5 text-xs text-[#64748B]">
              <li><button onClick={() => setIsSecurityOpen(true)} className="hover:text-[#172033]">Security Architecture</button></li>
              <li><button onClick={() => setIsPrivacyOpen(true)} className="hover:text-[#172033]">Privacy Policy</button></li>
              <li><button onClick={() => setIsPrivacyOpen(true)} className="hover:text-[#172033]">Terms & Conditions</button></li>
              <li><button onClick={() => setIsLimitationsOpen(true)} className="hover:text-[#172033]">System Information</button></li>
              <li><button onClick={onSignInClick} className="hover:text-[#2563EB] text-[#2563EB] font-mono font-bold">Sign In →</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[#D9E0E8] text-[10px] text-[#64748B] flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
          <span>Notice: Synthetic demonstration universe (CTX-001 / Operation Shadow Exchange). Not real citizen data.</span>
          <span>Section 63 BSA 2023 Compliant Ledger</span>
        </div>
      </footer>

      {/* Global Modals */}
      <AILimitationsModal isOpen={isLimitationsOpen} onClose={() => setIsLimitationsOpen(false)} />
      <SecurityArchitectureModal isOpen={isSecurityOpen} onClose={() => setIsSecurityOpen(false)} />
      <LegalPrivacyTermsModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};
