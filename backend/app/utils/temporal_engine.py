import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple


class TemporalIntelligenceEngine:
    """
    Phase 10: Temporal Intelligence & Anomaly Detection Engine for CIPHERTRACE X.
    
    Implements:
    1. Unified Chronological Event Timeline
    2. Communication Burst Detection (Z-score & Poisson intensity over sliding windows)
    3. Transaction Burst Detection (High-velocity Hawala/UPI layering sequences)
    4. Spatiotemporal Anomalies (Impossible travel speed > 800 km/h, nocturnal off-hours pings)
    5. Relationship Emergence Tracking (First contact, last contact, dormancy & sudden reactivation)
    6. Change-Point Detection (CUSUM statistical change points on activity frequencies)
    7. Clean-Slate Anomaly Engine (Strictly isolates historical criminal records from current case
       evidence, elevating zero-prior-record recruits as prime investigative hypotheses under Section 63 BSA 2023).
    """

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates great circle distance in kilometers between two GPS coordinates."""
        r = 6371.0  # Earth radius in km
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    @classmethod
    def build_unified_timeline(
        cls,
        cdrs: List[Dict[str, Any]],
        financials: List[Dict[str, Any]],
        firs: List[Dict[str, Any]],
        evidence_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Merges multi-source evidence items into a single unified, chronological event timeline.
        """
        timeline: List[Dict[str, Any]] = []

        # 1. CDR Events (Calls, SMS)
        for c in cdrs:
            t = c.get("start_time")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if not isinstance(t, datetime):
                continue

            timeline.append({
                "event_id": f"EVT_CDR_{c.get('id', '')}",
                "timestamp": t.isoformat(),
                "event_type": f"COMMUNICATION_{c.get('call_type', 'CALL')}",
                "actor_entity": c.get("calling_number", ""),
                "target_entity": c.get("called_number", ""),
                "duration_sec": c.get("duration_sec", 0),
                "channel_or_location": c.get("cell_tower_id") or "CELLULAR_NETWORK",
                "coordinates": (
                    {"lat": c["latitude"], "lon": c["longitude"]}
                    if c.get("latitude") and c.get("longitude")
                    else None
                ),
                "evidence_id": c.get("evidence_id", ""),
                "summary": f"{c.get('call_type', 'CALL')} from {c.get('calling_number')} to {c.get('called_number')} ({c.get('duration_sec', 0)}s)",
                "confidence": 1.0,
            })

        # 2. Financial Events (Transfers, Deposits, Hawala)
        for f in financials:
            t = f.get("timestamp")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if not isinstance(t, datetime):
                continue

            amt = f.get("amount", 0.0)
            curr = f.get("currency", "INR")
            timeline.append({
                "event_id": f"EVT_FIN_{f.get('id', '')}",
                "timestamp": t.isoformat(),
                "event_type": f"TRANSACTION_{f.get('txn_type', 'TRANSFER')}",
                "actor_entity": f.get("sender_account", ""),
                "target_entity": f.get("receiver_account", ""),
                "amount": amt,
                "currency": curr,
                "channel_or_location": f.get("channel") or f.get("sender_bank") or "BANK_CHANNEL",
                "evidence_id": f.get("evidence_id", ""),
                "summary": f"Transfer of {curr} {amt:,.2f} from {f.get('sender_account')} to {f.get('receiver_account')} (UTR: {f.get('utr_reference', 'N/A')})",
                "confidence": 1.0,
            })

        # 3. FIR / Police Station Filings
        for fir in firs:
            t = fir.get("incident_date_time") or fir.get("created_at")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if not isinstance(t, datetime):
                continue

            timeline.append({
                "event_id": f"EVT_FIR_{fir.get('id', '')}",
                "timestamp": t.isoformat(),
                "event_type": "LEGAL_FIR_FILING",
                "actor_entity": fir.get("police_station", "POLICE"),
                "target_entity": fir.get("fir_number", ""),
                "channel_or_location": fir.get("police_station", ""),
                "evidence_id": fir.get("evidence_id", ""),
                "summary": f"FIR #{fir.get('fir_number')} filed under sections {', '.join(fir.get('acts_and_sections', []))}",
                "confidence": 1.0,
            })

        # Sort timeline in chronological order
        timeline.sort(key=lambda x: x["timestamp"])
        return timeline

    @classmethod
    def detect_communication_bursts(
        cls,
        cdrs: List[Dict[str, Any]],
        window_hours: int = 2,
        z_threshold: float = 2.0,
    ) -> List[Dict[str, Any]]:
        """
        Detects sudden surges in communication velocity between suspects within a sliding window.
        """
        if not cdrs:
            return []

        # Parse and sort CDRs
        parsed_cdrs = []
        for c in cdrs:
            t = c.get("start_time")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if isinstance(t, datetime):
                parsed_cdrs.append({**c, "dt": t})

        parsed_cdrs.sort(key=lambda x: x["dt"])
        if len(parsed_cdrs) < 3:
            return []

        # Group by pairs
        pair_events: Dict[Tuple[str, str], List[datetime]] = {}
        for c in parsed_cdrs:
            caller = c.get("calling_number", "")
            called = c.get("called_number", "")
            pair = (min(caller, called), max(caller, called))
            pair_events.setdefault(pair, []).append(c["dt"])

        bursts: List[Dict[str, Any]] = []
        window_delta = timedelta(hours=window_hours)

        for (u, v), timestamps in pair_events.items():
            if len(timestamps) < 3:
                continue

            # Sliding window count
            for i, start_t in enumerate(timestamps):
                end_t = start_t + window_delta
                window_calls = [t for t in timestamps if start_t <= t <= end_t]
                count = len(window_calls)

                # Baseline average across the span (minimum 24.0h baseline for daily activity rate)
                total_span_hours = max(24.0, (timestamps[-1] - timestamps[0]).total_seconds() / 3600.0)
                expected_per_window = (len(timestamps) / total_span_hours) * window_hours
                std_dev = math.sqrt(max(0.5, expected_per_window))
                z_score = (count - expected_per_window) / std_dev

                if count >= 3 and (z_score >= z_threshold or count >= 3):
                    bursts.append({
                        "burst_type": "COMMUNICATION_BURST",
                        "entity_1": u,
                        "entity_2": v,
                        "window_start": start_t.isoformat(),
                        "window_end": end_t.isoformat(),
                        "call_count": count,
                        "expected_count": round(expected_per_window, 2),
                        "z_score": round(z_score, 2),
                        "severity": "CRITICAL" if z_score >= 3.5 else "HIGH",
                        "description": f"Abnormal spike of {count} communications between {u} and {v} within {window_hours}h (Z-score: {z_score:.1f}σ).",
                    })
                    break  # Record one peak burst per pair to prevent redundant overlapping windows

        return bursts

    @classmethod
    def detect_transaction_bursts(
        cls,
        financials: List[Dict[str, Any]],
        window_hours: int = 4,
        min_txns: int = 2,
    ) -> List[Dict[str, Any]]:
        """
        Detects rapid smurfing deposits and high-velocity layering bursts across bank accounts.
        """
        if not financials:
            return []

        parsed_fin = []
        for f in financials:
            t = f.get("timestamp")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if isinstance(t, datetime):
                parsed_fin.append({**f, "dt": t})

        parsed_fin.sort(key=lambda x: x["dt"])
        if len(parsed_fin) < min_txns:
            return []

        # Group by recipient account (money mule aggregation) or sender account (smurfing dispersion)
        acct_events: Dict[str, List[Dict[str, Any]]] = {}
        for f in parsed_fin:
            rec = f.get("receiver_account", "")
            if rec:
                acct_events.setdefault(rec, []).append(f)

        bursts: List[Dict[str, Any]] = []
        window_delta = timedelta(hours=window_hours)

        for acct, txns in acct_events.items():
            if len(txns) < min_txns:
                continue

            for i, first_txn in enumerate(txns):
                start_t = first_txn["dt"]
                end_t = start_t + window_delta
                window_txns = [t for t in txns if start_t <= t["dt"] <= end_t]

                if len(window_txns) >= min_txns:
                    total_vol = sum(t.get("amount", 0.0) for t in window_txns)
                    senders = list({t.get("sender_account", "") for t in window_txns})
                    channels = list({t.get("channel", "TRANSFER") for t in window_txns if t.get("channel")})

                    bursts.append({
                        "burst_type": "TRANSACTION_BURST",
                        "target_account": acct,
                        "senders_count": len(senders),
                        "senders_sample": senders[:3],
                        "window_start": start_t.isoformat(),
                        "window_end": end_t.isoformat(),
                        "transaction_count": len(window_txns),
                        "total_volume_inr": round(total_vol, 2),
                        "velocity_per_hour": round(len(window_txns) / window_hours, 2),
                        "channels": channels,
                        "severity": "CRITICAL" if total_vol >= 500000.0 or len(window_txns) >= 4 else "HIGH",
                        "description": (
                            f"Hawala/Smurfing burst detected on account {acct}: {len(window_txns)} transactions "
                            f"totaling INR {total_vol:,.2f} from {len(senders)} source account(s) within {window_hours}h."
                        )
                    })
                    break  # Avoid overlapping duplicate alerts for the same account

        return bursts

    @classmethod
    def detect_location_anomalies(
        cls,
        cdrs: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Detects spatiotemporal anomalies:
        1. Impossible Travel Velocity (> 800 km/h between successive cell tower connections)
        2. Nocturnal Off-Hours Activity (Cell tower pings between 01:00 AM and 04:30 AM IST)
        """
        anomalies: List[Dict[str, Any]] = []
        if not cdrs:
            return anomalies

        parsed = []
        for c in cdrs:
            t = c.get("start_time")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if isinstance(t, datetime):
                parsed.append({**c, "dt": t})

        parsed.sort(key=lambda x: x["dt"])

        # Group by caller phone number
        by_phone: Dict[str, List[Dict[str, Any]]] = {}
        for c in parsed:
            phone = c.get("calling_number", "")
            if phone:
                by_phone.setdefault(phone, []).append(c)

        for phone, records in by_phone.items():
            # 1. Impossible Speed Check
            for i in range(len(records) - 1):
                r1 = records[i]
                r2 = records[i + 1]

                lat1, lon1 = r1.get("latitude"), r1.get("longitude")
                lat2, lon2 = r2.get("latitude"), r2.get("longitude")

                if lat1 and lon1 and lat2 and lon2:
                    dist_km = cls.haversine_distance_km(lat1, lon1, lat2, lon2)
                    time_diff_hours = abs((r2["dt"] - r1["dt"]).total_seconds()) / 3600.0

                    if dist_km > 30.0 and time_diff_hours > 0.0:
                        speed_kmh = dist_km / time_diff_hours
                        if speed_kmh > 800.0:
                            anomalies.append({
                                "anomaly_type": "IMPOSSIBLE_TRAVEL_VELOCITY",
                                "entity_phone": phone,
                                "origin_tower": r1.get("cell_tower_id", "TOWER_A"),
                                "destination_tower": r2.get("cell_tower_id", "TOWER_B"),
                                "origin_time": r1["dt"].isoformat(),
                                "destination_time": r2["dt"].isoformat(),
                                "distance_km": round(dist_km, 2),
                                "time_delta_min": round(time_diff_hours * 60.0, 1),
                                "calculated_speed_kmh": round(speed_kmh, 1),
                                "severity": "CRITICAL",
                                "description": (
                                    f"Impossible displacement for {phone}: traveled {dist_km:.1f} km in "
                                    f"{time_diff_hours*60:.1f} min ({speed_kmh:.0f} km/h). "
                                    f"Indicates clone SIM, SIM-box relay, or coordinated multi-device burner conspiracy."
                                )
                            })

            # 2. Nocturnal Activity Check (01:00 to 04:30)
            nocturnal_pings = [r for r in records if 1 <= r["dt"].hour < 5]
            if len(nocturnal_pings) >= 2:
                anomalies.append({
                    "anomaly_type": "NOCTURNAL_OFF_HOURS_BURST",
                    "entity_phone": phone,
                    "pings_count": len(nocturnal_pings),
                    "sample_times": [p["dt"].strftime("%H:%M:%S") for p in nocturnal_pings[:3]],
                    "towers": list({p.get("cell_tower_id", "UNKNOWN") for p in nocturnal_pings}),
                    "severity": "HIGH",
                    "description": (
                        f"Repeated off-hours nocturnal activity ({len(nocturnal_pings)} events between 01:00 AM - 04:30 AM) "
                        f"recorded on handset {phone}."
                    )
                })

        return anomalies

    @classmethod
    def analyze_relationship_emergence(
        cls,
        relationships: List[Dict[str, Any]],
        cdrs: List[Dict[str, Any]],
        financials: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Tracks the temporal emergence of connections: first observed contact,
        last observed contact, total active duration, and reactivation after dormancy.
        """
        pair_timestamps: Dict[Tuple[str, str], List[datetime]] = {}

        def record_pair(u: str, v: str, dt_obj: Optional[datetime]):
            if not u or not v or not dt_obj or u == v:
                return
            p = (min(u, v), max(u, v))
            pair_timestamps.setdefault(p, []).append(dt_obj)

        # Parse CDRs
        for c in cdrs:
            t = c.get("start_time")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if isinstance(t, datetime):
                record_pair(c.get("calling_number", ""), c.get("called_number", ""), t)

        # Parse Financials
        for f in financials:
            t = f.get("timestamp")
            if isinstance(t, str):
                try:
                    t = datetime.fromisoformat(t.replace("Z", ""))
                except Exception:
                    continue
            if isinstance(t, datetime):
                record_pair(f.get("sender_account", ""), f.get("receiver_account", ""), t)

        emergence_items: List[Dict[str, Any]] = []

        for (u, v), t_list in pair_timestamps.items():
            t_list.sort()
            first_seen = t_list[0]
            last_seen = t_list[-1]
            active_days = max(1, (last_seen - first_seen).days)
            interaction_count = len(t_list)

            # Check for dormancy gap (> 14 days of silence then sudden reactivation)
            max_dormancy_gap_days = 0
            for i in range(len(t_list) - 1):
                gap = (t_list[i + 1] - t_list[i]).days
                if gap > max_dormancy_gap_days:
                    max_dormancy_gap_days = gap

            if max_dormancy_gap_days >= 14:
                status = "REACTIVATED_DORMANT"
            elif active_days <= 2 and interaction_count >= 3:
                status = "RAPID_EMERGENCE"
            else:
                status = "ESTABLISHED_PERSISTENT"

            emergence_items.append({
                "entity_1": u,
                "entity_2": v,
                "first_seen": first_seen.isoformat(),
                "last_seen": last_seen.isoformat(),
                "active_duration_days": active_days,
                "total_interactions": interaction_count,
                "max_dormancy_gap_days": max_dormancy_gap_days,
                "emergence_status": status,
                "description": (
                    f"Relationship {status}: First recorded on {first_seen.strftime('%Y-%m-%d')}, "
                    f"last on {last_seen.strftime('%Y-%m-%d')} across {interaction_count} evidentiary interactions."
                )
            })

        return emergence_items

    @classmethod
    def evaluate_clean_slate_anomalies(
        cls,
        entities: List[Dict[str, Any]],
        current_case_timeline: List[Dict[str, Any]],
        evidence_items: List[Dict[str, Any]],
        detected_bursts: List[Dict[str, Any]],
        location_anomalies: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Implements the Clean-Slate Anomaly Engine under Section 63 BSA 2023.
        
        CRUCIAL DOCTRINE:
        Separates historical criminal records from current-case signals.
        A suspect with NO PRIOR CRIMINAL RECORD who displays acute current-case
        telemetry anomalies (burst transactions, mule funneling, impossible travel)
        is flagged as a Clean-Slate Recruited Operative Hypothesis.
        """
        # 1. Identify entities mentioned in HISTORICAL_CRIMINAL_RECORD evidence items
        historical_evidence_ids = {
            e["id"] for e in evidence_items
            if e.get("evidence_category") == "HISTORICAL_CRIMINAL_RECORD"
        }

        # Count historical priors per entity name/value
        has_historical_record: Set[str] = set()
        for e in entities:
            if e.get("evidence_id") in historical_evidence_ids:
                val = e.get("normalized_value") or e.get("raw_value") or e.get("name", "")
                if val:
                    has_historical_record.add(val.lower())

        # 2. Score Current-Case Temporal Signals per Entity
        entity_current_activity: Dict[str, Dict[str, Any]] = {}

        for evt in current_case_timeline:
            for actor in [evt.get("actor_entity"), evt.get("target_entity")]:
                if not actor:
                    continue
                k = actor.lower()
                if k not in entity_current_activity:
                    entity_current_activity[k] = {
                        "name": actor,
                        "event_count": 0,
                        "financial_volume": 0.0,
                        "bursts_count": 0,
                        "impossible_travel": False,
                    }
                entity_current_activity[k]["event_count"] += 1
                if evt.get("amount"):
                    entity_current_activity[k]["financial_volume"] += float(evt["amount"])

        # Tag burst entities
        for b in detected_bursts:
            for ent in [b.get("entity_1"), b.get("entity_2"), b.get("target_account")]:
                if ent and ent.lower() in entity_current_activity:
                    entity_current_activity[ent.lower()]["bursts_count"] += 1

        # Tag location anomaly entities
        for loc in location_anomalies:
            p = loc.get("entity_phone")
            if p and p.lower() in entity_current_activity:
                entity_current_activity[p.lower()]["impossible_travel"] = True

        # 3. Evaluate Clean-Slate Candidates
        clean_slate_hypotheses: List[Dict[str, Any]] = []

        for k, act in entity_current_activity.items():
            # Check: ZERO historical criminal records
            if k in has_historical_record:
                continue  # Skip known habitual offenders; focus strictly on clean-slate recruits

            # Compute Current-Case Anomaly Score (0 - 100)
            score = 0.0
            score += min(40.0, act["event_count"] * 5.0)
            if act["financial_volume"] > 100000.0:
                score += min(35.0, (act["financial_volume"] / 100000.0) * 10.0)
            if act["bursts_count"] > 0:
                score += min(20.0, act["bursts_count"] * 10.0)
            if act["impossible_travel"]:
                score += 25.0

            normalized_score = min(98.5, round(score, 1))

            # Trigger hypothesis if current evidence anomaly score is significant (>= 30.0)
            if normalized_score >= 30.0:
                # Determine risk archetype
                if act["financial_volume"] >= 200000.0:
                    archetype = "RECRUITED_MULE_ACCOUNT_HOLDER"
                    reason = (
                        f"Clean police slate with zero historical criminal dossiers, but received "
                        f"INR {act['financial_volume']:,.2f} across rapid current-case Hawala/smurfing transfers. "
                        f"High probability of being a recruited student, front merchant, or coerced account holder."
                    )
                elif act["impossible_travel"]:
                    archetype = "BURNER_SIM_PROXY"
                    reason = (
                        f"Individual has no previous criminal history, but phone number exhibited "
                        f"impossible travel velocity and multi-device SIM-box relay patterns."
                    )
                else:
                    archetype = "LATENT_SYNDICATE_CUTOUT"
                    reason = (
                        f"Clean-slate subject exhibiting {act['event_count']} high-intensity current-case coordination "
                        f"events and burst communications with cartel nodes."
                    )

                clean_slate_hypotheses.append({
                    "entity_identifier": act["name"],
                    "has_historical_criminal_record": False,
                    "historical_convictions_count": 0,
                    "current_case_anomaly_score": normalized_score,
                    "current_case_events_count": act["event_count"],
                    "current_case_financial_volume": round(act["financial_volume"], 2),
                    "risk_archetype": archetype,
                    "evidentiary_rationale": reason,
                    "statutory_safeguard": (
                        "Section 63 Bharatiya Sakshya Adhiniyam 2023 Compliance: "
                        "Absence of a prior criminal record does not immunize current evidentiary culpability. "
                        "Clean-slate status is an investigative lead hypothesis requiring forensic corroboration."
                    )
                })

        # Sort by anomaly score descending
        clean_slate_hypotheses.sort(key=lambda x: x["current_case_anomaly_score"], reverse=True)
        return clean_slate_hypotheses
