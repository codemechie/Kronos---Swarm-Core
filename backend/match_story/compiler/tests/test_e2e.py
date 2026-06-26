from __future__ import annotations

import json
import os
import tempfile

from backend.match_story.compiler import TimelineCompiler, compile_dataset
from backend.match_story.compiler.models import (
    EventType,
    MatchInfo,
    RuntimeTimelineEvent,
)


DATASET_PATH = "backend/docs/datasets/canonical/argentina_france_2022_source.md"


class TestEndToEndPipeline:
    def test_full_pipeline_passes(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        assert compiler.validation.passed
        assert compiler.conversion.passed
        assert compiler.runtime_validation.passed
        assert compiler.json_path is not None
        assert compiler.report_path is not None

    def test_all_anchors_to_events(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        assert len(timeline.timeline) == 42

    def test_all_ids_preserved(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        parser = __import__("backend.match_story.compiler.parser", fromlist=["parse_dataset"])
        dataset = parser.parse_dataset(DATASET_PATH)
        anchor_ids = {a.event_id for a in dataset.anchors}
        event_ids = {e.id for e in timeline.timeline}
        assert anchor_ids == event_ids

    def test_chronological_order(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        for i in range(1, len(timeline.timeline)):
            prev = timeline.timeline[i - 1]
            curr = timeline.timeline[i]
            assert (curr.minute, curr.stoppage_time or -1) >= (
                prev.minute,
                prev.stoppage_time or -1,
            )

    def test_all_event_types_present(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        types = {e.event_type for e in timeline.timeline}
        for et in EventType:
            assert et.value in types, f"Missing event type {et.value}"

    def test_json_file_generated(self):
        compiler = TimelineCompiler()
        compiler.compile(DATASET_PATH)
        assert os.path.isfile(compiler.json_path)
        with open(compiler.json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["schema_version"] == "2.1"
        assert len(data["timeline"]) == 42
        assert data["match"]["home_team"] == "Argentina"
        assert data["match"]["away_team"] == "France"

    def test_report_file_generated(self):
        compiler = TimelineCompiler()
        compiler.compile(DATASET_PATH)
        assert os.path.isfile(compiler.report_path)
        with open(compiler.report_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "PASS" in content
        assert "Compiler Version:" in content
        assert "1.0.0" in content
        assert "42" in content

    def test_json_validates_all_events(self):
        compiler = TimelineCompiler()
        compiler.compile(DATASET_PATH)
        with open(compiler.json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for e in data["timeline"]:
            assert "id" in e
            assert "minute" in e
            assert "event_type" in e
            assert "weight" in e
            assert "score" in e
            assert "description" in e
            assert "confidence" in e
            assert "timeline_group" in e
            assert "icon" in e
            assert "color" in e
            assert "visible" in e
            assert "runtime_flags" in e
            rf = e["runtime_flags"]
            for flag in ["is_key_event", "is_highlight", "is_commentary_trigger",
                          "show_on_timeline", "include_in_replay", "requires_user_attention"]:
                assert flag in rf
                assert isinstance(rf[flag], bool)

    def test_compile_dataset_convenience(self):
        timeline = compile_dataset(DATASET_PATH)
        assert len(timeline.timeline) == 42

    def test_compile_with_match_info(self):
        match_info = MatchInfo(
            home_team="Argentina",
            away_team="France",
            date="2022-12-18",
            competition="FIFA World Cup Final",
            venue="Lusail Stadium",
            home_score=3,
            away_score=3,
            home_shootout_score=4,
            away_shootout_score=2,
        )
        compiler = TimelineCompiler(match_info=match_info)
        timeline = compiler.compile(DATASET_PATH)
        assert timeline.match.date == "2022-12-18"
        assert timeline.match.venue == "Lusail Stadium"
        assert timeline.match.home_shootout_score == 4
        assert timeline.match.away_shootout_score == 2

    def test_goals_have_correct_runtime_flags(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        goals = [e for e in timeline.timeline if e.event_type == "GOAL"]
        for g in goals:
            assert g.runtime_flags.is_commentary_trigger is True
            assert g.runtime_flags.include_in_replay is True
        high_goals = [g for g in goals if g.weight >= 0.90]
        for g in high_goals:
            assert g.runtime_flags.is_highlight is True
        low_goals = [g for g in goals if g.weight < 0.90]
        for g in low_goals:
            assert g.runtime_flags.is_highlight is False

    def test_penalty_shootout_overrides(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        # No penalty shootout events in this dataset, but verify the
        # override logic works on regular events
        penalties = [e for e in timeline.timeline if e.event_type == "PENALTY"]
        for p in penalties:
            assert p.icon == "penalty"
            assert p.timeline_group == "GOAL_EVENTS"

    def test_cards_have_correct_visuals(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        cards = [e for e in timeline.timeline if e.event_type == "CARD"]
        for c in cards:
            assert c.timeline_group == "DISCIPLINE"
            assert c.animation == "card_flash"
            assert c.audio_trigger == "whistle"
        yellows = [c for c in cards if c.card_type == "YELLOW"]
        for y in yellows:
            assert y.color == "#FFD700"

    def test_score_never_increments_on_non_goal(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        prev_score = {"home": 0, "away": 0}
        for e in timeline.timeline:
            if e.event_type not in ("GOAL", "PENALTY"):
                assert e.score == prev_score, (
                    f"Score changed on {e.event_type} event {e.id}: "
                    f"{prev_score} -> {e.score}"
                )
            prev_score = e.score

    def test_weight_precision(self):
        compiler = TimelineCompiler()
        timeline = compiler.compile(DATASET_PATH)
        for e in timeline.timeline:
            assert e.weight == round(e.weight, 2)
            assert 0.0 <= e.weight <= 1.0

    def test_compile_dataset_returns_timeline(self):
        timeline = compile_dataset(DATASET_PATH)
        assert isinstance(timeline, __import__("backend.match_story.compiler.models", fromlist=["RuntimeTimeline"]).RuntimeTimeline)

    def test_e2e_determinism(self):
        t1 = compile_dataset(DATASET_PATH)
        t2 = compile_dataset(DATASET_PATH)
        assert len(t1.timeline) == len(t2.timeline)
        for e1, e2 in zip(t1.timeline, t2.timeline):
            assert e1.id == e2.id
            assert e1.weight == e2.weight
            assert e1.score == e2.score
            assert e1.timeline_group == e2.timeline_group
            assert e1.runtime_flags == e2.runtime_flags
