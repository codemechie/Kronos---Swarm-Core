from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict


@dataclass
class TacticalMetrics:
    ppda: float
    block_height_m: float
    vertical_disconnect: float
    field_tilt: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PhysicalMetrics:
    sprint_drop_off: float
    hid_deficit_km: float
    recovery_time_sec: float
    defensive_fatigue: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PsychologicalMetrics:
    crowd_decibels: int
    foul_escalation: int
    xg_delta: float
    panic_index: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GameTheoryMetrics:
    rest_defense_count: int
    box_overload_count: int
    gk_sweeper_dist: float
    sub_shock_index: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EnvironmentalMetrics:
    pitch_slickness: float
    wind_interference: float
    fog_visibility: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class KronosTelemetryPacket:
    match_minute: int
    score_home: int
    score_away: int
    tactical: TacticalMetrics
    physical: PhysicalMetrics
    psychology: PsychologicalMetrics
    game_theory: GameTheoryMetrics
    environment: EnvironmentalMetrics

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
