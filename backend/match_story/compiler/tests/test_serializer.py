from __future__ import annotations

import json
import os
import tempfile

from backend.match_story.compiler.models import (
    MatchInfo,
    RuntimeFlags,
    RuntimeMetadata,
    RuntimeTimeline,
    RuntimeTimelineEvent,
)
from backend.match_story.compiler.serializer import RuntimeSerializer


def _make_event(
    event_id: str = "T_1",
    minute: int = 1,
    stoppage_time: int | None = None,
    match_period: str = "FIRST_HALF",
    event_type: str = "PHASE_CHANGE",
    team: str | None = None,
    player: str | None = None,
    weight: float = 0.60,
) -> RuntimeTimelineEvent:
    return RuntimeTimelineEvent(
        id=event_id,
        minute=minute,
        stoppage_time=stoppage_time,
        match_period=match_period,
        event_type=event_type,
        team=team,
        player=player,
        weight=weight,
        score={"home": 0, "away": 0},
        shootout_score=None,
        description="Test event.",
        confidence="HIGH",
        timeline_group="MATCH_STATE",
        icon="phase_change",
        color="#4444FF",
        animation="phase_transition",
        audio_trigger="phase_chime",
        visible=True,
        runtime_flags=RuntimeFlags(
            is_key_event=False,
            is_highlight=False,
            is_commentary_trigger=False,
            show_on_timeline=True,
            include_in_replay=False,
            requires_user_attention=False,
        ),
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
            home_shootout_score=4,
            away_shootout_score=2,
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


class TestRuntimeSerializer:
    def test_serialize_root_structure(self):
        timeline = _make_timeline()
        data = RuntimeSerializer().serialize(timeline)
        assert data["schema_version"] == "2.1"
        assert data["match_id"] == "ARG_FRA_2022"
        assert "match" in data
        assert "timeline" in data
        assert "metadata" in data

    def test_serialize_match_object(self):
        timeline = _make_timeline()
        data = RuntimeSerializer().serialize(timeline)
        m = data["match"]
        assert m["home_team"] == "Argentina"
        assert m["away_team"] == "France"
        assert m["date"] == "2022-12-18"
        assert m["competition"] == "FIFA World Cup Final"
        assert m["venue"] == "Lusail Stadium"
        assert m["home_score"] == 3
        assert m["away_score"] == 3
        assert m["home_shootout_score"] == 4
        assert m["away_shootout_score"] == 2

    def test_serialize_timeline_event(self):
        event = _make_event(
            event_id="T_GOAL_1",
            minute=23,
            event_type="GOAL",
            team="Argentina",
            player="Lionel Messi",
            weight=0.95,
            match_period="FIRST_HALF",
        )
        timeline = _make_timeline([event])
        data = RuntimeSerializer().serialize(timeline)
        e = data["timeline"][0]
        assert e["id"] == "T_GOAL_1"
        assert e["minute"] == 23
        assert e["event_type"] == "GOAL"
        assert e["team"] == "Argentina"
        assert e["player"] == "Lionel Messi"
        assert e["weight"] == 0.95
        assert e["match_period"] == "FIRST_HALF"
        assert e["stoppage_time"] is None

    def test_serialize_runtime_flags(self):
        event = _make_event()
        timeline = _make_timeline([event])
        data = RuntimeSerializer().serialize(timeline)
        flags = data["timeline"][0]["runtime_flags"]
        assert flags["is_key_event"] is False
        assert flags["is_highlight"] is False
        assert flags["is_commentary_trigger"] is False
        assert flags["show_on_timeline"] is True
        assert flags["include_in_replay"] is False
        assert flags["requires_user_attention"] is False

    def test_serialize_metadata(self):
        timeline = _make_timeline()
        data = RuntimeSerializer().serialize(timeline)
        m = data["metadata"]
        assert m["generation_time"] == "2026-06-26T12:00:00Z"
        assert m["compiler_version"] == "1.0.0"
        assert m["source_dataset"] == "test_source.md"
        assert m["total_events"] == 1
        assert m["validation_status"] == "PASS"
        assert m["schema_version"] == "2.1"

    def test_to_json_valid(self):
        timeline = _make_timeline()
        json_str = RuntimeSerializer().to_json(timeline)
        parsed = json.loads(json_str)
        assert parsed["schema_version"] == "2.1"
        assert len(parsed["timeline"]) == 1

    def test_write_json_file(self):
        timeline = _make_timeline()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as tmp:
            tmp_path = tmp.name
        try:
            written = RuntimeSerializer().write_json(timeline, tmp_path)
            assert written == tmp_path
            assert os.path.isfile(tmp_path)
            with open(tmp_path, "r", encoding="utf-8") as f:
                parsed = json.load(f)
            assert parsed["schema_version"] == "2.1"
        finally:
            if os.path.isfile(tmp_path):
                os.remove(tmp_path)

    def test_null_handling(self):
        event = _make_event(stoppage_time=None)
        event.shootout_score = None
        event.team = None
        event.player = None
        timeline = _make_timeline([event])
        data = RuntimeSerializer().serialize(timeline)
        e = data["timeline"][0]
        assert e["stoppage_time"] is None
        assert e["shootout_score"] is None
        assert e["team"] is None
        assert e["player"] is None


class TestValidationReport:
    def test_generate_report_no_issues(self):
        from backend.match_story.compiler.models import RuntimeValidationResult, ValidationResult, ConversionResult

        canon = ValidationResult(passed=True)
        runtime = RuntimeValidationResult(passed=True, total_events=1)
        conv = ConversionResult(passed=True, total_anchors=1, total_events=1)

        report = RuntimeSerializer.generate_validation_report(
            canonical_validation_result=canon,
            runtime_validation_result=runtime,
            conversion_result=conv,
            compiler_version="1.0.0",
            source_dataset="test.md",
            total_events=1,
        )
        assert "PASS" in report
        assert "No issues found" in report
        assert "Compiler Version:" in report
        assert "1.0.0" in report

    def test_generate_report_with_issues(self):
        from backend.match_story.compiler.models import (
            ConversionResult,
            RuntimeValidationResult,
            ValidationIssue,
            ValidationResult,
            ValidationSeverity,
        )

        canon = ValidationResult(
            passed=False,
            issues=[
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="DUPLICATE_EVENT_ID",
                    message="Duplicate event_id",
                )
            ],
            error_count=1,
        )
        runtime = RuntimeValidationResult(
            passed=False,
            issues=[
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="EMPTY_MATCH_FIELD",
                    message="date is empty",
                    field="date",
                )
            ],
            warning_count=1,
            total_events=1,
        )
        conv = ConversionResult(passed=True, total_anchors=1, total_events=1)

        report = RuntimeSerializer.generate_validation_report(
            canonical_validation_result=canon,
            runtime_validation_result=runtime,
            conversion_result=conv,
            compiler_version="1.0.0",
            source_dataset="test.md",
            total_events=1,
        )
        assert "FAIL" in report
        assert "DUPLICATE_EVENT_ID" in report
        assert "EMPTY_MATCH_FIELD" in report
        assert "Runtime" in report
        assert "Canonical" in report

    def test_write_report_file(self):
        import tempfile

        report = "# Test Report\n\nPASS"
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", delete=False
        ) as tmp:
            tmp_path = tmp.name
        try:
            written = RuntimeSerializer.write_validation_report(report, tmp_path)
            assert written == tmp_path
            with open(tmp_path, "r", encoding="utf-8") as f:
                content = f.read()
            assert "Test Report" in content
        finally:
            if os.path.isfile(tmp_path):
                os.remove(tmp_path)
