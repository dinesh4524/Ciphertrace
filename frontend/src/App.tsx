import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Sidebar, TabType } from './components/common/Sidebar';
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

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('sih-demo');
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
    fetchCases();
  }, []);

  useEffect(() => {
    if (activeCase) {
      fetchEvidence(activeCase.id);
    }
  }, [activeCase]);

  const handleCreateCase = async (payload: CaseCreatePayload) => {
    try {
      const newCase = await api.createCase(payload);
      setCases(prev => [newCase, ...prev]);
      setActiveCase(newCase);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to create case:', err);
      alert('Failed to create case');
    }
  };

  const handleSelectCase = (selectedCase: Case) => {
    setActiveCase(selectedCase);
    setCurrentTab('ledger');
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex flex-col font-sans selection:bg-sky-600 selection:text-white">
      <Header
        activeCaseNumber={activeCase?.case_number}
        activeCaseTitle={activeCase?.title}
        onOpenCaseSelector={() => setCurrentTab('cases')}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          evidenceCount={evidenceList.length}
          hasActiveCase={!!activeCase}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {currentTab === 'sih-demo' && (
            <SIHDemoWorkflow
              onSelectCase={(caseId) => {
                api.getCaseById(caseId).then(setActiveCase);
                setCurrentTab('ledger');
              }}
            />
          )}

          {currentTab === 'dashboard' && (
            <CaseDashboard
              onSelectCase={handleSelectCase}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {currentTab === 'cases' && (
            <CaseList
              cases={cases}
              activeCase={activeCase}
              onSelectCase={handleSelectCase}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              loading={loadingCases}
            />
          )}

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
              <p className="text-xs text-slate-300 font-mono">No active investigation selected.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'ingestion' && (
            <IngestionHub
              activeCase={activeCase}
              onIngestSuccess={() => {
                if (activeCase) fetchEvidence(activeCase.id);
              }}
            />
          )}

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
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'entities' && activeCase && (
            <Entity360View activeCase={activeCase} />
          )}

          {currentTab === 'entities' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'timeline' && activeCase && (
            <InvestigationTimeline activeCase={activeCase} />
          )}

          {currentTab === 'timeline' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'relationships' && activeCase && (
            <RelationshipMatrix activeCase={activeCase} />
          )}

          {currentTab === 'relationships' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'resolution' && activeCase && (
            <EntityResolutionHub activeCase={activeCase} />
          )}

          {currentTab === 'resolution' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'graph' && activeCase && (
            <KnowledgeGraphViewer activeCase={activeCase} />
          )}

          {currentTab === 'graph' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'analytics' && activeCase && (
            <GraphAnalyticsDashboard activeCase={activeCase} />
          )}

          {currentTab === 'analytics' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'rag' && activeCase && (
            <CaseRAGAssistant activeCase={activeCase} />
          )}

          {currentTab === 'rag' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'graphrag' && activeCase && (
            <GraphRAGDashboard activeCase={activeCase} />
          )}

          {currentTab === 'graphrag' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'reasoning' && activeCase && (
            <MultiPerspectiveDashboard activeCase={activeCase} />
          )}

          {currentTab === 'reasoning' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'counterfactual' && activeCase && (
            <AblationDashboard activeCase={activeCase} />
          )}

          {currentTab === 'counterfactual' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'priority' && activeCase && (
            <InvestigativePriorityDashboard activeCase={activeCase} />
          )}

          {currentTab === 'priority' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'legal' && activeCase && (
            <LegalIntelligenceDashboard activeCase={activeCase} />
          )}

          {currentTab === 'legal' && !activeCase && (
            <div className="p-8 text-center workstation-card rounded-lg space-y-2">
              <p className="text-xs text-slate-300 font-mono">Select an investigation case first.</p>
              <button
                onClick={() => setCurrentTab('cases')}
                className="btn-rect-primary"
              >
                Go to Case Registry
              </button>
            </div>
          )}

          {currentTab === 'audit' && (
            <ChainOfCustodyViewer activeCase={activeCase} />
          )}

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
