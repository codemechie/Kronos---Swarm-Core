from __future__ import annotations

from backend.match_story.compiler.models import (
    MatchInfo,
    RuntimeFlags,
    RuntimeMetadata,
    RuntimeTimeline,
    RuntimeTimelineEvent,
    RuntimeValidationResult,
    ValidationSeverity,
)
from backend.match_story.compiler.runtime_validator import validate_runtime


def _make_event(
    event_id: str = "T_1",
    minute: int = 1,
    stoppage_time: int | None = None,
    match_period: str = "FIRST_HALF",
    event_type: str = "PHASE_CHANGE",
    team: str | None = None,
    player: str | None = None,
    weight: float = 0.60,
    score: dict | None = None,
    shootout_score: dict | None = None,
    description: str = "Test event.",
    confidence: str = "MEDIUM",
    timeline_group: str = "MATCH_STATE",
    icon: str = "phase_change",
    color: str = "#4444FF",
    animation: str | None = "phase_transition",
    audio_trigger: str | None = "phase_chime",
    visible: bool = True,
    runtime_flags: RuntimeFlags | None = None,
) -> RuntimeTimelineEvent:
    if runtime_flags is None:
        runtime_flags = RuntimeFlags()
    return RuntimeTimelineEvent(
        id=event_id,
        minute=minute,
        stoppage_time=stoppage_time,
        match_period=match_period,
        event_type=event_type,
        team=team,
        player=player,
        weight=weight,
        score=score or {"home": 0, "away": 0},
        shootout_score=shootout_score,
        description=description,
        confidence=confidence,
        timeline_group=timeline_group,
        icon=icon,
        color=color,
        animation=animation,
        audio_trigger=audio_trigger,
        visible=visible,
        runtime_flags=runtime_flags,
    )


def _make_timeline(events: list[RuntimeTimelineEvent] | None = None) -> RuntimeTimeline:
    if events is None:
        events = [_make_event()]
    return RuntimeTimeline(
        schema_version="2.1",
        match_id="ARG_FRA_2022",
        match=MatchInfo(
            home_team="Argentina",
            away_team="France",
            date="2022-12-18",
            competition="FIFA World Cup Final",
            venue="Lusail Stadium",
            home_score=3,
            away_score=3,
            home_shootout_score=None,
            away_shootout_score=None,
        ),
        timeline=events,
        metadata=RuntimeMetadata(
            generation_time="2026-06-26T12:00:00Z",
            compiler_version="1.0.0",
            source_dataset="test_source.md",
            total_events=len(events),
            validation_status="PASS",
            schema_version="2.1",
        ),
    )


class TestDocumentValidation:
    def test_valid_document_passes(self):
        timeline = _make_timeline()
        result = validate_runtime(timeline)
        assert result.passed
        assert result.total_issues == 0

    def test_unsupported_schema_version(self):
        timeline = _make_timeline()
        timeline.schema_version = "3.0"
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "UNSUPPORTED_SCHEMA_VERSION"]
        assert len(issues) == 1
        assert issues[0].severity == ValidationSeverity.ERROR

    def test_invalid_match_id(self):
        timeline = _make_timeline()
        timeline.match_id = "INVALID"
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "INVALID_MATCH_ID"]
        assert len(issues) == 1

    def test_empty_timeline(self):
        timeline = _make_timeline([])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "EMPTY_TIMELINE"]
        assert len(issues) == 1
        assert result.passed is False


class TestEventRequiredFields:
    def test_missing_id(self):
        event = _make_event(event_id="")
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "MISSING_REQUIRED_EVENT_FIELD" and i.field == "id"]
        assert len(issues) == 1

    def test_missing_description(self):
        event = _make_event(description="")
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "MISSING_REQUIRED_EVENT_FIELD" and i.field == "description"]
        assert len(issues) == 1


class TestEventIdUniqueness:
    def test_duplicate_ids(self):
        events = [
            _make_event(event_id="DUP_1", minute=1),
            _make_event(event_id="DUP_1", minute=2),
        ]
        timeline = _make_timeline(events)
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "DUPLICATE_EVENT_ID"]
        assert len(issues) == 1


class TestWeightValidation:
    def test_weight_out_of_range(self):
        event = _make_event(weight=1.5)
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "WEIGHT_RANGE"]
        assert len(issues) == 1

    def test_weight_negative(self):
        event = _make_event(weight=-0.5)
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "WEIGHT_RANGE"]
        assert len(issues) == 1

    def test_weight_in_range(self):
        event = _make_event(weight=0.75)
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        errors = [i for i in result.issues if i.severity == ValidationSeverity.ERROR]
        assert len(errors) == 0


class TestConfidenceValidation:
    def test_invalid_confidence(self):
        event = _make_event(confidence="UNKNOWN")
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "INVALID_CONFIDENCE"]
        assert len(issues) == 1


class TestMatchPeriodValidation:
    def test_invalid_period_returns_error(self):
        event = _make_event(match_period="INVALID")
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "INVALID_MATCH_PERIOD"]
        assert len(issues) == 1

    def test_period_minute_mismatch(self):
        event = _make_event(match_period="FIRST_HALF", minute=90)
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "PERIOD_MINUTE_MISMATCH"]
        assert len(issues) == 1


class TestScoreValidation:
    def test_goal_score_increment(self):
        events = [
            _make_event(event_id="S_1", minute=1, event_type="PHASE_CHANGE", score={"home": 0, "away": 0}),
            _make_event(event_id="S_2", minute=23, event_type="GOAL", score={"home": 1, "away": 0}),
        ]
        timeline = _make_timeline(events)
        result = validate_runtime(timeline)
        errors = [i for i in result.issues if i.severity == ValidationSeverity.ERROR]
        assert len(errors) == 0

    def test_goal_no_increment_is_error(self):
        events = [
            _make_event(event_id="S_1", minute=1, event_type="PHASE_CHANGE", score={"home": 0, "away": 0}),
            _make_event(event_id="S_2", minute=23, event_type="GOAL", score={"home": 0, "away": 0}),
        ]
        timeline = _make_timeline(events)
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "SCORE_INCREMENT"]
        assert len(issues) == 1

    def test_score_change_non_goal(self):
        events = [
            _make_event(event_id="S_1", minute=1, event_type="PHASE_CHANGE", score={"home": 0, "away": 0}),
            _make_event(event_id="S_2", minute=2, event_type="CARD", score={"home": 1, "away": 0}),
        ]
        timeline = _make_timeline(events)
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "SCORE_CHANGE_NON_GOAL"]
        assert len(issues) == 1

    def test_negative_score(self):
        event = _make_event(score={"home": -1, "away": 0})
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "SCORE_NEGATIVE"]
        assert len(issues) == 1


class TestShootoutScoreValidation:
    def test_shootout_score_outside_shootout(self):
        event = _make_event(
            match_period="SECOND_HALF",
            shootout_score={"home": 4, "away": 2},
        )
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "SHOOTOUT_OUTSIDE_SHOOTOUT"]
        assert len(issues) == 1


class TestRuntimeFlagsValidation:
    def test_missing_runtime_flags(self):
        event = _make_event()
        event.runtime_flags = None
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "MISSING_RUNTIME_FLAGS"]
        assert len(issues) == 1

    def test_valid_runtime_flags(self):
        flags = RuntimeFlags(
            is_key_event=True,
            is_highlight=False,
            is_commentary_trigger=True,
            show_on_timeline=True,
            include_in_replay=True,
            requires_user_attention=False,
        )
        event = _make_event(runtime_flags=flags)
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        flag_issues = [i for i in result.issues if "runtime_flags" in (i.field or "")]
        assert len(flag_issues) == 0


class TestChronologyValidation:
    def test_unsorted_events(self):
        events = [
            _make_event(event_id="C_1", minute=80, event_type="GOAL"),
            _make_event(event_id="C_2", minute=1, event_type="PHASE_CHANGE"),
        ]
        timeline = _make_timeline(events)
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "CHRONOLOGY_UNSORTED"]
        assert len(issues) == 1

    def test_sorted_events_ok(self):
        events = [
            _make_event(event_id="C_1", minute=1),
            _make_event(event_id="C_2", minute=80),
        ]
        timeline = _make_timeline(events)
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "CHRONOLOGY_UNSORTED"]
        assert len(issues) == 0


class TestVisualMetadata:
    def test_empty_icon(self):
        event = _make_event(icon="")
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "MISSING_ICON"]
        assert len(issues) == 1

    def test_empty_color(self):
        event = _make_event(color="")
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "MISSING_COLOR"]
        assert len(issues) == 1

    def test_unknown_timeline_group(self):
        event = _make_event(timeline_group="UNKNOWN_GROUP")
        timeline = _make_timeline([event])
        result = validate_runtime(timeline)
        issues = [i for i in result.issues if i.code == "UNKNOWN_TIMELINE_GROUP"]
        assert len(issues) == 1
