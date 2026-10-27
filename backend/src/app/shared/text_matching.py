"""Comparison helpers; never use their output as the persisted display name."""
import re

_ROMAN_TO_INT = {
    "i": 1,
    "ii": 2,
    "iii": 3,
    "iv": 4,
    "v": 5,
    "vi": 6,
}

_STOP_WORDS = {
    "and", "or", "in", "of", "the", "for", "to", "with", "on", "at", "by",
    "from", "a", "an", "skills", "skill", "learning", "strand", "subject",
    "module", "course", "level", "program", "als", "ls",
    "ls1", "ls2", "ls3", "ls4", "ls5", "ls6",
}


def normalize_match_text(value: str | None) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise TypeError("Matching values must be strings or None.")
    return " ".join(value.casefold().split())


def extract_strand_number(value: str | None) -> int | None:
    """Extract canonical learning strand number (1..6) from strings like:
    'LS1 - Filipino', 'Learning Strand 2: ...', '2- Scientific and Critical Thinking Skills', 'I- Filipino'.
    """
    text = normalize_match_text(value)
    if not text:
        return None

    # 1. Explicit 'LS 1', 'LS-2', 'Learning Strand 3', 'Strand No. 4'
    explicit = re.search(
        r"\b(?:learning\s+strand|strand|ls)\s*[-–—:.)#]*\s*(?:no\.?\s*)?([1-6]|vi|iv|v|iii|ii|i)\b",
        text,
    )
    if explicit:
        token = explicit.group(1)
        return int(token) if token.isdigit() else _ROMAN_TO_INT.get(token)

    # 2. Leading numeral/Roman numeral followed by separator, e.g. '2- Scientific...', 'I- Filipino'
    leading = re.match(
        r"^(?:(?:learning\s+strand|strand)\s*[:\-–—]?\s*)?([1-6]|vi|iv|v|iii|ii|i)(?:\s*[-–—:.)]\s*|\s+)(?=[a-z])",
        text,
    )
    if leading:
        token = leading.group(1)
        return int(token) if token.isdigit() else _ROMAN_TO_INT.get(token)

    return None


def normalize_loose_text(value: str | None) -> str:
    """Case-insensitive, punctuation- and separator-insensitive normalization.
    Maps e.g. 'LS1-Filipino', 'LS1 - Filipino', '1- Filipino', 'LS 1: Filipino' -> 'ls1 filipino'.
    """
    text = normalize_match_text(value)
    if not text:
        return ""
    strand_num = extract_strand_number(text)
    stripped = normalize_strand_text(text)
    stripped_clean = re.sub(r"[-–—:/(),.;_&+]+", " ", stripped)
    stripped_clean = " ".join(stripped_clean.split())
    if strand_num is not None:
        if stripped_clean and not re.fullmatch(
            r"(?:learning\s+strand\s*|strand\s*|ls\s*)?(?:[1-6]|vi|iv|v|iii|ii|i)",
            stripped_clean,
        ):
            return f"ls{strand_num} {stripped_clean}"
        return f"ls{strand_num}"
    text = re.sub(r"[-–—:/(),.;_&+]+", " ", text)
    return " ".join(text.split())


def normalize_strand_text(value: str | None) -> str:
    text = normalize_match_text(value)
    if not text:
        return ""
    text = re.sub(r"^(?:learning\s+strand|strand)\s*[:\-–—]\s*", "", text).strip()
    # Keep language qualifiers: LS1 alone must not become English or Filipino.
    return re.sub(
        r"^(?:(?:learning\s+strand|strand|ls)\s*(?:no\.?|#)?\s*)?(?:[1-6]|vi|iv|v|iii|ii|i)"
        r"(?:\s*[-–—:.)]\s*|\s+)", "", text,
    ).strip()


def extract_content_stems(value: str | None) -> set[str]:
    """Extract normalized content keywords/stems from a strand or subject name (min length 4)."""
    stripped = normalize_strand_text(value)
    if not stripped:
        return set()
    words = re.findall(r"[a-z0-9]+", stripped)
    stems: set[str] = set()
    for word in words:
        if word in _STOP_WORDS or len(word) < 4 or word.isdigit():
            continue
        if word.startswith("math"):
            stems.add("math")
        elif word.startswith("scien"):
            stems.add("scien")
        elif word.startswith("commu"):
            stems.add("commu")
        elif word.startswith("digit"):
            stems.add("digit")
        elif word.startswith("citiz"):
            stems.add("citiz")
        elif word.startswith("liter"):
            stems.add("liter")
        elif word.startswith("criti"):
            stems.add("criti")
        elif word.startswith("probl"):
            stems.add("probl")
        elif word in {"tagalog", "wikang", "wika", "filipino"}:
            stems.add("filipino")
        else:
            stems.add(word)
            if len(word) >= 5:
                stems.add(word[:5])
    return stems


def contains_match_phrase(text: str | None, phrase: str | None) -> bool:
    text, phrase = normalize_match_text(text), normalize_match_text(phrase)
    return bool(phrase and re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", text))


