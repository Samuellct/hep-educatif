# /// script
# requires-python = ">=3.11"
# dependencies = ["pdg==2026.0"]
# ///
"""Extract the PDG values used by the catalogue (masses, widths, lifetimes, branching fractions).

Reads the SQLite database bundled with the official `pdg` package, so no request reaches the
PDG servers. The output JSON records the edition, citation, licence and data release timestamp
of the Review of Particle Physics, plus the extraction date.

Usage:
    uv run scripts/pdg/extract_pdg.py                       # writes scripts/pdg/cache/pdg_values.json
    uv run scripts/pdg/extract_pdg.py --out path/to/file.json
"""

from __future__ import annotations

import argparse
import json
import sys
import warnings
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

warnings.filterwarnings("ignore", module="pdg")  # SQLAlchemy deprecation noise inside the package

import pdg  # noqa: E402

# Each quantity is requested by its PDG Identifier; the description returned by the database
# must match `expect`, so a renumbered identifier in a later edition fails loudly.
QUANTITIES: dict[str, list[tuple[str, str]]] = {
    "H": [
        ("S126M", "H MASS"),
        ("S126W", "H DECAY WIDTH"),
        ("S126.3", "H --> gamma gamma"),
        ("S126.2", "H --> Z Z^*"),
        ("S126.1", "H --> W W^*"),
        ("S126.4", "H --> b bbar"),
        ("S126.5", "H --> tau+ tau-"),
        ("S126.8", "H --> mu+ mu-"),
    ],
    "Z": [
        ("S044M", "Z MASS"),
        ("S044W", "Z WIDTH"),
        ("S044.1", "Z --> e+ e-"),
        ("S044.2", "Z --> mu+ mu-"),
        ("S044.8", "Z --> tau+ tau-"),
    ],
    "W+": [
        ("S043M", "W MASS"),
        ("S043W", "W WIDTH"),
        ("S043.1", "W+ --> e+ nu"),
        ("S043.2", "W+ --> mu+ nu"),
        ("S043.5", "W+ --> tau+ nu"),
        ("S043.8", "W+ --> hadrons"),
    ],
    "J/psi(1S)": [
        ("M070M", "J/psi(1S) MASS"),
        ("M070W", "J/psi(1S) WIDTH"),
        ("M070.1", "J/psi(1S) --> e+ e-"),
        ("M070.2", "J/psi(1S) --> mu+ mu-"),
    ],
    "Upsilon(1S)": [
        ("M049M", "Upsilon(1S) MASS"),
        ("M049W", "Upsilon(1S) WIDTH"),
        ("M049.2", "Upsilon(1S) --> e+ e-"),
        ("M049.1", "Upsilon(1S) --> mu+ mu-"),
    ],
    "t": [
        ("Q007TP", "t-Quark Mass (Direct Measurements)"),
    ],
    "e-": [("S003M", "e MASS")],
    "mu-": [("S004M", "mu MASS"), ("S004T", "mu MEAN LIFE tau")],
    "tau-": [("S035M", "tau MASS"), ("S035T", "tau MEAN LIFE")],
}


def summary(api: pdg.api.PdgApi, pdgid: str, expect: str) -> dict:
    item = api.get(pdgid)
    if item.description != expect:
        raise SystemExit(f"{pdgid}: expected '{expect}', database says '{item.description}'")
    best = item.best_summary()
    return {
        "pdgid": pdgid,
        "description": item.description,
        "value": best.value,
        "error_positive": best.error_positive,
        "error_negative": best.error_negative,
        "is_limit": best.is_limit,
        "units": best.units,
        "value_text": best.value_text,
        "value_type": best.value_type,
        "display_in_percent": best.display_in_percent,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=Path(__file__).parent / "cache" / "pdg_values.json")
    args = parser.parse_args()

    api = pdg.connect()
    info = {key: api.info(key) for key in ("edition", "citation", "license", "data_release_timestamp")}
    particles = {}
    for name, quantities in QUANTITIES.items():
        particle = api.get_particle_by_name(name)
        particles[name] = {
            "pdgid": particle.pdgid,
            "mcid": particle.mcid,
            "quantities": [summary(api, pdgid, expect) for pdgid, expect in quantities],
        }

    output = {
        "source": {
            **info,
            "pdg_package_version": version("pdg"),
            "extracted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "particles": particles,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    count = sum(len(p["quantities"]) for p in particles.values())
    print(f"{count} values for {len(particles)} particles, edition {info['edition']} -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
