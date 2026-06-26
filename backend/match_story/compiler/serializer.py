from __future__ import annotations

import json
import os
from dataclasses import fields
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.match_story.compiler.models import (
    RuntimeFlags,
    RuntimeMetadata,
    RuntimeTimeline,
    RuntimeTimelineEvent,
    RuntimeValidationResult,
    MatchInfo,
)


def _asdict(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, (list, tuple)):
        return [_asdict(item) for item in obj]
    if isinstance(obj, dict):
        return {k: _asdict(v) for k, v in obj.items()}
    if hasattr(obj, "__dataclass_fields__"):
        result: Dict[str, Any] = {}
        for f in fields(obj):
            val = getattr(obj, f.name)
            if val is None:
                result[f.name] = None
            else:
                result[f.name] = _asdict(val)
        return result
    return obj


class RuntimeSerializer:
    def serialize(self, timeline: RuntimeTimeline) -> Dict[str, Any]:
        return _asdict(timeline)

    def to_json(self, timeline: RuntimeTimeline, indent: int = 2) -> str:
        data = self.serialize(timeline)
        return json.dumps(data, indent=indent, ensure_ascii=False)

    def write_json(
        self,
        timeline: RuntimeTimeline,
        filepath: str,
        indent: int = 2,
    ) -> str:
        json_str = self.to_json(timeline, indent=indent)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(json_str)
            f.write("\n")
        return filepath

    @staticmethod
    def generate_validation_report(
        canonical_validation_result: Any,
        runtime_validation_result: RuntimeValidationResult,
        conversion_result: Any,
        compiler_version: str,
        source_dataset: str,
        total_events: int,
    ) -> str:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        canonical_passed = getattr(canonical_validation_result, "passed", False)
        canonical_errors = getattr(canonical_validation_result, "error_count", 0)
        canonical_warnings = getattr(canonical_validation_result, "warning_count", 0)
        canonical_total = getattr(canonical_validation_result, "total_issues", 0)

        runtime_passed = runtime_validation_result.passed
        runtime_errors = runtime_validation_result.error_count
        runtime_warnings = runtime_validation_result.warning_count
        runtime_total = runtime_validation_result.total_issues

        conversion_passed = getattr(conversion_result, "passed", False) if conversion_result else True
        conversion_errors = getattr(conversion_result, "error_count", 0) if conversion_result else 0
        conversion_warnings = getattr(conversion_result, "warning_count", 0) if conversion_result else 0
        conversion_total = getattr(conversion_result, "total_issues", 0) if conversion_result else 0

        all_passed = canonical_passed and runtime_passed and (conversion_passed if conversion_result else True)
        overall = "PASS" if all_passed else "FAIL"

        lines: List[str] = []
        lines.append("# Kronos Timeline Compiler — Validation Report")
        lines.append("")
        lines.append(f"**Generated:** {now}")
        lines.append(f"**Compiler Version:** {compiler_version}")
        lines.append(f"**Source Dataset:** {source_dataset}")
        lines.append(f"**Total Events:** {total_events}")
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## Summary")
        lines.append("")
        lines.append(f"| Stage | Status | Issues | Errors | Warnings |")
        lines.append(f"|---|---|---|---|---|")
        lines.append(
            f"| Canonical Dataset Validation | {'PASS' if canonical_passed else 'FAIL'} | "
            f"{canonical_total} | {canonical_errors} | {canonical_warnings} |"
        )
        lines.append(
            f"| Conversion Validation | {'PASS' if conversion_passed else 'FAIL'} | "
            f"{conversion_total} | {conversion_errors} | {conversion_warnings} |"
        )
        lines.append(
            f"| Runtime JSON Validation | {'PASS' if runtime_passed else 'FAIL'} | "
            f"{runtime_total} | {runtime_errors} | {runtime_warnings} |"
        )
        lines.append(
            f"| **Overall** | **{overall}** | | | |"
        )
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## Validation Details")
        lines.append("")

        all_issues = []
        if hasattr(canonical_validation_result, "issues"):
            for iss in canonical_validation_result.issues:
                all_issues.append(("Canonical", iss))
        if conversion_result and hasattr(conversion_result, "issues"):
            for iss in conversion_result.issues:
                all_issues.append(("Conversion", iss))
        for iss in runtime_validation_result.issues:
            all_issues.append(("Runtime", iss))

        if not all_issues:
            lines.append("No issues found. All validations passed.")
            lines.append("")

        for stage, iss in all_issues:
            event_ref = f" event={iss.event_id}" if iss.event_id else ""
            field_ref = f" field={iss.field}" if iss.field else ""
            lines.append(f"- **[{iss.severity.value}]** [{stage}] `{iss.code}`{event_ref}{field_ref}: {iss.message}")
            lines.append("")

        lines.append("---")
        lines.append("")
        lines.append(f"*Report generated by Kronos Timeline Compiler v{compiler_version}*")

        return "\n".join(lines)

    @staticmethod
    def write_validation_report(
        report_markdown: str,
        filepath: str,
    ) -> str:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report_markdown)
            f.write("\n")
        return filepath
