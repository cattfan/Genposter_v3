"""Vietnamese-aware text normalization helpers."""
import re
import unicodedata


def strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace("\u0111", "d").replace("\u0110", "D")


def norm_key(s: str) -> str:
    """Aggressive key for matching photo folder names (ignore punctuation)."""
    return re.sub(r"[^a-z0-9]+", "", strip_accents(s).lower())


def norm_cmp(s) -> str:
    """Looser key for comparing filter values (keep word boundaries)."""
    if s is None:
        return ""
    return " ".join(strip_accents(s).lower().split())
