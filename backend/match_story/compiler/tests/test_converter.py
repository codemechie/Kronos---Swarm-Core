from __future__ import annotations

from backend.match_story.compiler.converter import Converter, TEAM_CODE_MAP
from backend.match_story.compiler.models import (
    CanonicalAnchor,
    CanonicalDataset,
    CardType,
    Confidence,
    DatasetMetadata,
    EventType,
    MatchInfo,
    MatchPeriod,
    SourceReference,
)


def _make_anchor(
    event_id: str,
    minute: int = 1,
    stoppage_time: int | None = None,
    match_period: MatchPeriod = MatchPeriod.FIRST_HALF,
    event_type: EventType = EventType.GOAL,
    team: str | None = "Argentina",
    player: str | None = "Lionel Messi",
    importance: int = 95,
    score_after_event: dict | None = None,
    shootout_score: dict | None = None,
    source_confidence: Confidence = Confidence.HIGH,
    narrative_notes: str = "A goal.",
    source_references: list | None = None,
    card_type: CardType | None = None,
    creation_reason: str | None = None,
    supporting_signals: list | None = None,
    pressure_indicators: list | None = None,
    phase_transition: str | None = None,
) -> CanonicalAnchor:
    return CanonicalAnchor(
        event_id=event_id,
        minute=minute,
        stoppage_time=stoppage_time,
        match_period=match_period,
        event_type=event_type,
        team=team,
        player=player,
        importance=importance,
        score_after_event=score_after_event or {"home": 0, "away": 0},
        shootout_score=shootout_score,
        source_confidence=source_confidence,
        narrative_notes=narrative_notes,
        source_references=source_references or [
            SourceReference(source="FIFA.com", detail="Match Report")
        ],
        card_type=card_type,
        creation_reason=creation_reason,
        supporting_signals=supporting_signals,
        pressure_indicators=pressure_indicators,
        phase_transition=phase_transition,
    )


def _make_dataset(anchors: list[CanonicalAnchor]) -> CanonicalDataset:
    return CanonicalDataset(
        metadata=DatasetMetadata(
            match_id="ARG_FRA_2022",
            schema_version="2.1",
            anchor_version="2.1",
            total_anchors=len(anchors),
        ),
        anchors=anchors,
        source_path="argentina_france_2022_source.md",
    )


# ── GOAL ──────────────────────────────────────────────────────────────────


class TestGoalConversion:
    def test_field_mapping(self):
        anchor = _make_anchor(
            event_id="ARG_FRA_2022_023_GOAL",
            minute=23,
            team="Argentina",
            player="Lionel Messi",
            importance=95,
            score_after_event={"home": 1, "away": 0},
            narrative_notes="Messi places the ball low to the left.",
            source_confidence=Confidence.HIGH,
        )
        converter = Converter()
        events = [converter._convert_anchor(anchor)]

        e = events[0]
        assert e.id == "ARG_FRA_2022_023_GOAL"
        assert e.minute == 23
        assert e.stoppage_time is None
        assert e.match_period == "FIRST_HALF"
        assert e.event_type == "GOAL"
        assert e.team == "Argentina"
        assert e.player == "Lionel Messi"
        assert e.weight == 0.95
        assert e.score == {"home": 1, "away": 0}
        assert e.shootout_score is None
        assert e.description == "Messi places the ball low to the left."
        assert e.confidence == "HIGH"

    def test_visual_metadata(self):
        anchor = _make_anchor(event_id="T_GOAL_1")
        e = Converter()._convert_anchor(anchor)
        assert e.timeline_group == "GOAL_EVENTS"
        assert e.icon == "goal"
        assert e.color == "#00FF88"
        assert e.animation == "goal_flash"
        assert e.audio_trigger == "crowd_roar"

    def test_visible_always_true(self):
        anchor = _make_anchor(event_id="T_GOAL_2")
        e = Converter()._convert_anchor(anchor)
        assert e.visible is True

    def test_shootout_goal_overrides(self):
        anchor = _make_anchor(
            event_id="T_GOAL_SHOOTOUT",
            match_period=MatchPeriod.PENALTY_SHOOTOUT,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.animation == "shootout_goal"
        assert e.audio_trigger == "shootout_cymbal"
        assert e.timeline_group == "GOAL_EVENTS"

    def test_weight_derivation(self):
        for imp, expected in [(100, 1.0), (50, 0.5), (0, 0.0), (33, 0.33)]:
            anchor = _make_anchor(event_id=f"T_GOAL_W_{imp}", importance=imp)
            e = Converter()._convert_anchor(anchor)
            assert e.weight == expected, f"importance={imp} → weight={e.weight}"

    def test_runtime_flags_key_event(self):
        anchor = _make_anchor(event_id="T_GOAL_KEY", importance=70)
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is True

    def test_runtime_flags_non_key(self):
        anchor = _make_anchor(event_id="T_GOAL_NON_KEY", importance=60)
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is False

    def test_runtime_flags_highlight(self):
        anchor = _make_anchor(event_id="T_GOAL_HL", importance=90)
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_highlight is True

    def test_runtime_flags_non_highlight(self):
        anchor = _make_anchor(event_id="T_GOAL_NO_HL", importance=85)
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_highlight is False

    def test_runtime_flags_commentary(self):
        anchor = _make_anchor(event_id="T_GOAL_CM")
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_commentary_trigger is True

    def test_include_in_replay(self):
        anchor = _make_anchor(event_id="T_GOAL_RP")
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.include_in_replay is True


# ── PENALTY ───────────────────────────────────────────────────────────────


class TestPenaltyConversion:
    def test_field_mapping(self):
        anchor = _make_anchor(
            event_id="T_PENALTY_1",
            event_type=EventType.PENALTY,
            importance=70,
            score_after_event={"home": 0, "away": 0},
        )
        e = Converter()._convert_anchor(anchor)
        assert e.event_type == "PENALTY"
        assert e.weight == 0.70

    def test_visual_metadata(self):
        anchor = _make_anchor(event_id="T_PENALTY_V", event_type=EventType.PENALTY)
        e = Converter()._convert_anchor(anchor)
        assert e.timeline_group == "GOAL_EVENTS"
        assert e.icon == "penalty"
        assert e.color == "#FF4444"
        assert e.animation == "penalty_award"
        assert e.audio_trigger == "whistle"

    def test_shootout_penalty_overrides(self):
        anchor = _make_anchor(
            event_id="T_PEN_SHOOTOUT",
            event_type=EventType.PENALTY,
            match_period=MatchPeriod.PENALTY_SHOOTOUT,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.animation == "shootout_penalty"
        assert e.audio_trigger == "shootout_whistle"

    def test_key_event(self):
        anchor = _make_anchor(
            event_id="T_PEN_KEY",
            event_type=EventType.PENALTY,
            importance=70,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is True

    def test_commentary_trigger(self):
        anchor = _make_anchor(event_id="T_PEN_CM", event_type=EventType.PENALTY)
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_commentary_trigger is True


# ── CARD ──────────────────────────────────────────────────────────────────


class TestCardConversion:
    def test_yellow_card_icon(self):
        anchor = _make_anchor(
            event_id="T_CARD_Y",
            event_type=EventType.CARD,
            team="Argentina",
            card_type=CardType.YELLOW,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.icon == "card_yellow"
        assert e.color == "#FFD700"
        assert e.timeline_group == "DISCIPLINE"

    def test_red_card_icon(self):
        anchor = _make_anchor(
            event_id="T_CARD_R",
            event_type=EventType.CARD,
            team="France",
            card_type=CardType.RED,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.icon == "card_red"
        assert e.color == "#FF0000"

    def test_second_yellow_icon(self):
        anchor = _make_anchor(
            event_id="T_CARD_SY",
            event_type=EventType.CARD,
            card_type=CardType.SECOND_YELLOW,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.icon == "card_second_yellow"
        assert e.color == "#FF6600"

    def test_null_card_type_defaults_to_yellow(self):
        anchor = _make_anchor(
            event_id="T_CARD_NULL",
            event_type=EventType.CARD,
            card_type=None,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.icon == "card_yellow"
        assert e.color == "#FFD700"
        assert e.card_type is None

    def test_card_type_field(self):
        anchor = _make_anchor(
            event_id="T_CARD_CT",
            event_type=EventType.CARD,
            card_type=CardType.YELLOW,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.card_type == "YELLOW"

    def test_animation_and_audio(self):
        anchor = _make_anchor(
            event_id="T_CARD_AA",
            event_type=EventType.CARD,
            card_type=CardType.YELLOW,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.animation == "card_flash"
        assert e.audio_trigger == "whistle"

    def test_visible_always_true(self):
        anchor = _make_anchor(
            event_id="T_CARD_V",
            event_type=EventType.CARD,
            importance=30,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is True

    def test_red_card_is_key_event(self):
        anchor = _make_anchor(
            event_id="T_CARD_RK",
            event_type=EventType.CARD,
            card_type=CardType.RED,
            importance=70,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is True

    def test_yellow_card_not_key(self):
        anchor = _make_anchor(
            event_id="T_CARD_NK",
            event_type=EventType.CARD,
            card_type=CardType.YELLOW,
            importance=70,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is False

    def test_red_card_is_highlight(self):
        anchor = _make_anchor(
            event_id="T_CARD_RH",
            event_type=EventType.CARD,
            card_type=CardType.RED,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_highlight is True

    def test_include_in_replay(self):
        anchor = _make_anchor(
            event_id="T_CARD_RP",
            event_type=EventType.CARD,
            card_type=CardType.YELLOW,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.include_in_replay is True


# ── SUBSTITUTION ──────────────────────────────────────────────────────────


class TestSubstitutionConversion:
    def test_field_mapping(self):
        anchor = _make_anchor(
            event_id="T_SUB_1",
            event_type=EventType.SUBSTITUTION,
            minute=63,
            team="France",
            player="Kylian Mbappé",
            importance=50,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.event_type == "SUBSTITUTION"
        assert e.minute == 63
        assert e.team == "France"

    def test_visual_metadata(self):
        anchor = _make_anchor(event_id="T_SUB_V", event_type=EventType.SUBSTITUTION)
        e = Converter()._convert_anchor(anchor)
        assert e.timeline_group == "TACTICAL"
        assert e.icon == "substitution"
        assert e.color == "#888888"
        assert e.animation == "substitution_board"
        assert e.audio_trigger is None

    def test_visible_always_true(self):
        anchor = _make_anchor(
            event_id="T_SUB_VIS",
            event_type=EventType.SUBSTITUTION,
            importance=10,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is True

    def test_runtime_flags(self):
        anchor = _make_anchor(event_id="T_SUB_FL", event_type=EventType.SUBSTITUTION)
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is False
        assert e.runtime_flags.is_highlight is False
        assert e.runtime_flags.is_commentary_trigger is False
        assert e.runtime_flags.include_in_replay is False


# ── PRESSURE_SURGE ────────────────────────────────────────────────────────


class TestPressureSurgeConversion:
    def test_field_mapping(self):
        anchor = _make_anchor(
            event_id="T_PR_1",
            event_type=EventType.PRESSURE_SURGE,
            minute=66,
            team="France",
            importance=70,
            player=None,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.event_type == "PRESSURE_SURGE"
        assert e.player is None

    def test_visual_metadata(self):
        anchor = _make_anchor(event_id="T_PR_V", event_type=EventType.PRESSURE_SURGE)
        e = Converter()._convert_anchor(anchor)
        assert e.timeline_group == "PRESSURE"
        assert e.icon == "pressure"
        assert e.color == "#FF8800"
        assert e.animation == "pressure_pulse"
        assert e.audio_trigger == "intensity_rise"

    def test_visible_high_importance(self):
        anchor = _make_anchor(
            event_id="T_PR_VH",
            event_type=EventType.PRESSURE_SURGE,
            importance=60,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is True

    def test_visible_low_importance(self):
        anchor = _make_anchor(
            event_id="T_PR_VL",
            event_type=EventType.PRESSURE_SURGE,
            importance=9,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is False

    def test_visible_medium_importance(self):
        anchor = _make_anchor(
            event_id="T_PR_VM",
            event_type=EventType.PRESSURE_SURGE,
            importance=50,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is True

    def test_include_in_replay_high_weight(self):
        anchor = _make_anchor(
            event_id="T_PR_RP",
            event_type=EventType.PRESSURE_SURGE,
            importance=60,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.include_in_replay is True

    def test_include_in_replay_low_weight(self):
        anchor = _make_anchor(
            event_id="T_PR_NRP",
            event_type=EventType.PRESSURE_SURGE,
            importance=50,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.include_in_replay is False


# ── MOMENTUM_SHIFT ────────────────────────────────────────────────────────


class TestMomentumShiftConversion:
    def test_field_mapping(self):
        anchor = _make_anchor(
            event_id="T_MS_1",
            event_type=EventType.MOMENTUM_SHIFT,
            minute=36,
            team="Argentina",
            player="Lionel Messi",
            importance=75,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.event_type == "MOMENTUM_SHIFT"
        assert e.weight == 0.75

    def test_visual_metadata(self):
        anchor = _make_anchor(event_id="T_MS_V", event_type=EventType.MOMENTUM_SHIFT)
        e = Converter()._convert_anchor(anchor)
        assert e.timeline_group == "MOMENTUM"
        assert e.icon == "momentum"
        assert e.color == "#AA44FF"
        assert e.animation == "momentum_wave"
        assert e.audio_trigger == "momentum_shift"

    def test_key_event_high_weight(self):
        anchor = _make_anchor(
            event_id="T_MS_KEY",
            event_type=EventType.MOMENTUM_SHIFT,
            importance=70,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is True

    def test_key_event_low_weight(self):
        anchor = _make_anchor(
            event_id="T_MS_NKEY",
            event_type=EventType.MOMENTUM_SHIFT,
            importance=60,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_key_event is False

    def test_highlight_high_weight(self):
        anchor = _make_anchor(
            event_id="T_MS_HL",
            event_type=EventType.MOMENTUM_SHIFT,
            importance=80,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_highlight is True

    def test_highlight_low_weight(self):
        anchor = _make_anchor(
            event_id="T_MS_NHL",
            event_type=EventType.MOMENTUM_SHIFT,
            importance=70,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_highlight is False

    def test_commentary_trigger_high_weight(self):
        anchor = _make_anchor(
            event_id="T_MS_CM",
            event_type=EventType.MOMENTUM_SHIFT,
            importance=70,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_commentary_trigger is True

    def test_commentary_trigger_low_weight(self):
        anchor = _make_anchor(
            event_id="T_MS_NCM",
            event_type=EventType.MOMENTUM_SHIFT,
            importance=60,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_commentary_trigger is False

    def test_include_in_replay(self):
        anchor = _make_anchor(
            event_id="T_MS_RP",
            event_type=EventType.MOMENTUM_SHIFT,
            importance=60,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.include_in_replay is True


# ── PHASE_CHANGE ──────────────────────────────────────────────────────────


class TestPhaseChangeConversion:
    def test_field_mapping(self):
        anchor = _make_anchor(
            event_id="T_PC_1",
            event_type=EventType.PHASE_CHANGE,
            minute=1,
            team=None,
            player=None,
            importance=60,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.event_type == "PHASE_CHANGE"
        assert e.team is None
        assert e.player is None

    def test_visual_metadata(self):
        anchor = _make_anchor(event_id="T_PC_V", event_type=EventType.PHASE_CHANGE)
        e = Converter()._convert_anchor(anchor)
        assert e.timeline_group == "MATCH_STATE"
        assert e.icon == "phase_change"
        assert e.color == "#4444FF"
        assert e.animation == "phase_transition"
        assert e.audio_trigger == "phase_chime"

    def test_visible_high_importance(self):
        anchor = _make_anchor(
            event_id="T_PC_VH",
            event_type=EventType.PHASE_CHANGE,
            importance=60,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is True

    def test_visible_low_importance(self):
        anchor = _make_anchor(
            event_id="T_PC_VL",
            event_type=EventType.PHASE_CHANGE,
            importance=9,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is False

    def test_visible_threshold_30(self):
        anchor = _make_anchor(
            event_id="T_PC_V30",
            event_type=EventType.PHASE_CHANGE,
            importance=30,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is False

    def test_visible_above_30(self):
        anchor = _make_anchor(
            event_id="T_PC_V31",
            event_type=EventType.PHASE_CHANGE,
            importance=31,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.visible is True

    def test_commentary_trigger_half_time(self):
        anchor = _make_anchor(
            event_id="T_PC_HT",
            event_type=EventType.PHASE_CHANGE,
            phase_transition="FIRST_HALF_TO_HALF_TIME",
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_commentary_trigger is True

    def test_commentary_trigger_non_half_time(self):
        anchor = _make_anchor(
            event_id="T_PC_NHT",
            event_type=EventType.PHASE_CHANGE,
            phase_transition="KICKOFF",
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_commentary_trigger is False

    def test_commentary_trigger_no_transition(self):
        anchor = _make_anchor(
            event_id="T_PC_NULL",
            event_type=EventType.PHASE_CHANGE,
            phase_transition=None,
        )
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.is_commentary_trigger is False

    def test_include_in_replay_not_key(self):
        anchor = _make_anchor(event_id="T_PC_RP", event_type=EventType.PHASE_CHANGE)
        e = Converter()._convert_anchor(anchor)
        assert e.runtime_flags.include_in_replay is False


# ── END-TO-END ────────────────────────────────────────────────────────────


class TestEndToEndConversion:
    def test_one_anchor_produces_one_event(self):
        anchors = [
            _make_anchor(event_id="E2E_1", minute=1, event_type=EventType.PHASE_CHANGE, importance=60),
            _make_anchor(event_id="E2E_2", minute=23, event_type=EventType.PENALTY, importance=70),
            _make_anchor(event_id="E2E_3", minute=23, event_type=EventType.GOAL, importance=95),
        ]
        dataset = _make_dataset(anchors)
        timeline = Converter().convert(dataset)
        assert len(timeline.timeline) == 3
        assert timeline.match_id == "ARG_FRA_2022"

    def test_all_ids_preserved(self):
        ids = ["E2E_ID_1", "E2E_ID_2", "E2E_ID_3"]
        anchors = [
            _make_anchor(event_id=ids[0], minute=1, event_type=EventType.PHASE_CHANGE, importance=60),
            _make_anchor(event_id=ids[1], minute=2, event_type=EventType.GOAL, importance=50),
            _make_anchor(event_id=ids[2], minute=3, event_type=EventType.CARD, card_type=CardType.YELLOW),
        ]
        dataset = _make_dataset(anchors)
        timeline = Converter().convert(dataset)
        assert [e.id for e in timeline.timeline] == ids

    def test_chronological_sorting(self):
        anchors = [
            _make_anchor(event_id="E2E_3", minute=80, event_type=EventType.GOAL, importance=95),
            _make_anchor(event_id="E2E_1", minute=1, event_type=EventType.PHASE_CHANGE, importance=60),
            _make_anchor(event_id="E2E_2", minute=23, event_type=EventType.GOAL, importance=95),
        ]
        dataset = _make_dataset(anchors)
        timeline = Converter().convert(dataset)
        minutes = [e.minute for e in timeline.timeline]
        assert minutes == sorted(minutes), f"Expected sorted minutes, got {minutes}"

    def test_anchors_equal_events(self):
        anchors = [_make_anchor(event_id=f"E2E_{i}", minute=i) for i in range(1, 11)]
        dataset = _make_dataset(anchors)
        validation = Converter()._validate_conversion(
            dataset, Converter().convert(dataset)
        )
        assert validation.passed
        assert validation.total_anchors == 10
        assert validation.total_events == 10

    def test_match_info_derivation(self):
        anchors = [
            _make_anchor(event_id="M_1", event_type=EventType.GOAL, team="Argentina", score_after_event={"home": 1, "away": 0}),
            _make_anchor(event_id="M_2", event_type=EventType.GOAL, team="France", importance=90, score_after_event={"home": 1, "away": 1}),
        ]
        dataset = _make_dataset(anchors)
        timeline = Converter().convert(dataset)
        assert timeline.match.home_team == "Argentina"
        assert timeline.match.away_team == "France"
        assert timeline.match.home_score == 1
        assert timeline.match.away_score == 1

    def test_custom_match_info(self):
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
        anchors = [_make_anchor(event_id="C_1", minute=1, event_type=EventType.PHASE_CHANGE, importance=60)]
        dataset = _make_dataset(anchors)
        timeline = Converter(match_info=match_info).convert(dataset)
        assert timeline.match.home_team == "Argentina"
        assert timeline.match.date == "2022-12-18"
        assert timeline.match.competition == "FIFA World Cup Final"
        assert timeline.match.venue == "Lusail Stadium"
        assert timeline.match.home_shootout_score == 4
        assert timeline.match.away_shootout_score == 2

    def test_requires_user_attention_always_false(self):
        for et in EventType:
            anchor = _make_anchor(event_id=f"RUA_{et.value}", event_type=et)
            e = Converter()._convert_anchor(anchor)
            assert e.runtime_flags.requires_user_attention is False

    def test_all_event_types_produce_valid_event(self):
        for et in EventType:
            anchor = _make_anchor(event_id=f"ALL_{et.value}", event_type=et)
            e = Converter()._convert_anchor(anchor)
            assert e.id == f"ALL_{et.value}"
            assert e.event_type == et.value
            assert e.weight >= 0.0
            assert e.timeline_group in ("GOAL_EVENTS", "DISCIPLINE", "TACTICAL", "PRESSURE", "MOMENTUM", "MATCH_STATE")


# ── VISIBLE DERIVATION ────────────────────────────────────────────────────


class TestVisibleDerivation:
    def test_goal_always_visible(self):
        anchor = _make_anchor(event_id="V_GOAL", event_type=EventType.GOAL, importance=0)
        assert Converter()._derive_visible(anchor, 0.0) is True

    def test_penalty_always_visible(self):
        anchor = _make_anchor(event_id="V_PEN", event_type=EventType.PENALTY, importance=0)
        assert Converter()._derive_visible(anchor, 0.0) is True

    def test_card_always_visible(self):
        anchor = _make_anchor(event_id="V_CARD", event_type=EventType.CARD, importance=0)
        assert Converter()._derive_visible(anchor, 0.0) is True

    def test_substitution_always_visible(self):
        anchor = _make_anchor(event_id="V_SUB", event_type=EventType.SUBSTITUTION, importance=0)
        assert Converter()._derive_visible(anchor, 0.0) is True

    def test_importance_0_to_9_hidden(self):
        for imp in range(0, 10):
            anchor = _make_anchor(
                event_id=f"V_IMP_{imp}",
                event_type=EventType.PRESSURE_SURGE,
                importance=imp,
            )
            assert Converter()._derive_visible(anchor, imp / 100.0) is False, f"failed at importance={imp}"

    def test_phase_change_30_hidden(self):
        anchor = _make_anchor(event_id="V_PC30", event_type=EventType.PHASE_CHANGE, importance=30)
        assert Converter()._derive_visible(anchor, 0.30) is False

    def test_phase_change_above_30_visible(self):
        anchor = _make_anchor(event_id="V_PC31", event_type=EventType.PHASE_CHANGE, importance=31)
        assert Converter()._derive_visible(anchor, 0.31) is True
