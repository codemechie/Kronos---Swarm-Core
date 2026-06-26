from __future__ import annotations

from typing import List, Set

from backend.match_story.compiler.models import (
    CanonicalAnchor,
    CanonicalDataset,
    EventType,
    ValidationIssue,
    ValidationResult,
    ValidationSeverity,
)


def validate_dataset(dataset: CanonicalDataset) -> ValidationResult:
    issues: List[ValidationIssue] = []
    anchors = dataset.anchors
    seen_ids: Set[str] = set()

    # Validate per-anchor rules across all anchors
    for idx, anchor in enumerate(anchors):
        _validate_required_fields(anchor, idx, issues)
        _validate_event_id_uniqueness(anchor, seen_ids, issues)
        _validate_match_period_consistency(anchor, idx, issues)
        _validate_importance_range(anchor, idx, issues)

    # Validate chronology and score progression on chronologically sorted order
    # (anchors are grouped by Part section in the document, not chronological)
    sorted_anchors = sorted(
        anchors,
        key=lambda a: (a.minute, a.stoppage_time if a.stoppage_time is not None else -1),
    )
    previous_minute = -1
    previous_stoppage: int = -1
    for idx, anchor in enumerate(sorted_anchors):
        _validate_chronology(anchor, idx, previous_minute, previous_stoppage, issues)
        _validate_score_progression(anchor, idx, sorted_anchors, issues)
        previous_minute = anchor.minute
        previous_stoppage = anchor.stoppage_time if anchor.stoppage_time is not None else -1

    error_count = sum(1 for iss in issues if iss.severity == ValidationSeverity.ERROR)
    warning_count = sum(1 for iss in issues if iss.severity == ValidationSeverity.WARNING)

    return ValidationResult(
        passed=error_count == 0,
        issues=issues,
        total_anchors=len(anchors),
        unique_event_ids=len(seen_ids),
        total_issues=len(issues),
        error_count=error_count,
        warning_count=warning_count,
    )


def _validate_required_fields(
    anchor: CanonicalAnchor, idx: int, issues: List[ValidationIssue]
) -> None:
    required = [
        ("event_id", anchor.event_id),
        ("minute", anchor.minute),
        ("match_period", anchor.match_period),
        ("event_type", anchor.event_type),
        ("importance", anchor.importance),
        ("score_after_event", anchor.score_after_event),
        ("source_confidence", anchor.source_confidence),
        ("narrative_notes", anchor.narrative_notes),
        ("source_references", anchor.source_references),
    ]
    for field_name, value in required:
        if value is None or (isinstance(value, str) and not value):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="MISSING_REQUIRED_FIELD",
                    message=f"Anchor {idx}: required field '{field_name}' is missing or empty",
                    event_id=anchor.event_id,
                    field=field_name,
                )
            )

    if anchor.event_type == EventType.CARD and anchor.card_type is not None:
        if anchor.card_type.value not in ("YELLOW", "RED", "SECOND_YELLOW"):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="INVALID_CARD_TYPE",
                    message=f"Anchor '{anchor.event_id}': unrecognised card_type '{anchor.card_type.value}'",
                    event_id=anchor.event_id,
                    field="card_type",
                )
            )


def _validate_event_id_uniqueness(
    anchor: CanonicalAnchor, seen_ids: Set[str], issues: List[ValidationIssue]
) -> None:
    if anchor.event_id in seen_ids:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="DUPLICATE_EVENT_ID",
                message=f"Duplicate event_id '{anchor.event_id}'",
                event_id=anchor.event_id,
                field="event_id",
            )
        )
    seen_ids.add(anchor.event_id)


def _validate_chronology(
    anchor: CanonicalAnchor,
    idx: int,
    prev_minute: int,
    prev_stoppage: int,
    issues: List[ValidationIssue],
) -> None:
    if idx == 0:
        return
    current_stoppage = anchor.stoppage_time if anchor.stoppage_time is not None else -1
    if anchor.minute < prev_minute or (
        anchor.minute == prev_minute and current_stoppage < prev_stoppage
    ):
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="CHRONOLOGY_ORDER",
                message=f"Anchor '{anchor.event_id}' at {anchor.minute}' (stoppage {anchor.stoppage_time}) "
                f"is out of order after anchor at {prev_minute}' (stoppage {prev_stoppage if prev_stoppage >= 0 else None})",
                event_id=anchor.event_id,
                field="minute",
            )
        )


def _validate_score_progression(
    anchor: CanonicalAnchor,
    idx: int,
    all_anchors: List[CanonicalAnchor],
    issues: List[ValidationIssue],
) -> None:
    if idx == 0:
        return
    previous = all_anchors[idx - 1]

    if anchor.event_type in (EventType.GOAL, EventType.PENALTY):
        home_diff = anchor.score_after_event.get("home", 0) - previous.score_after_event.get("home", 0)
        away_diff = anchor.score_after_event.get("away", 0) - previous.score_after_event.get("away", 0)
        total_diff = home_diff + away_diff

        if anchor.event_type == EventType.GOAL:
            if total_diff != 1:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="SCORE_INCREMENT",
                        message=f"Anchor '{anchor.event_id}': score must increment by exactly 1 on GOAL events. "
                        f"Previous: {previous.score_after_event}, Current: {anchor.score_after_event}",
                        event_id=anchor.event_id,
                        field="score_after_event",
                    )
                )
            if home_diff > 0 and away_diff > 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="SCORE_BOTH_SIDES",
                        message=f"Anchor '{anchor.event_id}': both home and away scores incremented on a single GOAL",
                        event_id=anchor.event_id,
                        field="score_after_event",
                    )
                )

    else:
        if anchor.score_after_event != previous.score_after_event:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="SCORE_CHANGE_NON_GOAL",
                    message=f"Anchor '{anchor.event_id}' (type {anchor.event_type.value}): "
                    f"score changed from {previous.score_after_event} to {anchor.score_after_event} "
                    f"on a non-GOAL event",
                    event_id=anchor.event_id,
                    field="score_after_event",
                )
            )


def _validate_match_period_consistency(
    anchor: CanonicalAnchor, idx: int, issues: List[ValidationIssue]
) -> None:
    minute = anchor.minute
    period = anchor.match_period

    if period.value == "FIRST_HALF" and minute > 45:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="PERIOD_MINUTE_MISMATCH",
                message=f"Anchor '{anchor.event_id}': minute {minute} is outside typical range for FIRST_HALF (1-45)",
                event_id=anchor.event_id,
                field="match_period",
            )
        )
    elif period.value == "SECOND_HALF" and minute < 46:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="PERIOD_MINUTE_MISMATCH",
                message=f"Anchor '{anchor.event_id}': minute {minute} is outside typical range for SECOND_HALF (46-90)",
                event_id=anchor.event_id,
                field="match_period",
            )
        )
    elif period.value == "EXTRA_TIME_1" and minute < 91:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="PERIOD_MINUTE_MISMATCH",
                message=f"Anchor '{anchor.event_id}': minute {minute} is outside typical range for EXTRA_TIME_1 (91-105)",
                event_id=anchor.event_id,
                field="match_period",
            )
        )
    elif period.value == "EXTRA_TIME_2" and minute < 106:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="PERIOD_MINUTE_MISMATCH",
                message=f"Anchor '{anchor.event_id}': minute {minute} is outside typical range for EXTRA_TIME_2 (106-120)",
                event_id=anchor.event_id,
                field="match_period",
            )
        )


def _validate_importance_range(
    anchor: CanonicalAnchor, idx: int, issues: List[ValidationIssue]
) -> None:
    if not (0 <= anchor.importance <= 100):
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="IMPORTANCE_RANGE",
                message=f"Anchor '{anchor.event_id}': importance {anchor.importance} is outside valid range (0-100)",
                event_id=anchor.event_id,
                field="importance",
            )
        )
