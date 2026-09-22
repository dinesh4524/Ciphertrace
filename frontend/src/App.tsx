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
const VALID_TABS: TabType[] = [
  'dashboard', 'cases', 'ledger', 'evidence', 'ingestion',
  'entities', 'timeline', 'graph', 'relationships', 'analytics',
  'search', 'rag', 'graphrag', 'hypotheses', 'reasoning',
  'counterfactual', 'priority', 'resolution', 'legal', 'reports',
  'sih-demo', 'audit', 'users', 'health'
];

function parseHash(): { page: 'landing' | 'login' | 'app'; tab: TabType; caseId: string | null } {
  const rawHash = window.location.hash.replace(/^#\/?/, '');
  if (!rawHash || rawHash === 'landing') {
    return { page: 'landing', tab: 'dashboard', caseId: null };
  }
  if (rawHash === 'login') {
    return { page: 'login', tab: 'dashboard', caseId: null };
  }

  const [routePart, queryPart] = rawHash.split('?');
  const params = new URLSearchParams(queryPart || '');
  const caseId = params.get('case');

  const tab = VALID_TABS.includes(routePart as TabType) ? (routePart as TabType) : 'dashboard';
  return { page: 'app', tab, caseId };
}

export function App() {
  const { currentUser, loading: authLoading, logout } = useAuth();
  
  // Initialize state from location hash
  const initialRoute = parseHash();
  const [publicPage, setPublicPage] = useState<'landing' | 'login'>(
    initialRoute.page === 'login' ? 'login' : 'landing'
  );
  const [currentTab, setCurrentTab] = useState<TabType>(initialRoute.tab);
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Centralized Navigation Dispatcher that pushes to browser history
  const navigate = (
    target: { page?: 'landing' | 'login'; tab?: TabType; caseId?: string | null },
    replace: boolean = false
  ) => {
    let newHash = '';
    if (!currentUser) {
      if (target.page === 'login') {
        newHash = '#login';
      } else {
        newHash = '#landing';
      }
    } else {
      if (target.page === 'login') {
        newHash = '#login';
      } else if (target.page === 'landing') {
        newHash = '#landing';
      } else {
        const destTab = target.tab || currentTab;
        const targetCaseId = target.caseId !== undefined ? target.caseId : activeCase?.id;
        newHash = `#${destTab}${targetCaseId ? `?case=${targetCaseId}` : ''}`;
      }
    }

    if (window.location.hash !== newHash) {
      if (replace) {
        window.history.replaceState(null, '', newHash);
      } else {
        window.history.pushState(null, '', newHash);
      }
    }

    if (target.page) {
      setPublicPage(target.page);
    }
    if (target.tab) {
      setCurrentTab(target.tab);
    }
    if (target.caseId !== undefined) {
      if (target.caseId) {
        const found = cases.find(c => c.id === target.caseId);
        if (found) {
          setActiveCase(found);
        } else {
          api.getCaseById(target.caseId).then(c => setActiveCase(c)).catch(console.error);
        }
      } else {
        setActiveCase(null);
      }
    }
  };

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const caseList = await api.getCases();
      setCases(caseList);

      // If URL hash has a specific case id, select it; otherwise default to first case
      const { caseId } = parseHash();
      if (caseId) {
        const matching = caseList.find(c => c.id === caseId);
        if (matching) {
          setActiveCase(matching);
        } else {
          try {
            const fetched = await api.getCaseById(caseId);
            setActiveCase(fetched);
          } catch {
            if (caseList.length > 0) setActiveCase(caseList[0]);
          }
        }
      } else if (!activeCase && caseList.length > 0) {
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

  // Sync state when browser back/forward buttons or hash change occurs
  useEffect(() => {
    const handleHashSync = () => {
      const { page, tab, caseId } = parseHash();
      if (!currentUser) {
        if (page === 'login') {
          setPublicPage('login');
        } else {
          setPublicPage('landing');
        }
      } else {
        setCurrentTab(tab);
        if (caseId) {
          if (cases.length > 0) {
            const match = cases.find(c => c.id === caseId);
            if (match) {
              setActiveCase(match);
            } else {
              api.getCaseById(caseId).then(setActiveCase).catch(console.error);
            }
          } else {
            api.getCaseById(caseId).then(setActiveCase).catch(console.error);
          }
        }
      }
    };

    window.addEventListener('popstate', handleHashSync);
    window.addEventListener('hashchange', handleHashSync);

    return () => {
      window.removeEventListener('popstate', handleHashSync);
      window.removeEventListener('hashchange', handleHashSync);
    };
  }, [currentUser, cases]);

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
      navigate({ tab: 'ledger', caseId: newCase.id });
    } catch (err) {
      console.error('Failed to create case:', err);
      alert('Failed to create case');
    }
  };

  const handleSelectCase = (selectedCase: Case) => {
    setActiveCase(selectedCase);
    navigate({ tab: 'ledger', caseId: selectedCase.id });
  };

  const handleLogout = () => {
    logout();
    navigate({ page: 'landing' }, true);
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
          onBackToLanding={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate({ page: 'landing' });
            }
          }}
          onLoginSuccess={() => navigate({ tab: 'dashboard' })}
        />
      );
    }
    return (
      <LandingPage
        onSignInClick={() => navigate({ page: 'login' })}
        onDemoClick={() => navigate({ page: 'login' })}
      />
    );
  }

  // 3. Authenticated Institutional Workstation Shell
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col font-sans selection:bg-[#2563EB] selection:text-white">
      <Header
        activeCaseNumber={activeCase?.case_number}
        activeCaseTitle={activeCase?.title}
        currentTab={currentTab}
        onOpenCaseSelector={() => navigate({ tab: 'cases' })}
        onNavigateToDashboard={() => navigate({ tab: 'dashboard' })}
        onNavigateToCases={() => navigate({ tab: 'cases' })}
        onNavigateToActiveCase={() => activeCase && navigate({ tab: 'ledger', caseId: activeCase.id })}
        onNavigateBack={() => window.history.back()}
        onNavigateForward={() => window.history.forward()}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => navigate({ tab, caseId: activeCase?.id })}
          evidenceCount={evidenceList.length}
          hasActiveCase={!!activeCase}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* SIH Benchmark & Full Dossier Report */}
          {(currentTab === 'sih-demo' || currentTab === 'reports') && (
            <SIHDemoWorkflow
              onSelectCase={(caseId) => {
                api.getCaseById(caseId).then(c => {
                  setActiveCase(c);
                  navigate({ tab: 'ledger', caseId: c.id });
                });
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
              onNavigateToCases={() => navigate({ tab: 'cases' })}
              onNavigateToIngestion={() => navigate({ tab: 'ingestion', caseId: activeCase.id })}
              onNavigateToEvidence={() => navigate({ tab: 'evidence', caseId: activeCase.id })}
              onNavigateToEntities={() => navigate({ tab: 'entities', caseId: activeCase.id })}
              onNavigateToRelationships={() => navigate({ tab: 'relationships', caseId: activeCase.id })}
              onNavigateToResolution={() => navigate({ tab: 'resolution', caseId: activeCase.id })}
              onNavigateToGraph={() => navigate({ tab: 'graph', caseId: activeCase.id })}
              onNavigateToAnalytics={() => navigate({ tab: 'analytics', caseId: activeCase.id })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
                onClick={() => navigate({ tab: 'cases' })}
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
