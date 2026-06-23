"""Turn a recipe into a render job (slide payload)."""
from typing import Any

from .config import mapping, xlsx_path
from .excel import read_sheet
from .paginate import chunk
from .photos import resolve_photos
from .text import norm_cmp


def _clean(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def canonical_rows(sheet: str):
    """Return (sheet_mapping, rows) with rows mapped to canonical fields.

    Each row keeps a private "_raw" dict (original headers) for filtering.
    """
    m = (mapping().get("sheets") or {}).get(sheet)
    if not m:
        raise ValueError(f"Unknown sheet: {sheet}")
    fields: dict[str, str] = m.get("fields", {})
    _, rows = read_sheet(str(xlsx_path()), sheet)
    out = []
    for r in rows:
        item: dict[str, Any] = {canon: _clean(r.get(header)) for canon, header in fields.items()}
        item["_raw"] = r
        out.append(item)
    return m, out


def apply_filter(rows, filt: dict[str, str] | None):
    if not filt:
        return rows
    result = []
    for it in rows:
        raw = it.get("_raw", {})
        if all(norm_cmp(raw.get(col)) == norm_cmp(val) for col, val in filt.items()):
            result.append(it)
    return result


def build_job(recipe: dict) -> dict:
    data = recipe.get("data") or {}
    sheet = data.get("sheet")
    if not sheet:
        raise ValueError("recipe.data.sheet is required")

    m, rows = canonical_rows(sheet)
    rows = apply_filter(rows, data.get("filter"))
    limit = data.get("limit")
    if limit:
        rows = rows[: int(limit)]

    group = m.get("photos")
    photo_cfg = recipe.get("photos") or {}
    per_item = int(photo_cfg.get("per_item", 1))
    per_slide = int(photo_cfg.get("per_slide", 0))

    for it in rows:
        it["photos"] = resolve_photos(group, it.get("photo_key"), per_item) if group else []
        it.pop("_raw", None)

    items_per = int(data.get("items_per_slide", 7))
    pages = chunk(rows, items_per)
    title = recipe.get("title") or recipe.get("name", "")
    subtitle = recipe.get("subtitle", "")

    slides = []
    for i, page in enumerate(pages, 1):
        slide_photos: list[str] = []
        if per_slide:
            for it in page:
                for p in it.get("photos", []):
                    if p not in slide_photos:
                        slide_photos.append(p)
                    if len(slide_photos) >= per_slide:
                        break
                if len(slide_photos) >= per_slide:
                    break
        slides.append(
            {
                "index": i,
                "page": i,
                "pages": len(pages),
                "title": title,
                "subtitle": subtitle,
                "items": page,
                "photos": slide_photos,
            }
        )

    return {
        "recipe": recipe.get("name", ""),
        "templateId": recipe.get("template_id", ""),
        "sheet": sheet,
        "count": len(rows),
        "output": recipe.get("output", {}),
        "slides": slides,
    }
