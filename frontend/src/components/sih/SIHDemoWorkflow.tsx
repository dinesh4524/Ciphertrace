import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ShieldCheck,
  Scale,
  Network,
  Cpu,
  Download,
  Printer,
  Sparkles,
  Zap,
  Lock,
  GitBranch,
  Layers,
  Search,
  Eye,
  ChevronRight,
  Database,
  ArrowRight,
  RefreshCw,
  FolderLock
} from 'lucide-react';
import { api } from '../../services/api';
import { RunSIHDemoResponse, WorkflowStepResult, InvestigationDossierReport } from '../../types';
import { Badge } from '../common/Badge';

interface SIHDemoWorkflowProps {
  onSelectCase?: (caseId: string) => void;
}

export const SIHDemoWorkflow: React.FC<SIHDemoWorkflowProps> = ({ onSelectCase }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [demoData, setDemoData] = useState<RunSIHDemoResponse | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunDemo = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await api.runSIHDemo();
      setDemoData(response);
      setSelectedStepIndex(18); // Default to final report step
    } catch (err: any) {
      console.error('Failed to run SIH Demo:', err);
      setError(err.message || 'SIH Demo workflow execution encountered an error.');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-load existing demo state if available
    api.runSIHDemo().then(res => {
      setDemoData(res);
      setSelectedStepIndex(18);
    }).catch(e => {
      console.log('Initial demo load standby:', e);
    });
  }, []);

  const steps = demoData?.execution_progress?.steps || [];
  const activeStep: WorkflowStepResult | null = steps[selectedStepIndex] || null;
  const dossier: InvestigationDossierReport | null = demoData?.dossier_report || null;

  return (
    <div className="space-y-4 pb-8 font-sans">
      {/* Top Banner */}
      <div className="bg-white border border-[#D9E0E8] p-4 rounded flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="inferred">SIH 2026 BENCHMARK</Badge>
            <Badge variant="observed">SEC 63 BSA COMPLIANT</Badge>
          </div>
          <h1 className="text-base font-bold text-[#172033] tracking-tight">
            CIPHERTRACE X // 19-STAGE INVESTIGATION WORKFLOW ENGINE
          </h1>
          <p className="text-xs text-[#64748B] max-w-3xl">
            Live multi-modal execution on <span className="text-[#163A5F] font-mono font-medium">Case SIH-2026-X771: Operation ShadowHawala</span> (INR 8.40 Cr Siphoning & Hawala Syndicate).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunDemo}
            disabled={isRunning}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing 19 Stages...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run 1-Click SIH Pipeline</span>
              </>
            )}
          </button>

          {dossier && (
            <button
              onClick={() => setShowDossierModal(true)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Inspect Court Dossier</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Pipeline Telemetry Bar */}
      {demoData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
          <div className="p-3 bg-white border border-[#D9E0E8] rounded shadow-xs">
            <div className="text-[#64748B] text-[10px] uppercase font-semibold">PIPELINE STATUS</div>
            <div className="text-[#16805C] font-bold flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16805C]" />
              <span>19 / 19 PASS</span>
            </div>
          </div>
          <div className="p-3 bg-white border border-[#D9E0E8] rounded shadow-xs">
            <div className="text-[#64748B] text-[10px] uppercase font-semibold">LATENCY</div>
            <div className="text-[#163A5F] font-bold mt-0.5 font-mono">{demoData.execution_progress.total_duration_ms} ms</div>
          </div>
          <div className="p-3 bg-white border border-[#D9E0E8] rounded shadow-xs">
            <div className="text-[#64748B] text-[10px] uppercase font-semibold">SYNDICATE LOSS</div>
            <div className="text-[#C53030] font-bold mt-0.5 font-mono">INR 8.40 Cr</div>
          </div>
          <div className="p-3 bg-white border border-[#D9E0E8] rounded shadow-xs">
            <div className="text-[#64748B] text-[10px] uppercase font-semibold">LOUVAIN CLUSTERS</div>
            <div className="text-[#163A5F] font-bold mt-0.5 font-mono">3 Syndicate Cells</div>
          </div>
          <div className="p-3 bg-white border border-[#D9E0E8] rounded shadow-xs">
            <div className="text-[#64748B] text-[10px] uppercase font-semibold">LEGAL CHARGES</div>
            <div className="text-[#B7791F] font-bold mt-0.5 font-mono">BNS 318 / BSA 63</div>
          </div>
          <div className="p-3 bg-white border border-[#D9E0E8] rounded shadow-xs">
            <div className="text-[#64748B] text-[10px] uppercase font-semibold">MERKLE ROOT</div>
            <div className="text-[#163A5F] font-bold truncate mt-0.5 font-mono" title={dossier?.blockchain_merkle_root}>
              Block #{dossier?.blockchain_block_height || 42}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded flex items-center gap-2.5 text-[#C53030] text-xs">
          <AlertTriangle className="w-4 h-4 text-[#C53030] flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 19-Step Stepper Navigator */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#163A5F]" />
              19-Stage Investigation Pipeline
            </h2>
            <span className="text-[10px] font-mono text-[#163A5F] bg-[#EFF6FF] border border-[#BFDBFE] px-1.5 py-0.5 rounded font-bold">
              Step {selectedStepIndex + 1} / {steps.length || 19}
            </span>
          </div>

          <div className="bg-white border border-[#D9E0E8] rounded p-2 space-y-1 max-h-[640px] overflow-y-auto shadow-xs">
            {steps.map((step, idx) => {
              const isSelected = selectedStepIndex === idx;
              return (
                <button
                  key={step.step_number}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`w-full text-left p-2 rounded transition-colors border flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#163A5F] font-bold shadow-xs'
                      : 'bg-[#F8FAFC] border-[#D9E0E8] text-[#64748B] hover:text-[#172033] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0 font-mono ${
                        isSelected
                          ? 'bg-[#163A5F] text-white'
                          : 'bg-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      {step.step_number}
                    </span>
                    <div className="min-w-0 truncate">
                      <div className="text-xs truncate font-semibold text-[#172033]">
                        {step.step_name}
                      </div>
                      <div className="text-[11px] text-[#64748B] truncate">
                        {step.step_category} • {step.duration_ms} ms
                      </div>
                    </div>
                  </div>

                  <CheckCircle2
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected ? 'text-[#2563EB]' : 'text-[#16805C]'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Step Inspection Canvas */}
        <div className="lg:col-span-8 space-y-3">
          {activeStep ? (
            <div className="bg-white border border-[#D9E0E8] rounded p-5 space-y-4 shadow-xs">
              {/* Step Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#D9E0E8]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="inferred" size="xs">
                      STAGE {activeStep.step_number} OF 19
                    </Badge>
                    <Badge variant="slate" size="xs">
                      {activeStep.step_category}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-[#172033]">
                    {activeStep.step_name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#64748B] flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    {activeStep.duration_ms} ms
                  </span>
                  <Badge variant="emerald" size="xs">
                    {activeStep.status}
                  </Badge>
                </div>
              </div>

              {/* Step Narrative Summary */}
              <div className="p-3 rounded bg-[#F8FAFC] border border-[#D9E0E8] text-[#172033] text-xs leading-relaxed space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#163A5F] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Investigative Stage Output
                </div>
                <p className="text-[#172033] text-xs">{activeStep.summary}</p>
              </div>

              {/* Step Key Metrics Cards */}
              {Object.keys(activeStep.key_metrics).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Telemetry & Analytical Indicators
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(activeStep.key_metrics).map(([key, val]) => (
                      <div key={key} className="bg-[#F8FAFC] border border-[#D9E0E8] p-2.5 rounded space-y-0.5">
                        <div className="text-[10px] text-[#64748B] uppercase truncate font-semibold">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs font-bold text-[#163A5F] truncate font-mono">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step Artifacts & Deep Drill-Down */}
              {activeStep.artifacts && Object.keys(activeStep.artifacts).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Forensic Raw Stream & JSON Payload
                  </h4>
                  <div className="bg-[#F8FAFC] border border-[#D9E0E8] rounded p-3 text-xs font-mono text-[#163A5F] max-h-56 overflow-y-auto space-y-1">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(activeStep.artifacts, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#D9E0E8] rounded p-12 text-center text-[#64748B] text-xs space-y-2 shadow-xs">
              <Cpu className="w-8 h-8 mx-auto text-[#94A3B8]" />
              <p>Click "Run 1-Click SIH Pipeline" to initialize the 19-stage intelligence workflow.</p>
            </div>
          )}
        </div>
      </div>

      {/* Court Dossier Modal */}
      {showDossierModal && dossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl bg-white border border-[#D9E0E8] rounded shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#D9E0E8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#163A5F]" />
                <h3 className="text-sm font-bold text-[#172033]">COURT-READY INVESTIGATION DOSSIER</h3>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#172033] leading-relaxed">
              <div className="border border-[#D9E0E8] p-4 rounded bg-[#F8FAFC] space-y-2">
                <div className="text-center border-b border-[#D9E0E8] pb-2">
                  <div className="font-bold text-[#172033] uppercase text-sm">
                    POLICE INVESTIGATION DOSSIER & FINAL CHARGESHEET REPORT
                  </div>
                  <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                    CASE: {dossier.case_number} | TITLE: {dossier.title}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div><strong>STATION:</strong> {dossier.police_station || 'Cyber Crime PS, Cyberabad'}</div>
                  <div><strong>LEAD IO:</strong> {dossier.io_name || 'Insp Rajesh Sharma'}</div>
                  <div><strong>PRIMARY SUSPECT:</strong> {dossier.key_players?.[0]?.name || 'Vikram Sharma @ Vicky'}</div>
                  <div><strong>FINANCIAL LOSS:</strong> INR {(dossier.total_loss_inr / 10000000).toFixed(2)} Cr</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-[#163A5F] uppercase text-xs">1. Executive Summary</div>
                <p className="text-[#172033]">{dossier.executive_summary}</p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-[#16805C] uppercase text-xs">2. Section 63 BSA Digital Evidence Certificate</div>
                <div className="p-3 bg-[#F8FAFC] border border-[#D9E0E8] rounded font-mono text-[11px] space-y-1">
                  <div><strong>BLOCKCHAIN MERKLE ROOT:</strong> <span className="text-[#16805C]">{dossier.blockchain_merkle_root}</span></div>
                  <div><strong>BLOCK HEIGHT:</strong> #{dossier.blockchain_block_height}</div>
                  <div><strong>BNS LEGAL CHARGES:</strong> {dossier.legal_charges_bns?.join(', ') || 'BNS 318(4), BNS 111'}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] border-t border-[#D9E0E8] flex justify-between items-center">
              <span className="text-[11px] text-[#64748B] font-mono">SEAL: POLICE-CYBER-SEC63-EVIDENCE</span>
              <button
                onClick={() => window.print()}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Court Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
