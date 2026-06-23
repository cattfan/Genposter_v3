"""FastAPI server for the desktop app.

Run: uvicorn app.main:app --port 8756
(Only needed for the desktop app; the batch pipeline uses app.cli directly.)
"""
from pathlib import Path

import json

import yaml
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .build import build_job, canonical_rows
from .config import DATA, OUTPUT, RECIPES, ROOT, TEMPLATES, mapping, xlsx_path
from .excel import read_sheet

app = FastAPI(title="Genposter data-api", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "root": str(ROOT)}


@app.get("/sheets")
def sheets():
    result = []
    for name, info in (mapping().get("sheets") or {}).items():
        entry = {"sheet": name, "label": info.get("label", name), "photos": info.get("photos")}
        try:
            headers, rows = read_sheet(str(xlsx_path()), name)
            entry["rows"] = len(rows)
            entry["columns"] = headers
        except Exception as e:  # noqa: BLE001
            entry["error"] = str(e)
        result.append(entry)
    return result


@app.get("/sheets/{sheet}/rows")
def sheet_rows(sheet: str, limit: int = Query(20, ge=1, le=500)):
    try:
        _, rows = canonical_rows(sheet)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    for it in rows:
        it.pop("_raw", None)
    return {"sheet": sheet, "count": len(rows), "rows": rows[:limit]}


@app.get("/recipes")
def recipes():
    out = []
    if RECIPES.exists():
        for f in sorted(RECIPES.glob("*.yaml")):
            try:
                r = yaml.safe_load(open(f, encoding="utf-8")) or {}
                out.append(
                    {
                        "file": f.name,
                        "name": r.get("name"),
                        "template_id": r.get("template_id"),
                        "sheet": (r.get("data") or {}).get("sheet"),
                    }
                )
            except Exception as e:  # noqa: BLE001
                out.append({"file": f.name, "error": str(e)})
    return out


@app.post("/build")
def build(recipe: dict):
    try:
        return build_job(recipe)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/build-file")
def build_file(body: dict):
    name = body.get("recipe")
    if not name:
        raise HTTPException(status_code=400, detail="body.recipe (file name) required")
    f = RECIPES / name
    if not f.exists():
        raise HTTPException(status_code=404, detail=f"recipe not found: {name}")
    recipe = yaml.safe_load(open(f, encoding="utf-8")) or {}
    return build_job(recipe)


@app.get("/file")
def file(path: str):
    """Serve a local image, restricted to data/ and output/ for safety."""
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / path
    p = p.resolve()
    allowed = (str(DATA.resolve()), str(OUTPUT.resolve()))
    if not str(p).startswith(allowed):
        raise HTTPException(status_code=403, detail="forbidden path")
    if not p.exists():
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(str(p))


@app.get("/templates")
def list_templates():
    out = []
    if TEMPLATES.exists():
        for f in sorted(TEMPLATES.glob("*.json")):
            try:
                j = json.loads(f.read_text(encoding="utf-8"))
                out.append(
                    {
                        "id": j.get("id", f.stem),
                        "name": j.get("name"),
                        "archetype": j.get("archetype"),
                        "file": f.name,
                    }
                )
            except Exception as e:  # noqa: BLE001
                out.append({"id": f.stem, "file": f.name, "error": str(e)})
    return out


@app.get("/templates/{template_id}")
def get_template(template_id: str):
    f = TEMPLATES / f"{template_id}.json"
    if not f.exists():
        raise HTTPException(status_code=404, detail="template not found")
    return json.loads(f.read_text(encoding="utf-8"))


@app.put("/templates/{template_id}")
def save_template(template_id: str, body: dict):
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in template_id)
    if not body.get("id"):
        body["id"] = safe
    f = TEMPLATES / f"{safe}.json"
    f.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "id": safe, "path": str(f)}
