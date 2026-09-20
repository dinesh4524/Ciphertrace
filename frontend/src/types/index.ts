export type Role = 
  | 'INVESTIGATOR'
  | 'SENIOR_INVESTIGATOR'
  | 'LEGAL_ANALYST'
  | 'FORENSIC_ANALYST'
  | 'INTELLIGENCE_ANALYST'
  | 'SYSTEM_ADMINISTRATOR';

export type Permission = 
  | 'CASE_READ'
  | 'CASE_CREATE'
  | 'CASE_UPDATE'
  | 'CASE_DELETE'
  | 'CASE_ASSIGN'
  | 'CASE_CHANGE_STATUS'
  | 'CASE_ADD_DIRECTIVE'
  | 'CASE_VIEW_CONFIDENTIAL'
  | 'EVIDENCE_READ'
  | 'EVIDENCE_UPLOAD'
  | 'EVIDENCE_VERIFY_INTEGRITY'
  | 'EVIDENCE_DELETE'
  | 'EVIDENCE_CERTIFY_BSA'
  | 'INGEST_CDR'
  | 'INGEST_FINANCIAL'
  | 'INGEST_FIR'
  | 'INGEST_INTERROGATION'
  | 'AUDIT_READ'
  | 'USER_MANAGE'
  | 'SYSTEM_CONFIG';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  badge_number?: string;
  department?: string;
  designation?: string;
  is_active: boolean;
  is_superuser: boolean;
  permissions: string[];
}

export type CaseStatus = 
  | 'DRAFT'
  | 'ACTIVE_INVESTIGATION'
  | 'UNDER_REVIEW'
  | 'CHARGESHEETED'
  | 'CLOSED'
  | 'ARCHIVED';

export type CasePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CaseStage = 
  | 'PRELIMINARY_ENQUIRY'
  | 'FIR_REGISTERED'
  | 'EVIDENCE_COLLECTION'
  | 'INTERROGATION_PHASE'
  | 'CHARGESHEET_PREPARATION'
  | 'TRIAL'
  | 'CLOSED';

export type EvidenceCategory = 
  | 'CURRENT_CASE_OBSERVED' 
  | 'CURRENT_CASE_INFERRED' 
  | 'HISTORICAL_RECORD' 
  | 'OSINT_UNVERIFIED';

export type SourceType = 
  | 'CDR' 
  | 'FINANCIAL' 
  | 'FIR' 
  | 'INTERROGATION' 
  | 'DIGITAL_FORENSICS' 
  | 'OSINT' 
  | 'PDF_DOCUMENT'
  | 'SEIZURE_MEMO';

export type IntegrityStatus = 'VERIFIED' | 'TAMPERED' | 'UNVERIFIED';
export type EvidenceStatus = 'VERIFIED' | 'PROCESSED_BY_NLP' | 'CHALLENGED_IN_COURT' | 'INADMISSIBLE' | 'ARCHIVED';

export interface CaseAssignment {
  id: string;
  case_id: string;
  user_id: string;
  username?: string;
  full_name?: string;
  role_in_case: string;
  assigned_at: string;
  can_write: boolean;
  can_export: boolean;
}

export interface CaseNote {
  id: string;
  case_id: string;
  author_id?: string;
  author_name?: string;
  author_role?: string;
  note_type: 'GENERAL' | 'FIELD_REPORT' | 'HYPOTHESIS' | 'SUPERVISORY_DIRECTIVE' | 'LEGAL_OPINION' | 'FORENSIC_MEMO';
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  crime_category: string;
  status: CaseStatus;
  priority: CasePriority;
  stage: CaseStage;
  is_confidential: boolean;
  lead_investigator_id?: string;
  assigned_lead_user_id?: string;
  investigating_agency: string;
  police_station?: string;
  district?: string;
  state?: string;
  tags: string[];
  case_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  team_members_count?: number;
  assigned_team?: CaseAssignment[];
}

export interface CaseCreatePayload {
  case_number: string;
  title: string;
  description?: string;
  crime_category: string;
  status?: string;
  priority?: CasePriority;
  stage?: CaseStage;
  is_confidential?: boolean;
  lead_investigator_id?: string;
  investigating_agency?: string;
  police_station?: string;
  district?: string;
  state?: string;
  tags?: string[];
  case_metadata?: Record<string, any>;
}

export interface CaseDashboardStats {
  total_cases: number;
  active_investigations: number;
  critical_priority_cases: number;
  under_review_cases: number;
  chargesheeted_cases: number;
  total_evidence_artifacts: number;
  cases_by_category: Record<string, number>;
  cases_by_priority: Record<string, number>;
  cases_by_stage: Record<string, number>;
}

export interface EvidenceItem {
  id: string;
  evidence_code?: string;
  case_id: string;
  source_type: SourceType;
  evidence_category: EvidenceCategory;
  file_name: string;
  file_path?: string;
  file_hash_sha256: string;
  mime_type: string;
  file_size_bytes: number;
  seizing_officer?: string;
  place_of_seizure?: string;
  witness_details?: string;
  forensic_extraction_tool?: string;
  device_serial_or_imei?: string;
  ingested_by_operator: string;
  ingestion_timestamp: string;
  integrity_status: IntegrityStatus;
  evidence_status: EvidenceStatus;
  last_verified_at?: string;
  is_admissible: boolean;
  extracted_text_content?: string;
  evidence_metadata?: Record<string, any>;
  provenance_metadata?: Record<string, any>;
  entities_count?: number;
  relationships_count?: number;
}

export interface ExtractedEntity {
  id: string;
  evidence_id: string;
  case_id: string;
  entity_type: string; // PERSON, PHONE_NUMBER, DEVICE, FINANCIAL_ACCOUNT, VEHICLE, LOCATION, ORGANIZATION, LEGAL_SECTION
  raw_value: string;
  normalized_value: string;
  confidence: number;
  char_start?: number;
  char_end?: number;
  context_snippet?: string;
  extraction_method: string;
  entity_metadata?: Record<string, any>;
  created_at: string;
}

export interface ExtractedRelationship {
  id: string;
  evidence_id: string;
  case_id: string;
  source_entity_id?: string;
  target_entity_id?: string;
  source_value: string;
  target_value: string;
  relationship_type: string;
  relationship_nature: string;
  confidence: number;
  context_snippet?: string;
  extraction_method: string;
  relationship_metadata?: Record<string, any>;
  created_at: string;
}

// Phase 5: Entity Resolution Types
export type CandidateReviewStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'CHALLENGED';

export interface EntityResolutionCandidate {
  id: string;
  case_id: string;
  source_entity_id: string;
  target_entity_id: string;
  source_value: string;
  target_value: string;
  entity_type: string;
  match_type: string;
  confidence_score: number;
  feature_scores: Record<string, any>;
  review_status: CandidateReviewStatus;
  reviewed_by_user_id?: string;
  reviewer_username?: string;
  reviewed_at?: string;
  decision_reason?: string;
  merge_directive: string;
  created_at: string;
}

export interface CanonicalEntity {
  id: string;
  canonical_code: string;
  case_id: string;
  entity_type: string;
  canonical_name: string;
  aliases: string[];
  phone_numbers: string[];
  devices: string[];
  accounts: string[];
  locations: string[];
  entity_metadata?: Record<string, any>;
  is_verified: boolean;
  created_at: string;
  members_count: number;
}

export interface ResolutionRunResult {
  case_id: string;
  candidates_generated: number;
  candidates: EntityResolutionCandidate[];
}

// Phase 6: Knowledge Graph Types
export interface GraphNode {
  id: string;
  label: string; // Person, Phone, Device, Vehicle, Account, Location, Organization, Event, Evidence, Case
  name: string;
  properties: Record<string, any>;
  is_canonical?: boolean;
  degree?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string; // CALLED, MESSAGED, OWNS, USED, VISITED, LOCATED_AT, TRANSFERRED, WORKS_FOR, ASSOCIATED_WITH, INVOLVED_IN
  confidence: number;
  relationship_nature: string;
  verification_status: string;
  evidence_id?: string;
  properties?: Record<string, any>;
}

export interface GraphData {
  case_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface GraphStats {
  case_id: string;
  nodes_by_label: Record<string, number>;
  edges_by_type: Record<string, number>;
  total_nodes: number;
  total_edges: number;
  density: number;
  max_degree_node?: string;
}

export interface NLPProcessingResult {
  evidence_id: string;
  case_id: string;
  status: string;
  language_info: {
    primary_language: string;
    is_hinglish: boolean;
    matched_legal_keywords?: string[];
    confidence?: number;
  };
  entities_count: number;
  relationships_count: number;
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

export interface DirectNLPResult {
  language_info: {
    primary_language: string;
    is_hinglish: boolean;
    matched_legal_keywords?: string[];
    confidence?: number;
  };
  entities: Array<{
    entity_type: string;
    raw_value: string;
    normalized_value: string;
    confidence: number;
    char_start?: number;
    char_end?: number;
    context_snippet?: string;
    extraction_method: string;
    metadata?: Record<string, any>;
  }>;
  relationships: Array<{
    source_value: string;
    target_value: string;
    relationship_type: string;
    relationship_nature: string;
    confidence: number;
    context_snippet?: string;
    extraction_method: string;
    metadata?: Record<string, any>;
  }>;
  entities_count: number;
  relationships_count: number;
}

export interface IntegrityCheckResult {
  evidence_id: string;
  file_name: string;
  stored_hash_sha256: string;
  computed_hash_sha256: string;
  integrity_status: IntegrityStatus;
  is_valid: boolean;
  verified_at: string;
  compliance_certification: string;
}

export interface AuditLogItem {
  id: string;
  case_id?: string;
  operator_id: string;
  operator_role: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  timestamp: string;
  ip_address: string;
  details_json: Record<string, any>;
  entry_hash_sha256?: string;
}

export interface IngestionResult {
  evidence_id: string;
  case_id: string;
  file_name: string;
  file_hash_sha256: string;
  source_type: SourceType;
  evidence_category: EvidenceCategory;
  records_extracted?: number;
  fir_number?: string;
  integrity_status: IntegrityStatus;
}

// Phase 7 & 8: Graph Analytics & Hidden-Link ML Types
export interface CentralityScore {
  node_id: string;
  name: string;
  label: string;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  pagerank: number;
  eigenvector_centrality?: number;
  local_clustering_coefficient?: number;
  coreness?: number;
  archetype: 'KINGPIN_INFLUENCER' | 'COMMUNICATION_BROKER' | 'OPERATIONAL_HUB' | 'SYNDICATE_OPERATIVE' | 'PERIPHERAL_ASSOCIATE' | string;
  justification: string;
  composite_threat_score: number;
  connections_count: number;
  non_culpability_caveat?: string;
}

export interface KeyPlayerResponse {
  case_id: string;
  total_analyzed_nodes: number;
  top_kingpins: CentralityScore[];
  top_brokers: CentralityScore[];
  top_hubs: CentralityScore[];
  all_players: CentralityScore[];
  judicial_disclaimer?: string;
}

export interface CommunityMember {
  node_id: string;
  name: string;
  label: string;
  internal_connections: number;
}

export interface CommunityCluster {
  community_id: string;
  name: string;
  centroid_node_id: string;
  centroid_name: string;
  size: number;
  internal_edges: number;
  external_edges: number;
  density: number;
  members: CommunityMember[];
}

export interface CommunityDetectionResponse {
  case_id: string;
  total_communities: number;
  modularity: number;
  communities: CommunityCluster[];
}

export interface PathfindingRequest {
  source_node_id: string;
  target_node_id: string;
}

export interface PathStep {
  step: number;
  node_id: string;
  name: string;
  label: string;
}

export interface PathfindingResponse {
  case_id: string;
  found: boolean;
  source_node_id: string;
  target_node_id: string;
  hops: number;
  total_weight: number;
  composite_confidence: number;
  path_nodes: PathStep[];
  path_edges: Record<string, any>[];
}

export interface PredictedLink {
  source_id: string;
  target_id: string;
  source_name: string;
  source_label: string;
  target_name: string;
  target_label: string;
  predicted_relation: string;
  probability: number;
  adamic_adar_score: number;
  jaccard_coefficient: number;
  common_neighbors_count: number;
  common_neighbor_names: string[];
  reason: string;
}

export interface HiddenLinkPredictionResponse {
  case_id: string;
  total_predicted_links: number;
  min_probability_threshold: number;
  predictions: PredictedLink[];
}

export interface LinkReviewRequest {
  source_id: string;
  target_id: string;
  decision: 'ACCEPTED' | 'DISMISSED';
  justification_reason: string;
  relationship_type?: string;
}

export interface GraphAnomalyItem {
  anomaly_type: 'CRITICAL_BRIDGE' | 'FAN_IN_AGGREGATION' | 'FAN_OUT_DISPERSION' | string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  entity_id: string;
  entity_name: string;
  entity_label: string;
  description: string;
  associated_nodes: string[];
}

export interface GraphAnomaliesResponse {
  case_id: string;
  total_anomalies: number;
  anomalies: GraphAnomalyItem[];
}

// Phase 8: k-Core & Structural Topology Types
export interface KCoreMember {
  node_id: string;
  name: string;
  label: string;
  degree: number;
}

export interface KCoreShell {
  k: number;
  shell_name: string;
  member_count: number;
  members: KCoreMember[];
}

export interface KCoreResponse {
  case_id: string;
  max_core: number;
  total_shells: number;
  shells: KCoreShell[];
  node_coreness: Record<string, number>;
  judicial_disclaimer?: string;
}

export interface StructuralOverviewResponse {
  case_id: string;
  total_nodes: number;
  total_edges: number;
  density: number;
  average_degree: number;
  connected_components_count: number;
  largest_component_size: number;
  diameter: number;
  average_path_length: number;
  transitivity: number;
  average_clustering: number;
  critical_bridges_count: number;
  judicial_non_culpability_caveat: string;
}

export interface MetricGlossaryItem {
  metric_id: string;
  name: string;
  formula: string;
  investigative_meaning: string;
  benign_alternative_explanation: string;
  judicial_non_culpability_statement: string;
}

export interface MetricGlossaryResponse {
  total_metrics: number;
  glossary: MetricGlossaryItem[];
  overarching_judicial_doctrine: string;
}

// Phase 9: Advanced Heterogeneous Graph ML Link Prediction Types
export interface HeterogeneousCandidateLink {
  source_id: string;
  source_name: string;
  source_type: string;
  target_id: string;
  target_name: string;
  target_type: string;
  predicted_relationship: string;
}

export interface BaselineAlgorithmicScores {
  common_neighbours_count: number;
  common_neighbour_names: string[];
  jaccard_coefficient: number;
  adamic_adar_score: number;
  preferential_attachment: number;
  resource_allocation: number;
  shortest_path_hops: number;
}

export interface GraphSignalItem {
  signal_code: string;
  weight: number;
  description: string;
}

export interface EvidencePathItem {
  hops: number;
  path_nodes: Array<{ id: string; name: string; type: string }>;
  summary: string;
}

export interface HiddenLinkMLPrediction {
  candidate_link: HeterogeneousCandidateLink;
  confidence: number;
  ml_probability: number;
  prediction_status: 'PREDICTED' | 'UNDER_INVESTIGATION' | 'ACCEPTED_AS_HYPOTHESIS' | 'REJECTED' | 'CHALLENGED';
  baseline_scores: BaselineAlgorithmicScores;
  supporting_graph_signals: GraphSignalItem[];
  contradictory_signals: GraphSignalItem[];
  evidence_paths: EvidencePathItem[];
  judicial_notice: string;
}

export interface HiddenLinkMLResponse {
  case_id: string;
  total_predicted_links: number;
  min_confidence_threshold: number;
  model_name: string;
  predictions: HiddenLinkMLPrediction[];
  judicial_warning: string;
}

export interface ReviewPredictionRequest {
  source_id: string;
  target_id: string;
  decision: 'ACCEPTED_AS_HYPOTHESIS' | 'REJECTED' | 'CHALLENGED';
  justification_reason: string;
  investigator_badge: string;
  relationship_type?: string;
}

// Phase 10: Temporal Intelligence & Clean-Slate Anomaly Types
export interface TimelineEventItem {
  event_id: string;
  timestamp: string;
  event_type: string;
  actor_entity: string;
  target_entity: string;
  amount?: number;
  currency?: string;
  channel_or_location?: string;
  evidence_id: string;
  summary: string;
  confidence: number;
  location_coords?: { lat: number; lon: number };
}

export interface CommunicationBurstItem {
  burst_type: string;
  entity_1: string;
  entity_2: string;
  window_start: string;
  window_end: string;
  call_count: number;
  expected_count: number;
  z_score: number;
  severity: string;
  description: string;
}

export interface TransactionBurstItem {
  burst_type: string;
  target_account: string;
  window_start: string;
  window_end: string;
  transaction_count: number;
  total_volume_inr: number;
  senders_involved: string[];
  channels: string[];
  severity: string;
  description: string;
}

export interface LocationAnomalyItem {
  anomaly_type: 'IMPOSSIBLE_TRAVEL_VELOCITY' | 'NOCTURNAL_OFF_HOURS_BURST' | string;
  entity_phone: string;
  origin_tower?: string;
  destination_tower?: string;
  origin_time?: string;
  destination_time?: string;
  distance_km?: number;
  time_delta_min?: number;
  calculated_speed_kmh?: number;
  pings_count?: number;
  sample_times?: string[];
  towers?: string[];
  severity: string;
  description: string;
}

export interface RelationshipEmergenceItem {
  entity_1: string;
  entity_2: string;
  first_seen: string;
  last_seen: string;
  active_duration_days: number;
  total_interactions: number;
  max_dormancy_gap_days: number;
  emergence_status: 'NEWLY_EMERGED' | 'REACTIVATED_DORMANT' | 'CHRONIC_ACTIVE' | 'ISOLATED' | string;
  description: string;
}

export interface CleanSlateAnomalyItem {
  entity_identifier: string;
  has_historical_criminal_record: boolean;
  historical_convictions_count: number;
  current_case_anomaly_score: number;
  current_case_events_count: number;
  current_case_financial_volume: number;
  risk_archetype: 'RECRUITED_MULE_ACCOUNT_HOLDER' | 'BURNER_SIM_PROXY' | 'LATENT_SYNDICATE_CUTOUT' | string;
  evidentiary_rationale: string;
  statutory_safeguard: string;
}

export interface TemporalIntelligenceResponse {
  case_id: string;
  analysis_timestamp: string;
  total_events: number;
  timeline: TimelineEventItem[];
  communication_bursts: CommunicationBurstItem[];
  transaction_bursts: TransactionBurstItem[];
  location_anomalies: LocationAnomalyItem[];
  relationship_emergence: RelationshipEmergenceItem[];
  clean_slate_anomalies: CleanSlateAnomalyItem[];
  judicial_disclaimer: string;
}

// Phase 11: Case-Aware & Permission-Aware Document RAG Types
export interface CitationItem {
  citation_id: string;
  evidence_id?: string;
  evidence_code?: string;
  source_type: string;
  file_name?: string;
  chunk_id: string;
  chunk_index: number;
  exact_quote: string;
  relevance_score: number;
  page_or_line?: string;
}

export interface RetrievedChunkItem {
  chunk_id: string;
  case_id: string;
  evidence_id?: string;
  chunk_index: number;
  content: string;
  source_type: string;
  evidence_code?: string;
  similarity_score: number;
  rerank_score: number;
  chunk_metadata: Record<string, any>;
}

export interface RAGQueryRequest {
  query: string;
  top_k?: number;
  source_type_filter?: string[];
  evidence_id_filter?: string;
  min_relevance_score?: number;
}

export interface RAGQueryResponse {
  case_id: string;
  query: string;
  answer: string;
  citations: CitationItem[];
  retrieved_chunks_count: number;
  grounding_status: 'FULLY_GROUNDED' | 'PARTIALLY_GROUNDED' | 'INSUFFICIENT_EVIDENCE' | string;
  confidence_score: number;
  statutory_safeguard: string;
  chunks: RetrievedChunkItem[];
}

export interface IndexCaseDocumentsResponse {
  case_id: string;
  total_documents_processed: number;
  total_chunks_created: number;
  source_breakdown: Record<string, number>;
  message: string;
}

export interface RAGStatsResponse {
  case_id: string;
  total_chunks: number;
  source_type_distribution: Record<string, number>;
  last_indexed_at?: string;
}

// Phase 12: GraphRAG Multi-Engine Router & Evidence Fusion Types
export type QueryIntentType =
  | 'ENTITY_CONNECTIVITY'
  | 'RELATIONSHIP_EVIDENCE'
  | 'TEMPORAL_CHANGE'
  | 'CROSS_CLUSTER'
  | 'MISSING_EVIDENCE'
  | 'GENERAL_INQUIRY';

export type PrimaryRouteType =
  | 'GRAPH'
  | 'DOC_RAG'
  | 'ML_PREDICTION'
  | 'TEMPORAL'
  | 'EVIDENCE_GAP'
  | 'HYBRID_FUSION';

export interface QueryClassificationResult {
  primary_route: PrimaryRouteType;
  question_intent: QueryIntentType;
  target_entities: string[];
  target_relationships: string[];
  engine_plan: {
    needs_graph: boolean;
    needs_rag: boolean;
    needs_ml: boolean;
    needs_temporal: boolean;
    needs_gap_analysis: boolean;
  };
  confidence: number;
  classification_rationale: string;
}

export interface GraphCitationItem {
  citation_id: string;
  source_node: string;
  target_node: string;
  relationship_type: string;
  confidence: number;
  relationship_nature: string;
  verification_status: string;
  evidence_id?: string;
  properties: Record<string, any>;
}

export interface EvidenceGapItem {
  gap_id: string;
  gap_type: string;
  entity_or_relationship: string;
  description: string;
  investigative_recommendation: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface GraphRAGQueryRequest {
  query: string;
  focus_entity?: string;
  include_evidence_gaps?: boolean;
  max_graph_hops?: number;
  top_k_chunks?: number;
}

export interface GraphRAGQueryResponse {
  case_id: string;
  query: string;
  classification: QueryClassificationResult;
  answer: string;
  graph_citations: GraphCitationItem[];
  document_citations: CitationItem[];
  evidence_gaps: EvidenceGapItem[];
  cross_cluster_insights?: any[];
  temporal_bursts?: any[];
  grounding_status: 'FULLY_GROUNDED' | 'PARTIALLY_GROUNDED' | 'EVIDENCE_GAP_HIGHLIGHTED' | string;
  confidence_score: number;
  statutory_safeguard: string;
}

export interface SuggestedPromptItem {
  category: string;
  prompt: string;
  focus_entity?: string;
  description: string;
}

export interface SuggestedPromptsResponse {
  case_id: string;
  prompts: SuggestedPromptItem[];
}

// Phase 13: Multi-Perspective Reasoning & Consensus Synthesis Types
export type PerspectiveType =
  | 'INVESTIGATOR'
  | 'FORENSIC'
  | 'LEGAL'
  | 'DEFENCE_ALTERNATIVE'
  | 'SUSPECT_INNOCENT'
  | 'COMMON_SENSE';

export interface PerspectiveFinding {
  point: string;
  evidence_anchor?: string;
  category: string;
  weight: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface PerspectiveReport {
  perspective: PerspectiveType;
  title: string;
  summary: string;
  arguments: string[];
  supporting_points: string[];
  concerns_or_limitations: string[];
  certainty_level: 'HIGH' | 'MODERATE' | 'LOW' | 'HIGHLY_UNCERTAIN';
  non_culpability_statement: string;
}

export interface SupportingEvidenceItem {
  evidence_anchor: string;
  source: string;
  description: string;
  corroboration_level: string;
  perspectives_aligned?: string[];
}

export interface ContradictoryEvidenceItem {
  conflict_id: string;
  title: string;
  perspective_a: string;
  perspective_b: string;
  description: string;
  significance: string;
}

export interface RecommendedVerificationAction {
  action_id: string;
  action_type: string;
  target: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  statutory_mandate: string;
  expected_outcome: string;
}

export interface ConsensusSynthesis {
  target_entity_name?: string;
  hypothesis: string;
  supporting_evidence: SupportingEvidenceItem[];
  contradictory_evidence: ContradictoryEvidenceItem[];
  alternative_explanations: string[];
  uncertainty: {
    uncertainty_score?: number;
    uncertainty_level?: string;
    perspective_agreement_index?: number;
    key_uncertainty_drivers?: string[];
  };
  unresolved_questions: string[];
  recommended_verification: RecommendedVerificationAction[];
  judicial_non_culpability_doctrine: string;
}

export interface MultiPerspectiveAnalysisRequest {
  hypothesis: string;
  target_entity?: string;
  focus_evidence_ids?: string[];
  include_historical_records?: boolean;
}

export interface MultiPerspectiveAnalysisResponse {
  assessment_id: string;
  case_id: string;
  hypothesis: string;
  target_entity?: string;
  perspectives: PerspectiveReport[];
  consensus: ConsensusSynthesis;
  created_at: string;
}

export interface PerspectiveAssessmentSummary {
  id: string;
  case_id: string;
  hypothesis_statement: string;
  target_entity_name?: string;
  created_at: string;
  created_by_username?: string;
}

export interface PerspectiveAssessmentHistoryResponse {
  case_id: string;
  total_assessments: number;
  assessments: PerspectiveAssessmentSummary[];
}

// ==========================================
// PHASE 14 — Counterfactual & Evidence Ablation
// ==========================================

export type AblationScenarioType =
  | 'FULL_EVIDENCE'
  | 'WITHOUT_CDR'
  | 'WITHOUT_LOCATION'
  | 'WITHOUT_FINANCIAL'
  | 'ENTITY_REMOVAL'
  | 'RELATIONSHIP_REMOVAL'
  | 'CUSTOM';

export type HypothesisSurvivalStatus =
  | 'ROBUST'
  | 'MODERATELY_DEGRADED'
  | 'HIGHLY_FRAGILE'
  | 'COLLAPSED';

export interface ScenarioMetricDelta {
  node_count: number;
  edge_count: number;
  density: number;
  components_count: number;
  avg_clustering: number;
  target_degree?: number | null;
  target_betweenness?: number | null;
  target_pagerank?: number | null;
  delta_nodes: number;
  delta_edges: number;
  delta_density: number;
  delta_components: number;
  delta_target_degree?: number | null;
  delta_target_betweenness?: number | null;
}

export interface AblatedScenarioResult {
  scenario_type: AblationScenarioType;
  scenario_name: string;
  description: string;
  excluded_elements_count: number;
  excluded_categories: string[];
  metrics: Record<string, any>;
  metric_deltas: ScenarioMetricDelta;
  hypothesis_confidence: number;
  confidence_delta: number;
  alternative_explanations: string[];
  key_vulnerabilities: string[];
  survival_status: HypothesisSurvivalStatus;
}

export interface SensitivityAnalysisSummary {
  baseline_confidence: number;
  lowest_confidence_scenario: string;
  max_confidence_drop: number;
  overall_fragility_score: number;
  single_points_of_failure: string[];
  survival_status: HypothesisSurvivalStatus;
  synthesis_finding: string;
  legal_statutory_disclaimer: string;
}

export interface ComparativeAblationRequest {
  hypothesis_statement: string;
  target_entity?: string;
  custom_scenarios?: string[];
}

export interface ComparativeAblationResponse {
  case_id: string;
  simulation_id: string;
  simulation_name: string;
  hypothesis_statement: string;
  target_entity?: string;
  baseline_metrics: Record<string, any>;
  scenarios: AblatedScenarioResult[];
  sensitivity_summary: SensitivityAnalysisSummary;
  created_at: string;
  non_culpability_notice: string;
}

export interface EntityRemovalSimulationRequest {
  hypothesis_statement: string;
  entity_name: string;
}

export interface RelationshipRemovalSimulationRequest {
  hypothesis_statement: string;
  source_entity: string;
  target_entity: string;
  relationship_type?: string;
}

export interface SimulationHistoryItem {
  id: string;
  case_id: string;
  simulation_name: string;
  hypothesis_statement: string;
  target_entity?: string;
  ablation_type: string;
  overall_fragility_score: number;
  survival_status: string;
  created_by_username?: string;
  created_at: string;
}

// ==========================================
// PHASE 15 — Investigative Priority & Next Best Action
// ==========================================

export type InvestigativePriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityScoreFactors {
  evidence_strength: number;
  temporal_correlation: number;
  network_relevance: number;
  anomaly_score: number;
  corroboration_index: number;
  source_reliability: number;
  contradictory_penalty: number;
  alternative_explanation_discount: number;
  uncertainty_penalty: number;
}

export interface SupportingEvidenceItem {
  modality: string;
  evidence_id?: string;
  summary: string;
  confidence_weight: number;
}

export interface ContradictoryEvidenceItem {
  modality: string;
  evidence_id?: string;
  conflict_reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

export interface UncertaintyAnalysis {
  uncertainty_score: number;
  uncertainty_level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  key_entropy_drivers: string[];
  confidence_interval?: string;
}

export interface NextBestAction {
  action_id: string;
  rank: number;
  title: string;
  action_category: string;
  expected_info_gain: number;
  hypotheses_resolved: string[];
  evidence_gaps_addressed: string[];
  statutory_mandate: string;
  operational_urgency: 'IMMEDIATE' | 'HIGH_PRIORITY' | 'ROUTINE' | string;
  target_entity?: string;
}

export interface AssessInvestigativePriorityRequest {
  lead_title?: string;
  target_entity_name?: string;
  target_entity_id?: string;
  include_next_best_actions?: boolean;
}

export interface InvestigativePriorityAssessmentResponse {
  assessment_id: string;
  case_id: string;
  lead_title: string;
  target_entity_name?: string;
  priority_level: InvestigativePriorityLevel;
  priority_score: number;
  score_factors: PriorityScoreFactors;
  reasons: string[];
  supporting_evidence: SupportingEvidenceItem[];
  contradictory_evidence: ContradictoryEvidenceItem[];
  alternative_explanations: string[];
  uncertainty: UncertaintyAnalysis;
  recommended_verification: string[];
  next_best_actions: NextBestAction[];
  created_at: string;
  legal_statutory_notice: string;
}

export interface PriorityAssessmentSummaryItem {
  id: string;
  case_id: string;
  lead_title: string;
  target_entity_name?: string;
  priority_level: string;
  priority_score: number;
  created_by_username?: string;
  created_at: string;
}

// Phase 16: Indian Legal Intelligence (BNS / BNSS / BSA 2023) Types
export type StatuteCode = 'BNS' | 'BNSS' | 'BSA';
export type LegalComplianceStatus = 'MET' | 'PARTIALLY_MET' | 'UNMET' | 'CONTESTED';

export interface LegalConditionItem {
  id: string;
  text: string;
  is_mandatory: boolean;
  description?: string;
}

export interface LegalSectionItem {
  id: string;
  statute_code: string;
  section_number: string;
  section_title: string;
  chapter?: string;
  category: 'OFFENSE' | 'PROCEDURE' | 'EVIDENCE_RULE' | string;
  offense_type?: 'COGNIZABLE' | 'NON_COGNIZABLE' | 'PROCEDURAL' | string;
  bailable?: boolean | null;
  compoundable?: boolean | null;
  punishment_text?: string;
  full_text: string;
  conditions: LegalConditionItem[];
  legacy_code_mapping: {
    act?: string;
    section?: string;
    title?: string;
  };
  version: string;
}

export interface LegalStatuteItem {
  id: string;
  code: string;
  title: string;
  enactment_year: number;
  effective_date: string;
  version: string;
  statute_metadata: Record<string, any>;
  sections_count: number;
}

export interface EvidenceLawChainStep {
  law: string;
  provision: string;
  condition: string;
  available_evidence: string[];
  relevance: string;
  missing_information: string;
  verification: string;
  status: LegalComplianceStatus;
}

export interface EvidenceToLawResponse {
  case_id: string;
  timestamp: string;
  chains: EvidenceLawChainStep[];
  statutory_summary: {
    BNS: { total_conditions: number; met: number; partially_met: number; unmet: number };
    BNSS: { total_conditions: number; met: number; partially_met: number; unmet: number };
    BSA: { total_conditions: number; met: number; partially_met: number; unmet: number };
  };
  procedural_safeguards: string[];
  non_culpability_notice: string;
}

export interface LegalRAGQueryRequest {
  query: string;
  statute_filter?: string[];
  include_case_evidence?: boolean;
  include_legacy_concordance?: boolean;
}

export interface CitedSectionItem {
  statute_code: string;
  statute_title: string;
  section_number: string;
  section_title: string;
  category?: string;
  offense_type?: string;
  punishment?: string;
}

export interface LegacyConcordanceItem {
  new_code: string;
  legacy_code: string;
  title: string;
}

export interface LegalRAGQueryResponse {
  query: string;
  answer: string;
  chains: EvidenceLawChainStep[];
  cited_sections: CitedSectionItem[];
  legacy_concordance: LegacyConcordanceItem[];
  non_culpability_notice: string;
}

export interface LegalGraphNode {
  id: string;
  label: string;
  type: string;
  statute_code?: string;
  properties: Record<string, any>;
}

export interface LegalGraphLink {
  source: string;
  target: string;
  label: string;
}

export interface LegalGraphResponse {
  nodes: LegalGraphNode[];
  links: LegalGraphLink[];
  total_nodes: number;
  total_links: number;
}

// ---------------------------------------------------------------------------
// Phase 20: Final Integration & SIH Demo Types
// ---------------------------------------------------------------------------

export interface WorkflowStepResult {
  step_number: number;
  step_name: string;
  step_category: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  duration_ms: number;
  summary: string;
  key_metrics: Record<string, any>;
  artifacts: Record<string, any>;
  error?: string;
}

export interface WorkflowExecutionProgress {
  case_id: string;
  case_number: string;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  current_step: number;
  total_steps: number;
  steps: WorkflowStepResult[];
  started_at: string;
  completed_at?: string;
  total_duration_ms: number;
}

export interface InvestigationDossierReport {
  case_id: string;
  case_number: string;
  title: string;
  crime_category: string;
  police_station: string;
  total_loss_inr: number;
  status: string;
  io_name: string;
  generated_at: string;
  executive_summary: string;
  
  entity_network_summary: Record<string, any>;
  key_players: Array<{ name: string; role: string; degree_centrality?: number; page_rank?: number; betweenness?: number }>;
  syndicate_communities: Array<{ id: number; name: string; lead?: string; members_count?: number }>;
  bridge_nodes: Array<{ node: string; betweenness?: number; cut_vertex?: boolean; impact?: string }>;
  hidden_links_predicted: Array<{ source: string; target: string; relation?: string; confidence?: number }>;
  anomalies_detected: Array<{ type: string; details: string; severity: string }>;
  
  graphrag_insights: Array<{ topic?: string; summary: string; evidence_citations?: string[] }>;
  multi_perspective_consensus: Record<string, any>;
  counterfactual_vulnerability: Record<string, any>;
  
  ranked_suspects: Array<{ rank: number; name: string; priority_score?: number; action?: string }>;
  next_best_actions: Array<{ priority: number; action: string; urgency?: string }>;
  
  legal_charges_bns: string[];
  bsa_section_63_status: string;
  judicial_admissibility_score: number;
  chargesheet_points: string[];
  
  blockchain_merkle_root: string;
  blockchain_block_height: number;
  bsa_sec_63_certificate_token: string;
  evidence_hashes: Array<{ code: string; file: string; type: string; sha256: string }>;
  audit_events_count: number;
  audit_chain_valid: boolean;
}

export interface RunSIHDemoResponse {
  success: boolean;
  message: string;
  case_id: string;
  case_number: string;
  execution_progress: WorkflowExecutionProgress;
  dossier_report: InvestigationDossierReport;
}


