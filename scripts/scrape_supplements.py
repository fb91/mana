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

# Range to scan.  After Psalms (ends at page 731) come Job, Prov, Rt, Cant,
# Ecl, Lam, Est, Dn.  With ~1 header page per book the supplements should
# fall between pages 830 and 970.  Widen if nothing is found.
SCAN_START = 730
SCAN_END   = 990

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


class PageParser(HTMLParser):
    """Extract <title> text and all <p class=MsoNormal> paragraphs."""

    def __init__(self) -> None:
        super().__init__()
        self.title: str = ""
        self.paragraphs: list[str] = []
        self._in_title = False
        self._in_p     = False
        self._buf: list[str] = []

    # ── tag events ────────────────────────────────────────────────────────────

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag == "title":
            self._in_title = True
            self._buf = []
        elif tag == "p":
            cls = dict(attrs).get("class", "")
            if "MsoNormal" in cls:
                self._in_p = True
                self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._in_title:
            self._in_title = False
            self.title = re.sub(r"\s+", " ", "".join(self._buf)).strip()
        elif tag == "p" and self._in_p:
            self._in_p = False
            text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if text:
                self.paragraphs.append(text)

    def handle_data(self, data: str) -> None:
        if self._in_title or self._in_p:
            self._buf.append(data)

    def handle_entityref(self, name: str) -> None:
        ch = _ENTITIES.get(name, f"&{name};")
        if self._in_title or self._in_p:
            self._buf.append(ch)

    def handle_charref(self, name: str) -> None:
        try:
            ch = chr(int(name[1:], 16) if name.lower().startswith("x") else int(name))
        except (ValueError, OverflowError):
            ch = ""
        if self._in_title or self._in_p:
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
    """Return (title, verses_dict) for a Vatican HTML chapter page."""
    html = content.decode("latin-1")
    p = PageParser()
    p.feed(html)
    return p.title, parse_verses(p.paragraphs)


# ── Target detection ──────────────────────────────────────────────────────────

# We want to detect these books / chapters on the Vatican pages.
# The page title format appears to be something like:
#   "ESL0506 - DANIEL - CAPÍTULO 1"
#   "ESL0506 - DANIEL SUPLEMENTOS GRIEGOS - CAPÍTULO 1"   (=our Dn 13)
#   "ESL0506 - ESTER SUPLEMENTOS GRIEGOS - CAPÍTULO 1"    (=Est supplement)
# We do a case-insensitive scan.

_DN_MAIN_RE   = re.compile(r"\bDANIEL\b(?!.*SUPLE)", re.I)
_DN_SUPPL_RE  = re.compile(r"\bDANIEL\b.*SUPLE", re.I)
_EST_MAIN_RE  = re.compile(r"\bEST[EÉ]R?\b(?!.*SUPLE)", re.I)
_EST_SUPPL_RE = re.compile(r"\bEST[EÉ]R?\b.*SUPLE", re.I)
_CHAPTER_RE   = re.compile(r"CAP[IÍ]TULO\s+(\d+)", re.I)
_ADDICION_RE  = re.compile(r"ADICI[OÓ]N\s+([A-F])", re.I)  # Add. A–F pattern

# Mapping of Greek Addition letter → canonical chapter number in NBJ
ADDITION_CHAPTER: dict[str, int] = {
    "A": 11, "B": 13, "C": 13, "D": 15, "E": 16, "F": 10,
}
# Note: Add. C is part of ch.13 (prayer of Mardocheo + prayer of Ester),
# but since the Vatican site may split them we just track by page sequence.


def identify_page(title: str) -> tuple[str, int] | None:
    """
    Returns (book_abbr, chapter_number) if the page is a supplement target,
    or None otherwise.

    Daniel main chapters 1-12: not a target (already in JSON).
    Daniel supplements: map sequential pages to Dn 13, 14.
    Esther main chapters 1-10: not a target.
    Esther supplements: map to Est 11, 12, 13, 14, 15, 16.
    """
    # ── Daniel supplement ────────────────────────────────────────────────────
    if _DN_SUPPL_RE.search(title):
        m = _CHAPTER_RE.search(title)
        if m:
            # Vatican numbers supplement chapters starting from 1 (= our Dn 13)
            offset = int(m.group(1))
            return ("Dn", 12 + offset)          # ch1 → Dn 13, ch2 → Dn 14
        # If no chapter number found we still flag it for manual review
        return ("Dn", -1)

    # ── Esther supplement ────────────────────────────────────────────────────
    if _EST_SUPPL_RE.search(title):
        m_add = _ADDICION_RE.search(title)
        m_ch  = _CHAPTER_RE.search(title)
        if m_add:
            letter = m_add.group(1).upper()
            return ("Est", ADDITION_CHAPTER.get(letter, -1))
        if m_ch:
            offset = int(m_ch.group(1))
            return ("Est", 10 + offset)         # ch1 → Est 11, etc.
        return ("Est", -1)

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
    found: list[tuple[str, int, dict[str, str], str]] = []   # (book, chapter, verses, title)

    # Also track consecutive Daniel/Ester supplement pages in case chapter
    # numbers are absent from the title (fall back to sequential numbering).
    dn_suppl_seq: list[tuple[int, dict[str, str], str]] = []   # (page_n, verses, title)
    est_suppl_seq: list[tuple[int, dict[str, str], str]] = []

    print()
    for n in range(SCAN_START, SCAN_END + 1):
        url = BASE_URL + page_url(n)
        content = fetch_page(url)

        if content is None:
            sys.stdout.write(f"\r  [{n:4d}/{page_url(n)}]  fetch failed            \n")
            sys.stdout.flush()
            time.sleep(REQUEST_DELAY)
            continue

        title, verses = parse_page(content)
        label = f"  [{n:4d}/{page_url(n)}]  {title[:65]:<65}  v={len(verses):3d}"
        sys.stdout.write(f"\r{label}")
        sys.stdout.flush()

        if not verses:
            time.sleep(REQUEST_DELAY)
            continue

        target = identify_page(title)

        if target:
            book, chapter = target
            sys.stdout.write("\n")  # new line so the target stands out
            print(f"      *** TARGET FOUND: {book} ch.{chapter}  '{title}'  ({len(verses)} verses)")

            if chapter > 0:
                found.append((book, chapter, verses, title))
            else:
                # Unknown chapter number — store for sequential fallback
                if _DN_SUPPL_RE.search(title):
                    dn_suppl_seq.append((n, verses, title))
                elif _EST_SUPPL_RE.search(title):
                    est_suppl_seq.append((n, verses, title))

        # Detect Daniel main chapters: anchor Dn 12, and re-scrape Dn 3 if extended
        elif _DN_MAIN_RE.search(title) and len(verses) > 0:
            m = _CHAPTER_RE.search(title)
            if m:
                ch = int(m.group(1))
                if ch == 12:
                    sys.stdout.write("\n")
                    print(f"      (anchor) Dn 12 found at page {n}")
                elif ch == 3 and len(verses) > 33:
                    # Vatican page for Dn 3 has more verses than our JSON → has Greek additions
                    sys.stdout.write("\n")
                    print(f"      *** TARGET FOUND: Dn 3 extended  ({len(verses)} verses, was 33)  '{title}'")
                    found.append(("Dn", 3, verses, title))

        time.sleep(REQUEST_DELAY)

    print()

    # ── Sequential fallback ──────────────────────────────────────────────────
    if dn_suppl_seq and not any(b == "Dn" for b, _, _, _ in found):
        print("\nUsing sequential fallback for Daniel supplements:")
        for i, (n, verses, title) in enumerate(dn_suppl_seq):
            ch = 13 + i
            print(f"  Page {n} → Dn {ch}  '{title}'  ({len(verses)} verses)")
            found.append(("Dn", ch, verses, title))

    if est_suppl_seq and not any(b == "Est" for b, _, _, _ in found):
        print("\nUsing sequential fallback for Esther supplements:")
        for i, (n, verses, title) in enumerate(est_suppl_seq):
            ch = 11 + i
            print(f"  Page {n} → Est {ch}  '{title}'  ({len(verses)} verses)")
            found.append(("Est", ch, verses, title))

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"Scan complete.  Found {len(found)} supplement chapter(s).")

    if not found:
        print("\nNothing found.  Suggestions:")
        print(f"  1. Widen scan range: edit SCAN_START/SCAN_END at the top of this script.")
        print(f"     Current range: {SCAN_START}–{SCAN_END}")
        print(f"  2. The Vatican title format may differ.  Re-run with --debug to print")
        print(f"     every page title (edit the script: change debug=True below).")
        return

    print("\nChapters to be added/updated:")
    for book, chapter, verses, title in found:
        cur = bible.get(book, {}).get(str(chapter))
        status = "UPDATE" if cur else "NEW"
        print(f'  [{status}] {book} {chapter:2d}  ({len(verses)} verses)  "{title}"')

    # ── Write ─────────────────────────────────────────────────────────────────
    ans = input("\nApply these changes to bible_es.json? [y/N] ").strip().lower()
    if ans != "y":
        print("Aborted — no changes written.")
        return

    for book, chapter, verses, _ in found:
        if book not in bible:
            bible[book] = {}
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
