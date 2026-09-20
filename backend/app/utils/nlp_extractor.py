import re
from typing import Any, Dict, List, Optional, Tuple


class NLPEntity:
    def __init__(
        self,
        entity_type: str,
        raw_value: str,
        normalized_value: str,
        confidence: float = 1.0,
        char_start: Optional[int] = None,
        char_end: Optional[int] = None,
        context_snippet: Optional[str] = None,
        extraction_method: str = "REGEX_RULE",
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.entity_type = entity_type
        self.raw_value = raw_value.strip()
        self.normalized_value = normalized_value.strip()
        self.confidence = confidence
        self.char_start = char_start
        self.char_end = char_end
        self.context_snippet = context_snippet
        self.extraction_method = extraction_method
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "raw_value": self.raw_value,
            "normalized_value": self.normalized_value,
            "confidence": self.confidence,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "context_snippet": self.context_snippet,
            "extraction_method": self.extraction_method,
            "metadata": self.metadata
        }


class NLPRelationship:
    def __init__(
        self,
        source_value: str,
        target_value: str,
        relationship_type: str,
        relationship_nature: str = "OBSERVED",
        confidence: float = 0.9,
        context_snippet: Optional[str] = None,
        extraction_method: str = "PATTERN_HEURISTIC",
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.source_value = source_value.strip()
        self.target_value = target_value.strip()
        self.relationship_type = relationship_type
        self.relationship_nature = relationship_nature
        self.confidence = confidence
        self.context_snippet = context_snippet
        self.extraction_method = extraction_method
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_value": self.source_value,
            "target_value": self.target_value,
            "relationship_type": self.relationship_type,
            "relationship_nature": self.relationship_nature,
            "confidence": self.confidence,
            "context_snippet": self.context_snippet,
            "extraction_method": self.extraction_method,
            "metadata": self.metadata
        }


class HybridNLPExtractionEngine:
    """
    Production-oriented Information Extraction Pipeline specialized for Indian Criminal Intelligence.
    Combines high-precision regex engines, contextual pattern analyzers, and linguistic heuristics.
    """

    # 1. Regex Pattern Definitions
    PHONE_REGEX = re.compile(r'(?:\+?91[-.\s]?)?[6-9]\d{9}\b')
    IMEI_REGEX = re.compile(r'\b(?<!\d)(?:86\d{13}|35\d{13}|01\d{13}|\d{15})(?!\d)\b')
    IMSI_REGEX = re.compile(r'\b404\d{12}\b|\b405\d{12}\b')
    PAN_REGEX = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b')
    AADHAAR_REGEX = re.compile(r'\b[2-9]\d{3}\s\d{4}\s\d{4}\b|\b[2-9]\d{11}\b')
    INDIAN_VEHICLE_REGEX = re.compile(r'\b(?:DL|HR|MH|KA|TS|AP|UP|WB|TN|KL|GJ|RJ|PB|MP|CH|JK|BR|JH|OD)[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}\b', re.IGNORECASE)
    UPI_REGEX = re.compile(r'\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b')
    CRYPTO_BTC_REGEX = re.compile(r'\b(?:1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b')
    CRYPTO_ETH_REGEX = re.compile(r'\b0x[a-fA-F0-9]{40}\b')
    CRYPTO_TRON_REGEX = re.compile(r'\bT[A-Za-z1-9]{33}\b')
    
    BANK_ACCOUNT_PATTERN = re.compile(r'\b(?:SBI|HDFC|ICICI|AXIS|KOTAK|PNB|BOB|CANARA|UNION)[-_\s]?\d{6,16}\b|\bAccount\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d{9,18})\b', re.IGNORECASE)
    UTR_REGEX = re.compile(r'\b(?:UTR|UTRN|REF)[0-9A-Z]{8,22}\b|\b[A-Z]{4}[0-9]{10,16}\b', re.IGNORECASE)
    
    LEGAL_SECTIONS_REGEX = re.compile(
        r'\b(?:BNS\s*(?:Section|Sec\.?)?\s*([0-9A-Za-z\(\)]+)|(?:IPC|Indian\s+Penal\s+Code)\s*(?:Section|Sec\.?)?\s*([0-9A-Za-z\(\)]+)|(?:IT\s+Act|Information\s+Technology\s+Act)\s*(?:Section|Sec\.?)?\s*([0-9A-Za-z]+)|(?:NDPS|UAPA|Arms\s+Act)\s*(?:Section|Sec\.?)?\s*([0-9A-Za-z]+))\b',
        re.IGNORECASE
    )

    KNOWN_BANKS = [
        "State Bank of India", "SBI", "HDFC Bank", "HDFC", "ICICI Bank", "ICICI",
        "Kotak Mahindra Bank", "Kotak", "Axis Bank", "Punjab National Bank", "PNB",
        "Bank of Baroda", "Canara Bank", "Union Bank of India", "Federal Bank", "Yes Bank"
    ]

    KNOWN_LOCATIONS = [
        "Delhi", "New Delhi", "Connaught Place", "Mandir Marg", "Noida", "Sector 62", "Gurgaon", "Cyber City",
        "Mumbai", "Andheri", "Bandra", "Kolkata", "Park Street", "Hyderabad", "Gachibowli", "Cyberabad",
        "Bangalore", "Whitefield", "Mewat", "Nuh", "Alwar", "Jamtara", "Aligarh", "Chandni Chowk", "Lodhi Colony"
    ]

    @classmethod
    def get_sentence_context(cls, text: str, start: int, end: int, window: int = 120) -> str:
        s = max(0, start - window)
        e = min(len(text), end + window)
        snippet = text[s:e].replace('\n', ' ').strip()
        return f"...{snippet}..."

    @classmethod
    def extract_entities(cls, text: str) -> List[NLPEntity]:
        """
        Extracts all recognized criminal intelligence entities from input text.
        """
        if not text:
            return []

        entities: List[NLPEntity] = []

        # 1. Phone Numbers
        for m in cls.PHONE_REGEX.finditer(text):
            val = m.group(0).strip()
            # Normalize to +91-XXXXXXXXXX
            digits = re.sub(r'[^\d]', '', val)
            if len(digits) == 10:
                norm = f"+91{digits}"
            elif len(digits) == 12 and digits.startswith('91'):
                norm = f"+{digits}"
            else:
                norm = val

            entities.append(NLPEntity(
                entity_type="PHONE_NUMBER",
                raw_value=val,
                normalized_value=norm,
                confidence=0.98,
                char_start=m.start(),
                char_end=m.end(),
                context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                extraction_method="REGEX_TELECOM"
            ))

        # 2. IMEIs
        for m in cls.IMEI_REGEX.finditer(text):
            val = m.group(0).strip()
            entities.append(NLPEntity(
                entity_type="DEVICE",
                raw_value=val,
                normalized_value=f"IMEI:{val}",
                confidence=0.96,
                char_start=m.start(),
                char_end=m.end(),
                context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                extraction_method="REGEX_IMEI",
                metadata={"device_type": "IMEI_IDENTIFIER"}
            ))

        # 3. IMSIs
        for m in cls.IMSI_REGEX.finditer(text):
            val = m.group(0).strip()
            entities.append(NLPEntity(
                entity_type="DEVICE",
                raw_value=val,
                normalized_value=f"IMSI:{val}",
                confidence=0.95,
                char_start=m.start(),
                char_end=m.end(),
                context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                extraction_method="REGEX_IMSI",
                metadata={"device_type": "IMSI_SIM_IDENTIFIER"}
            ))

        # 4. Bank Accounts & Mule Wallets
        for m in cls.BANK_ACCOUNT_PATTERN.finditer(text):
            val = m.group(0).strip()
            entities.append(NLPEntity(
                entity_type="FINANCIAL_ACCOUNT",
                raw_value=val,
                normalized_value=val.upper().replace(" ", "_"),
                confidence=0.92,
                char_start=m.start(),
                char_end=m.end(),
                context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                extraction_method="REGEX_BANKING",
                metadata={"account_nature": "MULE_OR_SETTLEMENT_ACCOUNT"}
            ))

        # 5. UPI Handles / VPAs
        for m in cls.UPI_REGEX.finditer(text):
            val = m.group(0).strip()
            if not val.endswith('.com') and not val.endswith('.org') and '@' in val:
                entities.append(NLPEntity(
                    entity_type="FINANCIAL_ACCOUNT",
                    raw_value=val,
                    normalized_value=val.lower(),
                    confidence=0.90,
                    char_start=m.start(),
                    char_end=m.end(),
                    context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                    extraction_method="REGEX_UPI",
                    metadata={"vpa_handle": True}
                ))

        # 6. Crypto Addresses
        for reg, chain in [(cls.CRYPTO_BTC_REGEX, "BTC"), (cls.CRYPTO_ETH_REGEX, "ETH"), (cls.CRYPTO_TRON_REGEX, "TRON_USDT")]:
            for m in reg.finditer(text):
                val = m.group(0).strip()
                entities.append(NLPEntity(
                    entity_type="FINANCIAL_ACCOUNT",
                    raw_value=val,
                    normalized_value=f"{chain}:{val}",
                    confidence=0.95,
                    char_start=m.start(),
                    char_end=m.end(),
                    context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                    extraction_method=f"REGEX_CRYPTO_{chain}",
                    metadata={"blockchain": chain}
                ))

        # 7. Indian Vehicle Registration Numbers
        for m in cls.INDIAN_VEHICLE_REGEX.finditer(text):
            val = m.group(0).strip()
            norm_vehicle = re.sub(r'[^A-Za-z0-9]', '', val).upper()
            entities.append(NLPEntity(
                entity_type="VEHICLE",
                raw_value=val,
                normalized_value=norm_vehicle,
                confidence=0.93,
                char_start=m.start(),
                char_end=m.end(),
                context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                extraction_method="REGEX_VEHICLE"
            ))

        # 8. Legal Sections (BNS / IPC / IT Act / NDPS)
        for m in cls.LEGAL_SECTIONS_REGEX.finditer(text):
            val = m.group(0).strip()
            entities.append(NLPEntity(
                entity_type="LEGAL_SECTION",
                raw_value=val,
                normalized_value=val.upper().replace("  ", " "),
                confidence=0.96,
                char_start=m.start(),
                char_end=m.end(),
                context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                extraction_method="REGEX_LEGAL"
            ))

        # 9. Known Locations
        for loc in cls.KNOWN_LOCATIONS:
            pattern = re.compile(r'\b' + re.escape(loc) + r'\b', re.IGNORECASE)
            for m in pattern.finditer(text):
                entities.append(NLPEntity(
                    entity_type="LOCATION",
                    raw_value=m.group(0),
                    normalized_value=loc.upper(),
                    confidence=0.90,
                    char_start=m.start(),
                    char_end=m.end(),
                    context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                    extraction_method="GAZETTEER_LOCATION"
                ))

        # 10. Known Organizations & Banks
        for org in cls.KNOWN_BANKS:
            pattern = re.compile(r'\b' + re.escape(org) + r'\b', re.IGNORECASE)
            for m in pattern.finditer(text):
                entities.append(NLPEntity(
                    entity_type="ORGANIZATION",
                    raw_value=m.group(0),
                    normalized_value=org.upper(),
                    confidence=0.88,
                    char_start=m.start(),
                    char_end=m.end(),
                    context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                    extraction_method="GAZETTEER_ORG"
                ))

        # 11. Suspect & Accused Person Names (with alias "@" matching)
        # Matches: "Tariq Ahmed @ Tiger @ T-Mobile", "Name: Imran Khan", "Accused: X"
        person_alias_pattern = re.compile(
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*(?:@|alias|\b(?:alias|s/o|d/o|w/o)\b)\s*([A-Za-z0-9_@\s]+?)(?:,|\.|\n|$|\bAge\b|\bResident\b)',
            re.IGNORECASE
        )
        for m in person_alias_pattern.finditer(text):
            primary_name = m.group(1).strip()
            aliases = m.group(2).strip()
            full_val = f"{primary_name} @ {aliases}"
            entities.append(NLPEntity(
                entity_type="PERSON",
                raw_value=full_val,
                normalized_value=primary_name.title(),
                confidence=0.94,
                char_start=m.start(),
                char_end=m.end(),
                context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                extraction_method="PATTERN_PERSON_ALIAS",
                metadata={"alias_list": [a.strip() for a in aliases.split('@')]}
            ))

        # Standalone name markers
        named_patterns = [
            re.compile(r'(?:Name|Accused|Person\s+Examined|Informant|Complainant)\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', re.IGNORECASE),
            re.compile(r'\b(?:Sri|Smt|Inspector|Dr\.|Advocate|Shri)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b')
        ]
        for p in named_patterns:
            for m in p.finditer(text):
                val = m.group(1).strip()
                if not any(e.raw_value.startswith(val) for e in entities if e.entity_type == "PERSON"):
                    entities.append(NLPEntity(
                        entity_type="PERSON",
                        raw_value=val,
                        normalized_value=val.title(),
                        confidence=0.89,
                        char_start=m.start(),
                        char_end=m.end(),
                        context_snippet=cls.get_sentence_context(text, m.start(), m.end()),
                        extraction_method="PATTERN_PERSON_TITLE"
                    ))

        # Deduplicate overlapping exact spans
        deduped: List[NLPEntity] = []
        seen = set()
        for e in entities:
            key = (e.entity_type, e.normalized_value, e.char_start)
            if key not in seen:
                seen.add(key)
                deduped.append(e)

        return deduped

    @classmethod
    def extract_relationships(cls, text: str, entities: List[NLPEntity]) -> List[NLPRelationship]:
        """
        Infers grounded relationships between co-occurring entities in document sentences.
        """
        relationships: List[NLPRelationship] = []
        if not text or len(entities) < 2:
            return []

        persons = [e for e in entities if e.entity_type == "PERSON"]
        phones = [e for e in entities if e.entity_type == "PHONE_NUMBER"]
        devices = [e for e in entities if e.entity_type == "DEVICE"]
        accounts = [e for e in entities if e.entity_type == "FINANCIAL_ACCOUNT"]
        sections = [e for e in entities if e.entity_type == "LEGAL_SECTION"]
        locations = [e for e in entities if e.entity_type == "LOCATION"]

        # 1. Person <-> Uses Phone / Device
        for p in persons:
            for ph in phones:
                # If in close proximity (within 300 characters in text)
                if abs((p.char_start or 0) - (ph.char_start or 0)) < 300:
                    relationships.append(NLPRelationship(
                        source_value=p.normalized_value,
                        target_value=ph.normalized_value,
                        relationship_type="USES_PHONE_NUMBER",
                        relationship_nature="OBSERVED",
                        confidence=0.91,
                        context_snippet=ph.context_snippet,
                        extraction_method="PROXIMITY_PERSON_PHONE"
                    ))

            for d in devices:
                if abs((p.char_start or 0) - (d.char_start or 0)) < 300:
                    relationships.append(NLPRelationship(
                        source_value=p.normalized_value,
                        target_value=d.normalized_value,
                        relationship_type="OPERATES_HANDSET_DEVICE",
                        relationship_nature="OBSERVED",
                        confidence=0.88,
                        context_snippet=d.context_snippet,
                        extraction_method="PROXIMITY_PERSON_DEVICE"
                    ))

            for acc in accounts:
                if abs((p.char_start or 0) - (acc.char_start or 0)) < 350:
                    relationships.append(NLPRelationship(
                        source_value=p.normalized_value,
                        target_value=acc.normalized_value,
                        relationship_type="CONTROLS_BANK_ACCOUNT",
                        relationship_nature="OBSERVED",
                        confidence=0.87,
                        context_snippet=acc.context_snippet,
                        extraction_method="PROXIMITY_PERSON_ACCOUNT"
                    ))

            for loc in locations:
                if abs((p.char_start or 0) - (loc.char_start or 0)) < 250:
                    relationships.append(NLPRelationship(
                        source_value=p.normalized_value,
                        target_value=loc.normalized_value,
                        relationship_type="OPERATES_IN_LOCATION",
                        relationship_nature="OBSERVED",
                        confidence=0.85,
                        context_snippet=loc.context_snippet,
                        extraction_method="PROXIMITY_PERSON_LOCATION"
                    ))

            for sec in sections:
                relationships.append(NLPRelationship(
                    source_value=p.normalized_value,
                    target_value=sec.normalized_value,
                    relationship_type="BOOKED_UNDER_SECTION",
                    relationship_nature="OBSERVED",
                    confidence=0.95,
                    context_snippet=sec.context_snippet,
                    extraction_method="STATUTORY_SECTION_LINK"
                ))

        # 2. Bank Account -> Bank Account (Transaction transfers)
        if len(accounts) >= 2:
            for i in range(len(accounts) - 1):
                acc1 = accounts[i]
                acc2 = accounts[i + 1]
                if abs((acc1.char_start or 0) - (acc2.char_start or 0)) < 200:
                    relationships.append(NLPRelationship(
                        source_value=acc1.normalized_value,
                        target_value=acc2.normalized_value,
                        relationship_type="TRANSFERS_FUNDS_TO",
                        relationship_nature="OBSERVED",
                        confidence=0.89,
                        context_snippet=acc1.context_snippet,
                        extraction_method="CONSECUTIVE_TRANSACTION_FLOW"
                    ))

        # Deduplicate relationships
        dedup_rels: List[NLPRelationship] = []
        seen = set()
        for r in relationships:
            key = (r.source_value, r.target_value, r.relationship_type)
            if key not in seen:
                seen.add(key)
                dedup_rels.append(r)

        return dedup_rels
