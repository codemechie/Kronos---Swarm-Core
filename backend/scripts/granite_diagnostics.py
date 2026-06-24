from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

os.environ["KRONOS_LLM_MODE"] = "mock"

from backend.config.runtime import reset_runtime_config

reset_runtime_config()

from backend.orchestrator.state_machine import KronosStateMachine


def run_diagnostics() -> None:
    sm = KronosStateMachine()

    for i in range(5):
        result = sm.transition()
        gr = result.granite_review
        rec = result.recommend
        v = result.validate

        print(f"=== Tick {i + 1} ===")
        print(
            f"[GRANITE] fracture={rec.fracture_metrics.fracture_index} "
            f"confidence={v.overall_confidence:.2f} "
            f"contradictions={v.contradiction_count}"
        )

        if gr is None:
            print("[GRANITE] granite_review is None!")
            continue

        print(f"[GRANITE] escalation_triggered={gr.escalation_triggered}")
        print(f"[GRANITE] skipped={gr.skipped}")
        print(f"[GRANITE] review_summary={gr.review_summary!r}")
        print(f"[GRANITE] granite_confidence={gr.granite_confidence}")
        print(f"[GRANITE] contradiction_analysis={gr.contradiction_analysis!r}")
        print(f"[GRANITE] confidence_assessment={gr.confidence_assessment!r}")
        print(f"[GRANITE] recommended_action={gr.recommended_action!r}")
        print(f"[GRANITE] provider={gr.provider!r}")

        legacy = sm.to_legacy_dict(result)
        sse_gr = legacy["granite_review"]
        print(
            "[SSE] granite_review "
            f"skipped={sse_gr['skipped']} "
            f"escalated={sse_gr['escalation_triggered']}"
        )
        print()


if __name__ == "__main__":
    run_diagnostics()
