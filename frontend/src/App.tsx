import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Sidebar, TabType } from './components/common/Sidebar';
import { LandingPage } from './components/public/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { CaseDashboard } from './components/cases/CaseDashboard';
import { CaseList } from './components/cases/CaseList';
import { CaseDetailLedger } from './components/cases/CaseDetailLedger';
import { CreateCaseModal } from './components/cases/CreateCaseModal';
import { IngestionHub } from './components/ingestion/IngestionHub';
import { EvidenceLocker } from './components/evidence/EvidenceLocker';
import { ChainOfCustodyViewer } from './components/evidence/ChainOfCustodyViewer';
import { SystemHealthMonitor } from './components/common/SystemHealthMonitor';
import { EntityExplorer } from './components/nlp/EntityExplorer';
import { Entity360View } from './components/entities/Entity360View';
import { InvestigationTimeline } from './components/analytics/InvestigationTimeline';
import { RelationshipMatrix } from './components/nlp/RelationshipMatrix';
import { EntityResolutionHub } from './components/resolution/EntityResolutionHub';
import { KnowledgeGraphViewer } from './components/graph/KnowledgeGraphViewer';
import { GraphAnalyticsDashboard } from './components/analytics/GraphAnalyticsDashboard';
import { CaseRAGAssistant } from './components/rag/CaseRAGAssistant';
import { GraphRAGDashboard } from './components/graphrag/GraphRAGDashboard';
import { MultiPerspectiveDashboard } from './components/reasoning/MultiPerspectiveDashboard';
import { AblationDashboard } from './components/counterfactual/AblationDashboard';
import { InvestigativePriorityDashboard } from './components/priority/InvestigativePriorityDashboard';
import { LegalIntelligenceDashboard } from './components/legal/LegalIntelligenceDashboard';
import { SIHDemoWorkflow } from './components/sih/SIHDemoWorkflow';
import { Case, EvidenceItem, CaseCreatePayload } from './types';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';

export function App() {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const [publicPage, setPublicPage] = useState<'landing' | 'login'>('landing');
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const caseList = await api.getCases();
      setCases(caseList);
      if (!activeCase && caseList.length > 0) {
        setActiveCase(caseList[0]);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoadingCases(false);
    }
  };

  const fetchEvidence = async (caseId: string) => {
    setLoadingEvidence(true);
    try {
      const items = await api.getEvidenceForCase(caseId);
      setEvidenceList(items);
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCases();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeCase && currentUser) {
      fetchEvidence(activeCase.id);
    }
  }, [activeCase, currentUser]);

  const handleCreateCase = async (payload: CaseCreatePayload) => {
    try {
      const newCase = await api.createCase(payload);
      setCases(prev => [newCase, ...prev]);
      setActiveCase(newCase);
      setIsCreateModalOpen(false);
      setCurrentTab('ledger');
    } catch (err) {
      console.error('Failed to create case:', err);
      alert('Failed to create case');
    }
  };

  const handleSelectCase = (selectedCase: Case) => {
    setActiveCase(selectedCase);
    setCurrentTab('ledger');
  };

  const handleLogout = () => {
    logout();
    setPublicPage('landing');
  };

  // 1. If checking auth token on page load
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#64748B] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#163A5F] animate-ping"></div>
          <span className="font-semibold text-[#172033]">Verifying institutional session...</span>
        </div>
      </div>
    );
  }

  // 2. If unauthenticated, show public Landing Page or institutional Login Page
  if (!currentUser) {
    if (publicPage === 'login') {
      return (
        <LoginPage
          onBackToLanding={() => setPublicPage('landing')}
          onLoginSuccess={() => setCurrentTab('dashboard')}
        />
      );
    }
    return (
      <LandingPage
        onSignInClick={() => setPublicPage('login')}
        onDemoClick={() => setPublicPage('login')}
      />
    );
  }

  // 3. Authenticated Institutional Workstation Shell
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col font-sans selection:bg-[#2563EB] selection:text-white">
      <Header
        activeCaseNumber={activeCase?.case_number}
        activeCaseTitle={activeCase?.title}
        onOpenCaseSelector={() => setCurrentTab('cases')}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          evidenceCount={evidenceList.length}
          hasActiveCase={!!activeCase}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* SIH Benchmark & Full Dossier Report */}
          {(currentTab === 'sih-demo' || currentTab === 'reports') && (
            <SIHDemoWorkflow
              onSelectCase={(caseId) => {
                api.getCaseById(caseId).then(setActiveCase);
                setCurrentTab('ledger');
              }}
            />
          )}

          {/* Institutional Dashboard */}
          {currentTab === 'dashboard' && (
            <CaseDashboard
              onSelectCase={handleSelectCase}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {/* Case Registry */}
          {currentTab === 'cases' && (
            <CaseList
              cases={cases}
              activeCase={activeCase}
              onSelectCase={handleSelectCase}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              loading={loadingCases}
            />
          )}

          {/* Case Detail Ledger */}
          {currentTab === 'ledger' && activeCase && (
            <CaseDetailLedger
              activeCase={activeCase}
              onNavigateToIngestion={() => setCurrentTab('ingestion')}
              onNavigateToEvidence={() => setCurrentTab('evidence')}
              onNavigateToEntities={() => setCurrentTab('entities')}
              onNavigateToRelationships={() => setCurrentTab('relationships')}
              onNavigateToResolution={() => setCurrentTab('resolution')}
              onNavigateToGraph={() => setCurrentTab('graph')}
              onNavigateToAnalytics={() => setCurrentTab('analytics')}
              onRefreshCase={() => {
                fetchCases();
                if (activeCase) {
                  api.getCaseById(activeCase.id).then(setActiveCase);
                }
              }}
            />
          )}

          {currentTab === 'ledger' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">No active investigation selected.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Evidence Ingestion Hub */}
          {currentTab === 'ingestion' && (
            <IngestionHub
              activeCase={activeCase}
              onIngestSuccess={() => {
                if (activeCase) fetchEvidence(activeCase.id);
              }}
            />
          )}

          {/* Evidence Locker */}
          {currentTab === 'evidence' && activeCase && (
            <EvidenceLocker
              activeCase={activeCase}
              evidenceList={evidenceList}
              loading={loadingEvidence}
              onRefresh={() => {
                if (activeCase) fetchEvidence(activeCase.id);
              }}
            />
          )}

          {currentTab === 'evidence' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Entity 360 View */}
          {currentTab === 'entities' && activeCase && (
            <Entity360View activeCase={activeCase} />
          )}

          {currentTab === 'entities' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Investigation Timeline */}
          {currentTab === 'timeline' && activeCase && (
            <InvestigationTimeline activeCase={activeCase} />
          )}

          {currentTab === 'timeline' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Relationship Matrix */}
          {currentTab === 'relationships' && activeCase && (
            <RelationshipMatrix activeCase={activeCase} />
          )}

          {currentTab === 'relationships' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Entity Resolution Hub */}
          {currentTab === 'resolution' && activeCase && (
            <EntityResolutionHub activeCase={activeCase} />
          )}

          {currentTab === 'resolution' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Knowledge Graph Viewer */}
          {currentTab === 'graph' && activeCase && (
            <KnowledgeGraphViewer activeCase={activeCase} />
          )}

          {currentTab === 'graph' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Graph Analytics & Centrality Dashboard */}
          {currentTab === 'analytics' && activeCase && (
            <GraphAnalyticsDashboard activeCase={activeCase} />
          )}

          {currentTab === 'analytics' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Search & Case RAG Assistant */}
          {(currentTab === 'rag' || currentTab === 'search') && activeCase && (
            <CaseRAGAssistant activeCase={activeCase} />
          )}

          {(currentTab === 'rag' || currentTab === 'search') && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Graph RAG Dashboard */}
          {currentTab === 'graphrag' && activeCase && (
            <GraphRAGDashboard activeCase={activeCase} />
          )}

          {currentTab === 'graphrag' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Hypotheses & Multi-Perspective Reasoning */}
          {(currentTab === 'reasoning' || currentTab === 'hypotheses') && activeCase && (
            <MultiPerspectiveDashboard activeCase={activeCase} />
          )}

          {(currentTab === 'reasoning' || currentTab === 'hypotheses') && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Counterfactual Ablation Analysis */}
          {currentTab === 'counterfactual' && activeCase && (
            <AblationDashboard activeCase={activeCase} />
          )}

          {currentTab === 'counterfactual' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Investigative Priority Dashboard */}
          {currentTab === 'priority' && activeCase && (
            <InvestigativePriorityDashboard activeCase={activeCase} />
          )}

          {currentTab === 'priority' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Legal Intelligence & BNS/BSA Reference */}
          {currentTab === 'legal' && activeCase && (
            <LegalIntelligenceDashboard activeCase={activeCase} />
          )}

          {currentTab === 'legal' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-[#64748B] font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {/* Immutable Audit Trail */}
          {currentTab === 'audit' && (
            <ChainOfCustodyViewer activeCase={activeCase} />
          )}

          {/* Users & Access Directory */}
          {currentTab === 'users' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="workstation-panel p-4 rounded space-y-1 shadow-2xs">
                <h1 className="text-base font-semibold text-[#172033] font-mono">USERS & ACCESS DIRECTORY</h1>
                <p className="text-xs text-[#64748B]">Institutional role-based access control under Section 63 BSA & IT Act.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded workstation-card space-y-2 shadow-2xs">
                  <div className="text-[#163A5F] font-bold">Insp Rajesh Sharma</div>
                  <div className="text-[#64748B] text-[11px]">Role: INVESTIGATOR</div>
                  <div className="text-[#94A3B8] text-[10px]">Badge: POL-CYB-8812</div>
                  <div className="text-[#16805C] font-bold text-[10px]">Active Field Clearance</div>
                </div>
                <div className="p-4 rounded workstation-card space-y-2 shadow-2xs">
                  <div className="text-[#7C3AED] font-bold">ACP Surender Verma</div>
                  <div className="text-[#64748B] text-[11px]">Role: SENIOR_INVESTIGATOR</div>
                  <div className="text-[#94A3B8] text-[10px]">Badge: POL-HQ-4091</div>
                  <div className="text-[#16805C] font-bold text-[10px]">Supervisory Oversight</div>
                </div>
                <div className="p-4 rounded workstation-card space-y-2 shadow-2xs">
                  <div className="text-[#B7791F] font-bold">Adv Priya Iyer</div>
                  <div className="text-[#64748B] text-[11px]">Role: LEGAL_ANALYST</div>
                  <div className="text-[#94A3B8] text-[10px]">Badge: PROS-SPL-109</div>
                  <div className="text-[#16805C] font-bold text-[10px]">BNS / BSA Compliance</div>
                </div>
                <div className="p-4 rounded workstation-card space-y-2 shadow-2xs">
                  <div className="text-[#C53030] font-bold">Dr. Anand Deshmukh</div>
                  <div className="text-[#64748B] text-[11px]">Role: FORENSIC_ANALYST</div>
                  <div className="text-[#94A3B8] text-[10px]">Badge: CFSL-HYD-402</div>
                  <div className="text-[#16805C] font-bold text-[10px]">Hardware & CDR Forensics</div>
                </div>
                <div className="p-4 rounded workstation-card space-y-2 shadow-2xs">
                  <div className="text-[#2563EB] font-bold">Kiran Patel</div>
                  <div className="text-[#64748B] text-[11px]">Role: INTELLIGENCE_ANALYST</div>
                  <div className="text-[#94A3B8] text-[10px]">Badge: CIB-INT-628</div>
                  <div className="text-[#16805C] font-bold text-[10px]">Network Graph Analytics</div>
                </div>
                <div className="p-4 rounded workstation-card space-y-2 shadow-2xs">
                  <div className="text-[#16805C] font-bold">System Administrator</div>
                  <div className="text-[#64748B] text-[11px]">Role: SYSTEM_ADMINISTRATOR</div>
                  <div className="text-[#94A3B8] text-[10px]">Badge: SYS-SEC-001</div>
                  <div className="text-[#16805C] font-bold text-[10px]">System & RBAC Admin</div>
                </div>
              </div>
            </div>
          )}

          {/* System Health Monitor */}
          {currentTab === 'health' && (
            <SystemHealthMonitor />
          )}
        </main>
      </div>

      <CreateCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCase}
      />
    </div>
  );
}

export default App;
