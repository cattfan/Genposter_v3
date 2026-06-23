"""Paths and mapping.yaml loader."""
from pathlib import Path
import yaml

# app/config.py -> data-api -> services -> repo root
ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"
OUTPUT = ROOT / "output"
TEMPLATES = ROOT / "templates"
RECIPES = ROOT / "recipes"
MAPPING_PATH = DATA / "mapping.yaml"

_mapping_cache = None


def mapping() -> dict:
    global _mapping_cache
    if _mapping_cache is None:
        with open(MAPPING_PATH, encoding="utf-8") as f:
            _mapping_cache = yaml.safe_load(f)
    return _mapping_cache


def xlsx_path() -> Path:
    return DATA / mapping()["database"]
