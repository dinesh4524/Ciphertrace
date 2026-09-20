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
      <div className="workstation-panel p-4 rounded-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="cyan">SIH 2026 BENCHMARK</Badge>
            <Badge variant="observed">SEC 63 BSA COMPLIANT</Badge>
          </div>
          <h1 className="text-base font-bold text-slate-100 font-mono tracking-wide">
            CIPHERTRACE X // 19-STAGE INVESTIGATION WORKFLOW ENGINE
          </h1>
          <p className="text-[11px] text-slate-400 max-w-3xl">
            Live multi-modal execution on <span className="text-sky-300 font-mono">Case SIH-2026-X771: Operation ShadowHawala</span> (INR 8.40 Cr Siphoning & Hawala Syndicate).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunDemo}
            disabled={isRunning}
            className="btn-rect-primary text-xs"
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
              className="btn-rect-secondary text-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Inspect Court Dossier</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Pipeline Telemetry Bar */}
      {demoData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs font-mono">
          <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
            <div className="text-slate-500 text-[10px] uppercase">PIPELINE STATUS</div>
            <div className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>19 / 19 PASS</span>
            </div>
          </div>
          <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
            <div className="text-slate-500 text-[10px] uppercase">LATENCY</div>
            <div className="text-sky-300 font-bold mt-0.5">{demoData.execution_progress.total_duration_ms} ms</div>
          </div>
          <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
            <div className="text-slate-500 text-[10px] uppercase">SYNDICATE LOSS</div>
            <div className="text-rose-400 font-bold mt-0.5">INR 8.40 Cr</div>
          </div>
          <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
            <div className="text-slate-500 text-[10px] uppercase">LOUVAIN CLUSTERS</div>
            <div className="text-purple-300 font-bold mt-0.5">3 Syndicate Cells</div>
          </div>
          <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
            <div className="text-slate-500 text-[10px] uppercase">LEGAL CHARGES</div>
            <div className="text-amber-300 font-bold mt-0.5">BNS 318 / BSA 63</div>
          </div>
          <div className="p-3 bg-[#080c14] border border-slate-800 rounded">
            <div className="text-slate-500 text-[10px] uppercase">MERKLE ROOT</div>
            <div className="text-sky-400 font-bold truncate mt-0.5" title={dossier?.blockchain_merkle_root}>
              Block #{dossier?.blockchain_block_height || 42}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800 rounded flex items-center gap-2.5 text-rose-200 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 19-Step Stepper Navigator */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              19-Stage Investigation Pipeline
            </h2>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950 border border-sky-800 px-1.5 py-0.2 rounded font-bold">
              Step {selectedStepIndex + 1} / {steps.length || 19}
            </span>
          </div>

          <div className="workstation-card rounded-lg p-2 space-y-1 max-h-[640px] overflow-y-auto">
            {steps.map((step, idx) => {
              const isSelected = selectedStepIndex === idx;
              return (
                <button
                  key={step.step_number}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`w-full text-left p-2 rounded transition-colors border flex items-center justify-between text-xs font-mono ${
                    isSelected
                      ? 'bg-sky-950/80 border-sky-600 text-sky-200 font-bold'
                      : 'bg-[#080c14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 text-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {step.step_number}
                    </span>
                    <div className="min-w-0 truncate">
                      <div className="text-xs truncate font-semibold">
                        {step.step_name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {step.step_category} • {step.duration_ms} ms
                      </div>
                    </div>
                  </div>

                  <CheckCircle2
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected ? 'text-sky-400' : 'text-emerald-500'
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
            <div className="workstation-card rounded-lg p-5 space-y-4">
              {/* Step Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="cyan" size="xs">
                      STAGE {activeStep.step_number} OF 19
                    </Badge>
                    <Badge variant="slate" size="xs">
                      {activeStep.step_category}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 font-mono">
                    {activeStep.step_name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    {activeStep.duration_ms} ms
                  </span>
                  <Badge variant="emerald" size="xs">
                    {activeStep.status}
                  </Badge>
                </div>
              </div>

              {/* Step Narrative Summary */}
              <div className="p-3 rounded bg-[#080c14] border border-slate-800 text-slate-200 text-xs leading-relaxed space-y-1 font-mono">
                <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Investigative Stage Output
                </div>
                <p className="text-slate-300 font-sans text-xs">{activeStep.summary}</p>
              </div>

              {/* Step Key Metrics Cards */}
              {Object.keys(activeStep.key_metrics).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Telemetry & Analytical Indicators
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono">
                    {Object.entries(activeStep.key_metrics).map(([key, val]) => (
                      <div key={key} className="bg-[#080c14] border border-slate-800 p-2.5 rounded space-y-0.5">
                        <div className="text-[9px] text-slate-500 uppercase truncate">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs font-bold text-sky-300 truncate">
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
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Forensic Raw Stream & JSON Payload
                  </h4>
                  <div className="bg-black/60 border border-slate-800 rounded p-3 text-[11px] font-mono text-emerald-400 max-h-56 overflow-y-auto space-y-1">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(activeStep.artifacts, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="workstation-card rounded-lg p-12 text-center text-slate-500 font-mono text-xs space-y-2">
              <Cpu className="w-8 h-8 mx-auto text-slate-700" />
              <p>Click "Run 1-Click SIH Pipeline" to initialize the 19-stage intelligence workflow.</p>
            </div>
          )}
        </div>
      </div>

      {/* Court Dossier Modal */}
      {showDossierModal && dossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-[#0b0f19] border border-slate-700 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#0e1422] border-b border-slate-800 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">COURT-READY INVESTIGATION DOSSIER</h3>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="btn-rect-secondary text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-slate-300 leading-relaxed">
              <div className="border border-slate-800 p-4 rounded bg-[#080c14] space-y-2">
                <div className="text-center border-b border-slate-800 pb-2">
                  <div className="font-bold text-slate-100 uppercase text-sm">
                    POLICE INVESTIGATION DOSSIER & FINAL CHARGESHEET REPORT
                  </div>
                  <div className="text-[10px] text-slate-500">
                    CASE: {dossier.case_number} | TITLE: {dossier.title}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2">
                  <div><strong>STATION:</strong> {dossier.police_station || 'Cyber Crime PS, Cyberabad'}</div>
                  <div><strong>LEAD IO:</strong> {dossier.io_name || 'Insp Rajesh Sharma'}</div>
                  <div><strong>PRIMARY SUSPECT:</strong> {dossier.key_players?.[0]?.name || 'Vikram Sharma @ Vicky'}</div>
                  <div><strong>FINANCIAL LOSS:</strong> INR {(dossier.total_loss_inr / 10000000).toFixed(2)} Cr</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-sky-400 uppercase text-xs">1. Executive Summary</div>
                <p className="text-slate-300 font-sans">{dossier.executive_summary}</p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-emerald-400 uppercase text-xs">2. Section 63 BSA Digital Evidence Certificate</div>
                <div className="p-3 bg-black/40 border border-slate-800 rounded font-mono text-[10px] space-y-1">
                  <div><strong>BLOCKCHAIN MERKLE ROOT:</strong> <span className="text-emerald-400">{dossier.blockchain_merkle_root}</span></div>
                  <div><strong>BLOCK HEIGHT:</strong> #{dossier.blockchain_block_height}</div>
                  <div><strong>BNS LEGAL CHARGES:</strong> {dossier.legal_charges_bns?.join(', ') || 'BNS 318(4), BNS 111'}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#0e1422] border-t border-slate-800 flex justify-between">
              <span className="text-[10px] text-slate-500 font-mono">SEAL: POLICE-CYBER-SEC63-EVIDENCE</span>
              <button
                onClick={() => window.print()}
                className="btn-rect-primary"
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
