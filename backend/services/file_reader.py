"""
file_reader.py — Lecture universelle de fichiers tabulaires

Formats supportés :
  .csv, .tsv, .txt   — texte délimité (détection auto séparateur + encodage)
  .xlsx, .xlsm       — Excel moderne (openpyxl)
  .xls               — Excel 97-2003 (xlrd, supporte fichiers corrompus Bizouk)
  .xlsb              — Excel binaire (pyxlsb)
  .ods               — LibreOffice Calc (odfpy)
  .parquet           — Apache Parquet (pyarrow / fastparquet)
  .json, .jsonl      — JSON ligne ou tableau
  .ndjson            — Newline-delimited JSON
  .feather           — Apache Feather
  .pkl, .pickle      — Pickle pandas

Pour chaque format on tente plusieurs moteurs/encodages en cascade
et on retourne un DataFrame normalisé.
"""

import io
import pandas as pd
from pathlib import Path
from typing import Optional


# ── Helpers ────────────────────────────────────────────────────────────────────

ENCODINGS = ('utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'iso-8859-15')

SHEET_KEYWORDS = [
    'participant', 'commande', 'order', 'billet', 'ticket',
    'data', 'données', 'sheet1', 'feuil1', 'export', 'rapport',
]


def _best_sheet(sheet_names: list) -> str:
    """Retourne l'onglet le plus pertinent parmi les noms disponibles."""
    for s in sheet_names:
        if any(k in s.lower() for k in SHEET_KEYWORDS):
            return s
    return sheet_names[0]


# ── Lecteurs par format ────────────────────────────────────────────────────────

def _read_csv(data: bytes, filename: str) -> pd.DataFrame:
    """CSV, TSV, TXT — détection auto du séparateur et de l'encodage."""
    for enc in ENCODINGS:
        try:
            df = pd.read_csv(
                io.BytesIO(data),
                sep=None,
                engine='python',
                encoding=enc,
                on_bad_lines='skip',
            )
            if not df.empty:
                return df
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue
    raise ValueError(f"Impossible de décoder le fichier texte : {filename}")


def _read_xlsx(data: bytes, filename: str) -> pd.DataFrame:
    """Excel moderne .xlsx / .xlsm — openpyxl."""
    xl = pd.ExcelFile(io.BytesIO(data), engine='openpyxl')
    sheet = _best_sheet(xl.sheet_names)
    return xl.parse(sheet)


def _read_xls(data: bytes, filename: str) -> pd.DataFrame:
    """Excel ancien .xls — xlrd avec ignore_workbook_corruption."""
    try:
        import xlrd  # noqa: F401
    except ImportError:
        raise ValueError("xlrd non installé. Lancer : pip install xlrd")

    try:
        return pd.read_excel(
            io.BytesIO(data),
            engine='xlrd',
            engine_kwargs={'ignore_workbook_corruption': True},
        )
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier .xls : {e}")


def _read_xlsb(data: bytes, filename: str) -> pd.DataFrame:
    """Excel binaire .xlsb — pyxlsb."""
    try:
        import pyxlsb  # noqa: F401
    except ImportError:
        raise ValueError("pyxlsb non installé. Lancer : pip install pyxlsb")
    xl = pd.ExcelFile(io.BytesIO(data), engine='pyxlsb')
    sheet = _best_sheet(xl.sheet_names)
    return xl.parse(sheet)


def _read_ods(data: bytes, filename: str) -> pd.DataFrame:
    """LibreOffice .ods — odfpy ou openpyxl."""
    try:
        return pd.read_excel(io.BytesIO(data), engine='odf')
    except Exception:
        # Fallback openpyxl pour certains .ods compatibles
        try:
            return pd.read_excel(io.BytesIO(data), engine='openpyxl')
        except Exception as e:
            raise ValueError(f"Impossible de lire le fichier .ods : {e}")


def _read_parquet(data: bytes, filename: str) -> pd.DataFrame:
    """Apache Parquet — pyarrow (préféré) ou fastparquet."""
    try:
        return pd.read_parquet(io.BytesIO(data))
    except ImportError:
        raise ValueError("pyarrow non installé. Lancer : pip install pyarrow")
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Parquet : {e}")


def _read_json(data: bytes, filename: str) -> pd.DataFrame:
    """JSON — tableau ou newline-delimited JSON."""
    text = None
    for enc in ENCODINGS:
        try:
            text = data.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError("Encodage JSON non reconnu")

    text = text.strip()

    # JSONL / NDJSON : chaque ligne est un objet JSON
    if text.startswith('{'):
        try:
            return pd.read_json(io.StringIO(text), lines=True)
        except Exception:
            pass

    # Tableau JSON standard
    try:
        return pd.read_json(io.StringIO(text))
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier JSON : {e}")


def _read_feather(data: bytes, filename: str) -> pd.DataFrame:
    """Apache Feather."""
    try:
        return pd.read_feather(io.BytesIO(data))
    except ImportError:
        raise ValueError("pyarrow non installé. Lancer : pip install pyarrow")
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Feather : {e}")


def _read_pickle(data: bytes, filename: str) -> pd.DataFrame:
    """Pickle pandas."""
    try:
        df = pd.read_pickle(io.BytesIO(data))
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Le fichier pickle ne contient pas un DataFrame")
        return df
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Pickle : {e}")


# ── Dispatch ───────────────────────────────────────────────────────────────────

READERS = {
    '.csv':     _read_csv,
    '.tsv':     _read_csv,
    '.txt':     _read_csv,
    '.xlsx':    _read_xlsx,
    '.xlsm':    _read_xlsx,
    '.xls':     _read_xls,
    '.xlsb':    _read_xlsb,
    '.ods':     _read_ods,
    '.parquet': _read_parquet,
    '.pq':      _read_parquet,
    '.json':    _read_json,
    '.jsonl':   _read_json,
    '.ndjson':  _read_json,
    '.feather': _read_feather,
    '.pkl':     _read_pickle,
    '.pickle':  _read_pickle,
}

SUPPORTED_EXTENSIONS = sorted(READERS.keys())


def read_file(data: bytes, filename: str) -> pd.DataFrame:
    """
    Point d'entrée principal.
    Lit n'importe quel fichier tabulaire supporté et retourne un DataFrame.

    Lève ValueError avec un message lisible en cas d'échec.
    """
    ext = Path(filename.lower()).suffix

    if ext not in READERS:
        # Essayer CSV en dernier recours (fichiers sans extension ou extension inconnue)
        try:
            return _read_csv(data, filename)
        except Exception:
            supported = ', '.join(SUPPORTED_EXTENSIONS)
            raise ValueError(
                f"Format non supporté : '{ext}'. "
                f"Formats acceptés : {supported}"
            )

    reader = READERS[ext]
    return reader(data, filename)
