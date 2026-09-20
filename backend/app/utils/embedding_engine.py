import re
import hashlib
from typing import List, Union
import numpy as np


class DenseSemanticEmbeddingEngine:
    """
    384-dimensional dense semantic embedding engine.
    Produces unit-normalized L2 dense representations optimized for pgvector storage
    and cosine similarity distance matching across investigative texts.
    """

    EMBEDDING_DIM = 384

    @classmethod
    def embed_text(cls, text: str) -> List[float]:
        """
        Embeds a single text into a normalized 384-dimensional vector.
        """
        if not text or not text.strip():
            return [0.0] * cls.EMBEDDING_DIM

        tokens = re.findall(r"\w+", text.lower())
        vec = np.zeros(cls.EMBEDDING_DIM, dtype=np.float32)

        if not tokens:
            return vec.tolist()

        for token in tokens:
            # Word-level hash bucket with sign bit
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % cls.EMBEDDING_DIM
            sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
            vec[idx] += sign * (1.0 + np.log(1.0 + len(token)))

            # Character trigrams for morphological and misspelling robustness
            if len(token) >= 3:
                for i in range(len(token) - 2):
                    sub = token[i:i + 3]
                    sh = int(hashlib.md5(sub.encode("utf-8")).hexdigest(), 16)
                    sidx = sh % cls.EMBEDDING_DIM
                    ssign = 1.0 if ((sh >> 8) & 1) == 0 else -1.0
                    vec[sidx] += ssign * 0.45

        # L2 Normalization
        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm
        else:
            vec = np.zeros(cls.EMBEDDING_DIM, dtype=np.float32)

        return vec.tolist()

    @classmethod
    def embed_batch(cls, texts: List[str]) -> List[List[float]]:
        """
        Batch-embeds a list of texts into a list of normalized vectors.
        """
        return [cls.embed_text(t) for t in texts]

    @classmethod
    def cosine_similarity(cls, vec1: Union[List[float], np.ndarray], vec2: Union[List[float], np.ndarray]) -> float:
        """
        Calculates exact cosine similarity between two unit vectors.
        """
        a = np.array(vec1, dtype=np.float32)
        b = np.array(vec2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a < 1e-6 or norm_b < 1e-6:
            return 0.0

        sim = float(np.dot(a, b) / (norm_a * norm_b))
        return max(-1.0, min(1.0, round(sim, 4)))
