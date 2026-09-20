import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  Layers, 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Radio, 
  MapPin, 
  CreditCard, 
  UserMinus, 
  Link2Off, 
  ArrowRight, 
  RefreshCw, 
  History, 
  Sparkles, 
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingDown,
  Gauge
} from 'lucide-react';
import { 
  Case, 
  ComparativeAblationResponse, 
  AblatedScenarioResult, 
  SimulationHistoryItem,
  HypothesisSurvivalStatus
} from '../../types';
import { api } from '../../services/api';

interface AblationDashboardProps {
  activeCase: Case;
}

export const AblationDashboard: React.FC<AblationDashboardProps> = ({ activeCase }) => {
  const [hypothesis, setHypothesis] = useState<string>(
    'Target suspect coordinated transnational hawala transfers and customs clearing via burner phone calls.'
  );
  const [targetEntity, setTargetEntity] = useState<string>('Vikram Sharma');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'4way' | 'sensitivity' | 'entity_sandbox' | 'relation_sandbox' | 'history'>('4way');
  const [simulationResult, setSimulationResult] = useState<ComparativeAblationResponse | null>(null);
  const [historyList, setHistoryList] = useState<SimulationHistoryItem[]>([]);

  // Sandbox states
  const [sandboxEntity, setSandboxEntity] = useState<string>('Vikram Sharma');
  const [sandboxSource, setSandboxSource] = useState<string>('Vikram Sharma');
  const [sandboxTarget, setSandboxTarget] = useState<string>('Rajesh Kumar');
  const [sandboxRelType, setSandboxRelType] = useState<string>('CALLED');
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);

  useEffect(() => {
    if (activeCase?.id) {
      loadHistory(activeCase.id);
    }
  }, [activeCase?.id]);

  const loadHistory = async (caseId: string) => {
    try {
      const runs = await api.getAblationHistory(caseId);
      setHistoryList(runs || []);
    } catch (err: any) {
      console.error('Failed to load ablation history:', err);
    }
  };

  const handleRunComparative = async () => {
    if (!activeCase?.id || !hypothesis.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.runComparativeAblation(activeCase.id, {
        hypothesis_statement: hypothesis,
        target_entity: targetEntity.trim() || undefined
      });
      setSimulationResult(res);
      setActiveTab('4way');
      loadHistory(activeCase.id);
    } catch (err: any) {
      setError(err.message || 'Failed to execute comparative evidence ablation');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateEntityRemoval = async () => {
    if (!activeCase?.id || !sandboxEntity.trim()) return;
    setSandboxLoading(true);
    setError(null);
    try {
      const res = await api.simulateEntityRemoval(activeCase.id, {
        hypothesis_statement: hypothesis,
        entity_name: sandboxEntity
      });
      setSandboxResult(res);
      loadHistory(activeCase.id);
    } catch (err: any) {
      setError(err.message || 'Entity removal simulation failed');
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleSimulateRelationshipRemoval = async () => {
    if (!activeCase?.id || !sandboxSource.trim() || !sandboxTarget.trim()) return;
    setSandboxLoading(true);
    setError(null);
    try {
      const res = await api.simulateRelationshipRemoval(activeCase.id, {
        hypothesis_statement: hypothesis,
        source_entity: sandboxSource,
        target_entity: sandboxTarget,
        relationship_type: sandboxRelType.trim() || undefined
      });
      setSandboxResult(res);
      loadHistory(activeCase.id);
    } catch (err: any) {
      setError(err.message || 'Relationship removal simulation failed');
    } finally {
      setSandboxLoading(false);
    }
  };

  const getStatusBadge = (status: HypothesisSurvivalStatus | string) => {
    switch (status) {
      case 'ROBUST':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> ROBUST
          </span>
        );
      case 'MODERATELY_DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> MODERATELY DEGRADED
          </span>
        );
      case 'HIGHLY_FRAGILE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <TrendingDown className="w-3.5 h-3.5" /> HIGHLY FRAGILE
          </span>
        );
      case 'COLLAPSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> COLLAPSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'FULL_EVIDENCE':
        return <Layers className="w-5 h-5 text-indigo-400" />;
      case 'WITHOUT_CDR':
        return <Radio className="w-5 h-5 text-sky-400" />;
      case 'WITHOUT_LOCATION':
        return <MapPin className="w-5 h-5 text-amber-400" />;
      case 'WITHOUT_FINANCIAL':
        return <CreditCard className="w-5 h-5 text-emerald-400" />;
      case 'ENTITY_REMOVAL':
        return <UserMinus className="w-5 h-5 text-rose-400" />;
      case 'RELATIONSHIP_REMOVAL':
        return <Link2Off className="w-5 h-5 text-purple-400" />;
      default:
        return <GitFork className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <GitFork className="w-4 h-4" />
            Phase 14 — Counterfactual Reasoning
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Evidence Ablation & Sensitivity Sandbox
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Evaluate hypothesis fragility by systematically removing CDR, Location, Financials, entities, or communication links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunComparative()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 text-sm transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Running Ablation Matrix...' : 'Run 4-Way Comparative Ablation'}
          </button>
        </div>
      </div>

      {/* Statutory Safeguard Doctrine Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300 uppercase tracking-wide mr-1">
            Statutory Safeguard (Section 63 Bharatiya Sakshya Adhiniyam 2023):
          </span>
          Counterfactual evidence ablation is an analytical sensitivity test assessing hypothesis fragility, 
          evidentiary dependence, and alternative explanations. 
          <strong className="text-amber-100 underline decoration-amber-500/50 underline-offset-2 ml-1">
            It measures evidentiary robustness and does NOT constitute proof of guilt, liability, or innocence.
          </strong>
        </div>
      </div>

      {/* Hypothesis Input Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Investigative Hypothesis Statement to Stress-Test
            </label>
            <input
              type="text"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="e.g. Target suspect coordinated transnational hawala transfers..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Entity (Optional)
            </label>
            <input
              type="text"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              placeholder="e.g. Vikram Sharma"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('4way')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === '4way'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          4-Way Comparative Matrix
        </button>

        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'sensitivity'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gauge className="w-4 h-4" />
          Sensitivity & Fragility Gauge
        </button>

        <button
          onClick={() => setActiveTab('entity_sandbox')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'entity_sandbox'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          Entity Removal Sandbox
        </button>

        <button
          onClick={() => setActiveTab('relation_sandbox')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'relation_sandbox'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2Off className="w-4 h-4" />
          Relationship Severing Sandbox
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Simulation Runs ({historyList.length})
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          {error}
        </div>
      )}

      {/* TAB 1: 4-WAY COMPARATIVE MATRIX */}
      {activeTab === '4way' && (
        <div className="space-y-6">
          {!simulationResult && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
              <Layers className="w-12 h-12 text-indigo-400/60 mx-auto animate-pulse" />
              <h3 className="text-base font-semibold text-slate-200">No Ablation Simulation Run Yet</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Click &quot;Run 4-Way Comparative Ablation&quot; above to evaluate how the investigative theory holds up 
                when Call Records, Tower Locations, or Financial transactions are omitted.
              </p>
            </div>
          )}

          {simulationResult && (
            <>
              {/* Summary Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">Simulation Target</div>
                  <div className="text-sm font-semibold text-slate-100">
                    {simulationResult.target_entity || 'Global Case Topology'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Baseline Confidence</div>
                  <div className="text-sm font-semibold text-emerald-400">
                    {(simulationResult.sensitivity_summary.baseline_confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Lowest State</div>
                  <div className="text-sm font-semibold text-amber-400">
                    {simulationResult.sensitivity_summary.lowest_confidence_scenario}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Max Confidence Drop</div>
                  <div className="text-sm font-semibold text-rose-400">
                    -{(simulationResult.sensitivity_summary.max_confidence_drop * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Survival Status</div>
                  <div className="mt-0.5">
                    {getStatusBadge(simulationResult.sensitivity_summary.survival_status)}
                  </div>
                </div>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {simulationResult.scenarios.map((scen, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                            {getScenarioIcon(scen.scenario_type)}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-100 leading-tight">
                              {scen.scenario_name}
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              {scen.excluded_elements_count} elements ablated
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                        {scen.description}
                      </p>

                      {/* Confidence Meter */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Hypothesis Confidence</span>
                          <span className="font-bold text-slate-200">
                            {(scen.hypothesis_confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              scen.hypothesis_confidence >= 0.7 
                                ? 'bg-emerald-500' 
                                : scen.hypothesis_confidence >= 0.45 
                                ? 'bg-amber-500' 
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(scen.hypothesis_confidence * 100, 100)}%` }}
                          />
                        </div>
                        {scen.confidence_delta !== 0 && (
                          <div className="text-[11px] text-rose-400 flex items-center justify-between">
                            <span>Confidence Shift:</span>
                            <span className="font-mono">{(scen.confidence_delta * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>

                      {/* Metric Deltas */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <div>
                          <span className="text-slate-500">Nodes:</span>{' '}
                          <span className="text-slate-300 font-mono">
                            {scen.metric_deltas.node_count} ({scen.metric_deltas.delta_nodes >= 0 ? '+' : ''}{scen.metric_deltas.delta_nodes})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Edges:</span>{' '}
                          <span className="text-slate-300 font-mono">
                            {scen.metric_deltas.edge_count} ({scen.metric_deltas.delta_edges >= 0 ? '+' : ''}{scen.metric_deltas.delta_edges})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Density:</span>{' '}
                          <span className="text-slate-300 font-mono">
                            {scen.metric_deltas.density.toFixed(3)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Components:</span>{' '}
                          <span className="text-slate-300 font-mono">
                            {scen.metric_deltas.components_count}
                          </span>
                        </div>
                      </div>

                      {/* Alternative Explanations */}
                      {scen.alternative_explanations.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                            <Info className="w-3 h-3 text-indigo-400" />
                            Alternative Explanations
                          </span>
                          <ul className="space-y-1 text-[11px] text-slate-400 leading-snug">
                            {scen.alternative_explanations.map((alt, aIdx) => (
                              <li key={aIdx} className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
                                {alt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Key Vulnerabilities */}
                      {scen.key_vulnerabilities.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wide flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Evidentiary Vulnerabilities
                          </span>
                          <ul className="space-y-1 text-[11px] text-rose-300/80 leading-snug">
                            {scen.key_vulnerabilities.map((vuln, vIdx) => (
                              <li key={vIdx} className="bg-rose-950/20 p-2 rounded border border-rose-900/30">
                                {vuln}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Verdict:</span>
                      {getStatusBadge(scen.survival_status)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: SENSITIVITY & FRAGILITY GAUGE */}
      {activeTab === 'sensitivity' && simulationResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fragility Index Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
              <h3 className="text-sm font-semibold text-slate-300">Hypothesis Fragility Score</h3>
              <div className="relative inline-flex items-center justify-center">
                <div className="text-4xl font-extrabold text-slate-100 font-mono">
                  {(simulationResult.sensitivity_summary.overall_fragility_score * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculated as the maximum relative drop in confidence across all ablated evidentiary modalities.
              </p>
              <div>
                {getStatusBadge(simulationResult.sensitivity_summary.survival_status)}
              </div>
            </div>

            {/* Single Points of Failure */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Single Points of Failure (SPOF) Identified
              </h3>
              {simulationResult.sensitivity_summary.single_points_of_failure.length === 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  No single evidentiary modality constitutes a single point of failure. Hypothesis is corroborated across multi-modal streams.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">
                    The following evidence streams cause catastrophic drop (&ge; 35%) when suppressed:
                  </p>
                  {simulationResult.sensitivity_summary.single_points_of_failure.map((spof, idx) => (
                    <div key={idx} className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs flex items-center justify-between">
                      <span className="font-semibold">{spof}</span>
                      <span className="text-[11px] bg-rose-500/20 px-2 py-0.5 rounded text-rose-400 font-mono">CRITICAL SPOF</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-400">Synthesis Finding:</span>
                <p className="text-xs font-medium text-slate-200 mt-1">
                  {simulationResult.sensitivity_summary.synthesis_finding}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ENTITY REMOVAL SANDBOX */}
      {activeTab === 'entity_sandbox' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-rose-400" />
                Simulate Entity Removal
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simulate deleting a specific suspect, broker, or account from the graph to measure whether the remaining network fragments or remains connected.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Entity Name / ID to Remove</label>
                <input
                  type="text"
                  value={sandboxEntity}
                  onChange={(e) => setSandboxEntity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSimulateEntityRemoval}
                  disabled={sandboxLoading}
                  className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {sandboxLoading ? 'Simulating...' : 'Simulate Removal'}
                </button>
              </div>
            </div>
          </div>

          {sandboxResult && sandboxResult.scenario && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-slate-100">
                  Simulation Outcome: [{sandboxResult.entity_name}] Removed
                </h4>
                {getStatusBadge(sandboxResult.scenario.survival_status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Nodes Remaining</div>
                  <div className="text-lg font-bold text-slate-200">
                    {sandboxResult.scenario.metric_deltas.node_count} ({sandboxResult.scenario.metric_deltas.delta_nodes})
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Edges Remaining</div>
                  <div className="text-lg font-bold text-slate-200">
                    {sandboxResult.scenario.metric_deltas.edge_count} ({sandboxResult.scenario.metric_deltas.delta_edges})
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Connected Components</div>
                  <div className="text-lg font-bold text-amber-400">
                    {sandboxResult.scenario.metric_deltas.components_count}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Confidence Shift</div>
                  <div className="text-lg font-bold text-rose-400 font-mono">
                    {(sandboxResult.scenario.confidence_delta * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="font-semibold text-indigo-300">Analytical Finding: </span>
                {sandboxResult.sensitivity_summary.synthesis_finding}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RELATIONSHIP SEVERING SANDBOX */}
      {activeTab === 'relation_sandbox' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Link2Off className="w-5 h-5 text-purple-400" />
                Simulate Relationship Severing
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sever a direct communication or money transfer edge to test whether alternative multi-hop paths sustain connectivity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source Entity</label>
                <input
                  type="text"
                  value={sandboxSource}
                  onChange={(e) => setSandboxSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Entity</label>
                <input
                  type="text"
                  value={sandboxTarget}
                  onChange={(e) => setSandboxTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rel Type (Optional)</label>
                <input
                  type="text"
                  value={sandboxRelType}
                  onChange={(e) => setSandboxRelType(e.target.value)}
                  placeholder="e.g. CALLED, TRANSFERRED"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSimulateRelationshipRemoval}
                  disabled={sandboxLoading}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {sandboxLoading ? 'Severing...' : 'Simulate Severing'}
                </button>
              </div>
            </div>
          </div>

          {sandboxResult && sandboxResult.scenario && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-slate-100">
                  Severing Outcome: [{sandboxResult.source_entity}] &lt;--&gt; [{sandboxResult.target_entity}]
                </h4>
                {getStatusBadge(sandboxResult.scenario.survival_status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Edges Left</div>
                  <div className="text-lg font-bold text-slate-200">
                    {sandboxResult.scenario.metric_deltas.edge_count} ({sandboxResult.scenario.metric_deltas.delta_edges})
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Graph Density</div>
                  <div className="text-lg font-bold text-slate-200">
                    {sandboxResult.scenario.metric_deltas.density.toFixed(3)}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Partitions</div>
                  <div className="text-lg font-bold text-amber-400">
                    {sandboxResult.scenario.metric_deltas.components_count}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-500">Confidence Shift</div>
                  <div className="text-lg font-bold text-rose-400 font-mono">
                    {(sandboxResult.scenario.confidence_delta * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="font-semibold text-indigo-300">Analytical Finding: </span>
                {sandboxResult.sensitivity_summary.synthesis_finding}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SIMULATION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-200">
              Ablation Simulation Archive under Section 63 BSA 2023
            </h3>
            <span className="text-xs text-slate-400">{historyList.length} records</span>
          </div>

          {historyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No previous simulation runs logged for this case.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {historyList.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-850/50 transition-all cursor-pointer"
                  onClick={async () => {
                    try {
                      const full = await api.getAblationSimulation(item.id);
                      if (full && full.ablated_scenarios) {
                        setSimulationResult({
                          case_id: full.case_id,
                          simulation_id: full.id,
                          simulation_name: full.simulation_name,
                          hypothesis_statement: full.hypothesis_statement,
                          target_entity: full.target_entity,
                          baseline_metrics: full.baseline_metrics,
                          scenarios: full.ablated_scenarios,
                          sensitivity_summary: full.sensitivity_summary,
                          created_at: full.created_at,
                          non_culpability_notice: full.legal_statutory_disclaimer
                        });
                        setActiveTab('4way');
                      }
                    } catch (e) {
                      console.error('Failed to reload simulation:', e);
                    }
                  }}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                      {item.simulation_name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.hypothesis_statement}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Executed by <span className="text-slate-300">{item.created_by_username || 'IO'}</span> on{' '}
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Fragility</div>
                      <div className="text-xs font-bold text-slate-200 font-mono">
                        {(item.overall_fragility_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    {getStatusBadge(item.survival_status)}
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
