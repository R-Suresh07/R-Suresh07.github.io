"""Extract public observations for Figure 1; no model reasoning is published.

Usage: python scripts/extract-environment-explorer.py <SMDD-Bench-main>
The generated JSON is committed, so the website does not need the source repo.
"""
import hashlib
import json
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
sources = {
    "lo": "results/blog/lead_optimization/v1/smdd_004_DHFR_11/transcript.md",
    "sh": "results/blog/scaffold_hopping/v1/smdd_003_4S0V_0__CdLrCm6/agent/transcript.md",
    "receptor": "results/blog/ipd/v1/smdd_002_P14061_0/transcript.md",
    "probes": "results/blog/ipd/v2/smdd_002_Q92769_0/transcript.md",
}
data = {}
for key, source in sources.items():
    raw = (root / source).read_bytes()
    text = raw.decode("utf-8").replace("\r\n", "\n")
    calls, features, measurements = [], [], []
    for match in re.finditer(r"## Turn (\d+)\n(.*?)(?=\n## Turn|\n## Summary|\Z)", text, re.S):
        turn, body = int(match[1]), match[2]
        for call in re.finditer(r"\*\*Tool Call:\*\* (\w+)(.*?)(?=\*\*Tool Call:|\Z)", body, re.S):
            calls.append({"turn": turn, "tool": call[1]})
            result = re.search(r"\*\*Result:\*\*\s*```(?:json)?\n(.*?)\n```", call[2], re.S)
            if not result:
                continue
            try:
                value = json.loads(result[1])
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict) and "features" in value:
                features.extend({**f, "probe": value["probe_id"], "turn": turn} for f in value["features"])
            if call[1] == "predict_admet" and isinstance(value, dict) and "clearance" in value:
                measurements.append({"turn": turn, "tool": call[1], "values": value})
            if call[1] == "predict_boltz" and isinstance(value, dict):
                outputs = value.get("boltz_outputs", value)
                if "affinity_data" in outputs:
                    measurements.append({"turn": turn, "tool": call[1], "values": outputs["affinity_data"]})
    data[key] = {"source": source, "sha256": hashlib.sha256(raw).hexdigest(), "calls": calls,
                 "features": features, "measurements": measurements}

# Six poses were predicted, but P005 feature extraction failed in the raw trace.
assert len({f["probe"] for f in data["probes"]["features"]}) == 5
assert len(data["probes"]["features"]) == 33
assert len(data["probes"]["measurements"]) == 6
assert all(c["tool"] not in ("predict_admet", "predict_boltz") for c in data["receptor"]["calls"])
out = Path(__file__).resolve().parents[1] / "src/components/figures/data/environmentObservations.json"
out.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {out.name}: {sum(len(d['calls']) for d in data.values())} tool calls, {len(data['probes']['features'])} ligand features")
