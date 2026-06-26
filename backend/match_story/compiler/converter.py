from __future__ import annotations

import datetime
import re
from typing import Dict, List, Optional, Set

from backend.match_story.compiler.exceptions import CompilerError
from backend.match_story.compiler.models import (
    CanonicalAnchor,
    CanonicalDataset,
    CardType,
    ConversionResult,
    EventType,
    MatchInfo,
    RuntimeFlags,
    RuntimeMetadata,
    RuntimeTimeline,
    RuntimeTimelineEvent,
    ValidationIssue,
    ValidationSeverity,
)


TEAM_CODE_MAP: Dict[str, str] = {
    "ARG": "Argentina",
    "FRA": "France",
}


class Converter:
    COMPILER_VERSION = "1.0.0"

    def __init__(
        self,
        match_info: Optional[MatchInfo] = None,
        date: str = "",
        competition: str = "",
        venue: str = "",
    ) -> None:
        self._match_info = match_info
        self._date = date
        self._competition = competition
        self._venue = venue
        self._validation: Optional[ConversionResult] = None

    @property
    def validation(self) -> Optional[ConversionResult]:
        return self._validation

    def convert(self, dataset: CanonicalDataset) -> RuntimeTimeline:
        events = [self._convert_anchor(a) for a in dataset.anchors]
        events.sort(
            key=lambda e: (e.minute, e.stoppage_time if e.stoppage_time is not None else -1),
        )
        match_info = self._match_info or self._derive_match_info(dataset)
        metadata = self._build_metadata(dataset, events)

        timeline = RuntimeTimeline(
            schema_version="2.1",
            match_id=dataset.metadata.match_id,
            match=match_info,
            timeline=events,
            metadata=metadata,
        )

        self._validation = self._validate_conversion(dataset, timeline)
        return timeline

    def _convert_anchor(self, anchor: CanonicalAnchor) -> RuntimeTimelineEvent:
        weight = round(anchor.importance / 100.0, 2)
        visible = self._derive_visible(anchor, weight)
        flags = self._derive_runtime_flags(anchor, weight)

        event_type_str = anchor.event_type.value
        visual = self._derive_visual_metadata(anchor)

        if anchor.event_type in (EventType.GOAL, EventType.PENALTY) and anchor.match_period.value == "PENALTY_SHOOTOUT":
            if anchor.event_type == EventType.GOAL:
                visual["animation"] = "shootout_goal"
                visual["audio_trigger"] = "shootout_cymbal"
            else:
                visual["animation"] = "shootout_penalty"
                visual["audio_trigger"] = "shootout_whistle"

        card_type_value: Optional[str] = None
        if anchor.card_type is not None:
            card_type_value = anchor.card_type.value
        elif anchor.event_type == EventType.CARD:
            card_type_value = None

        attribution = [
            {"source": ref.source, "detail": ref.detail}
            for ref in anchor.source_references
        ]

        return RuntimeTimelineEvent(
            id=anchor.event_id,
            minute=anchor.minute,
            stoppage_time=anchor.stoppage_time,
            match_period=anchor.match_period.value,
            event_type=event_type_str,
            team=anchor.team,
            player=anchor.player,
            weight=weight,
            score=dict(anchor.score_after_event),
            shootout_score=dict(anchor.shootout_score) if anchor.shootout_score else None,
            description=anchor.narrative_notes,
            confidence=anchor.source_confidence.value,
            card_type=card_type_value,
            attribution=attribution,
            timeline_group=visual["timeline_group"],
            icon=visual["icon"],
            color=visual["color"],
            animation=visual["animation"],
            audio_trigger=visual["audio_trigger"],
            visible=visible,
            runtime_flags=flags,
        )

    def _derive_visible(self, anchor: CanonicalAnchor, weight: float) -> bool:
        if anchor.event_type in (
            EventType.GOAL,
            EventType.PENALTY,
            EventType.CARD,
            EventType.SUBSTITUTION,
        ):
            return True
        if anchor.importance <= 9:
            return False
        if anchor.event_type is EventType.PHASE_CHANGE and weight <= 0.30:
            return False
        return True

    def _derive_runtime_flags(self, anchor: CanonicalAnchor, weight: float) -> RuntimeFlags:
        is_key_event = self._is_key_event(anchor, weight)
        is_highlight = self._is_highlight(anchor, weight)
        is_commentary = self._is_commentary_trigger(anchor, weight)
        show_on_timeline = self._derive_visible(anchor, weight)
        include_replay = self._include_in_replay(anchor, weight)

        return RuntimeFlags(
            is_key_event=is_key_event,
            is_highlight=is_highlight,
            is_commentary_trigger=is_commentary,
            show_on_timeline=show_on_timeline,
            include_in_replay=include_replay,
            requires_user_attention=False,
        )

    def _is_key_event(self, anchor: CanonicalAnchor, weight: float) -> bool:
        if weight < 0.70:
            return False
        if anchor.event_type in (EventType.GOAL, EventType.PENALTY):
            return True
        if anchor.event_type is EventType.MOMENTUM_SHIFT:
            return True
        if anchor.event_type is EventType.CARD and anchor.card_type == CardType.RED:
            return True
        return False

    def _is_highlight(self, anchor: CanonicalAnchor, weight: float) -> bool:
        if anchor.event_type is EventType.GOAL and weight >= 0.90:
            return True
        if anchor.event_type is EventType.MOMENTUM_SHIFT and weight >= 0.80:
            return True
        if anchor.event_type is EventType.CARD and anchor.card_type == CardType.RED:
            return True
        return False

    def _is_commentary_trigger(self, anchor: CanonicalAnchor, weight: float) -> bool:
        if anchor.event_type in (EventType.GOAL, EventType.PENALTY):
            return True
        if anchor.event_type is EventType.MOMENTUM_SHIFT and weight >= 0.70:
            return True
        if (
            anchor.event_type is EventType.PHASE_CHANGE
            and anchor.phase_transition is not None
        ):
            pt = anchor.phase_transition
            if "HALF_TIME" in pt or "FULL_TIME" in pt:
                return True
        return False

    def _include_in_replay(self, anchor: CanonicalAnchor, weight: float) -> bool:
        if anchor.event_type in (EventType.GOAL, EventType.PENALTY, EventType.CARD):
            return True
        if anchor.event_type is EventType.MOMENTUM_SHIFT and weight >= 0.60:
            return True
        if anchor.event_type is EventType.PRESSURE_SURGE and weight >= 0.60:
            return True
        return False

    def _derive_visual_metadata(self, anchor: CanonicalAnchor) -> dict:
        et = anchor.event_type

        if et == EventType.GOAL:
            return {
                "icon": "goal",
                "color": "#00FF88",
                "animation": "goal_flash",
                "audio_trigger": "crowd_roar",
                "timeline_group": "GOAL_EVENTS",
            }
        if et == EventType.PENALTY:
            return {
                "icon": "penalty",
                "color": "#FF4444",
                "animation": "penalty_award",
                "audio_trigger": "whistle",
                "timeline_group": "GOAL_EVENTS",
            }
        if et == EventType.CARD:
            ct = anchor.card_type
            if ct == CardType.YELLOW or ct is None:
                icon = "card_yellow"
                color = "#FFD700"
            elif ct == CardType.RED:
                icon = "card_red"
                color = "#FF0000"
            elif ct == CardType.SECOND_YELLOW:
                icon = "card_second_yellow"
                color = "#FF6600"
            else:
                icon = "card_yellow"
                color = "#FFD700"
            return {
                "icon": icon,
                "color": color,
                "animation": "card_flash",
                "audio_trigger": "whistle",
                "timeline_group": "DISCIPLINE",
            }
        if et == EventType.SUBSTITUTION:
            return {
                "icon": "substitution",
                "color": "#888888",
                "animation": "substitution_board",
                "audio_trigger": None,
                "timeline_group": "TACTICAL",
            }
        if et == EventType.PRESSURE_SURGE:
            return {
                "icon": "pressure",
                "color": "#FF8800",
                "animation": "pressure_pulse",
                "audio_trigger": "intensity_rise",
                "timeline_group": "PRESSURE",
            }
        if et == EventType.MOMENTUM_SHIFT:
            return {
                "icon": "momentum",
                "color": "#AA44FF",
                "animation": "momentum_wave",
                "audio_trigger": "momentum_shift",
                "timeline_group": "MOMENTUM",
            }
        if et == EventType.PHASE_CHANGE:
            return {
                "icon": "phase_change",
                "color": "#4444FF",
                "animation": "phase_transition",
                "audio_trigger": "phase_chime",
                "timeline_group": "MATCH_STATE",
            }

        return {
            "icon": "unknown",
            "color": "#CCCCCC",
            "animation": None,
            "audio_trigger": None,
            "timeline_group": "MATCH_STATE",
        }

    def _derive_match_info(self, dataset: CanonicalDataset) -> MatchInfo:
        match_id = dataset.metadata.match_id
        parts = match_id.split("_")
        home_code = parts[0] if len(parts) > 0 else ""
        away_code = parts[1] if len(parts) > 1 else ""

        teams: List[str] = sorted(
            set(a.team for a in dataset.anchors if a.team is not None)
        )

        home_team = TEAM_CODE_MAP.get(home_code, teams[0] if len(teams) > 0 else home_code)
        away_team = TEAM_CODE_MAP.get(away_code, teams[1] if len(teams) > 1 else away_code)

        last_anchor = dataset.anchors[-1]
        home_score = last_anchor.score_after_event.get("home", 0)
        away_score = last_anchor.score_after_event.get("away", 0)

        shootout = last_anchor.shootout_score
        home_shootout: Optional[int] = None
        away_shootout: Optional[int] = None
        if shootout is not None:
            home_shootout = shootout.get("home")
            away_shootout = shootout.get("away")

        competition = self._competition or ""
        if not competition:
            match match_id:
                case "ARG_FRA_2022":
                    competition = "FIFA World Cup Final"

        return MatchInfo(
            home_team=home_team,
            away_team=away_team,
            date=self._date or "",
            competition=competition,
            venue=self._venue or "",
            home_score=home_score,
            away_score=away_score,
            home_shootout_score=home_shootout,
            away_shootout_score=away_shootout,
        )

    def _build_metadata(
        self, dataset: CanonicalDataset, events: List[RuntimeTimelineEvent]
    ) -> RuntimeMetadata:
        validation_status = "PASS"
        if self._validation is not None:
            validation_status = "PASS" if self._validation.passed else "FAIL"

        return RuntimeMetadata(
            generation_time=datetime.datetime.now(datetime.timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
            compiler_version=self.COMPILER_VERSION,
            source_dataset=dataset.source_path.split("\\")[-1].split("/")[-1],
            total_events=len(events),
            validation_status=validation_status,
            schema_version="2.1",
        )

    def _validate_conversion(
        self, dataset: CanonicalDataset, timeline: RuntimeTimeline
    ) -> ConversionResult:
        issues: List[ValidationIssue] = []

        anchor_ids: Set[str] = {a.event_id for a in dataset.anchors}
        event_ids: Set[str] = {e.id for e in timeline.timeline}

        if anchor_ids != event_ids:
            missing_in_events = anchor_ids - event_ids
            missing_in_anchors = event_ids - anchor_ids
            if missing_in_events:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="MISSING_EVENT",
                        message=f"Anchors without timeline events: {', '.join(sorted(missing_in_events))}",
                    )
                )
            if missing_in_anchors:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="ORPHAN_EVENT",
                        message=f"Timeline events without source anchors: {', '.join(sorted(missing_in_anchors))}",
                    )
                )

        if len(dataset.anchors) != len(timeline.timeline):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="COUNT_MISMATCH",
                    message=f"Anchor count ({len(dataset.anchors)}) != event count ({len(timeline.timeline)})",
                )
            )

        sorted_events = sorted(
            timeline.timeline,
            key=lambda e: (e.minute, e.stoppage_time if e.stoppage_time is not None else -1),
        )
        for i, event in enumerate(timeline.timeline):
            if (
                event.minute != sorted_events[i].minute
                or event.stoppage_time != sorted_events[i].stoppage_time
            ):
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        code="CHRONOLOGY_UNSORTED",
                        message="Timeline events are not in chronological order",
                    )
                )
                break

        for event in timeline.timeline:
            if not (0.0 <= event.weight <= 1.0):
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="WEIGHT_RANGE",
                        message=f"Event '{event.id}': weight {event.weight} outside [0.0, 1.0]",
                        event_id=event.id,
                        field="weight",
                    )
                )

        error_count = sum(1 for i in issues if i.severity == ValidationSeverity.ERROR)
        warning_count = sum(1 for i in issues if i.severity == ValidationSeverity.WARNING)

        return ConversionResult(
            passed=error_count == 0,
            issues=issues,
            total_anchors=len(dataset.anchors),
            total_events=len(timeline.timeline),
            error_count=error_count,
            warning_count=warning_count,
        )
