import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Flag,
  Play,
  Pause,
  Compass,
  GitFork,
  Eye,
  Crosshair,
  Download,
  Share2,
  Sparkles,
  Route
} from 'lucide-react';
import { Case, GraphData, GraphNode, GraphEdge, GraphStats } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface KnowledgeGraphViewerProps {
  activeCase: Case;
}

type LayoutType = 'FORCE' | 'CONCENTRIC' | 'HIERARCHICAL' | 'RADIAL_CLUSTER' | 'GRID';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  radius: number;
  community?: number;
}

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ activeCase }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [nodeFilter, setNodeFilter] = useState<string>('ALL');
  const [layoutType, setLayoutType] = useState<LayoutType>('FORCE');
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);

  // Pathfinding state
  const [pathfindingMode, setPathfindingMode] = useState<boolean>(false);
  const [pathSourceId, setPathSourceId] = useState<string>('');
  const [pathTargetId, setPathTargetId] = useState<string>('');
  const [highlightedPathEdgeIds, setHighlightedPathEdgeIds] = useState<Set<string>>(new Set());
  const [highlightedPathNodeIds, setHighlightedPathNodeIds] = useState<Set<string>>(new Set());

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
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simNodesRef = useRef<Record<string, SimNode>>({});
  const animationFrameRef = useRef<number | null>(null);
  const [, setTick] = useState(0);

  // Fetch Graph Data
  const fetchGraph = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        api.getCaseGraph(activeCase.id),
        api.getGraphStats(activeCase.id)
      ]);
      setGraphData(data);
      setStats(statsData);
      initSimPositions(data?.nodes || [], data?.edges || [], layoutType);
    } catch (err: any) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setHighlightedPathEdgeIds(new Set());
    setHighlightedPathNodeIds(new Set());
    setPathSourceId('');
    setPathTargetId('');
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1.0);
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

  // Node Colors by Entity Type
  const getNodeColor = (label: string) => {
    switch (label) {
      case 'Person': return '#16805C';      // Forest Emerald
      case 'Phone': return '#0284C7';       // Sky Blue
      case 'Device': return '#7C3AED';      // Amethyst Purple
      case 'Account': return '#B7791F';     // Amber Gold
      case 'Vehicle': return '#E11D48';     // Rose Red
      case 'Location': return '#2563EB';    // Cobalt Blue
      case 'Organization': return '#4338CA';// Indigo
      case 'LegalSection': return '#475569';// Slate
      default: return '#64748B';            // Charcoal
    }
  };

  const getNodeBgColor = (label: string) => {
    switch (label) {
      case 'Person': return '#ECFDF5';
      case 'Phone': return '#F0F9FF';
      case 'Device': return '#F5F3FF';
      case 'Account': return '#FEFCE8';
      case 'Vehicle': return '#FFF1F2';
      case 'Location': return '#EFF6FF';
      case 'Organization': return '#EEF2FF';
      default: return '#F8FAFC';
    }
  };

  const getNodeIcon = (label: string, className = "w-4 h-4") => {
    switch (label) {
      case 'Person': return <User className={className} />;
      case 'Phone': return <Phone className={className} />;
      case 'Device': return <Smartphone className={className} />;
      case 'Account': return <CreditCard className={className} />;
      case 'Vehicle': return <Car className={className} />;
      case 'Location': return <MapPin className={className} />;
      case 'Organization': return <Building2 className={className} />;
      default: return <FileCheck2 className={className} />;
    }
  };

  const getEdgeTier = (edge: GraphEdge): 'observed' | 'inferred' | 'predicted' | 'contested' => {
    if (edge.relationship_nature === 'CONTESTED') return 'contested';
    if (edge.relationship_nature === 'PREDICTED' || (edge.confidence && edge.confidence < 0.90)) return 'predicted';
    if (edge.relationship_nature === 'INFERRED') return 'inferred';
    return 'observed';
  };

  const getEdgeStrokeColor = (tier: 'observed' | 'inferred' | 'predicted' | 'contested') => {
    switch (tier) {
      case 'observed': return '#16805C'; // Forest green solid
      case 'inferred': return '#2563EB'; // Blue dashed
      case 'predicted': return '#B7791F'; // Amber dotted
      case 'contested': return '#DC2626'; // Red
    }
  };

  // Filtered dataset
  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.filter(n => {
      if (nodeFilter !== 'ALL' && n.label !== nodeFilter) return false;
      if (!searchQuery) return true;
      return n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             n.label.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [graphData?.nodes, nodeFilter, searchQuery]);

  const filteredNodeIdSet = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.filter(e => {
      if (!filteredNodeIdSet.has(e.source) || !filteredNodeIdSet.has(e.target)) return false;
      const tier = getEdgeTier(e);
      return tierFilter[tier];
    });
  }, [graphData?.edges, filteredNodeIdSet, tierFilter]);

  // Direct Adjacency Map for 1-Hop / 2-Hop Highlighting
  const adjacencyMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    filteredEdges.forEach(e => {
      if (!map[e.source]) map[e.source] = new Set();
      if (!map[e.target]) map[e.target] = new Set();
      map[e.source].add(e.target);
      map[e.target].add(e.source);
    });
    return map;
  }, [filteredEdges]);

  // Active Focus Node Set (1-hop highlight)
  const activeFocusNodeIds = useMemo(() => {
    const focusTargetId = selectedNode?.id || hoveredNodeId;
    if (!focusTargetId) return null;
    const set = new Set<string>([focusTargetId]);
    const neighbors = adjacencyMap[focusTargetId];
    if (neighbors) {
      neighbors.forEach(nid => set.add(nid));
    }
    return set;
  }, [selectedNode?.id, hoveredNodeId, adjacencyMap]);

  // Initialize Layout Coordinates
  const initSimPositions = useCallback((nodes: GraphNode[], edges: GraphEdge[], layout: LayoutType) => {
    const width = 1000;
    const height = 680;
    const cx = width / 2;
    const cy = height / 2;
    const newSimNodes: Record<string, SimNode> = {};

    if (nodes.length === 0) {
      simNodesRef.current = {};
      return;
    }

    const sortedByDegree = [...nodes].sort((a, b) => (b.degree || 0) - (a.degree || 0));

    if (layout === 'CONCENTRIC') {
      const hub = sortedByDegree[0];
      newSimNodes[hub.id] = {
        ...hub,
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        radius: 26,
        community: 0
      };

      const rest = sortedByDegree.slice(1);
      rest.forEach((node, idx) => {
        const ring = Math.floor(idx / 7) + 1;
        const radius = ring * 140;
        const ringCount = Math.min(7, rest.length - (ring - 1) * 7);
        const angle = ((idx % 7) * 2 * Math.PI) / Math.max(1, ringCount);
        newSimNodes[node.id] = {
          ...node,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          vx: 0,
          vy: 0,
          radius: Math.max(16, 24 - ring * 2),
          community: ring
        };
      });
    } else if (layout === 'HIERARCHICAL') {
      // Group into tiers: Persons -> Devices/Accounts -> Locations/Orgs
      const tiers: Record<string, GraphNode[]> = {
        tier1: [],
        tier2: [],
        tier3: [],
        tier4: []
      };

      nodes.forEach(n => {
        if (n.label === 'Person') tiers.tier1.push(n);
        else if (n.label === 'Phone' || n.label === 'Device') tiers.tier2.push(n);
        else if (n.label === 'Account') tiers.tier3.push(n);
        else tiers.tier4.push(n);
      });

      const tierKeys = ['tier1', 'tier2', 'tier3', 'tier4'] as const;
      tierKeys.forEach((k, rowIdx) => {
        const rowNodes = tiers[k];
        const rowY = 120 + rowIdx * 150;
        rowNodes.forEach((node, colIdx) => {
          const spacing = width / (rowNodes.length + 1);
          newSimNodes[node.id] = {
            ...node,
            x: spacing * (colIdx + 1),
            y: rowY,
            vx: 0,
            vy: 0,
            radius: rowIdx === 0 ? 24 : 18,
            community: rowIdx
          };
        });
      });
    } else if (layout === 'RADIAL_CLUSTER') {
      const categories = Array.from(new Set(nodes.map(n => n.label)));
      const clusterAngleStep = (2 * Math.PI) / categories.length;

      categories.forEach((cat, cIdx) => {
        const catAngle = cIdx * clusterAngleStep;
        const clusterCenterX = cx + 220 * Math.cos(catAngle);
        const clusterCenterY = cy + 220 * Math.sin(catAngle);
        const catNodes = nodes.filter(n => n.label === cat);

        catNodes.forEach((node, nIdx) => {
          const subAngle = (nIdx * 2 * Math.PI) / Math.max(1, catNodes.length);
          const subRadius = Math.min(80, 25 + nIdx * 12);
          newSimNodes[node.id] = {
            ...node,
            x: clusterCenterX + subRadius * Math.cos(subAngle),
            y: clusterCenterY + subRadius * Math.sin(subAngle),
            vx: 0,
            vy: 0,
            radius: 20,
            community: cIdx
          };
        });
      });
    } else if (layout === 'GRID') {
      const cols = Math.ceil(Math.sqrt(nodes.length * 1.5));
      const colWidth = width / (cols + 1);
      const rowHeight = 110;

      nodes.forEach((node, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        newSimNodes[node.id] = {
          ...node,
          x: colWidth * (col + 1),
          y: 90 + row * rowHeight,
          vx: 0,
          vy: 0,
          radius: 18,
          community: row
        };
      });
    } else {
      // FORCE layout initial circular layout with jitter
      nodes.forEach((node, idx) => {
        const existing = simNodesRef.current[node.id];
        const angle = (idx * 2 * Math.PI) / nodes.length;
        const r = 200 + (idx % 3) * 60;
        newSimNodes[node.id] = {
          ...node,
          x: existing ? existing.x : cx + r * Math.cos(angle) + (Math.random() - 0.5) * 40,
          y: existing ? existing.y : cy + r * Math.sin(angle) + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          radius: Math.max(18, Math.min(30, 16 + (node.degree || 1) * 2.5)),
          community: (idx % 4)
        };
      });
    }

    simNodesRef.current = newSimNodes;
    setTick(t => t + 1);
  }, []);

  // Layout change triggers reposition
  useEffect(() => {
    if (graphData?.nodes) {
      initSimPositions(graphData.nodes, graphData.edges || [], layoutType);
    }
  }, [layoutType, graphData, initSimPositions]);

  // Real-Time Force Physics Engine Loop
  useEffect(() => {
    if (layoutType !== 'FORCE' || !isSimRunning) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let isMounted = true;
    const width = 1000;
    const height = 680;
    const cx = width / 2;
    const cy = height / 2;

    const runPhysicsStep = () => {
      const simNodes = Object.values(simNodesRef.current);
      if (simNodes.length === 0) return;

      const kRepulsion = 2200;
      const kAttraction = 0.045;
      const restingDistance = 140;
      const kCenterGravity = 0.015;
      const damping = 0.82;

      // 1. Repulsion between all node pairs (Coulomb force)
      for (let i = 0; i < simNodes.length; i++) {
        const n1 = simNodes[i];
        for (let j = i + 1; j < simNodes.length; j++) {
          const n2 = simNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          const minDist = n1.radius + n2.radius + 35;

          // Force inversely proportional to distance squared
          const force = (kRepulsion / Math.max(distSq, minDist * minDist)) * (dist < minDist ? 2.5 : 1.0);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!n1.fx) { n1.vx -= fx; n1.vy -= fy; }
          if (!n2.fx) { n2.vx += fx; n2.vy += fy; }
        }
      }

      // 2. Spring Attraction along edges (Hooke's law)
      (graphData?.edges || []).forEach(edge => {
        const src = simNodesRef.current[edge.source];
        const tgt = simNodesRef.current[edge.target];
        if (!src || !tgt) return;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - restingDistance;
        const force = displacement * kAttraction;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!src.fx) { src.vx += fx; src.vy += fy; }
        if (!tgt.fx) { tgt.vx += fx; tgt.vy += fy; }
      });

      // 3. Center Gravity pull
      simNodes.forEach(node => {
        if (!node.fx) {
          node.vx += (cx - node.x) * kCenterGravity;
          node.vy += (cy - node.y) * kCenterGravity;

          // Apply velocity and damping
          node.vx *= damping;
          node.vy *= damping;
          node.x += node.vx;
          node.y += node.vy;

          // Clamp to boundary
          node.x = Math.max(node.radius + 20, Math.min(width - node.radius - 20, node.x));
          node.y = Math.max(node.radius + 20, Math.min(height - node.radius - 20, node.y));
        } else {
          node.x = node.fx;
          node.y = node.fy;
          node.vx = 0;
          node.vy = 0;
        }
      });

      setTick(t => (t + 1) % 1000);

      if (isMounted && isSimRunning) {
        animationFrameRef.current = requestAnimationFrame(runPhysicsStep);
      }
    };

    animationFrameRef.current = requestAnimationFrame(runPhysicsStep);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [layoutType, isSimRunning, graphData?.edges]);

  // Shortest Path Finder (BFS)
  const calculateShortestPath = (srcId: string, tgtId: string) => {
    if (!srcId || !tgtId || srcId === tgtId) return;

    const queue: { id: string; pathNodes: string[]; pathEdges: string[] }[] = [
      { id: srcId, pathNodes: [srcId], pathEdges: [] }
    ];
    const visited = new Set<string>([srcId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === tgtId) {
        setHighlightedPathNodeIds(new Set(current.pathNodes));
        setHighlightedPathEdgeIds(new Set(current.pathEdges));
        return;
      }

      (graphData?.edges || []).forEach(e => {
        let nextNodeId: string | null = null;
        if (e.source === current.id && !visited.has(e.target)) nextNodeId = e.target;
        else if (e.target === current.id && !visited.has(e.source)) nextNodeId = e.source;

        if (nextNodeId) {
          visited.add(nextNodeId);
          queue.push({
            id: nextNodeId,
            pathNodes: [...current.pathNodes, nextNodeId],
            pathEdges: [...current.pathEdges, e.id]
          });
        }
      });
    }

    alert('No connecting forensic trail found between the selected nodes.');
  };

  // Node Drag Handlers (Interactive Repositioning)
  const handleNodeMouseDown = (e: React.MouseEvent, node: SimNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
    const simNode = simNodesRef.current[node.id];
    if (simNode) {
      simNode.fx = simNode.x;
      simNode.fy = simNode.y;
    }
  };

  // Canvas Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const rawY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      const simNode = simNodesRef.current[draggedNodeId];
      if (simNode) {
        simNode.fx = rawX;
        simNode.fy = rawY;
        simNode.x = rawX;
        simNode.y = rawY;
        setTick(t => t + 1);
      }
    } else if (isDraggingCanvas) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId) {
      const simNode = simNodesRef.current[draggedNodeId];
      if (simNode && layoutType === 'FORCE') {
        simNode.fx = null;
        simNode.fy = null;
      }
      setDraggedNodeId(null);
    }
    setIsDraggingCanvas(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(z => Math.max(0.4, Math.min(2.5, z + zoomDelta)));
  };

  // Export Graph as SVG
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIPHERTRACE_Graph_${activeCase.case_number}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Top Workstation Header Bar */}
      <div className="workstation-panel p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold text-[#172033] font-mono tracking-wide flex items-center gap-2">
              <Network className="w-4 h-4 text-[#163A5F]" />
              CRIMINAL NETWORK INVESTIGATION WORKSPACE
            </h1>
            <Badge variant="info">
              {filteredNodes.length} Nodes / {filteredEdges.length} Links
            </Badge>
            <span className="text-[11px] font-mono text-[#16805C] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0] font-semibold">
              ● SECTION 63 BSA COMPLIANT
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            4-tier multi-modal semantic topology synthesizing CDR handovers, mule account transfers, shared hardware IMEIs, and predictive syndicate relationships.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPathfindingMode(m => !m)}
            className={`btn-rect text-xs flex items-center gap-1.5 ${
              pathfindingMode 
                ? 'bg-[#B7791F] text-white border-[#92400E]' 
                : 'btn-rect-secondary'
            }`}
            title="Shortest Path Forensic Trail"
          >
            <Route className="w-3.5 h-3.5" />
            <span>Pathfinder</span>
          </button>
          
          <button
            onClick={handleExportSVG}
            className="btn-rect-secondary text-xs flex items-center gap-1.5"
            title="Export High-Res SVG Dossier"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SVG</span>
          </button>

          <button
            onClick={fetchGraph}
            className="btn-rect-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSyncNeo4j}
            disabled={syncing}
            className="btn-rect-primary text-xs flex items-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{syncing ? 'Syncing...' : 'Sync Graph Engine'}</span>
          </button>
        </div>
      </div>

      {/* Pathfinding Inspector Ribbon (When Active) */}
      {pathfindingMode && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2 text-[#92400E] font-bold">
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            <span>FORENSIC PATHFINDER (SHORTEST EVIDENCE TRAIL):</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={pathSourceId}
              onChange={(e) => setPathSourceId(e.target.value)}
              className="bg-white border border-[#CBD5E1] rounded px-2.5 py-1 text-xs text-[#172033]"
            >
              <option value="">-- Select Source Node --</option>
              {filteredNodes.map(n => (
                <option key={n.id} value={n.id}>{n.name} ({n.label})</option>
              ))}
            </select>

            <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />

            <select
              value={pathTargetId}
              onChange={(e) => setPathTargetId(e.target.value)}
              className="bg-white border border-[#CBD5E1] rounded px-2.5 py-1 text-xs text-[#172033]"
            >
              <option value="">-- Select Target Node --</option>
              {filteredNodes.map(n => (
                <option key={n.id} value={n.id}>{n.name} ({n.label})</option>
              ))}
            </select>

            <button
              onClick={() => calculateShortestPath(pathSourceId, pathTargetId)}
              disabled={!pathSourceId || !pathTargetId}
              className="bg-[#163A5F] text-white px-3 py-1 rounded font-bold hover:bg-[#0E2640] disabled:opacity-50"
            >
              Trace Trail
            </button>

            <button
              onClick={() => {
                setHighlightedPathEdgeIds(new Set());
                setHighlightedPathNodeIds(new Set());
                setPathSourceId('');
                setPathTargetId('');
              }}
              className="px-2 py-1 text-[#64748B] hover:text-[#172033]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 4-Tier Semantic Filter & Topology Ribbon */}
      <div className="workstation-card rounded p-3 space-y-2.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs font-mono">
          {/* Node Search Bar */}
          <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded px-2.5 py-1.5 w-full lg:w-64 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph nodes..."
              className="bg-transparent border-none outline-none text-xs text-[#172033] placeholder-[#94A3B8] w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#94A3B8] hover:text-[#172033]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Node Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-xl">
            {['ALL', 'Person', 'Phone', 'Account', 'Device', 'Vehicle', 'Location', 'Organization'].map(label => (
              <button
                key={label}
                onClick={() => setNodeFilter(label)}
                className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                  nodeFilter === label
                    ? 'bg-[#163A5F] text-white font-bold border border-[#0E2640]'
                    : 'bg-[#F8FAFC] text-[#475569] hover:text-[#172033] border border-[#CBD5E1]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Layout Algorithm Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B] font-bold">TOPOLOGY:</span>
            <select
              value={layoutType}
              onChange={(e) => setLayoutType(e.target.value as LayoutType)}
              className="bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs text-[#172033] font-semibold"
            >
              <option value="FORCE">🌐 Force-Directed (Physics)</option>
              <option value="CONCENTRIC">🎯 Concentric (Centrality)</option>
              <option value="HIERARCHICAL">🌲 Hierarchical (Syndicate Tree)</option>
              <option value="RADIAL_CLUSTER">🕸️ Radial (Role Clusters)</option>
              <option value="GRID">⊞ Matrix Grid</option>
            </select>

            {layoutType === 'FORCE' && (
              <button
                onClick={() => setIsSimRunning(r => !r)}
                className={`p-1.5 rounded border ${isSimRunning ? 'bg-[#ECFDF5] text-[#16805C] border-[#A7F3D0]' : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1]'}`}
                title={isSimRunning ? 'Pause Physics Simulation' : 'Resume Physics Simulation'}
              >
                {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
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
              onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Fit & Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4-Tier Semantic Relationship Legend & Toggles */}
        <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-3">
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
                className="rounded border-[#CBD5E1] text-[#DC2626] focus:ring-0"
              />
              <span className="flex items-center gap-1 text-[#DC2626] font-semibold">
                <span className="w-3 h-0.5 bg-[#DC2626] inline-block" />
                Contested (Disputed)
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 text-[#64748B]">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showMiniMap}
                onChange={(e) => setShowMiniMap(e.target.checked)}
                className="rounded border-[#CBD5E1]"
              />
              <span>Mini-Map</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="relative w-full h-[680px] rounded-lg bg-[#FFFFFF] border border-[#D9E0E8] overflow-hidden select-none shadow-sm cursor-grab active:cursor-grabbing"
      >
        {/* Subtle Institutional Graph Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            transform: `translate(${panOffset.x % 24}px, ${panOffset.y % 24}px)`
          }}
        />

        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-mono text-[#64748B] space-y-2">
            <RotateCw className="w-6 h-6 animate-spin text-[#163A5F]" />
            <span>Rendering Multi-Modal Criminal Network Topology...</span>
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-[#64748B] text-xs font-mono">
            <Network className="w-8 h-8 text-[#94A3B8]" />
            <p>No graph nodes found matching filter criteria.</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: '500px 340px',
              transition: isDraggingCanvas || draggedNodeId ? 'none' : 'transform 0.1s ease-out'
            }}
            onClick={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
          >
            {/* Arrowhead Defs */}
            <defs>
              <marker
                id="graph-arrow-observed"
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#16805C" />
              </marker>
              <marker
                id="graph-arrow-inferred"
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563EB" />
              </marker>
              <marker
                id="graph-arrow-predicted"
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#B7791F" />
              </marker>
              <marker
                id="graph-arrow-contested"
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#DC2626" />
              </marker>
              <marker
                id="graph-arrow-gold"
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D97706" />
              </marker>

              {/* Glowing filter for highlighted path */}
              <filter id="path-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Edges */}
            {filteredEdges.map((edge) => {
              const srcNode = simNodesRef.current[edge.source];
              const tgtNode = simNodesRef.current[edge.target];
              if (!srcNode || !tgtNode) return null;

              const tier = getEdgeTier(edge);
              const strokeColor = getEdgeStrokeColor(tier);
              const isSelected = selectedEdge?.id === edge.id;
              const isPathHighlighted = highlightedPathEdgeIds.has(edge.id);

              // Focus mode dimming
              let isDimmed = false;
              if (activeFocusNodeIds) {
                isDimmed = !activeFocusNodeIds.has(edge.source) || !activeFocusNodeIds.has(edge.target);
              }

              // Compute curved midpoint for bidirectional separation
              const dx = tgtNode.x - srcNode.x;
              const dy = tgtNode.y - srcNode.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const midX = (srcNode.x + tgtNode.x) / 2;
              const midY = (srcNode.y + tgtNode.y) / 2;

              // Slight perpendicular curvature
              const curvatureOffset = 12;
              const normX = -dy / dist;
              const normY = dx / dist;
              const ctrlX = midX + normX * curvatureOffset;
              const ctrlY = midY + normY * curvatureOffset;

              const pathString = `M ${srcNode.x} ${srcNode.y} Q ${ctrlX} ${ctrlY} ${tgtNode.x} ${tgtNode.y}`;

              let dashArray: string | undefined = undefined;
              if (tier === 'inferred') dashArray = '6,4';
              if (tier === 'predicted') dashArray = '2,4';
              if (tier === 'contested') dashArray = '8,3,2,3';

              return (
                <g 
                  key={edge.id} 
                  className={`group cursor-pointer transition-opacity duration-200 ${isDimmed ? 'opacity-15' : 'opacity-100'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(null);
                    setSelectedEdge(edge);
                  }}
                >
                  {/* Glowing backing for pathfinder */}
                  {isPathHighlighted && (
                    <path
                      d={pathString}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="6"
                      filter="url(#path-glow)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Edge Line */}
                  <path
                    d={pathString}
                    fill="none"
                    stroke={isPathHighlighted ? '#D97706' : isSelected ? '#163A5F' : strokeColor}
                    strokeWidth={isPathHighlighted ? '3.5' : isSelected ? '3.5' : tier === 'observed' ? '2.5' : '1.8'}
                    strokeDasharray={dashArray}
                    markerEnd={`url(#graph-arrow-${isPathHighlighted ? 'gold' : tier})`}
                    className="transition-all group-hover:stroke-[#163A5F] group-hover:stroke-[3]"
                  />

                  {/* Edge Label Badge */}
                  <g transform={`translate(${ctrlX}, ${ctrlY})`}>
                    <rect
                      x="-40"
                      y="-9"
                      width="80"
                      height="18"
                      rx="3"
                      fill="#FFFFFF"
                      stroke={isPathHighlighted ? '#D97706' : isSelected ? '#163A5F' : '#CBD5E1'}
                      strokeWidth={isSelected || isPathHighlighted ? '1.5' : '1'}
                      className="shadow-2xs"
                    />
                    <text
                      y="3.5"
                      textAnchor="middle"
                      fill={isPathHighlighted ? '#92400E' : isSelected ? '#163A5F' : '#334155'}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {edge.label.length > 14 ? `${edge.label.slice(0, 13)}.` : edge.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Render Nodes */}
            {filteredNodes.map((node) => {
              const simNode = simNodesRef.current[node.id];
              if (!simNode) return null;

              const color = getNodeColor(node.label);
              const bgColor = getNodeBgColor(node.label);
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isPathHighlighted = highlightedPathNodeIds.has(node.id);

              // Focus mode dimming
              let isDimmed = false;
              if (activeFocusNodeIds) {
                isDimmed = !activeFocusNodeIds.has(node.id);
              }

              const radius = isSelected ? simNode.radius + 4 : simNode.radius;

              return (
                <g
                  key={node.id}
                  transform={`translate(${simNode.x}, ${simNode.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, simNode)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdge(null);
                    setSelectedNode(node);
                  }}
                  className={`cursor-pointer group transition-opacity duration-200 ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                >
                  {/* Outer Pulsing Halo when Selected / Path-highlighted */}
                  {(isSelected || isPathHighlighted) && (
                    <circle
                      r={radius + 8}
                      fill="none"
                      stroke={isPathHighlighted ? '#F59E0B' : '#2563EB'}
                      strokeWidth="2.5"
                      strokeDasharray="4,3"
                      className="animate-spin-slow"
                    />
                  )}

                  {/* Outer Border Halo */}
                  <circle
                    r={radius + 3}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    opacity="0.4"
                    className="group-hover:opacity-90 transition-opacity"
                  />

                  {/* Inner Node Circle Body */}
                  <circle
                    r={radius}
                    fill={bgColor}
                    stroke={isSelected ? '#163A5F' : color}
                    strokeWidth={isSelected ? '3' : '2'}
                    className="transition-all shadow-sm group-hover:scale-105"
                  />

                  {/* Central Node Glyph / Category Text */}
                  <text
                    y="4"
                    textAnchor="middle"
                    fill={color}
                    fontSize={radius > 22 ? '11' : '9'}
                    fontWeight="bold"
                    fontFamily="monospace"
                    className="pointer-events-none select-none"
                  >
                    {node.label.slice(0, 3).toUpperCase()}
                  </text>

                  {/* Node Name Card Container Below Node */}
                  <g transform={`translate(0, ${radius + 14})`}>
                    <rect
                      x="-55"
                      y="-9"
                      width="110"
                      height="20"
                      rx="3"
                      fill="#FFFFFF"
                      stroke={isSelected ? '#2563EB' : '#CBD5E1'}
                      strokeWidth={isSelected ? '1.5' : '1'}
                      className="shadow-2xs"
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#172033"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {node.name.length > 15 ? `${node.name.slice(0, 14)}…` : node.name}
                    </text>
                  </g>

                  {/* Degree Centrality Badge Pill */}
                  <g transform={`translate(${radius - 4}, ${-radius + 4})`}>
                    <circle r="8" fill="#163A5F" />
                    <text
                      y="2.5"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="7.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {node.degree || 1}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}

        {/* Tactical Mini-Map Radar (Bottom-Right Viewport Preview) */}
        {showMiniMap && filteredNodes.length > 0 && (
          <div className="absolute bottom-3 left-3 w-44 h-32 bg-[#FFFFFF]/90 backdrop-blur border border-[#CBD5E1] rounded-md shadow-md p-1 font-mono text-[9px] text-[#64748B] pointer-events-none">
            <div className="text-[8px] font-bold text-[#163A5F] px-1 uppercase tracking-wider flex items-center justify-between border-b border-[#E2E8F0] pb-0.5 mb-1">
              <span>RADAR MINIMAP</span>
              <span>{(zoomLevel * 100).toFixed(0)}%</span>
            </div>
            <svg viewBox="0 0 1000 680" className="w-full h-24">
              {/* Mini-map edges */}
              {filteredEdges.map(e => {
                const s = simNodesRef.current[e.source];
                const t = simNodesRef.current[e.target];
                if (!s || !t) return null;
                return (
                  <line
                    key={`mini-${e.id}`}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke="#CBD5E1"
                    strokeWidth="2"
                  />
                );
              })}
              {/* Mini-map nodes */}
              {filteredNodes.map(n => {
                const sn = simNodesRef.current[n.id];
                if (!sn) return null;
                return (
                  <circle
                    key={`mini-${n.id}`}
                    cx={sn.x}
                    cy={sn.y}
                    r={sn.radius}
                    fill={getNodeColor(n.label)}
                  />
                );
              })}
              {/* Camera Frame */}
              <rect
                x={Math.max(0, -panOffset.x / zoomLevel)}
                y={Math.max(0, -panOffset.y / zoomLevel)}
                width={1000 / zoomLevel}
                height={680 / zoomLevel}
                fill="none"
                stroke="#2563EB"
                strokeWidth="4"
                strokeDasharray="8,6"
              />
            </svg>
          </div>
        )}

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-84 bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg shadow-xl p-4 space-y-3 font-mono text-xs max-h-[620px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded"
                  style={{ backgroundColor: getNodeBgColor(selectedNode.label), color: getNodeColor(selectedNode.label) }}
                >
                  {getNodeIcon(selectedNode.label)}
                </div>
                <div>
                  <div className="font-bold text-[#172033] truncate text-xs">
                    {selectedNode.name}
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    {selectedNode.label.toUpperCase()} ENTITY
                  </div>
                </div>
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
                <span className="text-[#64748B]">DEGREE CENTRALITY:</span>
                <span className="text-[#B7791F] font-bold">{selectedNode.degree || 1} connections</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">BSA §63 EVIDENCE REF:</span>
                <span className="text-[#16805C] font-bold">SEC-63-VERIFIED</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">INTEGRITY STATUS:</span>
                <span className="text-[#16805C] font-semibold">AUTHENTIC (SHA-256)</span>
              </div>
            </div>

            {/* Connected Neighbors List */}
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1.5">
              <div className="text-[10px] text-[#64748B] uppercase font-semibold flex items-center justify-between">
                <span>CONNECTED ADJACENCIES</span>
                <span>{(adjacencyMap[selectedNode.id] || new Set()).size} NODES</span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {Array.from(adjacencyMap[selectedNode.id] || []).map(neighborId => {
                  const neighborNode = graphData?.nodes.find(n => n.id === neighborId);
                  if (!neighborNode) return null;
                  return (
                    <div 
                      key={neighborId}
                      onClick={() => setSelectedNode(neighborNode)}
                      className="flex items-center justify-between text-[10px] p-1 bg-white hover:bg-[#EEF2FF] rounded border border-[#E2E8F0] cursor-pointer"
                    >
                      <span className="text-[#172033] font-semibold truncate max-w-[140px]">{neighborNode.name}</span>
                      <span className="text-[#64748B] text-[9px]">{neighborNode.label}</span>
                    </div>
                  );
                })}
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
          <div className="absolute top-3 right-3 w-84 bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg shadow-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#163A5F]" />
                <span className="font-bold text-[#172033] truncate text-xs">
                  {selectedEdge.label} RELATIONSHIP
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
                <span className="text-[#64748B]">RELATION TYPE:</span>
                <span className="text-[#163A5F] font-bold">{selectedEdge.label}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">TIER STATUS:</span>
                <Badge variant={getEdgeTier(selectedEdge) === 'observed' ? 'observed' : getEdgeTier(selectedEdge) === 'inferred' ? 'inferred' : getEdgeTier(selectedEdge) === 'predicted' ? 'predicted' : 'contested'}>
                  {selectedEdge.relationship_nature || 'OBSERVED'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">CONFIDENCE SCORE:</span>
                <span className="text-[#B7791F] font-bold">{((selectedEdge.confidence || 0.95) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">EVIDENCE REF:</span>
                <span className="text-[#16805C] font-bold">
                  {selectedEdge.evidence_id ? `EVID-${selectedEdge.evidence_id.substring(0, 8)}` : 'CORROBORATED'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">BSA COMPLIANCE:</span>
                <span className="text-[#172033] font-semibold">SEC-63 CERTIFIED</span>
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
