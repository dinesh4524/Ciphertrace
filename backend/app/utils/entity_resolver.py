import re
from typing import Any, Dict, List, Optional, Set, Tuple


class CandidateMatch:
    def __init__(
        self,
        source_id: str,
        target_id: str,
        source_value: str,
        target_value: str,
        entity_type: str,
        match_type: str,
        confidence_score: float,
        feature_scores: Dict[str, float],
        merge_directive: str = "MERGE_AS_CANONICAL"
    ):
        self.source_id = source_id
        self.target_id = target_id
        self.source_value = source_value
        self.target_value = target_value
        self.entity_type = entity_type
        self.match_type = match_type
        self.confidence_score = round(confidence_score, 4)
        self.feature_scores = feature_scores
        self.merge_directive = merge_directive

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "source_value": self.source_value,
            "target_value": self.target_value,
            "entity_type": self.entity_type,
            "match_type": self.match_type,
            "confidence_score": self.confidence_score,
            "feature_scores": self.feature_scores,
            "merge_directive": self.merge_directive
        }


class EntityResolutionEngine:
    """
    Advanced Multi-Strategy Entity Resolution Engine for Indian Criminal Intelligence.
    Combines phonetic algorithms, token-sort fuzzy matching, initials expansion,
    transliteration equivalence tables, and telecom/financial exact identifiers.
    """

    # Transliteration and spelling variations common in Indian police records
    NAME_EQUIVALENCE_CLUSTERS = [
        {"mohd", "mohammad", "mohammed", "md", "muhammad", "mohd."},
        {"chowdhury", "choudhary", "chaudhary", "choudhury", "chaudhry"},
        {"verma", "varma"},
        {"sharma", "sarma"},
        {"khan", "qan"},
        {"aggarwal", "agarwal", "agrawal"},
        {"yadav", "jadhav"},
        {"singh", "sinh"},
        {"sheikh", "shaikh", "cheikh"},
        {"hussain", "husain", "hussayn"},
        {"ahmed", "ahmad"},
        {"ansari", "ansary"},
        {"patil", "patel"},
        {"gupta", "guptha"},
        {"reddy", "reddi"},
        {"nair", "nayyar", "nayar"},
        {"tiwari", "tewari", "trivedi"},
        {"mishra", "misra"}
    ]

    @staticmethod
    def clean_text(s: str) -> str:
        if not s:
            return ""
        s = s.lower().strip()
        s = re.sub(r'[^a-z0-9\s@\.\-]', ' ', s)
        return re.sub(r'\s+', ' ', s).strip()

    @staticmethod
    def calculate_levenshtein_similarity(s1: str, s2: str) -> float:
        if s1 == s2:
            return 1.0
        if not s1 or not s2:
            return 0.0

        len1, len2 = len(s1), len(s2)
        dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]

        for i in range(len1 + 1):
            dp[i][0] = i
        for j in range(len2 + 1):
            dp[0][j] = j

        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                cost = 0 if s1[i - 1] == s2[j - 1] else 1
                dp[i][j] = min(
                    dp[i - 1][j] + 1,      # deletion
                    dp[i][j - 1] + 1,      # insertion
                    dp[i - 1][j - 1] + cost # substitution
                )

        dist = dp[len1][len2]
        max_len = max(len1, len2)
        return 1.0 - (dist / max_len)

    @staticmethod
    def calculate_jaro_winkler(s1: str, s2: str) -> float:
        if s1 == s2:
            return 1.0
        if not s1 or not s2:
            return 0.0

        len1, len2 = len(s1), len(s2)
        match_bound = max(len1, len2) // 2 - 1
        if match_bound < 0:
            match_bound = 0

        matches1 = [False] * len1
        matches2 = [False] * len2
        num_matches = 0

        for i in range(len1):
            start = max(0, i - match_bound)
            end = min(i + match_bound + 1, len2)
            for j in range(start, end):
                if matches2[j] or s1[i] != s2[j]:
                    continue
                matches1[i] = True
                matches2[j] = True
                num_matches += 1
                break

        if num_matches == 0:
            return 0.0

        transpositions = 0
        k = 0
        for i in range(len1):
            if not matches1[i]:
                continue
            while not matches2[k]:
                k += 1
            if s1[i] != s2[k]:
                transpositions += 1
            k += 1

        transpositions //= 2
        jaro = (
            (num_matches / len1) +
            (num_matches / len2) +
            ((num_matches - transpositions) / num_matches)
        ) / 3.0

        # Prefix bonus (up to 4 chars)
        prefix_len = 0
        for i in range(min(4, min(len1, len2))):
            if s1[i] == s2[i]:
                prefix_len += 1
            else:
                break

        return jaro + (prefix_len * 0.1 * (1.0 - jaro))

    @staticmethod
    def soundex(name: str) -> str:
        """Standard Soundex representation for phonetic matching."""
        if not name:
            return ""
        name = name.upper()
        clean_name = re.sub(r'[^A-Z]', '', name)
        if not clean_name:
            return ""

        mapping = {
            'B': '1', 'F': '1', 'P': '1', 'V': '1',
            'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
            'D': '3', 'T': '3',
            'L': '4',
            'M': '5', 'N': '5',
            'R': '6'
        }

        first_letter = clean_name[0]
        tail = clean_name[1:]
        encoded = ""
        prev_code = mapping.get(first_letter, '0')

        for char in tail:
            code = mapping.get(char, '0')
            if code != '0' and code != prev_code:
                encoded += code
            prev_code = code

        soundex_code = (first_letter + encoded).ljust(4, '0')[:4]
        return soundex_code

    @classmethod
    def token_sort_similarity(cls, s1: str, s2: str) -> float:
        t1 = " ".join(sorted(s1.lower().split()))
        t2 = " ".join(sorted(s2.lower().split()))
        return cls.calculate_jaro_winkler(t1, t2)

    @classmethod
    def check_transliteration_match(cls, w1: str, w2: str) -> bool:
        w1_l, w2_l = w1.lower(), w2.lower()
        if w1_l == w2_l:
            return True
        for cluster in cls.NAME_EQUIVALENCE_CLUSTERS:
            if w1_l in cluster and w2_l in cluster:
                return True
        return False

    @classmethod
    def match_person_initials(cls, name1: str, name2: str) -> Tuple[bool, float]:
        """
        Detects if 'R. Sharma' or 'R K Verma' matches 'Ramesh Sharma' or 'Rajesh Kumar Verma'.
        """
        parts1 = [p.replace('.', '') for p in name1.lower().split() if p]
        parts2 = [p.replace('.', '') for p in name2.lower().split() if p]

        if len(parts1) < 2 or len(parts2) < 2:
            return False, 0.0

        # Last name match check
        last1, last2 = parts1[-1], parts2[-1]
        last_sim = cls.calculate_jaro_winkler(last1, last2)
        if last_sim < 0.85 and not cls.check_transliteration_match(last1, last2):
            return False, 0.0

        # Initials check for leading parts
        shorter, longer = (parts1[:-1], parts2[:-1]) if len(parts1) <= len(parts2) else (parts2[:-1], parts1[:-1])
        matched_initials = 0

        for s, l in zip(shorter, longer):
            if len(s) == 1 and l.startswith(s):
                matched_initials += 1
            elif len(l) == 1 and s.startswith(l):
                matched_initials += 1
            elif cls.check_transliteration_match(s, l):
                matched_initials += 1
            elif cls.calculate_jaro_winkler(s, l) > 0.85:
                matched_initials += 1

        if matched_initials >= len(shorter):
            score = 0.80 + (0.15 * last_sim)
            return True, score

        return False, 0.0

    @classmethod
    def extract_aliases(cls, raw_value: str, metadata: Optional[Dict[str, Any]] = None) -> Set[str]:
        aliases = set()
        if "@" in raw_value:
            for part in raw_value.split("@"):
                p = part.strip()
                if p:
                    aliases.add(p.lower())
        
        meta = metadata or {}
        if "alias_list" in meta and isinstance(meta["alias_list"], list):
            for a in meta["alias_list"]:
                if a and isinstance(a, str):
                    aliases.add(a.strip().lower())
        return aliases

    @classmethod
    def compare_persons(
        cls,
        p1_val: str,
        p2_val: str,
        p1_meta: Optional[Dict[str, Any]] = None,
        p2_meta: Optional[Dict[str, Any]] = None
    ) -> Tuple[float, str, Dict[str, float]]:
        """
        Calculates multi-feature matching score between two Person entities.
        """
        clean1 = cls.clean_text(p1_val)
        clean2 = cls.clean_text(p2_val)

        if clean1 == clean2:
            return 1.0, "EXACT_PERSON_MATCH", {"exact_match": 1.0}

        # 1. Alias Cross-Matching
        aliases1 = cls.extract_aliases(p1_val, p1_meta)
        aliases1.add(clean1)
        aliases2 = cls.extract_aliases(p2_val, p2_meta)
        aliases2.add(clean2)

        alias_overlap = aliases1.intersection(aliases2)
        if len(alias_overlap) > 0:
            return 0.96, "PERSON_ALIAS_CROSS_MATCH", {
                "alias_match": 1.0,
                "matched_alias": list(alias_overlap)[0]
            }

        # Check fuzzy alias matches
        max_alias_sim = 0.0
        for a1 in aliases1:
            for a2 in aliases2:
                sim = cls.calculate_jaro_winkler(a1, a2)
                if sim > max_alias_sim:
                    max_alias_sim = sim

        if max_alias_sim >= 0.90:
            return 0.92, "FUZZY_ALIAS_MATCH", {"max_alias_sim": max_alias_sim}

        # 2. Transliteration / Multilingual Name Variations
        words1 = clean1.split()
        words2 = clean2.split()
        translit_matches = 0
        if len(words1) == len(words2) and len(words1) >= 2:
            for w1, w2 in zip(words1, words2):
                if cls.check_transliteration_match(w1, w2):
                    translit_matches += 1
            if translit_matches == len(words1):
                return 0.94, "MULTILINGUAL_TRANSLIT_MATCH", {"translit_match": 1.0}

        # 3. Initials Expansion Match
        is_initial, init_score = cls.match_person_initials(clean1, clean2)
        if is_initial:
            return init_score, "INITIALS_EXPANSION_MATCH", {"initials_score": init_score}

        # 4. Phonetic & Fuzzy String Similarity
        jw_score = cls.calculate_jaro_winkler(clean1, clean2)
        token_sort_score = cls.token_sort_similarity(clean1, clean2)
        lev_score = cls.calculate_levenshtein_similarity(clean1, clean2)

        # Soundex match
        snd1 = [cls.soundex(w) for w in words1 if w]
        snd2 = [cls.soundex(w) for w in words2 if w]
        phonetic_match = (snd1 == snd2 and len(snd1) > 0)
        phonetic_score = 0.90 if phonetic_match else 0.0

        # Weighted aggregate confidence
        combined_score = (
            (jw_score * 0.40) +
            (token_sort_score * 0.35) +
            (lev_score * 0.15) +
            (0.10 if phonetic_match else 0.0)
        )

        match_type = "PHONETIC_FUZZY" if phonetic_match else "STRING_SIMILARITY"
        features = {
            "jaro_winkler": round(jw_score, 4),
            "token_sort": round(token_sort_score, 4),
            "levenshtein": round(lev_score, 4),
            "phonetic_match": 1.0 if phonetic_match else 0.0
        }

        return combined_score, match_type, features

    @staticmethod
    def compare_phone_numbers(phone1: str, phone2: str) -> Tuple[float, str, Dict[str, float]]:
        digits1 = re.sub(r'\D', '', phone1)
        digits2 = re.sub(r'\D', '', phone2)

        if not digits1 or not digits2:
            return 0.0, "NO_MATCH", {}

        # Last 10 digits match for Indian mobile numbers
        last10_1 = digits1[-10:] if len(digits1) >= 10 else digits1
        last10_2 = digits2[-10:] if len(digits2) >= 10 else digits2

        if last10_1 == last10_2:
            return 1.0, "PHONE_EXACT_MATCH", {"digits_matched": 10}

        return 0.0, "PHONE_MISMATCH", {}

    @staticmethod
    def compare_devices(dev1: str, dev2: str) -> Tuple[float, str, Dict[str, float]]:
        clean1 = re.sub(r'[^A-Za-z0-9]', '', dev1).upper()
        clean2 = re.sub(r'[^A-Za-z0-9]', '', dev2).upper()

        if clean1 == clean2:
            return 1.0, "DEVICE_HARDWARE_EXACT", {"exact": 1.0}

        # Check IMEI TAC prefix (first 8 digits)
        if len(clean1) >= 15 and len(clean2) >= 15:
            if clean1[:8] == clean2[:8]:
                return 0.70, "SAME_HANDSET_MODEL_TAC", {"tac_matched": 8}

        return 0.0, "DEVICE_MISMATCH", {}

    @staticmethod
    def compare_financial_accounts(acc1: str, acc2: str) -> Tuple[float, str, Dict[str, float]]:
        c1 = acc1.upper().replace(' ', '').replace('-', '').replace('_', '')
        c2 = acc2.upper().replace(' ', '').replace('-', '').replace('_', '')

        if c1 == c2:
            return 1.0, "FINANCIAL_ACCOUNT_EXACT", {"exact": 1.0}

        # Check UPI VPA handle prefix
        if '@' in acc1 and '@' in acc2:
            u1, p1 = acc1.split('@', 1)
            u2, p2 = acc2.split('@', 1)
            if u1.lower() == u2.lower():
                return 0.92, "SAME_UPI_USER_DIFFERENT_PSP", {"user_matched": u1}

        return 0.0, "FINANCIAL_MISMATCH", {}

    @classmethod
    def generate_candidates(
        cls,
        entities: List[Dict[str, Any]],
        confidence_threshold: float = 0.70
    ) -> List[CandidateMatch]:
        """
        Executes pairwise candidate generation across case entities with type blocking.
        Produces candidate matches above the confidence threshold.
        """
        candidates: List[CandidateMatch] = []
        n = len(entities)
        if n < 2:
            return []

        for i in range(n):
            for j in range(i + 1, n):
                e1 = entities[i]
                e2 = entities[j]

                # Do not compare an entity against itself
                if e1["id"] == e2["id"]:
                    continue

                type1 = e1.get("entity_type", "")
                type2 = e2.get("entity_type", "")

                # Type blocking: only compare matching or compatible entity types
                if type1 != type2:
                    continue

                val1 = e1.get("normalized_value") or e1.get("raw_value", "")
                val2 = e2.get("normalized_value") or e2.get("raw_value", "")
                meta1 = e1.get("entity_metadata") or {}
                meta2 = e2.get("entity_metadata") or {}

                score = 0.0
                match_type = "UNKNOWN"
                features = {}

                if type1 == "PERSON":
                    score, match_type, features = cls.compare_persons(val1, val2, meta1, meta2)
                elif type1 == "PHONE_NUMBER":
                    score, match_type, features = cls.compare_phone_numbers(val1, val2)
                elif type1 == "DEVICE":
                    score, match_type, features = cls.compare_devices(val1, val2)
                elif type1 == "FINANCIAL_ACCOUNT":
                    score, match_type, features = cls.compare_financial_accounts(val1, val2)
                elif type1 in ("LOCATION", "ORGANIZATION", "VEHICLE"):
                    jw = cls.calculate_jaro_winkler(val1, val2)
                    ts = cls.token_sort_similarity(val1, val2)
                    score = (jw * 0.5) + (ts * 0.5)
                    match_type = f"{type1}_FUZZY"
                    features = {"jaro_winkler": round(jw, 4), "token_sort": round(ts, 4)}

                if score >= confidence_threshold:
                    candidates.append(CandidateMatch(
                        source_id=e1["id"],
                        target_id=e2["id"],
                        source_value=val1,
                        target_value=val2,
                        entity_type=type1,
                        match_type=match_type,
                        confidence_score=score,
                        feature_scores=features,
                        merge_directive="MERGE_AS_CANONICAL"
                    ))

        return candidates
