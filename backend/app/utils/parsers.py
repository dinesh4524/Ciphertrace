import io
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from app.core.exceptions import IngestionParsingError


def clean_phone_number(number_str: Optional[str]) -> Optional[str]:
    """Standardizes Indian phone numbers into 10-digit or +91-10-digit format."""
    if not number_str:
        return None
    cleaned = re.sub(r"[^\d+]", "", str(number_str).strip())
    # If starts with 0 and 11 digits, strip leading 0
    if cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    # If starts with 91 without plus, add +91
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = "+" + cleaned
    return cleaned


def parse_timestamp_flexible(ts_str: Optional[str]) -> Optional[datetime]:
    """Tries parsing multiple common timestamp formats from Indian CDRs and bank statements."""
    if not ts_str or pd.isna(ts_str):
        return None
    ts_clean = str(ts_str).strip()
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%d-%m-%Y %I:%M:%S %p",
        "%d/%m/%Y %I:%M:%S %p",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(ts_clean, fmt)
        except ValueError:
            continue
    try:
        # Fallback to dateutil or pandas parse
        return pd.to_datetime(ts_clean).to_pydatetime()
    except Exception:
        return None


def parse_cdr_csv(content: bytes) -> List[Dict[str, Any]]:
    """
    Parses CDR (Call Detail Record) CSV bytes into normalized dictionary list.
    Supports varying header naming conventions used by Indian telecom providers (Airtel, Jio, Vi, BSNL).
    """
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise IngestionParsingError("CDR CSV", f"Could not read CSV structure: {str(e)}")

    if df.empty:
        return []

    # Normalize column names
    col_map = {}
    for col in df.columns:
        c_lower = col.strip().lower().replace(" ", "_").replace(".", "").replace("-", "_")
        col_map[col] = c_lower
    df.rename(columns=col_map, inplace=True)

    records: List[Dict[str, Any]] = []

    # Map candidate column names
    def get_field(row, candidates, default=None):
        for c in candidates:
            if c in row and pd.notna(row[c]):
                return str(row[c]).strip()
        return default

    for _, row in df.iterrows():
        calling_num = clean_phone_number(get_field(row, ["calling_number", "calling_no", "a_party", "source_number", "from_number", "originating_number", "a_number"]))
        called_num = clean_phone_number(get_field(row, ["called_number", "called_no", "b_party", "destination_number", "to_number", "terminating_number", "b_number"]))
        
        if not calling_num and not called_num:
            continue

        raw_time = get_field(row, ["start_time", "call_date_time", "date_time", "timestamp", "call_time", "call_date", "time"])
        parsed_time = parse_timestamp_flexible(raw_time)

        raw_dur = get_field(row, ["duration_sec", "duration", "call_duration", "duration_seconds", "dur_sec"], "0")
        try:
            duration_sec = int(float(raw_dur))
        except (ValueError, TypeError):
            duration_sec = 0

        raw_lat = get_field(row, ["latitude", "lat", "tower_lat", "cell_lat"])
        raw_lon = get_field(row, ["longitude", "long", "lon", "tower_lon", "cell_lon"])
        lat = float(raw_lat) if raw_lat and re.match(r"^-?\d+(\.\d+)?$", raw_lat) else None
        lon = float(raw_lon) if raw_lon and re.match(r"^-?\d+(\.\d+)?$", raw_lon) else None

        record = {
            "calling_number": calling_num or "UNKNOWN",
            "called_number": called_num or "UNKNOWN",
            "imei": get_field(row, ["imei", "imei_number", "calling_imei", "a_imei"]),
            "imsi": get_field(row, ["imsi", "imsi_number", "calling_imsi", "a_imsi"]),
            "call_type": (get_field(row, ["call_type", "type", "service_type", "call_direction"]) or "VOICE_CALL").upper(),
            "start_time": parsed_time or datetime.utcnow(),
            "duration_sec": duration_sec,
            "cell_tower_id": get_field(row, ["cell_tower_id", "first_cgi", "cell_id", "cgi", "site_id", "tower_id"]),
            "latitude": lat,
            "longitude": lon,
            "provider": get_field(row, ["provider", "telecom_operator", "tsp", "operator", "circle"]),
            "raw_payload": row.to_dict()
        }
        records.append(record)

    return records


def parse_financial_csv(content: bytes) -> List[Dict[str, Any]]:
    """
    Parses Bank Transaction CSV / Hawala / Mule ledger data.
    """
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise IngestionParsingError("Financial CSV", f"Could not read CSV structure: {str(e)}")

    if df.empty:
        return []

    col_map = {col: col.strip().lower().replace(" ", "_").replace(".", "").replace("-", "_") for col in df.columns}
    df.rename(columns=col_map, inplace=True)

    def get_field(row, candidates, default=None):
        for c in candidates:
            if c in row and pd.notna(row[c]):
                return str(row[c]).strip()
        return default

    records: List[Dict[str, Any]] = []

    for _, row in df.iterrows():
        sender_acc = get_field(row, ["sender_account", "source_account", "from_account", "remitter_acc", "account_no", "debit_account"])
        receiver_acc = get_field(row, ["receiver_account", "beneficiary_account", "to_account", "credit_account", "destination_acc"])
        
        raw_amt = get_field(row, ["amount", "txn_amount", "transaction_amount", "debit_amount", "credit_amount", "amt"], "0")
        raw_amt_clean = re.sub(r"[^\d.]", "", raw_amt)
        try:
            amount = float(raw_amt_clean) if raw_amt_clean else 0.0
        except ValueError:
            amount = 0.0

        raw_time = get_field(row, ["timestamp", "txn_date", "transaction_date", "value_date", "date_time", "date"])
        parsed_time = parse_timestamp_flexible(raw_time)

        record = {
            "sender_account": sender_acc or "UNKNOWN_SENDER",
            "receiver_account": receiver_acc or "UNKNOWN_RECEIVER",
            "sender_bank": get_field(row, ["sender_bank", "remitter_bank", "source_bank", "bank_name"]),
            "receiver_bank": get_field(row, ["receiver_bank", "beneficiary_bank", "destination_bank"]),
            "amount": amount,
            "txn_type": (get_field(row, ["txn_type", "type", "transaction_type", "cr_dr"]) or "NEFT/RTGS/IMPS").upper(),
            "utr_reference": get_field(row, ["utr_reference", "utr", "reference_no", "ref_no", "txn_id", "transaction_id", "cheque_no"]),
            "timestamp": parsed_time or datetime.utcnow(),
            "channel": get_field(row, ["channel", "mode", "payment_gateway", "upi_handle", "device_id"]),
            "remarks": get_field(row, ["remarks", "narration", "description", "particulars"]),
            "raw_payload": row.to_dict()
        }
        records.append(record)

    return records


def parse_fir_payload(raw_content: bytes, is_json: bool = False) -> Dict[str, Any]:
    """
    Parses FIR document payload (either structured JSON or Unstructured Police Text).
    Extracts core statutory and incident fields.
    """
    if is_json:
        try:
            data = json.loads(raw_content.decode("utf-8"))
            return {
                "fir_number": data.get("fir_number", "FIR/UNKNOWN/2026"),
                "police_station": data.get("police_station", "Unknown PS"),
                "district": data.get("district", "Unknown District"),
                "state": data.get("state", "Unknown State"),
                "sections_invoked": data.get("sections_invoked", []),
                "incident_date": parse_timestamp_flexible(data.get("incident_date")),
                "filing_date": parse_timestamp_flexible(data.get("filing_date")) or datetime.utcnow(),
                "complainant_details": data.get("complainant_details", {}),
                "accused_named": data.get("accused_named", []),
                "informant_narrative": data.get("informant_narrative", ""),
                "raw_text": data.get("raw_text", json.dumps(data, indent=2))
            }
        except Exception as e:
            raise IngestionParsingError("FIR JSON", f"Invalid JSON format: {str(e)}")
    else:
        # Text extraction heuristics for Indian FIR format
        text = raw_content.decode("utf-8", errors="replace")
        
        # Regex heuristics
        fir_match = re.search(r"(?:FIR\s*(?:No\.?|Number)?\s*[:\-]?\s*)([A-Za-z0-9\/\-_]+)", text, re.IGNORECASE)
        fir_number = fir_match.group(1).strip() if fir_match else f"FIR/{datetime.utcnow().year}/UNASSIGNED"
        
        ps_match = re.search(r"(?:Police\s*Station|P\.S\.)\s*[:\-]?\s*([A-Za-z\s]+?)(?:District|Dist|\n|,)", text, re.IGNORECASE)
        police_station = ps_match.group(1).strip() if ps_match else "Police Station Not Specified"

        dist_match = re.search(r"(?:District|Dist\.?)\s*[:\-]?\s*([A-Za-z\s]+?)(?:State|\n|,)", text, re.IGNORECASE)
        district = dist_match.group(1).strip() if dist_match else "Unspecified District"

        # Extract legal sections (BNS / IPC / IT Act / NDPS)
        sections = re.findall(r"(?:u\/s|under\s+section|section|sec\.?)\s*([0-9A-Za-z,\s\(\)\/\-]+?)(?:IPC|BNS|IT\s+Act|NDPS|CrPC|BNSS)", text, re.IGNORECASE)
        clean_sections = [s.strip() for s in sections if len(s.strip()) > 0]

        return {
            "fir_number": fir_number,
            "police_station": police_station,
            "district": district,
            "state": "State of India",
            "sections_invoked": clean_sections,
            "incident_date": None,
            "filing_date": datetime.utcnow(),
            "complainant_details": {},
            "accused_named": [],
            "informant_narrative": text[:5000],
            "raw_text": text
        }
