#!/usr/bin/env python3
"""
Scrape Vatican IntraText Bible (ESL0506) for deuterocanonical supplements
that are absent from bible_es.json:

  • Daniel 13   — Historia de Susana
  • Daniel 14   — Bel y el Dragón
  • Daniel 3    — Adiciones griegas (Oración de Azarías + Cántico de los Tres Jóvenes)
                  currently ends at verse 33; should reach verse ~97
  • Esther 11–16 — Suplementos griegos (Adiciones A–F)

The Vatican site assigns one HTML page per chapter using the URL pattern:
  https://www.vatican.va/archive/ESL0506/__P<XX>.HTM
where <XX> is a 2-character base-36 code (digits 0-9 then A-Z).

Psalms verified range: __PG6 (582) → __PKB (731) = 150 pages, one per psalm.

Run from the repo root:
    python3 scripts/scrape_supplements.py
"""

import json
import re
import sys
import time
from html.parser import HTMLParser

import requests

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL   = "https://www.vatican.va/archive/ESL0506/"
BIBLE_PATH = "frontend/public/data/bible_es.json"
REQUEST_DELAY = 0.20   # seconds between requests (be polite to Vatican servers)
TIMEOUT       = 15

# Range to scan.
# - Est supplements (ESTER SUPLEMENTOS GRIEGOS): pages 945-950
# - Dn supplements (DANIEL SUPLEMENTOS GRIEGOS): pages 1088-1090
# Setting 940-1095 covers both without re-scanning the whole OT.
SCAN_START = 940
SCAN_END   = 1095

# Base-36 alphabet used in Vatican URL codes
_B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def n_to_code(n: int) -> str:
    """Convert integer 0–1295 to 2-char base-36 code, e.g. 582 → 'G6'."""
    return _B36[n // 36] + _B36[n % 36]


def page_url(n: int) -> str:
    return f"__P{n_to_code(n)}.HTM"


# ── HTML parser ───────────────────────────────────────────────────────────────

# Standard HTML entity map (same as fix_psalms.py)
_ENTITIES: dict[str, str] = {
    "ntilde": "ñ", "Ntilde": "Ñ",
    "aacute": "á", "eacute": "é", "iacute": "í", "oacute": "ó", "uacute": "ú",
    "Aacute": "Á", "Eacute": "É", "Iacute": "Í", "Oacute": "Ó", "Uacute": "Ú",
    "uuml": "ü", "Uuml": "Ü",
    "iexcl": "¡", "iquest": "¿",
    "amp": "&", "lt": "<", "gt": ">", "quot": '"', "nbsp": " ",
    "middot": "·", "laquo": "«", "raquo": "»",
    "mdash": "\u2014", "ndash": "\u2013",
}


# Regex to extract <meta name="part"> content, which holds the real book/chapter.
# Format: "El Antiguo Testamento > BOOK NAME > CHAPTER_NUMBER"
# The <title> tag always says "El libro del Pueblo de Dios - IntraText" (useless).
_PART_RE = re.compile(r'<meta\s+name="part"\s+content="([^"]+)"', re.I)


class PageParser(HTMLParser):
    """Extract all <p class=MsoNormal> paragraphs."""

    def __init__(self) -> None:
        super().__init__()
        self.paragraphs: list[str] = []
        self._in_p = False
        self._buf: list[str] = []

    # ── tag events ────────────────────────────────────────────────────────────

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag == "p":
            cls = dict(attrs).get("class", "")
            if "MsoNormal" in cls:
                self._in_p = True
                self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "p" and self._in_p:
            self._in_p = False
            text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if text:
                self.paragraphs.append(text)

    def handle_data(self, data: str) -> None:
        if self._in_p:
            self._buf.append(data)

    def handle_entityref(self, name: str) -> None:
        ch = _ENTITIES.get(name, f"&{name};")
        if self._in_p:
            self._buf.append(ch)

    def handle_charref(self, name: str) -> None:
        try:
            ch = chr(int(name[1:], 16) if name.lower().startswith("x") else int(name))
        except (ValueError, OverflowError):
            ch = ""
        if self._in_p:
            self._buf.append(ch)


# ── Verse parsing ─────────────────────────────────────────────────────────────

def parse_verses(paragraphs: list[str]) -> dict[str, str]:
    """
    Given a list of paragraphs from a Vatican chapter page, return
    {verse_number_str: full_verse_text}.
    A paragraph that begins with a digit starts a new verse; subsequent
    paragraphs are poetic continuation lines joined with a space.
    """
    verses: dict[str, str] = {}
    cur_num: int | None = None
    cur_lines: list[str] = []
    verse_re = re.compile(r"^(\d+)\s*(.*)")

    def flush() -> None:
        if cur_num is not None:
            text = re.sub(r"\s+", " ", " ".join(l for l in cur_lines if l)).strip()
            if text:
                verses[str(cur_num)] = text

    for para in paragraphs:
        m = verse_re.match(para)
        if m:
            flush()
            cur_num = int(m.group(1))
            rest = m.group(2).strip()
            cur_lines = [rest] if rest else []
        else:
            if cur_num is not None and para.strip():
                cur_lines.append(para.strip())

    flush()
    return verses


# ── Page fetching ─────────────────────────────────────────────────────────────

def fetch_page(url: str, retries: int = 3) -> bytes | None:
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=TIMEOUT)
            r.raise_for_status()
            return r.content
        except Exception as exc:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                return None
    return None


def parse_page(content: bytes) -> tuple[str, dict[str, str]]:
    """Return (part, verses_dict) for a Vatican HTML chapter page.

    'part' comes from <meta name="part"> and has the form:
        "El Antiguo Testamento > BOOK NAME > CHAPTER_NUMBER"
    The <title> tag is always the same generic string and is not used.
    """
    html = content.decode("latin-1")
    m = _PART_RE.search(html)
    part = m.group(1) if m else ""
    # Decode the few HTML entities that appear in meta content
    part = part.replace("&gt;", ">").replace("&amp;", "&").replace("&lt;", "<")
    p = PageParser()
    p.feed(html)
    return part, parse_verses(p.paragraphs)


# ── Target detection ──────────────────────────────────────────────────────────

# The <meta name="part"> content format is:
#   "El Antiguo Testamento > BOOK NAME > CHAPTER_NUMBER"
# e.g. "El Antiguo Testamento > DANIEL SUPLEMENTOS GRIEGOS > 13"
#      "El Antiguo Testamento > ESTER SUPLEMENTOS GRIEGOS > 1"

_DN_SUPPL_RE  = re.compile(r"\bDANIEL\b.*SUPLE", re.I)
_EST_SUPPL_RE = re.compile(r"\bEST[EÉ]R?\b.*SUPLE", re.I)
_PART_CH_RE   = re.compile(r">\s*(\d+)\s*$")   # chapter number at end of part string

# Esther supplement: Vatican "after chapter N" → NBJ chapter
# Vatican labels each supplement by the canonical Hebrew chapter it follows.
# Verse counts confirmed by scraping 2024-03:
#   > 1  (17 v) = Addition A  → Est 11+12 (stored together as ch 11 here, ch 12 empty)
#   > 3  ( 7 v) = Addition B  → Est 13 v1-7 only
#   > 4  (30 v) = Add. C      → Est 13 v8-18 + Est 14  (complex split; stored as ch 14)
#   > 5  (16 v) = Addition D  → Est 15
#   > 8  (21 v) = Addition E  → Est 16
#   > 10 (11 v) = Addition F  → appended to Est 10 (skip: already short book)
_EST_SUPPL_MAP: dict[int, int] = {1: 11, 3: 13, 4: 14, 5: 15, 8: 16}


def identify_page(part: str) -> tuple[str, int] | None:
    """
    Returns (book_abbr, chapter_number) if the page is a supplement target,
    or None otherwise.  'part' is the decoded <meta name="part"> content.

    Daniel main chapters 1-12: not a target (already in JSON).
    Daniel supplements (ch 3, 13, 14): returned with their actual chapter numbers.
    Esther main chapters 1-10: not a target.
    Esther supplements: mapped via _EST_SUPPL_MAP to NBJ chapter numbers.
    """
    ch_m = _PART_CH_RE.search(part)
    chapter = int(ch_m.group(1)) if ch_m else -1

    # ── Daniel supplement ────────────────────────────────────────────────────
    if _DN_SUPPL_RE.search(part):
        # Vatican part: "... > DANIEL SUPLEMENTOS GRIEGOS > 3/13/14"
        # Chapter number in part IS the canonical Dn chapter (3, 13, or 14).
        return ("Dn", chapter)

    # ── Esther supplement ────────────────────────────────────────────────────
    if _EST_SUPPL_RE.search(part):
        nbj_ch = _EST_SUPPL_MAP.get(chapter, -1)
        return ("Est", nbj_ch)

    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 70)
    print("Vatican Bible supplement scraper")
    print(f"Scanning pages {SCAN_START}–{SCAN_END}  ({SCAN_END - SCAN_START + 1} pages)")
    print("=" * 70)

    # Load existing JSON
    print(f"\nLoading {BIBLE_PATH} …")
    with open(BIBLE_PATH, encoding="utf-8") as f:
        bible: dict = json.load(f)

    print(f"  Dn current chapters: {sorted(int(k) for k in bible.get('Dn', {}).keys())}")
    print(f"  Est current chapters: {sorted(int(k) for k in bible.get('Est', {}).keys())}")

    # ── Scan ─────────────────────────────────────────────────────────────────
    found: list[tuple[str, int, dict[str, str], str]] = []   # (book, chapter, verses, part)

    print()
    for n in range(SCAN_START, SCAN_END + 1):
        url = BASE_URL + page_url(n)
        content = fetch_page(url)

        if content is None:
            sys.stdout.write(f"\r  [{n:4d}/{page_url(n)}]  fetch failed            \n")
            sys.stdout.flush()
            time.sleep(REQUEST_DELAY)
            continue

        part, verses = parse_page(content)
        label = f"  [{n:4d}/{page_url(n)}]  {part[:65]:<65}  v={len(verses):3d}"
        sys.stdout.write(f"\r{label}")
        sys.stdout.flush()

        if not verses:
            time.sleep(REQUEST_DELAY)
            continue

        target = identify_page(part)

        if target:
            book, chapter = target
            sys.stdout.write("\n")
            print(f"      *** TARGET FOUND: {book} ch.{chapter}  '{part}'  ({len(verses)} verses)")
            if chapter > 0:
                found.append((book, chapter, verses, part))

        time.sleep(REQUEST_DELAY)

    print()

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"Scan complete.  Found {len(found)} supplement chapter(s).")

    if not found:
        print("\nNothing found.  Suggestions:")
        print(f"  1. Widen scan range: edit SCAN_START/SCAN_END at the top of this script.")
        print(f"     Current range: {SCAN_START}–{SCAN_END}")
        print(f"  2. Check that the Vatican site returns <meta name='part'> with book info.")
        return

    print("\nChapters to be added/updated:")
    for book, chapter, verses, part in found:
        cur = bible.get(book, {}).get(str(chapter))
        if book == "Dn" and chapter == 3:
            # Special case: Dn 3 supplement = Greek additions only (v24-v90).
            # Will be merged with existing Hebrew text, not replaced.
            status = "MERGE"
        else:
            status = "UPDATE" if cur else "NEW"
        print(f'  [{status}] {book} {chapter:2d}  ({len(verses)} verses)  "{part}"')

    # ── Write ─────────────────────────────────────────────────────────────────
    ans = input("\nApply these changes to bible_es.json? [y/N] ").strip().lower()
    if ans != "y":
        print("Aborted — no changes written.")
        return

    for book, chapter, verses, _ in found:
        if book not in bible:
            bible[book] = {}

        if book == "Dn" and chapter == 3:
            # Dn 3 Greek additions (v24-v90) must be MERGED with the Hebrew text:
            #   v1-v23  : Hebrew (keep from current JSON)
            #   v24-v90 : Greek additions (from supplement)
            #   v91-v100: Hebrew continuation (current v24-v33, renumbered +67)
            dn3_cur = bible["Dn"].get("3", {})
            dn3_new: dict[str, str] = {}
            for v in range(1, 24):
                if str(v) in dn3_cur:
                    dn3_new[str(v)] = dn3_cur[str(v)]
            for vk, text in verses.items():
                if 24 <= int(vk) <= 90:
                    dn3_new[vk] = text
            for v in range(24, 34):
                if str(v) in dn3_cur:
                    dn3_new[str(v + 67)] = dn3_cur[str(v)]
            bible["Dn"]["3"] = dn3_new
            print(f"  Dn 3 merged: {len(dn3_new)} verses (Hebrew v1-23 + Greek v24-90 + Hebrew v91-100)")
        else:
            bible[book][str(chapter)] = verses

    print(f"\nWriting {BIBLE_PATH} …")
    with open(BIBLE_PATH, "w", encoding="utf-8") as f:
        json.dump(bible, f, ensure_ascii=False, separators=(",", ":"))
    print("Done!")

    # Final verification
    print("\nVerification:")
    for book, chapter, verses, _ in found:
        stored = bible[book].get(str(chapter), {})
        print(f"  {book} {chapter}: {len(stored)} verses stored")


if __name__ == "__main__":
    main()
