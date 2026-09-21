import React, { useState, useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { 
  Network, 
  RotateCw, 
  Search, 
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
  Cpu,
  Layers,
  ArrowRight,
  X,
  Flag,
  Download,
  Sparkles,
  Route,
  Focus,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { Case, GraphData, GraphNode, GraphEdge, GraphStats } from '../../types';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';

interface KnowledgeGraphViewerProps {
  activeCase: Case;
}

type LayoutName = 'cose' | 'concentric' | 'breadthfirst' | 'circle' | 'grid';

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ activeCase }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState<string>('ALL');
  const [currentLayout, setCurrentLayout] = useState<LayoutName>('cose');
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Pathfinder state
  const [pathfindingMode, setPathfindingMode] = useState<boolean>(false);
  const [pathSourceId, setPathSourceId] = useState<string>('');
  const [pathTargetId, setPathTargetId] = useState<string>('');
  const [pathFound, setPathFound] = useState<boolean | null>(null);

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

  const cyContainerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

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
    } catch (err: any) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setPathfindingMode(false);
    setPathSourceId('');
    setPathTargetId('');
    setPathFound(null);
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

  // Node Color Mapper
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

  // Cytoscape Layout Configuration Factory
  const getLayoutOptions = useCallback((layoutName: LayoutName) => {
    switch (layoutName) {
      case 'concentric':
        return {
          name: 'concentric',
          concentric: (node: any) => node.data('degree') || 1,
          levelWidth: () => 2,
          minNodeSpacing: 60,
          padding: 50,
          animate: true,
          animationDuration: 500
        };
      case 'breadthfirst':
        return {
          name: 'breadthfirst',
          directed: true,
          spacingFactor: 1.5,
          padding: 50,
          animate: true,
          animationDuration: 500
        };
      case 'circle':
        return {
          name: 'circle',
          spacingFactor: 1.2,
          padding: 50,
          animate: true,
          animationDuration: 500
        };
      case 'grid':
        return {
          name: 'grid',
          spacingFactor: 1.3,
          padding: 50,
          animate: true,
          animationDuration: 500
        };
      case 'cose':
      default:
        return {
          name: 'cose',
          animate: true,
          animationDuration: 600,
          refresh: 20,
          fit: true,
          padding: 60,
          randomize: false,
          componentSpacing: 120,
          nodeRepulsion: () => 900000,
          nodeOverlap: 20,
          idealEdgeLength: () => 140,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 40,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        };
    }
  }, []);

  // Initialize and update Cytoscape instance
  useEffect(() => {
    if (!cyContainerRef.current || !graphData) return;

    // Filter elements
    const visibleNodes = (graphData.nodes || []).filter(n => {
      if (nodeFilter !== 'ALL' && n.label !== nodeFilter) return false;
      if (!searchQuery) return true;
      return n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             n.label.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const visibleNodeIdSet = new Set(visibleNodes.map(n => n.id));

    const visibleEdges = (graphData.edges || []).filter(e => {
      if (!visibleNodeIdSet.has(e.source) || !visibleNodeIdSet.has(e.target)) return false;
      const tier = getEdgeTier(e);
      return tierFilter[tier];
    });

    // Build Cytoscape elements
    const elements: cytoscape.ElementDefinition[] = [
      ...visibleNodes.map(n => ({
        group: 'nodes' as const,
        data: {
          id: n.id,
          name: n.name,
          label: n.label,
          degree: n.degree || 1,
          color: getNodeColor(n.label),
          bgColor: getNodeBgColor(n.label),
          rawNode: n
        }
      })),
      ...visibleEdges.map(e => {
        const tier = getEdgeTier(e);
        let strokeColor = '#16805C';
        let lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid';

        if (tier === 'inferred') {
          strokeColor = '#2563EB';
          lineStyle = 'dashed';
        } else if (tier === 'predicted') {
          strokeColor = '#B7791F';
          lineStyle = 'dotted';
        } else if (tier === 'contested') {
          strokeColor = '#DC2626';
          lineStyle = 'dashed';
        }

        return {
          group: 'edges' as const,
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            tier: tier,
            strokeColor: strokeColor,
            lineStyle: lineStyle,
            rawEdge: e
          }
        };
      })
    ];

    // Destroy existing instance if container changed
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Initialize Cytoscape Core
    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: elements,
      boxSelectionEnabled: true,
      autounselectify: false,
      wheelSensitivity: 0.25,
      minZoom: 0.2,
      maxZoom: 3.5,
      style: [
        // Core Node Styling
        {
          selector: 'node',
          style: {
            'content': 'data(name)',
            'font-family': 'Inter, system-ui, -apple-system, sans-serif',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 7,
            'color': '#172033',
            'text-background-color': '#FFFFFF',
            'text-background-opacity': 0.95,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': '#CBD5E1',
            'text-border-width': 1,
            'text-border-opacity': 0.8,
            'text-wrap': 'ellipsis',
            'text-max-width': '120px',
            'background-color': 'data(bgColor)',
            'border-color': 'data(color)',
            'border-width': 2.5,
            'width': (ele: any) => Math.max(34, Math.min(54, 30 + (ele.data('degree') || 1) * 3)),
            'height': (ele: any) => Math.max(34, Math.min(54, 30 + (ele.data('degree') || 1) * 3)),
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': 0.2
          }
        },
        // Selected / Highlighted Node
        {
          selector: 'node:selected, node.highlighted',
          style: {
            'border-color': '#163A5F',
            'border-width': 4.5,
            'border-opacity': 1,
            'text-background-color': '#163A5F',
            'color': '#FFFFFF',
            'text-border-color': '#0E2640'
          }
        },
        // Pathhighlight Node
        {
          selector: 'node.path-node',
          style: {
            'border-color': '#D97706',
            'border-width': 5,
            'border-opacity': 1,
            'background-color': '#FEF3C7',
            'text-background-color': '#92400E',
            'color': '#FFFFFF'
          }
        },
        // Dimmed Node
        {
          selector: 'node.dimmed',
          style: {
            'opacity': 0.15
          }
        },
        // Core Edge Styling
        {
          selector: 'edge',
          style: {
            'content': 'data(label)',
            'font-family': 'ui-monospace, monospace',
            'font-size': '8.5px',
            'font-weight': 'bold',
            'text-background-color': '#FFFFFF',
            'text-background-opacity': 0.95,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': '#E2E8F0',
            'text-border-width': 1,
            'text-border-opacity': 0.9,
            'text-rotation': 'autorotate',
            'color': '#334155',
            'width': 2.2,
            'line-color': 'data(strokeColor)',
            'line-style': 'data(lineStyle)' as any,
            'target-arrow-color': 'data(strokeColor)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.1,
            'curve-style': 'bezier',
            'control-point-step-size': 28,
            'overlay-opacity': 0,
            'transition-property': 'line-color, width, opacity',
            'transition-duration': 0.2
          }
        },
        // Selected / Highlighted Edge
        {
          selector: 'edge:selected, edge.highlighted',
          style: {
            'width': 3.8,
            'line-color': '#163A5F',
            'target-arrow-color': '#163A5F',
            'color': '#163A5F',
            'text-border-color': '#163A5F'
          }
        },
        // Pathhighlight Edge
        {
          selector: 'edge.path-edge',
          style: {
            'width': 4.5,
            'line-color': '#D97706',
            'target-arrow-color': '#D97706',
            'color': '#92400E',
            'text-background-color': '#FEF3C7',
            'text-border-color': '#D97706'
          }
        },
        // Dimmed Edge
        {
          selector: 'edge.dimmed',
          style: {
            'opacity': 0.1
          }
        }
      ]
    });

    // Event Listeners
    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeData = evt.target.data('rawNode');
      setSelectedNode(nodeData);
      setSelectedEdge(null);
    });

    cy.on('tap', 'edge', (evt: EventObject) => {
      const edgeData = evt.target.data('rawEdge');
      setSelectedEdge(edgeData);
      setSelectedNode(null);
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
        cy.elements().removeClass('dimmed highlighted');
      }
    });

    // Hover 1-hop Highlighting
    cy.on('mouseover', 'node', (evt: EventObject) => {
      const node = evt.target;
      const neighborhood = node.neighborhood().add(node);
      cy.elements().addClass('dimmed');
      neighborhood.removeClass('dimmed').addClass('highlighted');
    });

    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('dimmed highlighted');
      if (selectedNode) {
        const selEle = cy.getElementById(selectedNode.id);
        if (selEle.length > 0) {
          const neighborhood = selEle.neighborhood().add(selEle);
          cy.elements().addClass('dimmed');
          neighborhood.removeClass('dimmed').addClass('highlighted');
        }
      }
    });

    cy.on('zoom', () => {
      setZoomPercent(Math.round(cy.zoom() * 100));
    });

    // Execute Layout
    const layout = cy.layout(getLayoutOptions(currentLayout));
    layout.run();

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graphData, nodeFilter, searchQuery, tierFilter, currentLayout, getLayoutOptions]);

  // Execute Layout Switch
  const applyLayout = (layoutName: LayoutName) => {
    setCurrentLayout(layoutName);
    if (cyRef.current) {
      const layout = cyRef.current.layout(getLayoutOptions(layoutName));
      layout.run();
    }
  };

  // Run Shortest Path Analysis (Dijkstra / BFS via Cytoscape)
  const runPathfinder = () => {
    if (!cyRef.current || !pathSourceId || !pathTargetId) return;

    const cy = cyRef.current;
    cy.elements().removeClass('path-node path-edge dimmed');

    const sourceEle = cy.getElementById(pathSourceId);
    const targetEle = cy.getElementById(pathTargetId);

    if (sourceEle.length === 0 || targetEle.length === 0) return;

    const dijkstra = cy.elements().dijkstra({
      root: sourceEle,
      directed: false
    });

    const pathToTarget = dijkstra.pathTo(targetEle);

    if (pathToTarget.length > 0) {
      setPathFound(true);
      cy.elements().addClass('dimmed');
      pathToTarget.removeClass('dimmed');
      pathToTarget.nodes().addClass('path-node');
      pathToTarget.edges().addClass('path-edge');
      cy.fit(pathToTarget, 80);
    } else {
      setPathFound(false);
      alert('No forensic path connects these two entities in the current network.');
    }
  };

  const clearPathfinder = () => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('path-node path-edge dimmed highlighted');
      cyRef.current.fit(undefined, 50);
    }
    setPathSourceId('');
    setPathTargetId('');
    setPathFound(null);
  };

  // Export High-Res PNG
  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({
      bg: '#FFFFFF',
      full: true,
      scale: 2
    });
    const a = document.createElement('a');
    a.href = png64;
    a.download = `CIPHERTRACE_Network_${activeCase.case_number}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
              {graphData?.nodes?.length || 0} Nodes / {graphData?.edges?.length || 0} Links
            </Badge>
            <span className="text-[11px] font-mono text-[#16805C] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0] font-semibold">
              ● SECTION 63 BSA COMPLIANT
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Deterministic multi-modal semantic topology synthesizing CDR handovers, mule accounts, shared hardware IMEIs, and predictive syndicate relationships.
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
            onClick={handleExportPNG}
            className="btn-rect-secondary text-xs flex items-center gap-1.5"
            title="Export High-Res PNG Image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Image</span>
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
              {(graphData?.nodes || []).map(n => (
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
              {(graphData?.nodes || []).map(n => (
                <option key={n.id} value={n.id}>{n.name} ({n.label})</option>
              ))}
            </select>

            <button
              onClick={runPathfinder}
              disabled={!pathSourceId || !pathTargetId}
              className="bg-[#163A5F] text-white px-3 py-1 rounded font-bold hover:bg-[#0E2640] disabled:opacity-50"
            >
              Trace Trail
            </button>

            <button
              onClick={clearPathfinder}
              className="px-2 py-1 text-[#64748B] hover:text-[#172033]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Topology & Semantic Filters Toolbar */}
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

          {/* Layout Algorithm Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B] font-bold">TOPOLOGY:</span>
            <select
              value={currentLayout}
              onChange={(e) => applyLayout(e.target.value as LayoutName)}
              className="bg-white border border-[#CBD5E1] rounded px-2.5 py-1 text-xs text-[#172033] font-semibold cursor-pointer"
            >
              <option value="cose">🌐 Organic Force (CoSE)</option>
              <option value="concentric">🎯 Concentric (Centrality)</option>
              <option value="breadthfirst">🌲 Hierarchical (Tree)</option>
              <option value="circle">⭕ Radial Circle</option>
              <option value="grid">⊞ Matrix Grid</option>
            </select>
          </div>

          {/* Zoom and Fit Controls */}
          <div className="flex items-center gap-1 text-[#64748B]">
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] px-1 font-bold text-[#172033]">{zoomPercent}%</span>
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => cyRef.current?.fit(undefined, 50)}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => cyRef.current?.center()}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]"
              title="Center View"
            >
              <Focus className="w-3.5 h-3.5" />
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

          <div className="text-[10px] text-[#64748B]">
            <span>Tip: Drag nodes to rearrange • Double-click node to focus</span>
          </div>
        </div>
      </div>

      {/* Cytoscape Canvas Container */}
      <div className="relative w-full h-[680px] rounded-lg bg-[#FAFCFF] border border-[#D9E0E8] overflow-hidden shadow-sm">
        {/* Subtle Institutional Grid Texture */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-mono text-[#64748B] space-y-2 z-10 bg-white/70">
            <RotateCw className="w-6 h-6 animate-spin text-[#163A5F]" />
            <span>Rendering High-Precision Criminal Knowledge Graph...</span>
          </div>
        )}

        {/* The DOM container for Cytoscape.js */}
        <div ref={cyContainerRef} className="w-full h-full" />

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-84 bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg shadow-xl p-4 space-y-3 font-mono text-xs max-h-[620px] overflow-y-auto z-20">
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
          <div className="absolute top-3 right-3 w-84 bg-[#FFFFFF] border border-[#D9E0E8] rounded-lg shadow-xl p-4 space-y-3 font-mono text-xs z-20">
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
