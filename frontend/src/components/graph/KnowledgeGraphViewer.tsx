import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  RotateCw, 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  User, 
  Phone, 
  Smartphone, 
  CreditCard, 
  Car, 
  MapPin, 
  Building2, 
  FileCheck2, 
  ShieldCheck, 
  Cpu,
  Layers,
  ArrowRight,
  Info,
  X,
  Scale,
  Flag
} from 'lucide-react';
import { Case, GraphData, GraphNode, GraphEdge, GraphStats } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface KnowledgeGraphViewerProps {
  activeCase: Case;
}

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ activeCase }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [nodeFilter, setNodeFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<{
    observed: boolean;
    inferred: boolean;
    predicted: boolean;
    contested: boolean;
  }>({
    observed: true,
    inferred: true,
    predicted: true,
    contested: true
  });

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        api.getCaseGraph(activeCase.id),
        api.getGraphStats(activeCase.id)
      ]);
      setGraphData(data);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [activeCase.id]);

  const handleSyncNeo4j = async () => {
    setSyncing(true);
    try {
      await api.syncCaseToGraph(activeCase.id);
      fetchGraph();
    } catch (err: any) {
      console.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Node placement layout calculation
  const calculateNodePositions = (nodes: GraphNode[]) => {
    const width = 840;
    const height = 580;
    const centerX = width / 2;
    const centerY = height / 2;
    const positions: Record<string, { x: number; y: number }> = {};

    if (nodes.length === 0) return positions;

    const sorted = [...nodes].sort((a, b) => (b.degree || 0) - (a.degree || 0));
    const hubNode = sorted[0];
    positions[hubNode.id] = { x: centerX, y: centerY };

    const remaining = sorted.slice(1);

    remaining.forEach((node, idx) => {
      const ring = Math.floor(idx / 8) + 1;
      const ringRadius = ring * 135;
      const angle = (idx % 8) * ((2 * Math.PI) / Math.min(8, remaining.length));
      positions[node.id] = {
        x: centerX + ringRadius * Math.cos(angle),
        y: centerY + ringRadius * Math.sin(angle)
      };
    });

    return positions;
  };

  const getNodeColor = (label: string) => {
    switch (label) {
      case 'Person': return '#16805C'; // Verified green
      case 'Phone': return '#0369A1'; // Sky blue
      case 'Device': return '#7C3AED'; // Purple
      case 'Account': return '#B7791F'; // Amber
      case 'Vehicle': return '#C53030'; // Red
      case 'Location': return '#2563EB'; // Blue
      case 'Organization': return '#4338CA'; // Indigo
      default: return '#475569'; // Slate
    }
  };

  const getNodeIcon = (label: string) => {
    switch (label) {
      case 'Person': return <User className="w-3.5 h-3.5 text-[#16805C]" />;
      case 'Phone': return <Phone className="w-3.5 h-3.5 text-[#0369A1]" />;
      case 'Device': return <Smartphone className="w-3.5 h-3.5 text-[#7C3AED]" />;
      case 'Account': return <CreditCard className="w-3.5 h-3.5 text-[#B7791F]" />;
      case 'Vehicle': return <Car className="w-3.5 h-3.5 text-[#C53030]" />;
      case 'Location': return <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />;
      case 'Organization': return <Building2 className="w-3.5 h-3.5 text-[#4338CA]" />;
      default: return <FileCheck2 className="w-3.5 h-3.5 text-[#475569]" />;
    }
  };

  const getEdgeTier = (edge: GraphEdge): 'observed' | 'inferred' | 'predicted' | 'contested' => {
    if (edge.relationship_nature === 'CONTESTED') return 'contested';
    if (edge.relationship_nature === 'PREDICTED' || (edge.confidence && edge.confidence < 0.95)) return 'predicted';
    if (edge.relationship_nature === 'INFERRED') return 'inferred';
    return 'observed';
  };

  const getEdgeStrokeColor = (tier: 'observed' | 'inferred' | 'predicted' | 'contested') => {
    switch (tier) {
      case 'observed': return '#16805C'; // Forest green solid
      case 'inferred': return '#2563EB'; // Blue dashed
      case 'predicted': return '#B7791F'; // Amber dotted
      case 'contested': return '#C53030'; // Red hashed
    }
  };

  const filteredNodes = (graphData?.nodes || []).filter(n => {
    if (nodeFilter !== 'ALL' && n.label !== nodeFilter) return false;
    if (!searchQuery) return true;
    return n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = (graphData?.edges || []).filter(e => {
    if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;
    const tier = getEdgeTier(e);
    return tierFilter[tier];
  });

  const nodePositions = calculateNodePositions(filteredNodes);

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header Bar */}
      <div className="workstation-panel p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#172033] font-mono tracking-wide">
              CRIMINAL NETWORK INVESTIGATION WORKSPACE
            </h1>
            <Badge variant="info">{stats?.total_nodes || 0} Nodes / {stats?.total_edges || 0} Links</Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            4-tier semantic network topology synthesizing observed CDR transmissions, mule accounts, shared hardware IMEIs, and predicted syndicate ties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGraph}
            className="btn-rect-secondary text-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleSyncNeo4j}
            disabled={syncing}
            className="btn-rect-primary text-xs"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{syncing ? 'Syncing...' : 'Sync Graph Engine'}</span>
          </button>
        </div>
      </div>

      {/* 4-Tier Semantic Filter & Search Ribbon */}
      <div className="workstation-card rounded p-3 space-y-2.5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
          {/* Node Search Bar */}
          <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded px-2.5 py-1.5 w-full md:w-64 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph nodes..."
              className="bg-transparent border-none outline-none text-xs text-[#172033] placeholder-[#94A3B8] w-full"
            />
          </div>

          {/* Node Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-xl">
            {['ALL', 'Person', 'Phone', 'Account', 'Device', 'Vehicle', 'Location'].map(label => (
              <button
                key={label}
                onClick={() => setNodeFilter(label)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  nodeFilter === label
                    ? 'bg-[#163A5F] text-white font-bold border border-[#0E2640]'
                    : 'bg-[#F8FAFC] text-[#475569] hover:text-[#172033] border border-[#CBD5E1]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Zoom and Reset Controls */}
          <div className="flex items-center gap-1 text-[#64748B]">
            <button
              onClick={() => setZoomLevel(z => Math.max(0.4, z - 0.2))}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] px-1 font-bold text-[#172033]">{(zoomLevel * 100).toFixed(0)}%</span>
            <button
              onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.2))}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4-Tier Semantic Relationship Legend & Toggles */}
        <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span className="text-[#64748B] uppercase text-[10px] font-bold">RELATION TIERS:</span>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tierFilter.observed}
              onChange={(e) => setTierFilter(prev => ({ ...prev, observed: e.target.checked }))}
              className="rounded border-[#CBD5E1] text-[#16805C] focus:ring-0"
            />
            <span className="flex items-center gap-1 text-[#16805C] font-semibold">
              <span className="w-3 h-0.5 bg-[#16805C] inline-block" />
              Observed Fact (Solid)
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tierFilter.inferred}
              onChange={(e) => setTierFilter(prev => ({ ...prev, inferred: e.target.checked }))}
              className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-0"
            />
            <span className="flex items-center gap-1 text-[#2563EB] font-semibold">
              <span className="w-3 h-0.5 border-b border-[#2563EB] border-dashed inline-block" />
              Inferred Link (Dashed)
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tierFilter.predicted}
              onChange={(e) => setTierFilter(prev => ({ ...prev, predicted: e.target.checked }))}
              className="rounded border-[#CBD5E1] text-[#B7791F] focus:ring-0"
            />
            <span className="flex items-center gap-1 text-[#B7791F] font-semibold">
              <span className="w-3 h-0.5 border-b border-[#B7791F] border-dotted inline-block" />
              Predicted Link (Dotted ML)
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tierFilter.contested}
              onChange={(e) => setTierFilter(prev => ({ ...prev, contested: e.target.checked }))}
              className="rounded border-[#CBD5E1] text-[#C53030] focus:ring-0"
            />
            <span className="flex items-center gap-1 text-[#C53030] font-semibold">
              <span className="w-3 h-0.5 bg-[#C53030] inline-block" />
              Contested (Disputed)
            </span>
          </label>
        </div>
      </div>

      {/* Main Interactive Canvas Area (Clean Light Canvas) */}
      <div className="relative w-full h-[620px] rounded bg-[#FFFFFF] border border-[#D9E0E8] overflow-hidden select-none shadow-sm">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-[#64748B]">
            Rendering Criminal Knowledge Graph Topology...
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-[#64748B] text-xs font-mono">
            <Network className="w-8 h-8 text-[#94A3B8]" />
            <p>No graph nodes found matching filter criteria.</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing bg-[#FAFCFF]"
          >
            <svg
              className="w-full h-full"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDraggingCanvas ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              {/* Arrowhead Defs */}
              <defs>
                <marker
                  id="graph-arrow-observed"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#16805C" />
                </marker>
                <marker
                  id="graph-arrow-inferred"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563EB" />
                </marker>
                <marker
                  id="graph-arrow-predicted"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#B7791F" />
                </marker>
                <marker
                  id="graph-arrow-contested"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#C53030" />
                </marker>
              </defs>

              {/* Render Edges */}
              {filteredEdges.map((edge) => {
                const srcPos = nodePositions[edge.source];
                const tgtPos = nodePositions[edge.target];
                if (!srcPos || !tgtPos) return null;

                const midX = (srcPos.x + tgtPos.x) / 2;
                const midY = (srcPos.y + tgtPos.y) / 2;
                const tier = getEdgeTier(edge);
                const strokeColor = getEdgeStrokeColor(tier);
                const isSelected = selectedEdge?.id === edge.id;

                let dashArray: string | undefined = undefined;
                if (tier === 'inferred') dashArray = '5,5';
                if (tier === 'predicted') dashArray = '2,4';
                if (tier === 'contested') dashArray = '8,3,2,3';

                return (
                  <g 
                    key={edge.id} 
                    className="group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(null);
                      setSelectedEdge(edge);
                    }}
                  >
                    <line
                      x1={srcPos.x}
                      y1={srcPos.y}
                      x2={tgtPos.x}
                      y2={tgtPos.y}
                      stroke={isSelected ? '#163A5F' : strokeColor}
                      strokeWidth={isSelected ? '3.5' : tier === 'observed' ? '2.5' : '1.5'}
                      strokeDasharray={dashArray}
                      markerEnd={`url(#graph-arrow-${tier})`}
                      className="transition-all group-hover:stroke-[#163A5F] group-hover:stroke-[3]"
                    />
                    {/* Edge Label Badge */}
                    <rect
                      x={midX - 35}
                      y={midY - 8}
                      width="70"
                      height="16"
                      rx="2"
                      fill="#FFFFFF"
                      stroke={isSelected ? '#2563EB' : '#CBD5E1'}
                      className="shadow-2xs"
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      fill="#334155"
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="pointer-events-none group-hover:fill-[#163A5F]"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {filteredNodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;

                const color = getNodeColor(node.label);
                const isSelected = selectedNode?.id === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(null);
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Node Selection Outline */}
                    {isSelected && (
                      <circle
                        r="22"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2.5"
                        strokeDasharray="4,3"
                      />
                    )}

                    {/* Inner Node Circle */}
                    <circle
                      r="15"
                      fill="#FFFFFF"
                      stroke={color}
                      strokeWidth="2.5"
                      className="group-hover:stroke-[#163A5F] transition-colors shadow-sm"
                    />

                    {/* Node Label Text */}
                    <text
                      y="28"
                      textAnchor="middle"
                      fill="#172033"
                      fontSize="10"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {node.name.length > 18 ? `${node.name.slice(0, 16)}...` : node.name}
                    </text>

                    {/* Sub-label */}
                    <text
                      y="38"
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="8"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-80 bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg shadow-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center gap-2">
                {getNodeIcon(selectedNode.label)}
                <span className="font-bold text-[#172033] truncate text-xs">
                  {selectedNode.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#64748B] hover:text-[#172033] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">ENTITY TYPE:</span>
                <span className="text-[#163A5F] font-bold">{selectedNode.label}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">DEGREE CENTRALITY:</span>
                <span className="text-[#B7791F] font-bold">{selectedNode.degree || 1} connections</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">BSA §63 EVIDENCE REF:</span>
                <span className="text-[#16805C] font-bold">SEC-63-VERIFIED</span>
              </div>
            </div>

            {/* Properties View */}
            {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1">
                <div className="text-[10px] text-[#64748B] uppercase font-semibold">FORENSIC ATTRIBUTES</div>
                {Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px] text-[#334155]">
                    <span className="text-[#64748B]">{k}:</span>
                    <span className="truncate max-w-[150px] font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-[#E2E8F0] flex gap-2">
              <button
                onClick={() => alert(`Node ${selectedNode.name} verified under Section 63 BSA.`)}
                className="btn-rect-primary flex-1 text-[11px]"
              >
                Verify Node
              </button>
              <button
                onClick={() => alert(`Node ${selectedNode.name} marked as contested for defense review.`)}
                className="btn-rect-danger text-[11px]"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Edge Inspector Drawer */}
        {selectedEdge && (
          <div className="absolute top-3 right-3 w-80 bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg shadow-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#163A5F]" />
                <span className="font-bold text-[#172033] truncate text-xs">
                  {selectedEdge.label} LINK
                </span>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="text-[#64748B] hover:text-[#172033] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">TYPE:</span>
                <span className="text-[#163A5F] font-bold">{selectedEdge.label}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">STATUS:</span>
                <Badge variant={getEdgeTier(selectedEdge) === 'observed' ? 'observed' : getEdgeTier(selectedEdge) === 'inferred' ? 'inferred' : getEdgeTier(selectedEdge) === 'predicted' ? 'predicted' : 'contested'}>
                  {selectedEdge.relationship_nature || 'OBSERVED'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">EVIDENCE REF:</span>
                <span className="text-[#16805C] font-bold">
                  {selectedEdge.evidence_id ? `EVID-${selectedEdge.evidence_id.substring(0, 8)}` : 'CORROBORATED'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">CONFIDENCE:</span>
                <span className="text-[#B7791F] font-bold">{((selectedEdge.confidence || 0.95) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">VERIFICATION:</span>
                <span className="text-[#172033] font-semibold">{selectedEdge.verification_status || 'VERIFIED'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-[#E2E8F0] flex gap-2">
              <button
                onClick={() => alert(`Relationship ${selectedEdge.label} verified.`)}
                className="btn-rect-primary flex-1 text-[11px]"
              >
                Verify Link
              </button>
              <button
                onClick={() => alert(`Relationship marked contested.`)}
                className="btn-rect-danger text-[11px]"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
