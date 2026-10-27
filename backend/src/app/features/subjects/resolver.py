"""Resolve extracted metadata against live catalog records without guessing."""
import re
from app.shared.text_matching import (
    normalize_match_text,
    normalize_loose_text,
    normalize_strand_text,
    extract_strand_number,
    extract_content_stems,
    contains_match_phrase,
)


class CatalogMatchError(ValueError):
    pass


class InvalidCatalogError(RuntimeError):
    pass


_PROGRAM_ALIASES = {
    "blp": "blp",
    "basic literacy": "blp",
    "basic literacy program": "blp",
    "basic literacy program blp": "blp",
    "blp basic literacy program": "blp",
    "jhs": "secondary",
    "junior": "secondary",
    "junior high": "secondary",
    "junior high school": "secondary",
    "junior high school jhs": "secondary",
    "jhs junior high school": "secondary",
    "secondary": "secondary",
    "secondary jhs": "secondary",
    "jhs secondary": "secondary",
    "elementary": "elementary",
    "elem": "elementary",
    "shs": "shs",
    "senior high": "shs",
    "senior high school": "shs",
}

_BARE_STRAND_CODE_RE = re.compile(
    r"^(?:learning\s+strand\s*|strand\s*|ls\s*)?(?:[1-6]|vi|iv|v|iii|ii|i)$"
)


def program_key(value):
    text = normalize_match_text(value)
    if not text:
        return ""
    if text in _PROGRAM_ALIASES:
        return _PROGRAM_ALIASES[text]

    loose = re.sub(r"[-–—:/(),.;_&+]+", " ", text)
    loose = re.sub(
        r"\b(?:als|alternative\s+learning\s+system|accreditation\s+and\s+equivalency|a\s*e|program|antas|level)\b",
        " ",
        loose,
    )
    loose = " ".join(loose.split())
    if loose in _PROGRAM_ALIASES:
        return _PROGRAM_ALIASES[loose]

    if re.search(r"\b(?:blp|basic\s+literacy)\b", loose):
        return "blp"
    if re.search(r"\b(?:jhs|junior\s+high|secondary)\b", loose):
        return "secondary"
    if re.search(r"\b(?:elementary|elem)\b", loose):
        return "elementary"
    if re.search(r"\b(?:shs|senior\s+high)\b", loose):
        return "shs"

    return loose or text


def subject_strand_number(subject) -> int | None:
    name_num = extract_strand_number(getattr(subject, "name", None) if isinstance(getattr(subject, "name", None), str) else None)
    if name_num is not None:
        return name_num
    code_val = getattr(subject, "code", None)
    if isinstance(code_val, str):
        return extract_strand_number(code_val)
    return None


def has_conflicting_strand_number(input_num: int | None, subj_num: int | None) -> bool:
    return bool(input_num is not None and subj_num is not None and input_num != subj_num)


def has_conflicting_ls1_language(input_stems: set[str], subj_stems: set[str]) -> bool:
    langs = {"english", "filipino"}
    subj_langs = subj_stems & langs
    input_langs = input_stems & langs
    if subj_langs and not input_stems:
        return True
    if subj_langs and input_langs and not (subj_langs & input_langs):
        return True
    return False


def required_input(value, label):
    try:
        text = normalize_match_text(value)
    except TypeError as exc:
        raise CatalogMatchError(f"{label} must be text.") from exc
    if not text:
        raise CatalogMatchError(f"{label} is required.")
    return text


def catalog_text(record, field, required=False):
    try:
        value = getattr(record, field, None)
        text = normalize_match_text(value)
    except TypeError as exc:
        raise InvalidCatalogError(f"Invalid catalog field: {field}.") from exc
    if required and not text:
        raise InvalidCatalogError(f"Missing catalog field: {field}.")
    return text


def unique_match(matches, label):
    if not matches:
        raise CatalogMatchError(f"No matching {label} found in the catalog.")
    if len(matches) != 1:
        raise CatalogMatchError(f"Multiple matching {label} records found. Correct the document or catalog.")
    return matches[0]


async def resolve_catalog(uow, als_program, learning_strand):
    program = program_key(required_input(als_program, "ALS program"))
    strand = required_input(learning_strand, "Learning strand")
    categories = []
    offset = 0
    while True:
        page, total = await uow.user_categories.list(offset=offset, limit=500)
        categories.extend(page)
        offset += len(page)
        if offset >= total:
            break
        if not page:
            raise InvalidCatalogError("Program catalog pagination is incomplete.")
    matches = [c for c in categories if program in {
        program_key(catalog_text(c, "name")), program_key(catalog_text(c, "code")),
    }]
    category = unique_match(matches, "program")
    catalog_text(category, "category_id", True)
    catalog_text(category, "name", True)
    catalog_text(category, "code")
    subjects = await uow.subjects.get_all_by_category(category.category_id)
    active = []
    for subject in subjects:
        if getattr(subject, "category_id", None) != category.category_id:
            continue
        if not isinstance(getattr(subject, "is_active", None), bool):
            raise InvalidCatalogError("InvFalid subject active status.")
        if subject.is_active:
            active.append(subject)

    input_num = extract_strand_number(strand)
    input_stems = extract_content_stems(strand)
    strand_loose = normalize_loose_text(strand)
    stripped = normalize_strand_text(strand)
    stripped_loose = normalize_loose_text(stripped)
    is_bare_code = bool(_BARE_STRAND_CODE_RE.fullmatch(stripped_loose or strand_loose))

    # Tier 1: Exact case-insensitive match
    exact = [s for s in active if catalog_text(s, "name") == strand]

    # Tier 2: Loose punctuation & spacing match (e.g. 'LS1-Filipino' == 'LS1 - Filipino')
    if not exact and strand_loose:
        exact = [s for s in active if normalize_loose_text(catalog_text(s, "name")) == strand_loose]

    # Tier 3: Stripped qualifier match without conflicting strand numbers
    if not exact and stripped and not is_bare_code:
        exact = [
            s for s in active
            if not has_conflicting_strand_number(input_num, subject_strand_number(s))
            and (
                normalize_strand_text(catalog_text(s, "name")) == stripped
                or (
                    stripped_loose
                    and normalize_loose_text(normalize_strand_text(catalog_text(s, "name"))) == stripped_loose
                )
            )
        ]

    # Tier 4: Dynamic Strand Number (1..6 <-> LS1..LS6) resolution
    if not exact and input_num is not None:
        same_num = [s for s in active if subject_strand_number(s) == input_num]
        if same_num:
            qualified = []
            for s in same_num:
                subj_name = catalog_text(s, "name")
                subj_stripped_loose = normalize_loose_text(normalize_strand_text(subj_name))
                subj_stems = extract_content_stems(subj_name)
                if has_conflicting_ls1_language(input_stems, subj_stems):
                    continue
                if (
                    (
                        stripped_loose
                        and subj_stripped_loose
                        and not is_bare_code
                        and not _BARE_STRAND_CODE_RE.fullmatch(subj_stripped_loose)
                        and (
                            contains_match_phrase(stripped_loose, subj_stripped_loose)
                            or contains_match_phrase(subj_stripped_loose, stripped_loose)
                        )
                    )
                    or bool(input_stems and subj_stems and (input_stems & subj_stems))
                ):
                    qualified.append(s)
            if qualified:
                exact = qualified
            elif not is_bare_code or input_num in {2, 3, 4, 5, 6}:
                exact = [
                    s for s in same_num
                    if not has_conflicting_ls1_language(input_stems, extract_content_stems(catalog_text(s, "name")))
                ]

    # Tier 5: Whole-word phrase & content stem matching across non-conflicting subjects
    if not exact and stripped_loose and not is_bare_code:
        name_matches = []
        for s in active:
            if has_conflicting_strand_number(input_num, subject_strand_number(s)):
                continue
            subj_stripped_loose = normalize_loose_text(normalize_strand_text(catalog_text(s, "name")))
            if not subj_stripped_loose or _BARE_STRAND_CODE_RE.fullmatch(subj_stripped_loose):
                continue
            if (
                contains_match_phrase(stripped_loose, subj_stripped_loose)
                or contains_match_phrase(subj_stripped_loose, stripped_loose)
            ):
                name_matches.append(s)
        exact = name_matches

    if not exact and input_stems and not is_bare_code:
        stem_matches = []
        best_overlap = 0
        for s in active:
            if has_conflicting_strand_number(input_num, subject_strand_number(s)):
                continue
            subj_stems = extract_content_stems(catalog_text(s, "name"))
            if not subj_stems or has_conflicting_ls1_language(input_stems, subj_stems):
                continue
            overlap = len(input_stems & subj_stems)
            if overlap > best_overlap:
                best_overlap = overlap
                stem_matches = [s]
            elif overlap > 0 and overlap == best_overlap:
                stem_matches.append(s)
        exact = stem_matches

    # Tier 6: Description phrase fallback
    if not exact:
        phrases = {
            strand,
            strand_loose,
            stripped,
            stripped_loose,
        } - {""}
        exact = [
            s for s in active
            if not has_conflicting_strand_number(input_num, subject_strand_number(s))
            and any(contains_match_phrase(catalog_text(s, "description"), phrase) for phrase in phrases)
        ]

    subject = unique_match(exact, "active subject in the selected program")
    catalog_text(subject, "subject_id", True)
    catalog_text(subject, "name", True)
    return {
        "category_id": category.category_id, "program_name": category.name,
        "program_code": category.code, "subject_id": subject.subject_id,
        "subject_name": subject.name,
    }


