#!/usr/bin/env python3
"""
Scraper de novenas desde sitios católicos de referencia.
Estrategia: página principal → links a los 9 días → contenido de cada día.

Sitios soportados:
  - https://www.aciprensa.com/  (main → /recurso/NNNN/primer-dia-...)
  - https://misionerosdigitales.com/  (mismo patrón)
  - Fallback genérico: página única con texto "DÍA N"

Genera o enriquece frontend/src/data/novenas.json

Uso:
    python3 scripts/scrape_novenas.py [--dry-run] [--quiet] [--batch N]
"""

import json
import re
import sys
import time
from html.parser import HTMLParser
import argparse

try:
    import requests
except ImportError:
    print("Instala requests: pip install requests")
    sys.exit(1)

OUTPUT_PATH = "frontend/src/data/novenas.json"
REQUEST_DELAY = 1.5
TIMEOUT = 20
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ManaAppBot/1.0)",
    "Accept-Language": "es-ES,es;q=0.9",
}

# ── Lista completa de novenas ──────────────────────────────────────────────────
# fuente "aciprensa"        → main page tiene links /recurso/NNNN/XXX-dia-...
# fuente "misioneros"       → main page tiene links /devocionario-index/.../XXX-dia/
# fuente "generic"          → página única con texto "DÍA N" / "Día N:"
#
# Las novenas ya en el JSON (≥9 días) se saltan automáticamente.
# Usar --batch N para procesar solo N nuevas por ejecución (default: 2).

NOVENA_URLS = [
    # ── YA EN EL JSON (se saltan automáticamente) ──────────────────────────
    # Novena al Sagrado Corazón de Jesús   (id=4)
    # Novena a la Divina Misericordia      (id=6)
    # Novena a San José                    (id=3)
    # Novena a San Judas Tadeo             (id=5)

    # ── ACI PRENSA ─────────────────────────────────────────────────────────
    {
        "nombre": "Novena al Niño Jesús",
        "santo": "Niño Jesús",
        "categoria": "jesus",
        "main_url": "https://www.aciprensa.com/recurso/1024/novena-de-navidad-2024",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Cristo Rey",
        "santo": "Cristo Rey",
        "categoria": "jesus",
        "main_url": "https://www.aciprensa.com/recurso/1489/novena-a-jesucristo-rey-del-universo",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Nuestra Señora de Guadalupe",
        "santo": "Virgen de Guadalupe",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/1014/novena-a-la-virgen-de-guadalupe",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Nuestra Señora de Lourdes",
        "santo": "Virgen de Lourdes",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/671/novena-a-la-virgen-de-lourdes-2021",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Nuestra Señora de Fátima",
        "santo": "Virgen de Fátima",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/1075/novena-a-la-virgen-de-fatima-2022",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a la Inmaculada Concepción",
        "santo": "Inmaculada Concepción",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/1004/novena-a-la-inmaculada-concepcion",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a la Virgen del Carmen",
        "santo": "Virgen del Carmen",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/722/novena-a-la-virgen-del-carmen-2022",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Nuestra Señora del Rosario",
        "santo": "Nuestra Señora del Rosario",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/902/novena-a-nuestra-senora-del-rosario",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a la Virgen de la Medalla Milagrosa",
        "santo": "Virgen de la Medalla Milagrosa",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/992/novena-a-la-virgen-de-la-medalla-milagrosa",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Nuestra Señora del Perpetuo Socorro",
        "santo": "Nuestra Señora del Perpetuo Socorro",
        "categoria": "maria",
        "main_url": "https://www.aciprensa.com/recurso/1165/novena-a-nuestra-senora-del-perpetuo-socorro",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Miguel Arcángel",
        "santo": "San Miguel Arcángel",
        "categoria": "santos",
        "main_url": "https://misionerosdigitales.com/devocionario-index/novena-a-san-miguel-arcangel/",
        "fuente": "misioneros",
    },
    # San Gabriel y San Rafael Arcángel — URLs no encontradas aún
    {
        "nombre": "Novena al Ángel de la Guarda",
        "santo": "Ángel de la Guarda",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/862/novena-a-los-angeles-custodios",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Antonio de Padua",
        "santo": "San Antonio de Padua",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/691/novena-a-san-antonio-de-padua-2022",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Benito de Nursia",
        "santo": "San Benito",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/1175/novena-a-san-benito-2022",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Francisco de Asís",
        "santo": "San Francisco de Asís",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/882/novena-a-san-francisco-de-asis",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Ignacio de Loyola",
        "santo": "San Ignacio de Loyola",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/732/novena-a-san-ignacio-de-loyola",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Pío de Pietrelcina",
        "santo": "San Pío de Pietrelcina (Padre Pío)",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/822/novena-a-san-pio-de-pietrelcina",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Juan Pablo II",
        "santo": "San Juan Pablo II",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/942/novena-a-san-juan-pablo-ii",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Juan Bosco",
        "santo": "San Juan Bosco",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/1045/novena-a-san-juan-bosco",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Martín de Porres",
        "santo": "San Martín de Porres",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/972/novena-a-san-martin-de-porres",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Santa Rita de Casia",
        "santo": "Santa Rita de Casia",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/1449/novena-a-santa-rita-de-casia",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Santa Teresita del Niño Jesús",
        "santo": "Santa Teresita del Niño Jesús",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/842/novena-a-santa-teresita-del-nino-jesus",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Santa Teresa de Ávila",
        "santo": "Santa Teresa de Ávila",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/932/novena-a-santa-teresa-de-jesus",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a Santa Mónica",
        "santo": "Santa Mónica",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/772/novena-a-santa-monica",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena al Señor de los Milagros",
        "santo": "Señor de los Milagros",
        "categoria": "jesus",
        "main_url": "https://www.aciprensa.com/recurso/1308/novena-al-senor-de-los-milagros",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena al Divino Niño Jesús",
        "santo": "Divino Niño Jesús",
        "categoria": "jesus",
        "main_url": "https://www.aciprensa.com/recurso/1195/novena-al-divino-nino-2022",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a las Almas del Purgatorio",
        "santo": "Almas del Purgatorio",
        "categoria": "especial",
        "main_url": "https://www.aciprensa.com/recurso/962/novena-por-las-almas-del-purgatorio",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a la Santa Cruz",
        "santo": "Santa Cruz",
        "categoria": "especial",
        "main_url": "https://www.aciprensa.com/recurso/812/novena-por-la-fiesta-de-la-exaltacion-de-la-cruz",
        "fuente": "aciprensa",
    },
    {
        "nombre": "Novena a San Charbel",
        "santo": "San Charbel",
        "categoria": "santos",
        "main_url": "https://www.aciprensa.com/recurso/1469/novena-a-san-charbel",
        "fuente": "aciprensa",
    },
    # San Nicolás de Tolentino — URL no encontrada aún

    # ── MISIONEROS DIGITALES ────────────────────────────────────────────────
    {
        "nombre": "Novena a la Virgen de Luján",
        "santo": "Virgen de Luján",
        "categoria": "maria",
        "main_url": "https://misionerosdigitales.com/devocionario-index/novena-a-nuestra-senora-de-lujan/",
        "fuente": "misioneros",
    },
    {
        "nombre": "Novena a San José Obrero",
        "santo": "San José Obrero",
        "categoria": "santos",
        "main_url": "https://misionerosdigitales.com/devocionario-index/novena-a-san-jose-para-agradecer-y-pedir-trabajo/",
        "fuente": "misioneros",
    },
    {
        "nombre": "Novena de los 7 Dolores y Gozos de San José",
        "santo": "San José",
        "categoria": "santos",
        "main_url": "https://misionerosdigitales.com/devocionario-index/novena-honor-san-jose-dormido/",
        "fuente": "misioneros",
    },

    # ── DEVOCIONARIO.COM ────────────────────────────────────────────────────
    {
        "nombre": "Novena a la Virgen de la Caridad del Cobre",
        "santo": "Virgen de la Caridad del Cobre",
        "categoria": "maria",
        "main_url": "https://www.devocionario.com/maria/caridad_del_cobre_2.html",
        "fuente": "generic",
    },
    {
        "nombre": "Novena a San Cayetano",
        "santo": "San Cayetano",
        "categoria": "santos",
        "main_url": "https://www.devocionario.com/santos/cayetano_2.html",
        "fuente": "generic",
    },
    {
        "nombre": "Novena a Santa Clara de Asís",
        "santo": "Santa Clara de Asís",
        "categoria": "santos",
        "main_url": "https://www.devocionario.com/santos/clara_2.html",
        "fuente": "generic",
    },
    # San Expedito — devocionario.com 404, URL no encontrada
    # San Roque — devocionario.com 404, URL no encontrada
    # San Lorenzo — devocionario.com 404, URL no encontrada
    # Virgen de Medjugorje — devocionario.com 404, URL no encontrada
    # Virgen de Aparecida — devocionario.com 404, URL no encontrada
    # Preciosísima Sangre — URL no encontrada
    {
        "nombre": "Novena a la Virgen de San Juan de los Lagos",
        "santo": "Virgen de San Juan de los Lagos",
        "categoria": "maria",
        "main_url": "https://desdelafe.mx/oraciones/novena-virgen-san-juan-de-los-lagos/",
        "fuente": "generic",
    },

    # ── TODO: pendientes ────────────────────────────────────────────────────
    # Novena a Santa Elena  (devocionario.com solo tiene oraciones, no novena)
]

# ── HTML Parser ────────────────────────────────────────────────────────────────

class TextExtractor(HTMLParser):
    SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside"}
    BLOCK_TAGS = {"p", "br", "div", "h1", "h2", "h3", "h4", "li", "td", "tr"}

    def __init__(self):
        super().__init__()
        self._skip = 0
        self.parts: list[str] = []
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP_TAGS:
            self._skip += 1
        if tag == "a":
            href = dict(attrs).get("href", "")
            if href and "dia" in href.lower() and (
                "recurso" in href or "devocionario" in href
            ):
                self.links.append(href)

    def handle_endtag(self, tag):
        if tag in self.SKIP_TAGS:
            self._skip = max(0, self._skip - 1)
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._skip == 0:
            self.parts.append(data)

    def get_text(self) -> str:
        raw = "".join(self.parts)
        lines = [l.strip() for l in raw.splitlines()]
        return "\n".join(l for l in lines if l)


def fetch(url: str) -> str | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except Exception as e:
        print(f"  [ERROR] {url}: {e}")
        return None


def parse_html(html: str) -> TextExtractor:
    parser = TextExtractor()
    parser.feed(html)
    return parser


# ── Patrones de extracción ─────────────────────────────────────────────────────

_FIXED_SECTION = re.compile(
    r"^(Padre nuestro|Dios te salve|Gloria al Padre|Acto de Contrición|"
    r"Letanías|Oraciones Finales|Cordero de Dios|Señor, ten piedad|"
    r"Cristo, ten piedad|Cristo, óyenos|Ruega por nosotros|"
    r"Últimas noticias|Calendario|Las más leídas|Videos)",
    re.IGNORECASE,
)

_ORACION_HEADING = re.compile(r"^Oración\s+(?:a |al |de |en honor)", re.IGNORECASE)

_DIA_HEADING = re.compile(
    r"^(?:Primer|Segundo|Tercer|Cuarto|Quinto|Sexto|Séptimo|Séptimo|Octavo|Noveno)"
    r"\s+[Dd]ía\s*[:\-–]\s*(.+)",
    re.IGNORECASE,
)

_DIA_NUM_RE = re.compile(
    r"D[ÍI]A\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve"
    r"|primero|segundo|tercero|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno)",
    re.IGNORECASE,
)

_ORD_MAP = {
    "primer": 1, "primero": 1, "segundo": 2, "tercer": 3, "tercero": 3, "cuarto": 4,
    "quinto": 5, "sexto": 6, "séptimo": 7, "septimo": 7,
    "octavo": 8, "noveno": 9,
    "uno": 1, "dos": 2, "tres": 3, "cuatro": 4,
    "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9,
}

_BODY_STOP = re.compile(
    r"^(Coronilla|Últimas noticias|Calendario|Las más leídas|Videos)",
    re.IGNORECASE,
)

_NAV_LINE = re.compile(
    r"^(Portada|Recursos|Oraciones|Novenas|Novena a |Novena al |"
    r"Primer día|Segundo día|Tercer día|Cuarto día|Quinto día|"
    r"Sexto día|Séptimo día|Octavo día|Noveno día)",
    re.IGNORECASE,
)


def extract_day_number_from_url(url: str) -> int | None:
    m = re.search(
        r"(primer|segundo|tercer|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno)[-_]dia",
        url, re.IGNORECASE,
    )
    if m:
        key = m.group(1).lower().replace("é", "e")
        return _ORD_MAP.get(key)
    return None


def parse_day_page(html: str, url: str) -> dict | None:
    p = parse_html(html)
    lines = [l for l in p.get_text().splitlines() if l.strip()]

    # Número de día
    dia_num = extract_day_number_from_url(url)
    if dia_num is None:
        for line in lines[:25]:
            word = re.match(
                r"(primer|segundo|tercer|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno)\s+d[ií]a",
                line, re.IGNORECASE,
            )
            if word:
                key = word.group(1).lower().replace("é", "e")
                dia_num = _ORD_MAP.get(key)
                break

    if dia_num is None:
        return None

    # Título
    titulo = f"Día {dia_num}"
    for line in lines:
        m = _DIA_HEADING.match(line)
        if m:
            tema = m.group(1).strip()
            if tema:
                titulo = f"Día {dia_num}: {tema}"
            break

    # Oración principal
    oracion_lines: list[str] = []
    in_oracion = False
    for line in lines:
        if _ORACION_HEADING.match(line):
            in_oracion = True
            continue
        if in_oracion:
            if _FIXED_SECTION.match(line) or _DIA_HEADING.match(line):
                break
            if re.match(r"^(Letanías|Oraciones|Padre |Dios te|Cordero|Gloria)", line, re.IGNORECASE):
                break
            oracion_lines.append(line)

    # Reflexión del día
    reflexion_lines: list[str] = []
    in_reflexion = False
    for line in lines:
        if _DIA_HEADING.match(line):
            in_reflexion = True
            continue
        if in_reflexion:
            if _FIXED_SECTION.match(line):
                break
            if re.match(r"^(Padre nuestro|Dios te|Gloria|Oraciones Finales)", line, re.IGNORECASE):
                break
            reflexion_lines.append(line)

    oracion = "\n\n".join(oracion_lines).strip()
    reflexion = "\n\n".join(reflexion_lines[:6]).strip()

    # Fallback: cuerpo principal para páginas sin "Oración a..."
    if not oracion:
        body_lines: list[str] = []
        past_nav = False
        for line in lines:
            if not past_nav:
                if _NAV_LINE.match(line):
                    continue
                if len(line) > 40:
                    past_nav = True
            if past_nav:
                if _BODY_STOP.match(line):
                    break
                body_lines.append(line)
        oracion = "\n\n".join(body_lines).strip()

    if not oracion and reflexion:
        oracion = reflexion
        reflexion = ""

    if not oracion:
        return None

    return {
        "dia": dia_num,
        "titulo": titulo[:150],
        "reflexion": reflexion[:800],
        "oracion": oracion[:2000],
    }


# ── Parser genérico: página única con todos los días ──────────────────────────

def parse_single_page_novena(html: str) -> list[dict]:
    """Para sitios que ponen los 9 días en una sola página."""
    p = parse_html(html)
    text = p.get_text()
    lines = [l for l in text.splitlines() if l.strip()]

    splits = list(_DIA_NUM_RE.finditer(text))
    if len(splits) < 7:
        return []

    days: list[dict] = []
    for i, m in enumerate(splits):
        num_str = m.group(1).lower()
        num = _ORD_MAP.get(num_str)
        if num is None:
            try:
                num = int(num_str)
            except ValueError:
                continue

        start = m.start()
        end = splits[i + 1].start() if i + 1 < len(splits) else len(text)
        body = text[start:end].strip()
        body_lines = [l.strip() for l in body.splitlines() if l.strip()]

        titulo = body_lines[0][:120] if body_lines else f"Día {num}"
        paragraphs = [l for l in body_lines[1:] if len(l) > 30]
        reflexion = paragraphs[0][:800] if paragraphs else ""
        oracion = "\n\n".join(paragraphs[1:])[:2000] if len(paragraphs) > 1 else reflexion

        if not oracion and reflexion:
            oracion = reflexion
            reflexion = ""

        if oracion and 1 <= num <= 9:
            days.append({"dia": num, "titulo": titulo, "reflexion": reflexion, "oracion": oracion})

    seen: set[int] = set()
    result = []
    for d in sorted(days, key=lambda x: x["dia"]):
        if d["dia"] not in seen:
            seen.add(d["dia"])
            result.append(d)
    return result


# ── Scraper de una novena ──────────────────────────────────────────────────────

def scrape_novena(target: dict, quiet: bool = False) -> list[dict]:
    fuente = target.get("fuente", "aciprensa")
    main_url = target["main_url"]

    if not quiet:
        print(f"  Descargando índice: {main_url}")

    html = fetch(main_url)
    if not html:
        return []

    # Fuente genérica (single-page)
    if fuente == "generic":
        days = parse_single_page_novena(html)
        if not quiet:
            print(f"  Días en página única: {len(days)}")
        return days

    # Multi-page (aciprensa, misioneros)
    p = parse_html(html)
    seen: set[str] = set()
    day_links: list[str] = []
    for link in p.links:
        if link not in seen:
            seen.add(link)
            day_links.append(link)

    if not quiet:
        print(f"  Links de días: {len(day_links)}")

    if len(day_links) < 7:
        # Intentar fallback genérico
        days = parse_single_page_novena(html)
        if days:
            if not quiet:
                print(f"  Fallback single-page: {len(days)} días")
            return days
        if not quiet:
            print(f"  [WARN] Pocos links ({len(day_links)})")

    days: list[dict] = []
    for link in day_links[:9]:
        time.sleep(REQUEST_DELAY)
        if not quiet:
            print(f"    → {link}")
        day_html = fetch(link)
        if not day_html:
            continue
        day = parse_day_page(day_html, link)
        if day:
            days.append(day)
            if not quiet:
                print(f"      Día {day['dia']}: {day['titulo'][:60]}")
        else:
            if not quiet:
                print(f"      [WARN] No se pudo parsear")

    days.sort(key=lambda d: d["dia"])
    return days


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="No escribe el JSON")
    parser.add_argument("--quiet", action="store_true",
                        help="Suprime logs por día (solo muestra resumen)")
    parser.add_argument("--batch", type=int, default=2,
                        help="Procesar solo N novenas nuevas por ejecución (default: 2)")
    args = parser.parse_args()

    try:
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            existing: list[dict] = json.load(f)
    except FileNotFoundError:
        existing = []

    existing_by_name = {n["nombre"]: n for n in existing}
    next_id = max((n["id"] for n in existing), default=0) + 1

    results: list[dict] = list(existing)
    scraped_count = 0
    skipped_count = 0
    failed: list[str] = []
    batch_remaining = args.batch

    for target in NOVENA_URLS:
        nombre = target["nombre"]

        if nombre in existing_by_name:
            dias_actuales = existing_by_name[nombre].get("dias", [])
            if len(dias_actuales) >= 9:
                skipped_count += 1
                continue

        if batch_remaining <= 0:
            print(f"  [BATCH] Límite alcanzado. Quedan novenas pendientes.")
            break

        print(f"\n{'─'*60}")
        print(f"Novena: {nombre}")

        days = scrape_novena(target, quiet=args.quiet)
        print(f"  Días parseados: {len(days)}")

        if len(days) >= 7:
            if nombre in existing_by_name:
                existing_by_name[nombre]["dias"] = days
                print("  [OK] Actualizado.")
            else:
                entry = {
                    "id": next_id,
                    "nombre": nombre,
                    "santo": target.get("santo", nombre),
                    "categoria": target.get("categoria", "especial"),
                    "descripcion": "",
                    "intencionSugerida": "",
                    "autor": "Tradición de la Iglesia",
                    "fuente": target["main_url"],
                    "dias": days,
                }
                results.append(entry)
                existing_by_name[nombre] = entry
                next_id += 1
                scraped_count += 1
                print(f"  [OK] Agregada (id={entry['id']}).")
            batch_remaining -= 1
        else:
            failed.append(f"{nombre} ({len(days)} días)")
            batch_remaining -= 1

        time.sleep(REQUEST_DELAY)

    total_en_json = len([n for n in results if len(n.get("dias", [])) >= 9])
    total_pendientes = len([t for t in NOVENA_URLS
                            if t["nombre"] not in existing_by_name
                            or len(existing_by_name[t["nombre"]].get("dias", [])) < 9])

    print(f"\n{'='*60}")
    print(f"Esta ejecución → OK: {scraped_count} | Fallidas: {len(failed)} | Saltadas (ya OK): {skipped_count}")
    print(f"Total en JSON: {total_en_json} novenas completas")
    if failed:
        print(f"Fallidas:")
        for f in failed:
            print(f"  - {f}")

    if not args.dry_run:
        with open(OUTPUT_PATH, "w", encoding="utf-8") as fp:
            json.dump(results, fp, ensure_ascii=False, indent=2)
        print(f"\nJSON guardado: {OUTPUT_PATH} ({len(results)} novenas).")
    else:
        print("\n[DRY RUN] No se escribió el JSON.")


if __name__ == "__main__":
    main()
