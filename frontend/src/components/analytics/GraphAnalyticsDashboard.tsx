import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Crown, 
  GitFork, 
  Share2, 
  Route, 
  Sparkles, 
  AlertTriangle, 
  RotateCw, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  Zap, 
  Users, 
  Eye, 
  Search, 
  Radio,
  Layers,
  Scale,
  BookOpen,
  HelpCircle,
  Activity,
  Info,
  ChevronRight,
  Clock,
  Flame,
  MapPin,
  DollarSign,
  PhoneCall,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { 
  Case, 
  KeyPlayerResponse, 
  CommunityDetectionResponse, 
  PathfindingResponse, 
  HiddenLinkPredictionResponse, 
  GraphAnomaliesResponse, 
  CentralityScore, 
  PredictedLink,
  StructuralOverviewResponse,
  KCoreResponse,
  MetricGlossaryResponse,
  HiddenLinkMLResponse,
  HiddenLinkMLPrediction,
  ReviewPredictionRequest,
  TemporalIntelligenceResponse,
  CleanSlateAnomalyItem,
  TimelineEventItem
} from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface GraphAnalyticsDashboardProps {
  activeCase: Case;
}

type TabType = 'KEY_PLAYERS' | 'COMMUNITIES' | 'K_CORE' | 'PATHFINDING' | 'HIDDEN_LINKS' | 'ANOMALIES' | 'STRUCTURAL' | 'TEMPORAL';

export const GraphAnalyticsDashboard: React.FC<GraphAnalyticsDashboardProps> = ({ activeCase }) => {
  const [activeTab, setActiveTab] = useState<TabType>('KEY_PLAYERS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics Data States
  const [temporalIntel, setTemporalIntel] = useState<TemporalIntelligenceResponse | null>(null);
  const [cleanSlateFilter, setCleanSlateFilter] = useState<'ALL' | 'MULE' | 'BURNER' | 'CUTOUT'>('ALL');
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'CDR' | 'TRANSACTION' | 'FIR'>('ALL');
  const [keyPlayers, setKeyPlayers] = useState<KeyPlayerResponse | null>(null);
  const [communities, setCommunities] = useState<CommunityDetectionResponse | null>(null);
  const [anomalies, setAnomalies] = useState<GraphAnomaliesResponse | null>(null);
  const [hiddenLinks, setHiddenLinks] = useState<HiddenLinkPredictionResponse | null>(null);
  const [mlHiddenLinks, setMlHiddenLinks] = useState<HiddenLinkMLResponse | null>(null);
  const [kCoreData, setKCoreData] = useState<KCoreResponse | null>(null);
  const [structuralOverview, setStructuralOverview] = useState<StructuralOverviewResponse | null>(null);
  const [metricsGlossary, setMetricsGlossary] = useState<MetricGlossaryResponse | null>(null);

  // Pathfinding State
  const [sourceNodeId, setSourceNodeId] = useState<string>('');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [pathResult, setPathResult] = useState<PathfindingResponse | null>(null);
  const [pathfindingLoading, setPathfindingLoading] = useState(false);

  // Hidden Link Review Modal State (Phase 7 & Phase 9 ML)
  const [selectedLink, setSelectedLink] = useState<PredictedLink | null>(null);
  const [selectedMLPrediction, setSelectedMLPrediction] = useState<HiddenLinkMLPrediction | null>(null);
  const [mlReviewDecision, setMlReviewDecision] = useState<'ACCEPTED_AS_HYPOTHESIS' | 'REJECTED' | 'CHALLENGED'>('ACCEPTED_AS_HYPOTHESIS');
  const [mlReviewJustification, setMlReviewJustification] = useState<string>('');
  const [mlInvestigatorBadge, setMlInvestigatorBadge] = useState<string>('INSP-9021');
  const [isMLReviewModalOpen, setIsMLReviewModalOpen] = useState<boolean>(false);
  const [reviewDecision, setReviewDecision] = useState<'ACCEPTED' | 'DISMISSED'>('ACCEPTED');
  const [reviewReason, setReviewReason] = useState<string>('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // k-Core Shell Filter
  const [selectedKShell, setSelectedKShell] = useState<number>(1);

  // Glossary Modal State
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);

  // Filters
  const [playerFilter, setPlayerFilter] = useState<'ALL' | 'KINGPIN' | 'BROKER' | 'HUB'>('ALL');
  const [minProbability, setMinProbability] = useState<number>(0.35);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kp, comm, anom, hl, mlHl, kc, so, mg, ti] = await Promise.all([
        api.getKeyPlayers(activeCase.id),
        api.getCommunities(activeCase.id),
        api.getGraphAnomalies(activeCase.id),
        api.predictHiddenLinks(activeCase.id, minProbability),
        api.predictHiddenLinksML(activeCase.id, minProbability),
        api.getKCoreDecomposition(activeCase.id),
        api.getStructuralOverview(activeCase.id),
        api.getMetricsGlossary(),
        api.getTemporalIntelligence(activeCase.id).catch(() => null)
      ]);
      setKeyPlayers(kp);
      setCommunities(comm);
      setAnomalies(anom);
      setHiddenLinks(hl);
      setMlHiddenLinks(mlHl);
      setKCoreData(kc);
      setStructuralOverview(so);
      setMetricsGlossary(mg);
      setTemporalIntel(ti);

      if (kc.shells.length > 0) {
        setSelectedKShell(kc.max_core);
      }

      if (kp.all_players.length >= 2 && !sourceNodeId) {
        setSourceNodeId(kp.all_players[0].node_id);
        setTargetNodeId(kp.all_players[kp.all_players.length - 1].node_id);
      }
    } catch (err: any) {
      console.error('Analytics load error:', err);
      setError(err.message || 'Failed to load graph analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [activeCase.id]);

  const handleRunPathfinding = async () => {
    if (!sourceNodeId || !targetNodeId) return;
    setPathfindingLoading(true);
    try {
      const res = await api.findShortestPath(activeCase.id, {
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId
      });
      setPathResult(res);
    } catch (err: any) {
      alert(`Pathfinding error: ${err.message}`);
    } finally {
      setPathfindingLoading(false);
    }
  };

  const handlePredictLinksWithThreshold = async (thresh: number) => {
    setMinProbability(thresh);
    try {
      const hl = await api.predictHiddenLinks(activeCase.id, thresh);
      setHiddenLinks(hl);
    } catch (err: any) {
      console.error('Link prediction error:', err);
    }
  };

  const submitLinkReview = async () => {
    if (!selectedLink) return;
    if (reviewReason.trim().length < 5) {
      alert('Section 63 BSA compliance requires a minimum 5-character investigative justification.');
      return;
    }

    setReviewing(true);
    try {
      const res = await api.reviewPredictedLink(activeCase.id, {
        source_id: selectedLink.source_id,
        target_id: selectedLink.target_id,
        decision: reviewDecision,
        justification_reason: reviewReason,
        relationship_type: 'ASSOCIATED_WITH'
      });

      setReviewSuccessMsg(res.message);
      setSelectedLink(null);
      setReviewReason('');
      fetchAllAnalytics();
    } catch (err: any) {
      alert(`Review error: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  };

  const handleOpenMLReviewModal = (pred: HiddenLinkMLPrediction) => {
    setSelectedMLPrediction(pred);
    setMlReviewDecision('ACCEPTED_AS_HYPOTHESIS');
    setMlReviewJustification(
      `Topological alignment via ${pred.baseline_scores.common_neighbours_count} mutual intermediaries. Supporting signals: ${pred.supporting_graph_signals.map(s => s.signal_code).join(', ')}.`
    );
    setIsMLReviewModalOpen(true);
  };

  const handleMLReviewSubmit = async () => {
    if (!selectedMLPrediction) return;
    if (!mlReviewJustification.trim() || mlReviewJustification.trim().length < 5) {
      alert('Section 63 BSA compliance requires a minimum 5-character investigative justification.');
      return;
    }

    setReviewing(true);
    try {
      const res = await api.reviewMLPrediction(activeCase.id, {
        source_id: selectedMLPrediction.candidate_link.source_id,
        target_id: selectedMLPrediction.candidate_link.target_id,
        decision: mlReviewDecision,
        justification_reason: mlReviewJustification,
        investigator_badge: mlInvestigatorBadge || 'INSP-9901',
        relationship_type: selectedMLPrediction.candidate_link.predicted_relationship || 'INFERRED_ASSOCIATION'
      });

      setReviewSuccessMsg(res.message);
      setIsMLReviewModalOpen(false);
      setSelectedMLPrediction(null);
      setMlReviewJustification('');
      fetchAllAnalytics();
    } catch (err: any) {
      alert(`ML Review error: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  };


  const getArchetypeBadgeColor = (archetype: string) => {
    switch (archetype) {
      case 'KINGPIN_INFLUENCER':
        return 'bg-purple-900/60 text-purple-300 border border-purple-500/50';
      case 'COMMUNICATION_BROKER':
        return 'bg-amber-900/60 text-amber-300 border border-amber-500/50';
      case 'OPERATIONAL_HUB':
        return 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/50';
      case 'SYNDICATE_OPERATIVE':
        return 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/50';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const filteredPlayers = keyPlayers?.all_players.filter(p => {
    if (playerFilter === 'KINGPIN') return p.archetype === 'KINGPIN_INFLUENCER' || p.pagerank >= 0.15;
    if (playerFilter === 'BROKER') return p.archetype === 'COMMUNICATION_BROKER' || p.betweenness_centrality >= 0.1;
    if (playerFilter === 'HUB') return p.archetype === 'OPERATIONAL_HUB' || p.degree_centrality >= 0.2;
    return true;
  }) || [];

  const filteredCleanSlate = (temporalIntel?.clean_slate_anomalies || []).filter(item => {
    if (cleanSlateFilter === 'MULE') return item.risk_archetype.includes('MULE');
    if (cleanSlateFilter === 'BURNER') return item.risk_archetype.includes('BURNER');
    if (cleanSlateFilter === 'CUTOUT') return item.risk_archetype.includes('CUTOUT');
    return true;
  });

  const filteredTimeline = (temporalIntel?.timeline || []).filter(item => {
    if (timelineFilter === 'CDR') return item.event_type.includes('CALL') || item.event_type.includes('SMS');
    if (timelineFilter === 'TRANSACTION') return item.event_type.includes('TRANSACTION');
    if (timelineFilter === 'FIR') return item.event_type.includes('FIR');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* MANDATORY JUDICIAL NON-CULPABILITY NOTICE (BSA 2023) */}
      <div className="p-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 rounded-xl shadow-xl flex items-start space-x-3">
        <Scale className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
              Judicial Admissibility Notice: Network Centrality ≠ Criminal Guilt
            </h4>
            <span className="px-2 py-0.2 bg-amber-900/80 text-amber-200 border border-amber-600 rounded text-[9px] font-bold">
              Sec 63 BSA 2023
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Network analytics metrics (Degree, Betweenness, Closeness, Eigenvector, PageRank, k-Core) measure 
            <strong className="text-white"> structural communication flow and topological mediation</strong>. 
            They <strong className="text-amber-200 underline">do NOT establish legal culpability, criminal conspiracy, or intent</strong>. 
            Legitimate commercial business owners, nodal bank branch officers, telecom routing gateways, public service dispatchers, 
            and victimized courier mules naturally exhibit high centrality. All algorithmic findings must be substantiated with independent primary evidence.
          </p>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="p-2 bg-purple-950/80 border border-purple-800/60 rounded-lg text-purple-400">
                <Network className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Advanced Criminal Network Analytics & Graph Theory
                </h1>
                <p className="text-sm text-slate-400">
                  Centralities, k-core shells, clustering coefficients, community detection, and topological structural analysis
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsGlossaryModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-200 rounded-lg text-xs font-semibold transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Metric Meanings & Legal Caveats</span>
            </button>
            <button
              onClick={fetchAllAnalytics}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-Scan Topology</span>
            </button>
          </div>
        </div>

        {/* Global Metric Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 font-medium">Network Density</span>
            <div className="text-lg font-bold text-white mt-0.5 font-mono">
              {structuralOverview ? (structuralOverview.density * 100).toFixed(1) + '%' : '0.0%'}
            </div>
            <div className="text-[10px] text-purple-400 mt-0.5">{structuralOverview?.total_edges ?? 0} active links</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 font-medium">Clustering Transitivity</span>
            <div className="text-lg font-bold text-cyan-400 mt-0.5 font-mono">
              {structuralOverview ? (structuralOverview.transitivity * 100).toFixed(1) + '%' : '0.0%'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Triadic Closure Ratio</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 font-medium">Max k-Core Nucleus</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5 font-mono">
              k = {kCoreData?.max_core ?? 0}
            </div>
            <div className="text-[10px] text-amber-400 mt-0.5">{kCoreData?.total_shells ?? 0} concentric shells</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 font-medium">Syndicate Cells</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">
              {communities?.total_communities ?? 0}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Q = {communities?.modularity.toFixed(3) ?? '0.000'}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 font-medium">Critical Bridges</span>
            <div className="text-lg font-bold text-rose-400 mt-0.5 font-mono">
              {structuralOverview?.critical_bridges_count ?? 0}
            </div>
            <div className="text-[10px] text-rose-400 mt-0.5">Single Cut-off Edges</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 font-medium">Clean-Slate Recruits</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5 font-mono">
              {temporalIntel?.clean_slate_anomalies.length ?? 0}
            </div>
            <div className="text-[10px] text-amber-400 mt-0.5">Zero Prior Record Mules</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 mt-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('KEY_PLAYERS')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'KEY_PLAYERS'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Centrality & Roles</span>
          </button>
          <button
            onClick={() => setActiveTab('K_CORE')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'K_CORE'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>k-Core Shells ({kCoreData?.max_core ? `Max k=${kCoreData.max_core}` : 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('COMMUNITIES')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'COMMUNITIES'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Syndicate Cells ({communities?.total_communities ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('PATHFINDING')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'PATHFINDING'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Shortest Paths</span>
          </button>
          <button
            onClick={() => setActiveTab('STRUCTURAL')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'STRUCTURAL'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Network Density & Structure</span>
          </button>
          <button
            onClick={() => setActiveTab('ANOMALIES')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ANOMALIES'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Bridges & Choke-points</span>
          </button>
          <button
            onClick={() => setActiveTab('HIDDEN_LINKS')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'HIDDEN_LINKS'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hidden-Link ML Radar ({mlHiddenLinks?.total_predicted_links ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('TEMPORAL')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'TEMPORAL'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Temporal & Clean-Slate ({temporalIntel?.clean_slate_anomalies.length ?? 0})</span>
          </button>
        </div>
      </div>

      {reviewSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {reviewSuccessMsg}
          </span>
          <button onClick={() => setReviewSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TAB 1: KEY PLAYERS & CENTRALITIES (WITH EIGENVECTOR & CLUSTERING) */}
      {activeTab === 'KEY_PLAYERS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPlayerFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  playerFilter === 'ALL' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                All Ranked Players ({keyPlayers?.all_players.length ?? 0})
              </button>
              <button
                onClick={() => setPlayerFilter('KINGPIN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  playerFilter === 'KINGPIN' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Kingpins & Masters ({keyPlayers?.top_kingpins.length ?? 0})
              </button>
              <button
                onClick={() => setPlayerFilter('BROKER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  playerFilter === 'BROKER' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Communication Brokers ({keyPlayers?.top_brokers.length ?? 0})
              </button>
              <button
                onClick={() => setPlayerFilter('HUB')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  playerFilter === 'HUB' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Operational Hubs ({keyPlayers?.top_hubs.length ?? 0})
              </button>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              Includes Degree, Betweenness, Closeness, Eigenvector, and Local Clustering
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => (
              <div 
                key={player.node_id} 
                className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-xl p-5 shadow-lg transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        {player.label}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {player.name}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 bg-purple-950/80 border border-purple-700/60 rounded-full text-xs font-bold text-purple-300">
                      {player.composite_threat_score.toFixed(1)} Threat
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${getArchetypeBadgeColor(player.archetype)}`}>
                      {player.archetype.replace(/_/g, ' ')}
                    </span>
                    {player.coreness !== undefined && (
                      <span className="px-2 py-0.5 bg-slate-950 text-amber-300 border border-amber-800/80 rounded text-[10px] font-mono font-bold">
                        k-Core {player.coreness}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed italic">
                    "{player.justification}"
                  </p>
                </div>

                {/* Metric Bars */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">PageRank Authority</span>
                      <span className="text-purple-400 font-mono font-bold">{(player.pagerank * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(player.pagerank * 300, 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Betweenness (Cut-out Broker)</span>
                      <span className="text-amber-400 font-mono font-bold">{(player.betweenness_centrality * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(player.betweenness_centrality * 200, 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Eigenvector Influence</span>
                      <span className="text-indigo-400 font-mono font-bold">{((player.eigenvector_centrality ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min((player.eigenvector_centrality ?? 0) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Local Clustering Coefficient</span>
                      <span className="text-emerald-400 font-mono font-bold">{((player.local_clustering_coefficient ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((player.local_clustering_coefficient ?? 0) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Direct Degree</span>
                      <span className="text-cyan-400 font-mono font-bold">{player.connections_count} contacts</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min(player.degree_centrality * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Non-Culpability Footer */}
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 leading-tight">
                  <span className="text-amber-400 font-bold">Caveat: </span>
                  Structural centrality is an algorithmic routing measure, not proof of criminal intent.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: k-CORE DECOMPOSITION */}
      {activeTab === 'K_CORE' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  k-Core Sub-Syndicate Decomposition
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Iteratively prunes peripheral vertices of degree &lt; k to isolate the cohesive, resilient inner core of the criminal enterprise.
                </p>
              </div>

              {/* Shell Selector */}
              <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-300 font-medium px-1">Select Shell:</span>
                {kCoreData?.shells.map((shell) => (
                  <button
                    key={shell.k}
                    onClick={() => setSelectedKShell(shell.k)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${
                      selectedKShell === shell.k
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    k={shell.k} ({shell.member_count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Current Shell Members */}
          {kCoreData?.shells.find(s => s.k === selectedKShell) ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {selectedKShell}-Core Nucleus Members (Every member connects to at least {selectedKShell} others)
                  </h4>
                  <span className="text-xs text-slate-400">
                    {kCoreData.shells.find(s => s.k === selectedKShell)?.member_count} nodes identified in this shell
                  </span>
                </div>
                <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-700 rounded-full text-xs font-mono font-bold">
                  Shell Layer k={selectedKShell}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {kCoreData.shells.find(s => s.k === selectedKShell)?.members.map((m) => (
                  <div key={m.node_id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-mono">{m.label}</span>
                      <h5 className="text-xs font-bold text-white">{m.name}</h5>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-1 rounded">
                      {m.degree} links
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              No nodes present in this shell layer.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CRIMINAL CELLS (COMMUNITIES) */}
      {activeTab === 'COMMUNITIES' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Modularity Optimization (Newman-Girvan)</h4>
                <p className="text-xs text-slate-400">
                  Criminal syndicates partitioned by dense intra-cluster communications and sparse bridge links.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Modularity Score</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                Q = {communities?.modularity.toFixed(4) ?? '0.000'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {communities?.communities.map((comm) => (
              <div key={comm.community_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded text-[10px] font-mono font-bold">
                      {comm.community_id}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">
                      {comm.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Cell Density</span>
                    <div className="text-sm font-bold text-emerald-300 font-mono">
                      {(comm.density * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-400">Cluster Centroid Lead:</span>{' '}
                    <span className="font-bold text-white">{comm.centroid_name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                  <div className="bg-slate-950 p-2 rounded">
                    <div className="text-slate-400 text-[10px]">Members</div>
                    <div className="text-white font-bold">{comm.size}</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded">
                    <div className="text-slate-400 text-[10px]">Internal Edges</div>
                    <div className="text-emerald-400 font-bold">{comm.internal_edges}</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded">
                    <div className="text-slate-400 text-[10px]">External Bridges</div>
                    <div className="text-amber-400 font-bold">{comm.external_edges}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Cell Operatives & Nodes:</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {comm.members.map((m) => (
                      <span 
                        key={m.node_id} 
                        className="px-2 py-1 bg-slate-800/80 border border-slate-700/60 rounded text-xs text-slate-200 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">({m.internal_connections})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SHORTEST PATHFINDING */}
      {activeTab === 'PATHFINDING' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Route className="w-5 h-5 text-purple-400" />
              Trace Multi-Hop Criminal Syndicate Connection
            </h3>
            <p className="text-xs text-slate-400">
              Select any two entities (suspects, burner phones, mule accounts) to reconstruct the weighted shortest evidentiary chain of custody.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Source Entity (Suspect / Account / Phone)
                </label>
                <select
                  value={sourceNodeId}
                  onChange={(e) => setSourceNodeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Source Node --</option>
                  {keyPlayers?.all_players.map((p) => (
                    <option key={p.node_id} value={p.node_id}>
                      {p.name} ({p.label} - {p.archetype})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Destination Entity (Target Suspect / Receiver)
                </label>
                <select
                  value={targetNodeId}
                  onChange={(e) => setTargetNodeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Target Node --</option>
                  {keyPlayers?.all_players.map((p) => (
                    <option key={p.node_id} value={p.node_id}>
                      {p.name} ({p.label} - {p.archetype})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunPathfinding}
                disabled={!sourceNodeId || !targetNodeId || pathfindingLoading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-purple-600/30"
              >
                <Zap className="w-4 h-4" />
                <span>{pathfindingLoading ? 'Tracing Graph...' : 'Trace Evidentiary Path'}</span>
              </button>
            </div>
          </div>

          {/* Path Results */}
          {pathResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {pathResult.found ? (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Connected Path Established ({pathResult.hops} Hops)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <XCircle className="w-4 h-4" />
                        No Path Found Between Selected Nodes
                      </span>
                    )}
                  </h4>
                </div>
                {pathResult.found && (
                  <div className="flex items-center space-x-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-400">Path Confidence: </span>
                      <span className="text-purple-400 font-bold">{(pathResult.composite_confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Distance Weight: </span>
                      <span className="text-white font-bold">{pathResult.total_weight.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {pathResult.found && (
                <div className="relative">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
                    {pathResult.path_nodes.map((node, index) => (
                      <React.Fragment key={node.node_id}>
                        <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-4 w-full md:w-48 text-center shadow-lg relative">
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-900 text-purple-200 rounded text-[9px] font-bold">
                            STEP {node.step}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono uppercase block mt-1">{node.label}</span>
                          <h5 className="text-xs font-bold text-white truncate mt-0.5">{node.name}</h5>
                        </div>

                        {index < pathResult.path_nodes.length - 1 && (
                          <div className="flex flex-col items-center justify-center shrink-0 px-2">
                            <span className="text-[10px] font-mono text-purple-400 font-bold mb-1">
                              {pathResult.path_edges[index]?.label || 'CONNECTED'}
                            </span>
                            <ArrowRight className="w-5 h-5 text-purple-400 hidden md:block" />
                            <div className="w-0.5 h-6 bg-purple-500/40 md:hidden my-1"></div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STRUCTURAL ANALYSIS & DENSITY */}
      {activeTab === 'STRUCTURAL' && structuralOverview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs text-slate-400">Network Density Ratio</span>
              <div className="text-2xl font-bold text-white font-mono">
                {(structuralOverview.density * 100).toFixed(2)}%
              </div>
              <p className="text-[11px] text-slate-500">
                Fraction of all possible ties that are present. Dense networks exhibit high operational collusion; sparse graphs feature insulated tree structures.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs text-slate-400">Global Clustering (Transitivity)</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono">
                {(structuralOverview.transitivity * 100).toFixed(2)}%
              </div>
              <p className="text-[11px] text-slate-500">
                Probability that two associates of an operative also know each other. Measures clique formation and conspiratorial trust.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs text-slate-400">Network Diameter & Dispersion</span>
              <div className="text-2xl font-bold text-purple-400 font-mono">
                {structuralOverview.diameter} Hops
              </div>
              <p className="text-[11px] text-slate-500">
                Maximum distance between any two connected nodes. Average path distance: {structuralOverview.average_path_length} hops.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Structural Parameters & Law Enforcement Admissibility
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Total Nodes</span>
                <span className="text-white font-bold text-sm">{structuralOverview.total_nodes}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Total Edges</span>
                <span className="text-white font-bold text-sm">{structuralOverview.total_edges}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Average Degree</span>
                <span className="text-white font-bold text-sm">{structuralOverview.average_degree}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Connected Components</span>
                <span className="text-white font-bold text-sm">{structuralOverview.connected_components_count}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Legal Substantive Caveat: </strong>
              {structuralOverview.judicial_non_culpability_caveat}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BRIDGES & CHOKE-POINTS */}
      {activeTab === 'ANOMALIES' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
            <span className="p-2 bg-amber-950/80 border border-amber-800 text-amber-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">Structural Choke-Points & Smurfing Patterns</h4>
              <p className="text-xs text-slate-400">
                Identifies critical single points of failure (Tarjan bridges) and high-volume fan-in/fan-out financial mule funnels.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies?.anomalies.map((anom, idx) => (
              <div 
                key={`${anom.entity_id}_${idx}`} 
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    anom.severity === 'CRITICAL' 
                      ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {anom.severity} SEVERITY
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {anom.anomaly_type.replace(/_/g, ' ')}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">
                  {anom.entity_name}
                </h4>

                <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  {anom.description}
                </p>

                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold">Associated Entities: </span>
                  <span className="font-mono text-slate-300">{anom.associated_nodes.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: HIDDEN-LINK ML RADAR (PHASE 9) */}
      {activeTab === 'HIDDEN_LINKS' && (
        <div className="space-y-6">
          {/* Header & Configuration Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 font-bold mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>HETEROGENEOUS GRAPHSAGE & CALIBRATED ML ENGINE</span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Unobserved Conspiratorial Link Prediction
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Identifies covert ties, burner relays, and mule layering using baseline graph algorithms and multi-hop neighborhood ML.
                </p>
              </div>

              <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Confidence Gate</span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {(minProbability * 100).toFixed(0)}% Min
                  </span>
                </div>
                <input
                  type="range"
                  min="0.20"
                  max="0.80"
                  step="0.05"
                  value={minProbability}
                  onChange={(e) => handlePredictLinksWithThreshold(parseFloat(e.target.value))}
                  className="w-28 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Mandatory Statutory Notice */}
            <div className="p-3 bg-amber-950/50 border border-amber-800/80 rounded-lg flex items-start space-x-3 text-xs text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="text-amber-200">Judicial Non-Automatic Doctrine (Section 63 BSA 2023): </strong>
                {mlHiddenLinks?.judicial_warning || "A predicted link must never automatically become a confirmed relationship. Acceptance requires explicit investigator verification and rationale."}
              </div>
            </div>
          </div>

          {/* Predictions List */}
          <div className="space-y-4">
            {(!mlHiddenLinks || mlHiddenLinks.predictions.length === 0) ? (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-2">
                <Search className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">No Hidden Links Above Confidence Threshold</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try lowering the confidence gate slider above to evaluate weaker topological signals.
                </p>
              </div>
            ) : (
              mlHiddenLinks.predictions.map((pred, idx) => {
                const cand = pred.candidate_link;
                const baselines = pred.baseline_scores;
                return (
                  <div
                    key={`${cand.source_id}_${cand.target_id}_${idx}`}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-xl space-y-4 transition"
                  >
                    {/* Top Row: Candidate Nodes & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-950 border border-purple-500/40 px-3 py-1.5 rounded-lg text-left">
                          <span className="text-[9px] font-mono text-purple-400 uppercase block">{cand.source_type}</span>
                          <span className="text-xs font-bold text-white">{cand.source_name}</span>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 mb-0.5">
                            {cand.predicted_relationship}
                          </span>
                          <ArrowRight className="w-4 h-4 text-amber-400" />
                        </div>

                        <div className="bg-slate-950 border border-purple-500/40 px-3 py-1.5 rounded-lg text-left">
                          <span className="text-[9px] font-mono text-purple-400 uppercase block">{cand.target_type}</span>
                          <span className="text-xs font-bold text-white">{cand.target_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-mono">Calibrated Confidence</span>
                          <span className="text-base font-bold text-amber-400 font-mono">
                            {(pred.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenMLReviewModal(pred)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-amber-600/30"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Review Hypothesis</span>
                        </button>
                      </div>
                    </div>

                    {/* Algorithmic Baseline Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Common Contacts</span>
                        <span className="text-white font-bold">{baselines.common_neighbours_count}</span>
                        {baselines.common_neighbour_names.length > 0 && (
                          <span className="text-[9px] text-slate-400 block truncate mt-0.5" title={baselines.common_neighbour_names.join(', ')}>
                            {baselines.common_neighbour_names[0]}
                          </span>
                        )}
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Jaccard Index</span>
                        <span className="text-cyan-400 font-bold">{(baselines.jaccard_coefficient * 100).toFixed(1)}%</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Adamic-Adar</span>
                        <span className="text-purple-400 font-bold">{baselines.adamic_adar_score.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Pref. Attachment</span>
                        <span className="text-amber-400 font-bold">{baselines.preferential_attachment}</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Resource Alloc.</span>
                        <span className="text-emerald-400 font-bold">{baselines.resource_allocation.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Shortest Hops</span>
                        <span className="text-white font-bold">{baselines.shortest_path_hops}</span>
                      </div>
                    </div>

                    {/* Dual Explainability: Supporting vs Contradictory Signals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Supporting Signals */}
                      <div className="bg-emerald-950/30 border border-emerald-900/60 rounded-lg p-3 space-y-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Supporting Graph Signals ({pred.supporting_graph_signals.length})</span>
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-emerald-300/90">
                          {pred.supporting_graph_signals.map((sig, sIdx) => (
                            <li key={sIdx} className="flex items-start space-x-1.5">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{sig.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Contradictory Signals */}
                      <div className="bg-rose-950/30 border border-rose-900/60 rounded-lg p-3 space-y-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Contradictory Signals ({pred.contradictory_signals.length})</span>
                        </div>
                        {pred.contradictory_signals.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic block">No strong contradictory signals detected.</span>
                        ) : (
                          <ul className="space-y-1.5 text-[11px] text-rose-300/90">
                            {pred.contradictory_signals.map((csig, cIdx) => (
                              <li key={cIdx} className="flex items-start space-x-1.5">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{csig.description}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Evidence Paths */}
                    {pred.evidence_paths.length > 0 && (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Verified Multi-Hop Evidence Paths</span>
                        <div className="space-y-1">
                          {pred.evidence_paths.map((pItem, pIdx) => (
                            <div key={pIdx} className="flex items-center space-x-2 font-mono text-[11px] text-slate-300">
                              <span className="px-1.5 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 rounded text-[9px]">
                                {pItem.hops} HOPS
                              </span>
                              <span>{pItem.path_nodes.map(pn => pn.name).join(' ➔ ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 8: TEMPORAL INTELLIGENCE & CLEAN-SLATE ANOMALIES (PHASE 10) */}
      {activeTab === 'TEMPORAL' && (
        <div className="space-y-6">
          {/* Top Banner: Section 63 BSA 2023 Clean-Slate Doctrine */}
          <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-cyan-950/60 border border-cyan-500/40 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Temporal Intelligence & Clean-Slate Anomaly Engine
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300">
                  BSA 2023 SEC 63
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Correlates unified chronological timelines, high-frequency communication bursts, smurfing velocity, 
                and impossible travel speeds. Detects <strong className="text-white">Clean-Slate Recruits</strong> — operatives with zero historical 
                police records intentionally deployed by syndicates as financial mules and burner SIM proxies.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchAllAnalytics}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Refresh Signals</span>
              </button>
            </div>
          </div>

          {/* Temporal Metrics Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Events</span>
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-white font-mono">
                {temporalIntel?.total_events ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Chronological Feed</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Telecom Bursts</span>
                <PhoneCall className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-cyan-400 font-mono">
                {temporalIntel?.communication_bursts.length ?? 0}
              </div>
              <div className="text-[10px] text-cyan-400/80 mt-0.5">Z-Score &gt; 2.0σ Spikes</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Mule Smurfing</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {temporalIntel?.transaction_bursts.length ?? 0}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Rapid Layering Windows</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Location Anomalies</span>
                <MapPin className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-rose-400 font-mono">
                {temporalIntel?.location_anomalies.length ?? 0}
              </div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">&gt;800 km/h & Nocturnal</div>
            </div>

            <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 bg-gradient-to-b from-amber-950/20 to-transparent">
              <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
                <span>Clean-Slate Recruits</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400 font-mono">
                {temporalIntel?.clean_slate_anomalies.length ?? 0}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Zero Prior Dossier</div>
            </div>
          </div>

          {/* SECTION 1: CLEAN-SLATE ANOMALY RADAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Clean-Slate Anomaly Dossier: Recruited Cartel Proxies
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Operatives with clean police slates exhibiting acute current-case velocity (Section 63 BSA 2023 Evidentiary Priority).
                </p>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  onClick={() => setCleanSlateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    cleanSlateFilter === 'ALL' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({temporalIntel?.clean_slate_anomalies.length ?? 0})
                </button>
                <button
                  onClick={() => setCleanSlateFilter('MULE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    cleanSlateFilter === 'MULE' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Mule Accounts
                </button>
                <button
                  onClick={() => setCleanSlateFilter('BURNER')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    cleanSlateFilter === 'BURNER' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Burner Proxies
                </button>
                <button
                  onClick={() => setCleanSlateFilter('CUTOUT')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    cleanSlateFilter === 'CUTOUT' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Syndicate Cutouts
                </button>
              </div>
            </div>

            {filteredCleanSlate.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                <h5 className="text-xs font-bold text-slate-300">No Clean-Slate Anomalies Detected in Filter</h5>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Either no zero-prior subjects exhibit anomalous velocity or all active actors have existing criminal dossiers.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCleanSlate.map((cs, idx) => (
                  <div
                    key={`${cs.entity_identifier}_${idx}`}
                    className="bg-slate-950 border border-amber-500/30 hover:border-amber-500/60 rounded-xl p-4 shadow-lg space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white font-mono">{cs.entity_identifier}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                            {cs.risk_archetype}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          <span className="text-emerald-400 font-semibold">✓ Zero Prior FIRs</span>
                          <span>•</span>
                          <span>{cs.current_case_events_count} Current Events</span>
                          {cs.current_case_financial_volume > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-mono font-bold">
                                ₹{cs.current_case_financial_volume.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Anomaly Score</span>
                        <div className="text-lg font-bold text-amber-400 font-mono">
                          {cs.current_case_anomaly_score.toFixed(1)}
                          <span className="text-xs text-slate-500 font-normal">/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/80 rounded-lg text-xs space-y-1.5">
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        <strong className="text-amber-300">Evidentiary Lead: </strong>
                        {cs.evidentiary_rationale}
                      </p>
                      <p className="text-[10px] text-slate-400 italic">
                        <strong className="text-cyan-400">Statutory Safeguard: </strong>
                        {cs.statutory_safeguard}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: COMMUNICATION & TRANSACTION BURSTS (DUAL GRIDS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Communication Bursts Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <PhoneCall className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Communication Bursts ({temporalIntel?.communication_bursts.length ?? 0})
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Window: 2 Hours</span>
              </div>

              {(!temporalIntel || temporalIntel.communication_bursts.length === 0) ? (
                <div className="p-6 text-center bg-slate-950 rounded-lg text-xs text-slate-500">
                  No sudden telecom surges exceeding Z-score threshold detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {temporalIntel.communication_bursts.map((cb, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-mono text-xs text-white">
                          <span className="text-purple-300 font-semibold">{cb.entity_1}</span>
                          <span className="text-slate-500">⇄</span>
                          <span className="text-cyan-300 font-semibold">{cb.entity_2}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          cb.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {cb.severity} (Z: {cb.z_score}σ)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {cb.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                        <span>Recorded Calls: {cb.call_count} (Expected: {cb.expected_count})</span>
                        <span>{new Date(cb.window_start).toLocaleTimeString()} – {new Date(cb.window_end).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Layering Bursts Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Transaction Smurfing Bursts ({temporalIntel?.transaction_bursts.length ?? 0})
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Window: 4 Hours</span>
              </div>

              {(!temporalIntel || temporalIntel.transaction_bursts.length === 0) ? (
                <div className="p-6 text-center bg-slate-950 rounded-lg text-xs text-slate-500">
                  No high-velocity transaction clusters detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {temporalIntel.transaction_bursts.map((tb, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs text-emerald-300 font-bold">
                          {tb.target_account}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            ₹{tb.total_volume_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {tb.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-500">Channels:</span>
                        {tb.channels.map((ch, cIdx) => (
                          <span key={cIdx} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: SPATIOTEMPORAL ANOMALIES & RELATIONSHIP EMERGENCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spatiotemporal Anomalies */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Spatiotemporal Anomalies ({temporalIntel?.location_anomalies.length ?? 0})
                  </h4>
                </div>
                <span className="text-[10px] text-rose-400 font-mono">Clone SIM &amp; Nocturnal Radar</span>
              </div>

              {(!temporalIntel || temporalIntel.location_anomalies.length === 0) ? (
                <div className="p-6 text-center bg-slate-950 rounded-lg text-xs text-slate-500">
                  No impossible displacement speeds or off-hours tower bursts detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {temporalIntel.location_anomalies.map((loc, idx) => (
                    <div key={idx} className="bg-slate-950 border border-rose-900/40 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{loc.entity_phone}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800">
                          {loc.anomaly_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {loc.description}
                      </p>
                      {loc.calculated_speed_kmh && (
                        <div className="flex items-center justify-between text-[10px] font-mono text-rose-300 bg-rose-950/30 p-2 rounded border border-rose-900/40">
                          <span>{loc.origin_tower} ➔ {loc.destination_tower}</span>
                          <span>{loc.calculated_speed_kmh} km/h ({loc.distance_km} km in {loc.time_delta_min}m)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Relationship Emergence Dynamics */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Relationship Emergence &amp; Dormancy ({temporalIntel?.relationship_emergence.length ?? 0})
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Temporal Evolution</span>
              </div>

              {(!temporalIntel || temporalIntel.relationship_emergence.length === 0) ? (
                <div className="p-6 text-center bg-slate-950 rounded-lg text-xs text-slate-500">
                  No multi-event relationship transitions recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {temporalIntel.relationship_emergence.map((rel, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono text-purple-300 font-bold">
                          {rel.entity_1} ⇄ {rel.entity_2}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          rel.emergence_status === 'NEWLY_EMERGED' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                          rel.emergence_status === 'REACTIVATED_DORMANT' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {rel.emergence_status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {rel.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                        <span>Span: {rel.active_duration_days} days ({rel.total_interactions} interactions)</span>
                        <span>Max Gap: {rel.max_dormancy_gap_days} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: MASTER CHRONOLOGICAL TIMELINE */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Unified Evidentiary Master Timeline ({filteredTimeline.length})
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Chronologically synchronized multi-source evidence feed (CDRs, Bank Records, FIRs).
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  onClick={() => setTimelineFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    timelineFilter === 'ALL' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTimelineFilter('CDR')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    timelineFilter === 'CDR' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  CDRs
                </button>
                <button
                  onClick={() => setTimelineFilter('TRANSACTION')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    timelineFilter === 'TRANSACTION' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setTimelineFilter('FIR')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    timelineFilter === 'FIR' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  FIRs
                </button>
              </div>
            </div>

            {filteredTimeline.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl text-xs text-slate-500">
                No timeline events available for this case filter.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredTimeline.map((evt, eIdx) => (
                  <div
                    key={evt.event_id || eIdx}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="shrink-0 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          evt.event_type.includes('CALL') ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                          evt.event_type.includes('TRANSACTION') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {evt.event_type}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white">
                          {evt.summary}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                          <span>{evt.actor_entity}</span>
                          <span>➔</span>
                          <span>{evt.target_entity}</span>
                          {evt.channel_or_location && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">{evt.channel_or_location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-purple-300 font-bold">
                        {new Date(evt.timestamp).toLocaleString()}
                      </div>
                      {evt.amount && (
                        <div className="text-xs font-mono text-emerald-400 font-bold">
                          {evt.currency || 'INR'} {evt.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SECTION 63 BSA INVESTIGATOR REVIEW */}
      {isMLReviewModalOpen && selectedMLPrediction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/70">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 font-bold mb-1">
                  <Scale className="w-4 h-4" />
                  <span>SECTION 63 BSA 2023 INVESTIGATOR DECISION</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Investigative Review of Predicted Link
                </h3>
              </div>
              <button
                onClick={() => setIsMLReviewModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-2 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Source</span>
                  <span className="text-xs font-bold text-white">{selectedMLPrediction.candidate_link.source_name}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-amber-400 font-bold">{selectedMLPrediction.candidate_link.predicted_relationship}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Target</span>
                  <span className="text-xs font-bold text-white">{selectedMLPrediction.candidate_link.target_name}</span>
                </div>
              </div>

              {/* Decision Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">Investigative Determination</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setMlReviewDecision('ACCEPTED_AS_HYPOTHESIS')}
                    className={`p-2.5 rounded-lg border text-center font-semibold transition ${
                      mlReviewDecision === 'ACCEPTED_AS_HYPOTHESIS'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Accept Hypothesis
                  </button>
                  <button
                    type="button"
                    onClick={() => setMlReviewDecision('REJECTED')}
                    className={`p-2.5 rounded-lg border text-center font-semibold transition ${
                      mlReviewDecision === 'REJECTED'
                        ? 'bg-rose-950 border-rose-500 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Reject Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setMlReviewDecision('CHALLENGED')}
                    className={`p-2.5 rounded-lg border text-center font-semibold transition ${
                      mlReviewDecision === 'CHALLENGED'
                        ? 'bg-amber-950 border-amber-500 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Challenge / Hold
                  </button>
                </div>
              </div>

              {/* Officer Badge */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Investigator Badge / ID</label>
                <input
                  type="text"
                  value={mlInvestigatorBadge}
                  onChange={(e) => setMlInvestigatorBadge(e.target.value)}
                  placeholder="e.g. INSP-7789"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Justification Rationale */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Statutory Rationale & Reason for Determination
                  <span className="text-rose-400 ml-1">*</span>
                </label>
                <textarea
                  rows={3}
                  value={mlReviewJustification}
                  onChange={(e) => setMlReviewJustification(e.target.value)}
                  placeholder="Mandatory evidentiary justification for audit trail under Section 63 BSA 2023..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400">
                <strong className="text-amber-400">Section 63 BSA Compliance: </strong>
                Accepting this candidate registers an <span className="text-emerald-300 font-mono">INFERRED_HYPOTHESIS</span> relationship in the knowledge graph with your officer badge signature. It does NOT automatically declare guilt or evidentiary finality.
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsMLReviewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMLReviewSubmit}
                disabled={reviewing}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-600/30"
              >
                {reviewing ? 'Recording Decision...' : 'Confirm & Log Audit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: METRICS GLOSSARY & LEGAL DEFINITIONS */}
      {isGlossaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 font-bold mb-1">
                  <Scale className="w-4 h-4" />
                  <span>SECTION 63 BSA 2023 JURISPRUDENCE</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Graph Analytics Metrics & Non-Culpability Glossary
                </h3>
              </div>
              <button 
                onClick={() => setIsGlossaryModalOpen(false)} 
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-300 leading-relaxed">
                <strong>Statutory Doctrine: </strong>
                {metricsGlossary?.overarching_judicial_doctrine}
              </div>

              <div className="space-y-4">
                {metricsGlossary?.glossary.map((item) => (
                  <div key={item.metric_id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white tracking-tight">
                        {item.name}
                      </h4>
                      <code className="text-[10px] bg-slate-900 text-purple-300 px-2 py-0.5 rounded font-mono">
                        {item.formula}
                      </code>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong className="text-slate-400">Investigative Meaning: </strong>
                      {item.investigative_meaning}
                    </p>

                    <div className="p-2.5 bg-slate-900/60 rounded-lg text-xs space-y-1">
                      <p className="text-slate-400">
                        <strong className="text-cyan-400">Benign Alternative Explanation: </strong>
                        {item.benign_alternative_explanation}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-amber-400">Judicial Non-Culpability Rule: </strong>
                        {item.judicial_non_culpability_statement}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setIsGlossaryModalOpen(false)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
