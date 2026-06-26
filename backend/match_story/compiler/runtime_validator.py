from __future__ import annotations

from typing import List, Set

from backend.match_story.compiler.models import (
    EventType,
    RuntimeFlags,
    RuntimeTimeline,
    RuntimeTimelineEvent,
    RuntimeValidationResult,
    ValidationIssue,
    ValidationSeverity,
)


VALID_EVENT_TYPES = {"GOAL", "PENALTY", "CARD", "SUBSTITUTION", "MOMENTUM_SHIFT", "PRESSURE_SURGE", "PHASE_CHANGE"}
VALID_PERIODS = {"FIRST_HALF", "SECOND_HALF", "EXTRA_TIME_1", "EXTRA_TIME_2", "PENALTY_SHOOTOUT"}
VALID_CONFIDENCE = {"HIGH", "MEDIUM", "LOW"}
VALID_GROUPS = {"MATCH_STATE", "GOAL_EVENTS", "DISCIPLINE", "TACTICAL", "PRESSURE", "MOMENTUM", "STRUCTURE"}
REQUIRED_MATCH_FIELDS = {"home_team", "away_team", "date", "competition", "venue", "home_score", "away_score"}
REQUIRED_METADATA_FIELDS = {"generation_time", "compiler_version", "source_dataset", "total_events", "validation_status", "schema_version"}
REQUIRED_FLAGS = {"is_key_event", "is_highlight", "is_commentary_trigger", "show_on_timeline", "include_in_replay", "requires_user_attention"}
PERIOD_MINUTE_RANGES = {
    "FIRST_HALF": (1, 45),
    "SECOND_HALF": (46, 90),
    "EXTRA_TIME_1": (91, 105),
    "EXTRA_TIME_2": (106, 120),
    "PENALTY_SHOOTOUT": (120, 120),
}


def validate_runtime(timeline: RuntimeTimeline) -> RuntimeValidationResult:
    issues: List[ValidationIssue] = []

    _validate_document(timeline, issues)
    _validate_events(timeline, issues)

    error_count = sum(1 for i in issues if i.severity == ValidationSeverity.ERROR)
    warning_count = sum(1 for i in issues if i.severity == ValidationSeverity.WARNING)

    return RuntimeValidationResult(
        passed=error_count == 0,
        issues=issues,
        total_events=len(timeline.timeline),
        total_issues=len(issues),
        error_count=error_count,
        warning_count=warning_count,
    )


def _validate_document(timeline: RuntimeTimeline, issues: List[ValidationIssue]) -> None:
    # V1: schema_version is a supported version
    if timeline.schema_version != "2.1":
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="UNSUPPORTED_SCHEMA_VERSION",
                message=f"Unsupported schema_version '{timeline.schema_version}'. Supported: 2.1",
            )
        )

    # V2: match_id matches source dataset
    parts = timeline.match_id.split("_")
    if len(parts) < 3:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="INVALID_MATCH_ID",
                message=f"match_id '{timeline.match_id}' does not match {{HOME}}_{{AWAY}}_{{YEAR}}",
            )
        )

    # V3: match contains all required fields
    match_dict = {
        "home_team": timeline.match.home_team,
        "away_team": timeline.match.away_team,
        "date": timeline.match.date,
        "competition": timeline.match.competition,
        "venue": timeline.match.venue,
        "home_score": timeline.match.home_score,
        "away_score": timeline.match.away_score,
    }
    for field in REQUIRED_MATCH_FIELDS:
        val = match_dict.get(field)
        if val is None:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="MISSING_MATCH_FIELD",
                    message=f"match object is missing required field '{field}'",
                    field=field,
                )
            )
        elif isinstance(val, str) and not val:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="EMPTY_MATCH_FIELD",
                    message=f"match object field '{field}' is empty (not available in source dataset)",
                    field=field,
                )
            )

    # V4: timeline is a non-empty array
    if len(timeline.timeline) == 0:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="EMPTY_TIMELINE",
                message="timeline array is empty",
            )
        )

    # V5: metadata contains all required fields
    meta_dict = {
        "generation_time": timeline.metadata.generation_time,
        "compiler_version": timeline.metadata.compiler_version,
        "source_dataset": timeline.metadata.source_dataset,
        "total_events": timeline.metadata.total_events,
        "validation_status": timeline.metadata.validation_status,
        "schema_version": timeline.metadata.schema_version,
    }
    for field in REQUIRED_METADATA_FIELDS:
        if field not in meta_dict or meta_dict[field] is None:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="MISSING_METADATA_FIELD",
                    message=f"metadata object is missing required field '{field}'",
                    field=field,
                )
            )


def _validate_events(timeline: RuntimeTimeline, issues: List[ValidationIssue]) -> None:
    seen_ids: Set[str] = set()
    event_list = timeline.timeline

    for idx, event in enumerate(event_list):
        _validate_required_event_fields(event, idx, issues)
        _validate_event_id_uniqueness(event, seen_ids, issues)
        _validate_event_type(event, idx, issues)
        _validate_weight(event, idx, issues)
        _validate_confidence(event, idx, issues)
        _validate_match_period(event, idx, issues)
        _validate_score(event, idx, event_list, issues)
        _validate_shootout_score(event, idx, issues)
        _validate_runtime_flags(event, idx, issues)
        _validate_visual_metadata(event, idx, issues)
        _validate_timeline_group(event, idx, issues)
        _validate_visible(event, idx, issues)

    # V7: Events sorted by (minute, stoppage_time) ascending
    _validate_chronology(event_list, issues)


def _validate_required_event_fields(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    required = [
        ("id", event.id),
        ("minute", event.minute),
        ("match_period", event.match_period),
        ("event_type", event.event_type),
        ("weight", event.weight),
        ("description", event.description),
        ("confidence", event.confidence),
        ("timeline_group", event.timeline_group),
        ("icon", event.icon),
        ("color", event.color),
        ("visible", event.visible),
    ]
    for field_name, value in required:
        if value is None or (isinstance(value, str) and not value):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="MISSING_REQUIRED_EVENT_FIELD",
                    message=f"Event {idx} ('{event.id}'): required field '{field_name}' is missing or empty",
                    event_id=event.id,
                    field=field_name,
                )
            )


def _validate_event_id_uniqueness(event: RuntimeTimelineEvent, seen_ids: Set[str], issues: List[ValidationIssue]) -> None:
    if event.id in seen_ids:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="DUPLICATE_EVENT_ID",
                message=f"Duplicate event id '{event.id}'",
                event_id=event.id,
                field="id",
            )
        )
    seen_ids.add(event.id)


def _validate_event_type(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    if event.event_type not in VALID_EVENT_TYPES:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="UNKNOWN_EVENT_TYPE",
                message=f"Event '{event.id}': unrecognised event_type '{event.event_type}'",
                event_id=event.id,
                field="event_type",
            )
        )


def _validate_weight(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    if not isinstance(event.weight, (int, float)):
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="WEIGHT_TYPE",
                message=f"Event '{event.id}': weight must be a number, got {type(event.weight).__name__}",
                event_id=event.id,
                field="weight",
            )
        )
        return
    if event.weight < 0.0 or event.weight > 1.0:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="WEIGHT_RANGE",
                message=f"Event '{event.id}': weight {event.weight} is outside [0.0, 1.0]",
                event_id=event.id,
                field="weight",
            )
        )
    if isinstance(event.weight, float) and event.weight != round(event.weight, 2):
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="WEIGHT_PRECISION",
                message=f"Event '{event.id}': weight {event.weight} has more than 2 decimal places",
                event_id=event.id,
                field="weight",
            )
        )


def _validate_confidence(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    if event.confidence not in VALID_CONFIDENCE:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="INVALID_CONFIDENCE",
                message=f"Event '{event.id}': confidence '{event.confidence}' is not a valid value ({', '.join(sorted(VALID_CONFIDENCE))})",
                event_id=event.id,
                field="confidence",
            )
        )


def _validate_match_period(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    if event.match_period not in VALID_PERIODS:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="INVALID_MATCH_PERIOD",
                message=f"Event '{event.id}': match_period '{event.match_period}' is not a valid value",
                event_id=event.id,
                field="match_period",
            )
        )
        return

    period_range = PERIOD_MINUTE_RANGES.get(event.match_period)
    if period_range:
        lo, hi = period_range
        if not (lo <= event.minute <= hi):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="PERIOD_MINUTE_MISMATCH",
                    message=f"Event '{event.id}': minute {event.minute} is outside range for {event.match_period} ({lo}-{hi})",
                    event_id=event.id,
                    field="match_period",
                )
            )


def _validate_score(event: RuntimeTimelineEvent, idx: int, event_list: List[RuntimeTimelineEvent], issues: List[ValidationIssue]) -> None:
    score = event.score
    home = score.get("home", 0)
    away = score.get("away", 0)

    if not isinstance(home, int) or not isinstance(away, int):
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="SCORE_TYPE",
                message=f"Event '{event.id}': score values must be integers, got home={type(home).__name__}, away={type(away).__name__}",
                event_id=event.id,
                field="score",
            )
        )
        return

    if home < 0 or away < 0:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="SCORE_NEGATIVE",
                message=f"Event '{event.id}': score contains negative values: {score}",
                event_id=event.id,
                field="score",
            )
        )

    # V9: score increments by exactly 1 on GOAL events for the scoring side
    # V10: score does not change on non-GOAL events
    if idx > 0:
        prev = event_list[idx - 1]
        prev_score = prev.score
        prev_home = prev_score.get("home", 0)
        prev_away = prev_score.get("away", 0)
        home_diff = home - prev_home
        away_diff = away - prev_away

        if event.event_type == "GOAL":
            total_diff = home_diff + away_diff
            if total_diff != 1:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="SCORE_INCREMENT",
                        message=f"Event '{event.id}': score must increment by exactly 1 on GOAL events. "
                        f"Previous: {prev_score}, Current: {score}",
                        event_id=event.id,
                        field="score",
                    )
                )
            if home_diff > 0 and away_diff > 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="SCORE_BOTH_SIDES",
                        message=f"Event '{event.id}': both home and away scores incremented on a single GOAL",
                        event_id=event.id,
                        field="score",
                    )
                )
        elif event.event_type not in ("GOAL", "PENALTY"):
            if home_diff != 0 or away_diff != 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="SCORE_CHANGE_NON_GOAL",
                        message=f"Event '{event.id}' (type {event.event_type}): "
                        f"score changed from {prev_score} to {score} on a non-GOAL event",
                        event_id=event.id,
                        field="score",
                    )
                )


def _validate_shootout_score(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    shootout = event.shootout_score
    is_shootout_period = event.match_period == "PENALTY_SHOOTOUT"

    if shootout is not None and not is_shootout_period:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="SHOOTOUT_OUTSIDE_SHOOTOUT",
                message=f"Event '{event.id}': shootout_score is present but match_period is {event.match_period}",
                event_id=event.id,
                field="shootout_score",
            )
        )

    if shootout is not None:
        s_home = shootout.get("home", 0)
        s_away = shootout.get("away", 0)
        if not isinstance(s_home, int) or not isinstance(s_away, int):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="SHOOTOUT_SCORE_TYPE",
                    message=f"Event '{event.id}': shootout_score values must be integers",
                    event_id=event.id,
                    field="shootout_score",
                )
            )


def _validate_runtime_flags(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    flags = event.runtime_flags
    if flags is None:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="MISSING_RUNTIME_FLAGS",
                message=f"Event '{event.id}': runtime_flags is None",
                event_id=event.id,
                field="runtime_flags",
            )
        )
        return

    flag_dict = {
        "is_key_event": flags.is_key_event,
        "is_highlight": flags.is_highlight,
        "is_commentary_trigger": flags.is_commentary_trigger,
        "show_on_timeline": flags.show_on_timeline,
        "include_in_replay": flags.include_in_replay,
        "requires_user_attention": flags.requires_user_attention,
    }

    for flag_name, flag_value in flag_dict.items():
        if not isinstance(flag_value, bool):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="FLAG_TYPE",
                    message=f"Event '{event.id}': runtime_flags.{flag_name} must be boolean, got {type(flag_value).__name__}",
                    event_id=event.id,
                    field=f"runtime_flags.{flag_name}",
                )
            )


def _validate_visual_metadata(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    if not event.icon:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="MISSING_ICON",
                message=f"Event '{event.id}': icon is empty",
                event_id=event.id,
                field="icon",
            )
        )
    if not event.color:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="MISSING_COLOR",
                message=f"Event '{event.id}': color is empty",
                event_id=event.id,
                field="color",
            )
        )


def _validate_timeline_group(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    if event.timeline_group not in VALID_GROUPS:
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="UNKNOWN_TIMELINE_GROUP",
                message=f"Event '{event.id}': timeline_group '{event.timeline_group}' is not a recognised group",
                event_id=event.id,
                field="timeline_group",
            )
        )


def _validate_visible(event: RuntimeTimelineEvent, idx: int, issues: List[ValidationIssue]) -> None:
    if not isinstance(event.visible, bool):
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="VISIBLE_TYPE",
                message=f"Event '{event.id}': visible must be boolean, got {type(event.visible).__name__}",
                event_id=event.id,
                field="visible",
            )
        )


def _validate_chronology(event_list: List[RuntimeTimelineEvent], issues: List[ValidationIssue]) -> None:
    for i in range(1, len(event_list)):
        prev = event_list[i - 1]
        curr = event_list[i]
        prev_key = (prev.minute, prev.stoppage_time if prev.stoppage_time is not None else -1)
        curr_key = (curr.minute, curr.stoppage_time if curr.stoppage_time is not None else -1)
        if curr_key < prev_key:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="CHRONOLOGY_UNSORTED",
                    message=f"Events not sorted: '{curr.id}' at {curr.minute}' (stoppage {curr.stoppage_time}) "
                    f"appears after '{prev.id}' at {prev.minute}' (stoppage {prev.stoppage_time})",
                    event_id=curr.id,
                    field="minute",
                )
            )
            break
