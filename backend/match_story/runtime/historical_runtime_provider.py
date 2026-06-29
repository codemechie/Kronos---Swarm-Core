from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from backend.match_story.compiler.models import (
    MatchInfo,
    RuntimeTimeline,
    RuntimeTimelineEvent,
)
from backend.match_story.runtime.clock_models import MatchTime
from backend.match_story.runtime.simulation_clock import SimulationClock as _SimulationClock

logger = logging.getLogger(__name__)


class HistoricalRuntimeProvider:
    """Provides historical match simulation state.

    Owns a SimulationClock and a Runtime Timeline loaded once from
    a JSON file at initialisation.  Exposes the current runtime state
    derived from the clock position and the timeline.

    No background threads, no timers, no scheduled jobs, no persistent
    state.
    """

    def __init__(
        self,
        timeline_path: Optional[str] = None,
        clock: Optional[_SimulationClock] = None,
    ) -> None:
        # Accept an externally-created clock so the caller can share a single
        # authoritative SimulationClock across the whole backend.
        self._clock = clock if clock is not None else _SimulationClock()
        self._timeline: Optional[RuntimeTimeline] = None

        if timeline_path is not None:
            self._load_timeline(timeline_path)

    # ── Public API ───────────────────────────────────────────────────

    def get_current_match_time(self) -> MatchTime:
        """Return the current simulation match time."""
        return self._clock.get_match_time()

    def get_visible_events(self) -> List[Dict[str, Any]]:
        """Return timeline events that have occurred up to the current minute.

        In a looping simulation, events from the current cycle are
        returned — i.e. events whose minute <= current_minute.
        Returns an empty list if no timeline is loaded.
        """
        if self._timeline is None:
            return []

        current_minute = self._clock.get_current_minute()
        visible: List[Dict[str, Any]] = []
        for event in self._timeline.timeline:
            if event.minute <= current_minute:
                visible.append(self._event_to_dict(event))
        return visible

    def get_current_score(self) -> Dict[str, int]:
        """Return the latest known score.

        Walks visible events for the most recent score entry.
        Falls back to match metadata or (0, 0).
        """
        if self._timeline is not None:
            current_minute = self._clock.get_current_minute()
            latest_score: Optional[Dict[str, int]] = None
            for event in self._timeline.timeline:
                if event.minute <= current_minute:
                    home = event.score.get("home")
                    away = event.score.get("away")
                    if home is not None and away is not None:
                        latest_score = {"home": home, "away": away}

            if latest_score is not None:
                return latest_score

            # Fall back to match-level score
            match = self._timeline.match
            return {"home": match.home_score, "away": match.away_score}

        return {"home": 0, "away": 0}

    def get_current_statistics(self) -> Dict[str, Any]:
        """Return current match statistics.

        Derived from visible timeline events.
        Returns basic statistics; may be extended as data becomes
        available.
        """
        if self._timeline is None:
            return {}

        events = self.get_visible_events()
        total_events = len(events)

        # Count event types
        type_counts: Dict[str, int] = {}
        for ev in events:
            etype = ev.get("event_type", "UNKNOWN")
            type_counts[etype] = type_counts.get(etype, 0) + 1

        return {
            "total_events": total_events,
            "event_type_counts": type_counts,
        }

    def get_match_phase(self) -> str:
        """Return the current match period (e.g. FIRST_HALF)."""
        return self._clock.get_match_period()

    # ── Internal ─────────────────────────────────────────────────────

    def _load_timeline(self, path: str) -> None:
        """Load a RuntimeTimeline from a JSON file, exactly once."""
        if not os.path.isfile(path):
            logger.warning("Timeline file not found: %s", path)
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to load timeline from %s: %s", path, exc)
            return

        match_data = data.get("match", {})
        match = MatchInfo(
            home_team=match_data.get("home_team", ""),
            away_team=match_data.get("away_team", ""),
            date=match_data.get("date", ""),
            competition=match_data.get("competition", ""),
            venue=match_data.get("venue", ""),
            home_score=match_data.get("home_score", 0),
            away_score=match_data.get("away_score", 0),
            home_shootout_score=match_data.get("home_shootout_score"),
            away_shootout_score=match_data.get("away_shootout_score"),
        )

        timeline_events: List[RuntimeTimelineEvent] = []
        for item in data.get("timeline", []):
            timeline_events.append(
                RuntimeTimelineEvent(
                    id=item.get("id", ""),
                    minute=item.get("minute", 0),
                    stoppage_time=item.get("stoppage_time"),
                    match_period=item.get("match_period", ""),
                    event_type=item.get("event_type", ""),
                    team=item.get("team"),
                    player=item.get("player"),
                    weight=item.get("weight", 0.0),
                    score=item.get("score", {}),
                    shootout_score=item.get("shootout_score"),
                    description=item.get("description", ""),
                    confidence=item.get("confidence", "LOW"),
                    card_type=item.get("card_type"),
                    attribution=item.get("attribution", []),
                    timeline_group=item.get("timeline_group", "MATCH_STATE"),
                    icon=item.get("icon", "unknown"),
                    color=item.get("color", "#CCCCCC"),
                    animation=item.get("animation"),
                    audio_trigger=item.get("audio_trigger"),
                    visible=item.get("visible", True),
                    runtime_flags=None,
                )
            )

        self._timeline = RuntimeTimeline(
            schema_version=data.get("schema_version", ""),
            match_id=data.get("match_id", ""),
            match=match,
            timeline=timeline_events,
            metadata=data.get("metadata", {}),
        )

        logger.info(
            "Loaded timeline: %s (%d events)",
            self._timeline.match_id,
            len(self._timeline.timeline),
        )

    @staticmethod
    def _event_to_dict(event: RuntimeTimelineEvent) -> Dict[str, Any]:
        """Convert a RuntimeTimelineEvent to a plain dict for the public API."""
        return {
            "id": event.id,
            "minute": event.minute,
            "stoppage_time": event.stoppage_time,
            "match_period": event.match_period,
            "event_type": event.event_type,
            "team": event.team,
            "player": event.player,
            "weight": event.weight,
            "score": event.score,
            "description": event.description,
            "confidence": event.confidence,
            "card_type": event.card_type,
            "attribution": event.attribution,
            "timeline_group": event.timeline_group,
            "icon": event.icon,
            "color": event.color,
            "visible": event.visible,
        }
