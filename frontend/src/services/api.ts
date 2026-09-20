import { 
  Case, 
  CaseCreatePayload, 
  EvidenceItem, 
  IntegrityCheckResult, 
  AuditLogItem, 
  IngestionResult,
  CaseDashboardStats,
  CaseAssignment,
  CaseNote,
  User,
  ExtractedEntity,
  ExtractedRelationship,
  NLPProcessingResult,
  DirectNLPResult,
  EntityResolutionCandidate,
  CanonicalEntity,
  ResolutionRunResult,
  GraphData,
  GraphStats,
  KeyPlayerResponse,
  CommunityDetectionResponse,
  PathfindingRequest,
  PathfindingResponse,
  HiddenLinkPredictionResponse,
  LinkReviewRequest,
  GraphAnomaliesResponse,
  StructuralOverviewResponse,
  KCoreResponse,
  MetricGlossaryResponse,
  HiddenLinkMLResponse,
  ReviewPredictionRequest,
  TemporalIntelligenceResponse,
  CleanSlateAnomalyItem,
  RAGQueryRequest,
  RAGQueryResponse,
  IndexCaseDocumentsResponse,
  RAGStatsResponse,
  GraphRAGQueryRequest,
  GraphRAGQueryResponse,
  QueryClassificationResult,
  SuggestedPromptsResponse,
  MultiPerspectiveAnalysisRequest,
  MultiPerspectiveAnalysisResponse,
  PerspectiveAssessmentHistoryResponse,
  ComparativeAblationRequest,
  ComparativeAblationResponse,
  EntityRemovalSimulationRequest,
  RelationshipRemovalSimulationRequest,
  SimulationHistoryItem,
  AssessInvestigativePriorityRequest,
  InvestigativePriorityAssessmentResponse,
  PriorityAssessmentSummaryItem,
  LegalStatuteItem,
  LegalSectionItem,
  EvidenceToLawResponse,
  LegalRAGQueryRequest,
  LegalRAGQueryResponse,
  LegalGraphResponse,
  RunSIHDemoResponse,
  InvestigationDossierReport,
  WorkflowExecutionProgress
} from '../types';

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('ciphertrace_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Case Dashboard & Analytics APIs
  async getDashboardStats(): Promise<CaseDashboardStats> {
    const res = await fetch(`${API_BASE}/cases/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch dashboard stats: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Case Management APIs
  async getCases(params?: { 
    search?: string; 
    status?: string; 
    priority?: string; 
    crime_category?: string;
    my_cases_only?: boolean;
  }): Promise<Case[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.crime_category) query.append('crime_category', params.crime_category);
    if (params?.my_cases_only) query.append('my_cases_only', 'true');

    const res = await fetch(`${API_BASE}/cases?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch cases: ${res.statusText}`);
    const data = await res.json();
    return data.items || [];
  },

  async createCase(payload: CaseCreatePayload): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Failed to create case');
    }
    const data = await res.json();
    return data.data;
  },

  async getCaseById(caseId: string): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch case details: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async updateCaseStatus(caseId: string, status: string, stage?: string, reason?: string): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status, stage, reason_or_directive: reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Status transition failed');
    }
    const data = await res.json();
    return data.data;
  },

  async assignTeamMember(caseId: string, userId: string, roleInCase: string): Promise<CaseAssignment> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ user_id: userId, role_in_case: roleInCase, can_write: true, can_export: true })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Team assignment failed');
    }
    const data = await res.json();
    return data.data;
  },

  async getCaseTeam(caseId: string): Promise<CaseAssignment[]> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/team`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch team: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  async addCaseNote(caseId: string, noteType: string, title: string, content: string): Promise<CaseNote> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ note_type: noteType, title, content })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Failed to record case note');
    }
    const data = await res.json();
    return data.data;
  },

  async getCaseNotes(caseId: string): Promise<CaseNote[]> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/notes`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch case notes: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  // Evidence Fabric APIs (Phase 3)
  async getEvidenceForCase(caseId: string, search?: string, status?: string): Promise<EvidenceItem[]> {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (status) query.append('evidence_status', status);

    const res = await fetch(`${API_BASE}/evidence/case/${caseId}?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch evidence: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  async getEvidenceDetails(evidenceId: string): Promise<EvidenceItem> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch evidence details: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async updateEvidenceStatus(evidenceId: string, status: string, notes?: string): Promise<EvidenceItem> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ evidence_status: status, notes })
    });
    if (!res.ok) throw new Error(`Failed to update status: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async updateEvidenceProvenance(evidenceId: string, payload: {
    seizing_officer?: string;
    place_of_seizure?: string;
    witness_details?: string;
    forensic_extraction_tool?: string;
    device_serial_or_imei?: string;
  }): Promise<EvidenceItem> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/provenance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to update provenance: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async verifyEvidenceIntegrity(evidenceId: string): Promise<IntegrityCheckResult> {
    const res = await fetch(`${API_BASE}/evidence/verify-integrity/${evidenceId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to verify evidence integrity: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async uploadGenericEvidence(
    caseId: string,
    sourceType: string,
    file: File,
    evidenceCategory = 'CURRENT_CASE_OBSERVED',
    provenance?: {
      seizing_officer?: string;
      place_of_seizure?: string;
      witness_details?: string;
      forensic_extraction_tool?: string;
      device_serial_or_imei?: string;
    }
  ): Promise<EvidenceItem> {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('source_type', sourceType);
    formData.append('evidence_category', evidenceCategory);
    formData.append('file', file);
    if (provenance?.seizing_officer) formData.append('seizing_officer', provenance.seizing_officer);
    if (provenance?.place_of_seizure) formData.append('place_of_seizure', provenance.place_of_seizure);
    if (provenance?.witness_details) formData.append('witness_details', provenance.witness_details);
    if (provenance?.forensic_extraction_tool) formData.append('forensic_extraction_tool', provenance.forensic_extraction_tool);
    if (provenance?.device_serial_or_imei) formData.append('device_serial_or_imei', provenance.device_serial_or_imei);

    const res = await fetch(`${API_BASE}/evidence/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Evidence upload failed');
    }
    const data = await res.json();
    return data.data;
  },

  // Document Intelligence & NLP Extraction APIs (Phase 4)
  async processEvidenceNLP(evidenceId: string): Promise<NLPProcessingResult> {
    const res = await fetch(`${API_BASE}/nlp/process-evidence/${evidenceId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'NLP processing failed');
    }
    const data = await res.json();
    return data.data;
  },

  async getCaseEntities(caseId: string, entityType?: string): Promise<ExtractedEntity[]> {
    const query = new URLSearchParams();
    if (entityType) query.append('entity_type', entityType);

    const res = await fetch(`${API_BASE}/nlp/entities/case/${caseId}?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch entities: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  async getCaseRelationships(caseId: string, relationshipType?: string): Promise<ExtractedRelationship[]> {
    const query = new URLSearchParams();
    if (relationshipType) query.append('relationship_type', relationshipType);

    const res = await fetch(`${API_BASE}/nlp/relationships/case/${caseId}?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch relationships: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  async extractDirectNLP(text: string): Promise<DirectNLPResult> {
    const res = await fetch(`${API_BASE}/nlp/extract-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ text })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Direct NLP analysis failed');
    }
    const data = await res.json();
    return data.data;
  },

  // Entity Resolution APIs (Phase 5)
  async runEntityResolution(caseId: string, threshold = 0.70): Promise<ResolutionRunResult> {
    const res = await fetch(`${API_BASE}/entity-resolution/cases/${caseId}/run?threshold=${threshold}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Entity resolution failed');
    }
    const data = await res.json();
    return data.data;
  },

  async getEntityResolutionCandidates(caseId: string, reviewStatus?: string, entityType?: string): Promise<EntityResolutionCandidate[]> {
    const query = new URLSearchParams();
    if (reviewStatus) query.append('review_status', reviewStatus);
    if (entityType) query.append('entity_type', entityType);

    const res = await fetch(`${API_BASE}/entity-resolution/cases/${caseId}/candidates?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch resolution candidates: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  async reviewCandidate(
    candidateId: string,
    decision: 'ACCEPTED' | 'REJECTED' | 'CHALLENGED',
    decisionReason: string,
    mergeDirective = 'MERGE_AS_CANONICAL'
  ): Promise<EntityResolutionCandidate> {
    const res = await fetch(`${API_BASE}/entity-resolution/candidates/${candidateId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        decision,
        decision_reason: decisionReason,
        merge_directive: mergeDirective
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Review submission failed');
    }
    const data = await res.json();
    return data.data;
  },

  async getCanonicalEntities(caseId: string): Promise<CanonicalEntity[]> {
    const res = await fetch(`${API_BASE}/entity-resolution/cases/${caseId}/canonical-entities`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch canonical entities: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  // Knowledge Graph APIs (Phase 6)
  async syncCaseToGraph(caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/graph/sync/${caseId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || err.detail || 'Graph sync failed');
    }
    const data = await res.json();
    return data.data;
  },

  async getCaseGraph(
    caseId: string,
    params?: { node_types?: string[]; rel_types?: string[]; min_confidence?: number }
  ): Promise<GraphData> {
    const query = new URLSearchParams();
    if (params?.node_types) params.node_types.forEach(t => query.append('node_types', t));
    if (params?.rel_types) params.rel_types.forEach(r => query.append('rel_types', r));
    if (params?.min_confidence !== undefined) query.append('min_confidence', params.min_confidence.toString());

    const res = await fetch(`${API_BASE}/graph/case/${caseId}?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch case graph: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async expandGraphNode(nodeId: string, depth = 1): Promise<GraphData> {
    const res = await fetch(`${API_BASE}/graph/node/${nodeId}/expand?depth=${depth}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to expand node: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getGraphStats(caseId: string): Promise<GraphStats> {
    const res = await fetch(`${API_BASE}/graph/stats/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch graph stats: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Ingestion APIs
  async uploadCDR(caseId: string, file: File, evidenceCategory = 'CURRENT_CASE_OBSERVED'): Promise<IngestionResult> {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('evidence_category', evidenceCategory);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/ingest/cdr/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(`CDR Ingestion failed: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async uploadFinancial(caseId: string, file: File, evidenceCategory = 'CURRENT_CASE_OBSERVED'): Promise<IngestionResult> {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('evidence_category', evidenceCategory);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/ingest/financial/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(`Financial Ingestion failed: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async uploadFIR(caseId: string, file: File, evidenceCategory = 'CURRENT_CASE_OBSERVED'): Promise<IngestionResult> {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('evidence_category', evidenceCategory);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/ingest/fir/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(`FIR Ingestion failed: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Audit Log API
  async getAuditLogs(caseId?: string): Promise<AuditLogItem[]> {
    const query = new URLSearchParams();
    if (caseId) query.append('case_id', caseId);
    const res = await fetch(`${API_BASE}/audit/logs?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
    const data = await res.json();
    return data.items || [];
  },

  // Users Directory API
  async listUsers(role?: string): Promise<User[]> {
    const query = new URLSearchParams();
    if (role) query.append('role', role);
    const res = await fetch(`${API_BASE}/auth/users?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch users: ${res.statusText}`);
    const data = await res.json();
    return data.items || [];
  },

  // Phase 7: Graph Analytics & Hidden-Link ML APIs
  async getKeyPlayers(caseId: string): Promise<KeyPlayerResponse> {
    const res = await fetch(`${API_BASE}/analytics/key-players/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch key players: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getCommunities(caseId: string): Promise<CommunityDetectionResponse> {
    const res = await fetch(`${API_BASE}/analytics/communities/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch syndicate communities: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async findShortestPath(caseId: string, req: PathfindingRequest): Promise<PathfindingResponse> {
    const res = await fetch(`${API_BASE}/analytics/pathfinding/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error(`Failed to calculate investigative path: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async predictHiddenLinks(caseId: string, minProbability = 0.35): Promise<HiddenLinkPredictionResponse> {
    const res = await fetch(`${API_BASE}/analytics/predict-links/${caseId}?min_probability=${minProbability}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to predict hidden links: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async reviewPredictedLink(caseId: string, req: LinkReviewRequest): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/accept-predicted-link/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error(`Failed to review predicted link: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getGraphAnomalies(caseId: string): Promise<GraphAnomaliesResponse> {
    const res = await fetch(`${API_BASE}/analytics/anomalies/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch graph anomalies: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 8: Advanced Graph Analytics APIs
  async getStructuralOverview(caseId: string): Promise<StructuralOverviewResponse> {
    const res = await fetch(`${API_BASE}/analytics/structural-overview/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch structural overview: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getKCoreDecomposition(caseId: string): Promise<KCoreResponse> {
    const res = await fetch(`${API_BASE}/analytics/k-core/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch k-core decomposition: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getMetricsGlossary(): Promise<MetricGlossaryResponse> {
    const res = await fetch(`${API_BASE}/analytics/metrics-glossary`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch metrics glossary: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 9: Advanced Heterogeneous Graph ML Hidden-Link Prediction APIs
  async predictHiddenLinksML(caseId: string, minConfidence = 0.40, limit = 25): Promise<HiddenLinkMLResponse> {
    const res = await fetch(`${API_BASE}/analytics/predict-links-ml/${caseId}?min_confidence=${minConfidence}&limit=${limit}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to execute ML hidden link prediction: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async reviewMLPrediction(caseId: string, payload: ReviewPredictionRequest): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/review-prediction/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to submit ML prediction review: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 10: Temporal Intelligence & Anomaly Detection APIs
  async getTemporalIntelligence(caseId: string): Promise<TemporalIntelligenceResponse> {
    const res = await fetch(`${API_BASE}/analytics/temporal-intelligence/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch temporal intelligence: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getCleanSlateAnomalies(caseId: string): Promise<CleanSlateAnomalyItem[]> {
    const res = await fetch(`${API_BASE}/analytics/clean-slate-anomalies/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch clean-slate anomalies: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 11: Document RAG & Evidentiary Citations APIs
  async queryCaseRAG(caseId: string, payload: RAGQueryRequest): Promise<RAGQueryResponse> {
    const res = await fetch(`${API_BASE}/rag/query/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `RAG query failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async indexCaseDocuments(caseId: string): Promise<IndexCaseDocumentsResponse> {
    const res = await fetch(`${API_BASE}/rag/index/${caseId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Document indexing failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async getCaseRAGStats(caseId: string): Promise<RAGStatsResponse> {
    const res = await fetch(`${API_BASE}/rag/stats/${caseId}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return data.data;
  },

  // Phase 12: GraphRAG Multi-Engine Router & Evidence Fusion APIs
  async queryCaseGraphRAG(caseId: string, payload: GraphRAGQueryRequest): Promise<GraphRAGQueryResponse> {
    const res = await fetch(`${API_BASE}/graphrag/query/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `GraphRAG query failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async classifyGraphRAGQuery(query: string, focusEntity?: string): Promise<QueryClassificationResult> {
    const res = await fetch(`${API_BASE}/graphrag/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ query, focus_entity: focusEntity })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Query classification failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async getSuggestedGraphRAGPrompts(caseId: string): Promise<SuggestedPromptsResponse> {
    const res = await fetch(`${API_BASE}/graphrag/suggested-prompts/${caseId}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return data.data;
  },

  // Phase 13: Multi-Perspective Reasoning & Consensus Synthesis APIs
  async runMultiPerspectiveAnalysis(caseId: string, payload: MultiPerspectiveAnalysisRequest): Promise<MultiPerspectiveAnalysisResponse> {
    const res = await fetch(`${API_BASE}/perspective-reasoning/analyze/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Multi-perspective analysis failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async getPerspectiveHistory(caseId: string): Promise<PerspectiveAssessmentHistoryResponse> {
    const res = await fetch(`${API_BASE}/perspective-reasoning/history/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch perspective history: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getPerspectiveAssessment(assessmentId: string): Promise<MultiPerspectiveAnalysisResponse> {
    const res = await fetch(`${API_BASE}/perspective-reasoning/assessment/${assessmentId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch assessment: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 14: Counterfactual & Evidence Ablation APIs
  async runComparativeAblation(caseId: string, payload: ComparativeAblationRequest): Promise<ComparativeAblationResponse> {
    const res = await fetch(`${API_BASE}/counterfactual/compare/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Comparative ablation failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async simulateEntityRemoval(caseId: string, payload: EntityRemovalSimulationRequest): Promise<any> {
    const res = await fetch(`${API_BASE}/counterfactual/simulate-entity-removal/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Entity removal simulation failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async simulateRelationshipRemoval(caseId: string, payload: RelationshipRemovalSimulationRequest): Promise<any> {
    const res = await fetch(`${API_BASE}/counterfactual/simulate-relationship-removal/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Relationship removal simulation failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async getAblationHistory(caseId: string): Promise<SimulationHistoryItem[]> {
    const res = await fetch(`${API_BASE}/counterfactual/history/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch ablation history: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getAblationSimulation(simulationId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/counterfactual/simulation/${simulationId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch simulation: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 15: Investigative Priority & Next Best Action APIs
  async assessInvestigativePriority(caseId: string, payload: AssessInvestigativePriorityRequest): Promise<InvestigativePriorityAssessmentResponse> {
    const res = await fetch(`${API_BASE}/priority/assess/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Investigative priority assessment failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async getPriorityHistory(caseId: string): Promise<PriorityAssessmentSummaryItem[]> {
    const res = await fetch(`${API_BASE}/priority/history/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch priority history: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getPriorityAssessment(assessmentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/priority/assessment/${assessmentId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch priority assessment: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 16: Indian Legal Intelligence (BNS / BNSS / BSA 2023) APIs
  async getStatutes(): Promise<LegalStatuteItem[]> {
    const res = await fetch(`${API_BASE}/legal/statutes`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch legal statutes: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getSectionsByStatute(statuteCode: string): Promise<LegalSectionItem[]> {
    const res = await fetch(`${API_BASE}/legal/statute/${statuteCode}/sections`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch sections for ${statuteCode}: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getSectionDetails(statuteCode: string, sectionNumber: string): Promise<LegalSectionItem> {
    const res = await fetch(`${API_BASE}/legal/section/${statuteCode}/${sectionNumber}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch section ${statuteCode} §${sectionNumber}: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async mapCaseEvidenceToLaw(caseId: string): Promise<EvidenceToLawResponse> {
    const res = await fetch(`${API_BASE}/legal/map-evidence/${caseId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Evidence-to-law mapping failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async queryLegalRAG(caseId: string, payload: LegalRAGQueryRequest): Promise<LegalRAGQueryResponse> {
    const res = await fetch(`${API_BASE}/legal/query/${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Legal RAG query failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async getLegalGraph(): Promise<LegalGraphResponse> {
    const res = await fetch(`${API_BASE}/legal/graph`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch legal knowledge graph: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  // Phase 20: Final Integration & SIH Demo APIs
  async runSIHDemo(): Promise<RunSIHDemoResponse> {
    const res = await fetch(`${API_BASE}/integration/run-sih-demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `SIH Demo execution failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data;
  },

  async getCaseDossier(caseId: string): Promise<InvestigationDossierReport> {
    const res = await fetch(`${API_BASE}/integration/dossier/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch case dossier: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async getSIHDemoStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/integration/sih-demo/status`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch SIH demo status: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  }
};




