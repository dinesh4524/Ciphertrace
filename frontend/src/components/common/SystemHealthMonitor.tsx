import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Network, 
  Layers, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  ShieldCheck,
  Server,
  Zap,
  Lock
} from 'lucide-react';
import { Badge } from './Badge';

interface HealthData {
  status: string;
  platform: string;
  version: string;
  phase: string;
  environment: string;
  response_time_ms: number;
  services: {
    relational_database: {
      engine: string;
      status: string;
      latency_ms: number;
      url_configured: string;
    };
    graph_database: {
      status: string;
      uri: string;
      message?: string;
    };
    cache_and_queue: {
      status: string;
      url: string;
      message?: string;
    };
    evidence_filesystem_storage: {
      status: string;
      path: string;
      is_writable: boolean;
    };
  };
  compliance: {
    evidence_hash_algorithm: string;
    standards: string[];
  };
}

export const SystemHealthMonitor: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error(`Health check returned HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Could not connect to FastAPI backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // 15s poll
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'HEALTHY' || status === 'ONLINE') {
      return <Badge variant="emerald">{status}</Badge>;
    }
    if (status === 'UNAVAILABLE' || status === 'DEGRADED') {
      return <Badge variant="amber">{status}</Badge>;
    }
    return <Badge variant="rose">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl cyber-glass border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white tracking-wide">Infrastructure & Foundation Monitor</h1>
            <Badge variant="cyan">Phase 1 Readiness</Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Live diagnostic telemetry for FastAPI, PostgreSQL/SQLite Relational Store, Neo4j Graph Database,
            Redis Cache & Task Queue, and Local Evidence Filesystem Locker.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Probing Services...' : 'Refresh Status'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <div>
            <div className="font-semibold">Backend Connection Failed</div>
            <div className="text-[11px] text-rose-400/80 font-mono">
              Ensure FastAPI backend server is running on <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-200">http://localhost:8000</code>. Error: {error}
            </div>
          </div>
        </div>
      )}

      {health && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Backend State */}
            <div className="p-4 rounded-xl cyber-glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  FastAPI Engine
                </span>
                {getStatusBadge(health.status)}
              </div>
              <div className="text-lg font-bold text-white">{health.version}</div>
              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Latency: {health.response_time_ms} ms</span>
                <span className="text-cyan-400">{health.environment}</span>
              </div>
            </div>

            {/* Relational DB */}
            <div className="p-4 rounded-xl cyber-glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Relational Store
                </span>
                {getStatusBadge(health.services.relational_database.status)}
              </div>
              <div className="text-lg font-bold text-white">
                {health.services.relational_database.engine}
              </div>
              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Latency: {health.services.relational_database.latency_ms} ms</span>
                <span className="text-emerald-400">Schemas Active</span>
              </div>
            </div>

            {/* Neo4j Graph DB */}
            <div className="p-4 rounded-xl cyber-glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-purple-400" />
                  Neo4j Graph Engine
                </span>
                {getStatusBadge(health.services.graph_database.status)}
              </div>
              <div className="text-lg font-bold text-white">Bolt Protocol</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                {health.services.graph_database.uri}
              </div>
            </div>

            {/* Evidence Locker */}
            <div className="p-4 rounded-xl cyber-glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  Evidence Storage
                </span>
                {getStatusBadge(health.services.evidence_filesystem_storage.status)}
              </div>
              <div className="text-lg font-bold text-white">SHA-256 Storage</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                {health.services.evidence_filesystem_storage.path}
              </div>
            </div>
          </div>

          {/* Detailed Service Inspection Card */}
          <div className="p-6 rounded-2xl cyber-glass border border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Service Connectivity Breakdown
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    SQLAlchemy ORM & Relational DB
                  </span>
                  <span className="text-emerald-400">{health.services.relational_database.status}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Manages Cases, Evidence Items, normalized CDRs, Financial Ledger transactions, FIR Documents, and the Section 65B/63 BSA Audit Trail.
                </p>
                <div className="text-[11px] text-slate-500 truncate pt-1 border-t border-slate-800">
                  Target: {health.services.relational_database.url_configured}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    Neo4j Enterprise / Community Driver
                  </span>
                  <span className={health.services.graph_database.status === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}>
                    {health.services.graph_database.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Graph database driver initialized with connection pooling. Used for Temporal Knowledge Graphs and Cypher relationship traversals.
                </p>
                <div className="text-[11px] text-slate-500 truncate pt-1 border-t border-slate-800">
                  URI: {health.services.graph_database.uri}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Redis Cache & Celery/Task Queue
                  </span>
                  <span className={health.services.cache_and_queue.status === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}>
                    {health.services.cache_and_queue.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  In-memory key-value cache and asynchronous background processing bridge for heavy batch ingestion jobs.
                </p>
                <div className="text-[11px] text-slate-500 truncate pt-1 border-t border-slate-800">
                  URL: {health.services.cache_and_queue.url}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    Cryptographic Evidence Vault
                  </span>
                  <span className="text-emerald-400">{health.services.evidence_filesystem_storage.status}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Isolated storage directory with active write permissions and SHA-256 ingress hashing enforcement.
                </p>
                <div className="text-[11px] text-slate-500 truncate pt-1 border-t border-slate-800">
                  Path: {health.services.evidence_filesystem_storage.path} (Writable: {health.services.evidence_filesystem_storage.is_writable ? 'Yes' : 'No'})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
