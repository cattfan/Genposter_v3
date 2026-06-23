"""CLI for the build pipeline (no FastAPI dependency).

Usage:
    python -m app.cli build --recipe recipes/foo.yaml --out output/_slides/foo.json
"""
import argparse
import json
import sys
from pathlib import Path

import yaml

from .build import build_job
from .config import ROOT


def _resolve(p: str) -> Path:
    path = Path(p)
    return path if path.is_absolute() else ROOT / path


def cmd_build(args) -> int:
    recipe = yaml.safe_load(open(_resolve(args.recipe), encoding="utf-8"))
    job = build_job(recipe)
    out = _resolve(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(job, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out}")
    print(f"  recipe : {job['recipe']}")
    print(f"  sheet  : {job['sheet']}  rows={job['count']}  slides={len(job['slides'])}")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="genposter-data")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build", help="build a render job from a recipe")
    b.add_argument("--recipe", required=True)
    b.add_argument("--out", required=True)
    b.set_defaults(func=cmd_build)
    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
