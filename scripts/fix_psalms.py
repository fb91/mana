#!/usr/bin/env python3
"""
Re-scrape all 150 Psalms from the Vatican website and update bible_es.json.
Vatican IntraText HTML: each verse's poetic lines are in separate <p class=MsoNormal> paragraphs.
A paragraph starting with a digit begins a new verse; subsequent paragraphs are continuation lines.
"""

import json
import re
import time
import requests
from html.parser import HTMLParser

BASE_URL = "https://www.vatican.va/archive/ESL0506/"
PSALM_PAGES = [
    "__PG6.HTM","__PG7.HTM","__PG8.HTM","__PG9.HTM","__PGA.HTM","__PGB.HTM",
    "__PGC.HTM","__PGD.HTM","__PGE.HTM","__PGF.HTM","__PGG.HTM","__PGH.HTM",
    "__PGI.HTM","__PGJ.HTM","__PGK.HTM","__PGL.HTM","__PGM.HTM","__PGN.HTM",
    "__PGO.HTM","__PGP.HTM","__PGQ.HTM","__PGR.HTM","__PGS.HTM","__PGT.HTM",
    "__PGU.HTM","__PGV.HTM","__PGW.HTM","__PGX.HTM","__PGY.HTM","__PGZ.HTM",
    "__PH0.HTM","__PH1.HTM","__PH2.HTM","__PH3.HTM","__PH4.HTM","__PH5.HTM",
    "__PH6.HTM","__PH7.HTM","__PH8.HTM","__PH9.HTM","__PHA.HTM","__PHB.HTM",
    "__PHC.HTM","__PHD.HTM","__PHE.HTM","__PHF.HTM","__PHG.HTM","__PHH.HTM",
    "__PHI.HTM","__PHJ.HTM","__PHK.HTM","__PHL.HTM","__PHM.HTM","__PHN.HTM",
    "__PHO.HTM","__PHP.HTM","__PHQ.HTM","__PHR.HTM","__PHS.HTM","__PHT.HTM",
    "__PHU.HTM","__PHV.HTM","__PHW.HTM","__PHX.HTM","__PHY.HTM","__PHZ.HTM",
    "__PI0.HTM","__PI1.HTM","__PI2.HTM","__PI3.HTM","__PI4.HTM","__PI5.HTM",
    "__PI6.HTM","__PI7.HTM","__PI8.HTM","__PI9.HTM","__PIA.HTM","__PIB.HTM",
    "__PIC.HTM","__PID.HTM","__PIE.HTM","__PIF.HTM","__PIG.HTM","__PIH.HTM",
    "__PII.HTM","__PIJ.HTM","__PIK.HTM","__PIL.HTM","__PIM.HTM","__PIN.HTM",
    "__PIO.HTM","__PIP.HTM","__PIQ.HTM","__PIR.HTM","__PIS.HTM","__PIT.HTM",
    "__PIU.HTM","__PIV.HTM","__PIW.HTM","__PIX.HTM","__PIY.HTM","__PIZ.HTM",
    "__PJ0.HTM","__PJ1.HTM","__PJ2.HTM","__PJ3.HTM","__PJ4.HTM","__PJ5.HTM",
    "__PJ6.HTM","__PJ7.HTM","__PJ8.HTM","__PJ9.HTM","__PJA.HTM","__PJB.HTM",
    "__PJC.HTM","__PJD.HTM","__PJE.HTM","__PJF.HTM","__PJG.HTM","__PJH.HTM",
    "__PJI.HTM","__PJJ.HTM","__PJK.HTM","__PJL.HTM","__PJM.HTM","__PJN.HTM",
    "__PJO.HTM","__PJP.HTM","__PJQ.HTM","__PJR.HTM","__PJS.HTM","__PJT.HTM",
    "__PJU.HTM","__PJV.HTM","__PJW.HTM","__PJX.HTM","__PJY.HTM","__PJZ.HTM",
    "__PK0.HTM","__PK1.HTM","__PK2.HTM","__PK3.HTM","__PK4.HTM","__PK5.HTM",
    "__PK6.HTM","__PK7.HTM","__PK8.HTM","__PK9.HTM","__PKA.HTM","__PKB.HTM",
]


class ParagraphExtractor(HTMLParser):
    """Extract text content of all <p class=MsoNormal> paragraphs."""
    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self._in_p = False
        self._current_text = []

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            attrs_dict = dict(attrs)
            cls = attrs_dict.get('class', '')
            if 'MsoNormal' in cls or cls == 'MsoNormal':
                self._in_p = True
                self._current_text = []

    def handle_endtag(self, tag):
        if tag == 'p' and self._in_p:
            self._in_p = False
            text = ' '.join(self._current_text).strip()
            text = re.sub(r'\s+', ' ', text).strip()
            if text:
                self.paragraphs.append(text)

    def handle_data(self, data):
        if self._in_p:
            self._current_text.append(data)

    def handle_entityref(self, name):
        entities = {
            'ntilde': 'ñ', 'Ntilde': 'Ñ',
            'aacute': 'á', 'eacute': 'é', 'iacute': 'í', 'oacute': 'ó', 'uacute': 'ú',
            'Aacute': 'Á', 'Eacute': 'É', 'Iacute': 'Í', 'Oacute': 'Ó', 'Uacute': 'Ú',
            'uuml': 'ü', 'Uuml': 'Ü',
            'iexcl': '¡', 'iquest': '¿',
            'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'nbsp': ' ',
            'middot': '·', 'laquo': '«', 'raquo': '»',
            'mdash': '\u2014', 'ndash': '\u2013',
        }
        if self._in_p:
            self._current_text.append(entities.get(name, f'&{name};'))

    def handle_charref(self, name):
        if self._in_p:
            try:
                if name.startswith('x'):
                    ch = chr(int(name[1:], 16))
                else:
                    ch = chr(int(name))
                self._current_text.append(ch)
            except (ValueError, OverflowError):
                pass


def parse_psalm_html(html_bytes):
    """
    Parse Vatican IntraText HTML for a single Psalm.
    Returns dict: {verse_number_str: full_verse_text}
    """
    html = html_bytes.decode('latin-1')

    parser = ParagraphExtractor()
    parser.feed(html)

    verses = {}
    current_verse = None
    current_lines = []

    verse_start = re.compile(r'^(\d+)\s*(.*)')

    for para in parser.paragraphs:
        m = verse_start.match(para)
        if m:
            # Save previous verse
            if current_verse is not None:
                full_text = ' '.join(line for line in current_lines if line)
                full_text = re.sub(r'\s+', ' ', full_text).strip()
                verses[str(current_verse)] = full_text

            current_verse = int(m.group(1))
            rest = m.group(2).strip()
            current_lines = [rest] if rest else []
        else:
            # Continuation hemistich line
            if current_verse is not None and para.strip():
                current_lines.append(para.strip())

    # Save last verse
    if current_verse is not None:
        full_text = ' '.join(line for line in current_lines if line)
        full_text = re.sub(r'\s+', ' ', full_text).strip()
        verses[str(current_verse)] = full_text

    return verses


def main():
    bible_path = 'frontend/public/data/bible_es.json'
    print(f"Loading {bible_path}...")
    with open(bible_path, encoding='utf-8') as f:
        data = json.load(f)

    sal = data['Sal']
    total_updated = 0
    total_verses = 0

    for psalm_num, page in enumerate(PSALM_PAGES, start=1):
        url = BASE_URL + page
        print(f"  Psalm {psalm_num:3d}/150  {page}  ", end='', flush=True)

        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
        except Exception as e:
            print(f"ERROR fetching: {e}")
            continue

        scraped = parse_psalm_html(resp.content)

        if not scraped:
            print("WARNING: no verses found!")
            continue

        chapter_key = str(psalm_num)
        if chapter_key not in sal:
            print(f"WARNING: chapter {psalm_num} not in JSON!")
            continue

        old_chapter = sal[chapter_key]
        updated = 0

        for verse_key, new_text in scraped.items():
            if verse_key in old_chapter:
                old_text = old_chapter[verse_key]
                if old_text != new_text:
                    old_chapter[verse_key] = new_text
                    updated += 1

        total_updated += updated
        total_verses += len(old_chapter)
        print(f"verses={len(old_chapter):3d}  scraped={len(scraped):3d}  updated={updated:3d}")

        time.sleep(0.15)

    print(f"\nDone. Updated {total_updated} verse texts across {total_verses} total verses.")

    print(f"Writing updated {bible_path}...")
    with open(bible_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print("Saved.")


if __name__ == '__main__':
    main()
