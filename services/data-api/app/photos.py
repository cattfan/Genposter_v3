"""Resolve a row's Link_drive key to real image files under data/photos/."""
from pathlib import Path

from .config import DATA, mapping
from .text import norm_key

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

_index_cache: dict[str, dict[str, Path]] = {}


def _group_index(group_slug: str) -> dict[str, Path]:
    if group_slug in _index_cache:
        return _index_cache[group_slug]
    idx: dict[str, Path] = {}
    info = (mapping().get("photos") or {}).get(group_slug)
    if info:
        base = DATA / info["path"]
        if base.exists():
            for d in base.iterdir():
                if d.is_dir():
                    idx[norm_key(d.name)] = d
    _index_cache[group_slug] = idx
    return idx


def list_images(folder: Path, limit: int | None = None) -> list[Path]:
    files = sorted(
        (f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTS),
        key=lambda p: p.name.lower(),
    )
    return files[:limit] if limit else files


def resolve_photos(group_slug: str | None, photo_key: str | None, per: int | None = None) -> list[str]:
    if not group_slug or not photo_key:
        return []
    folder = _group_index(group_slug).get(norm_key(photo_key))
    if not folder:
        return []
    return [str(p) for p in list_images(folder, per)]
