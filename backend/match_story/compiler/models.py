from __future__ import annotations

import datetime
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, List, Optional


class EventType(Enum):
    GOAL = "GOAL"
    PENALTY = "PENALTY"
    CARD = "CARD"
    SUBSTITUTION = "SUBSTITUTION"
    MOMENTUM_SHIFT = "MOMENTUM_SHIFT"
    PRESSURE_SURGE = "PRESSURE_SURGE"
    PHASE_CHANGE = "PHASE_CHANGE"


class MatchPeriod(Enum):
    FIRST_HALF = "FIRST_HALF"
    SECOND_HALF = "SECOND_HALF"
    EXTRA_TIME_1 = "EXTRA_TIME_1"
    EXTRA_TIME_2 = "EXTRA_TIME_2"
    PENALTY_SHOOTOUT = "PENALTY_SHOOTOUT"


class Confidence(Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class CardType(Enum):
    YELLOW = "YELLOW"
    RED = "RED"
    SECOND_YELLOW = "SECOND_YELLOW"


class ValidationSeverity(Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"


@dataclass
class SourceReference:
    source: str
    detail: str


@dataclass
class CanonicalAnchor:
    event_id: str
    minute: int
    stoppage_time: Optional[int]
    match_period: MatchPeriod
    event_type: EventType
    team: Optional[str]
    player: Optional[str]
    importance: int
    score_after_event: dict
    shootout_score: Optional[dict]
    source_confidence: Confidence
    narrative_notes: str
    source_references: List[SourceReference]
    card_type: Optional[CardType] = None
    creation_reason: Optional[str] = None
    supporting_signals: Optional[List[str]] = None
    pressure_indicators: Optional[List[str]] = None
    phase_transition: Optional[str] = None


@dataclass
class DatasetMetadata:
    match_id: str
    schema_version: str
    anchor_version: str
    total_anchors: Optional[int] = None
    source_parts: Optional[int] = None
    coverage: Optional[List[str]] = None


@dataclass
class CanonicalDataset:
    metadata: DatasetMetadata
    anchors: List[CanonicalAnchor]
    source_path: str


@dataclass
class ValidationIssue:
    severity: ValidationSeverity
    code: str
    message: str
    event_id: Optional[str] = None
    field: Optional[str] = None


@dataclass
class ValidationResult:
    passed: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    total_anchors: int = 0
    unique_event_ids: int = 0
    total_issues: int = 0
    error_count: int = 0
    warning_count: int = 0

    @property
    def summary(self) -> str:
        parts = []
        if self.passed:
            parts.append("PASS")
        else:
            parts.append("FAIL")
        parts.append(f"{self.total_anchors} anchors")
        parts.append(f"{self.total_issues} issues")
        parts.append(f"{self.error_count} errors")
        parts.append(f"{self.warning_count} warnings")
        return " | ".join(parts)


@dataclass
class CompilerMetadata:
    generation_time: datetime.datetime
    compiler_version: str
    source_dataset: str
    total_events: int
    validation_status: str
    schema_version: str


@dataclass
class MatchInfo:
    home_team: str
    away_team: str
    date: str
    competition: str
    venue: str
    home_score: int
    away_score: int
    home_shootout_score: Optional[int] = None
    away_shootout_score: Optional[int] = None


@dataclass
class RuntimeFlags:
    is_key_event: bool = False
    is_highlight: bool = False
    is_commentary_trigger: bool = False
    show_on_timeline: bool = True
    include_in_replay: bool = True
    requires_user_attention: bool = False


@dataclass
class RuntimeTimelineEvent:
    id: str
    minute: int
    stoppage_time: Optional[int]
    match_period: str
    event_type: str
    team: Optional[str]
    player: Optional[str]
    weight: float
    score: dict
    shootout_score: Optional[dict]
    description: str
    confidence: str
    card_type: Optional[str] = None
    attribution: List[dict] = field(default_factory=list)
    timeline_group: str = "MATCH_STATE"
    icon: str = "unknown"
    color: str = "#CCCCCC"
    animation: Optional[str] = None
    audio_trigger: Optional[str] = None
    visible: bool = True
    runtime_flags: Optional[RuntimeFlags] = None


@dataclass
class RuntimeMetadata:
    generation_time: str
    compiler_version: str
    source_dataset: str
    total_events: int
    validation_status: str
    schema_version: str


@dataclass
class RuntimeTimeline:
    schema_version: str
    match_id: str
    match: MatchInfo
    timeline: List[RuntimeTimelineEvent]
    metadata: RuntimeMetadata


@dataclass
class ConversionResult:
    passed: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    total_anchors: int = 0
    total_events: int = 0
    error_count: int = 0
    warning_count: int = 0

    @property
    def summary(self) -> str:
        parts = []
        if self.passed:
            parts.append("PASS")
        else:
            parts.append("FAIL")
        parts.append(f"{self.total_anchors} anchors")
        parts.append(f"{self.total_events} events")
        parts.append(f"{self.error_count} errors")
        parts.append(f"{self.warning_count} warnings")
        return " | ".join(parts)


@dataclass
class RuntimeValidationResult:
    passed: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    total_events: int = 0
    total_issues: int = 0
    error_count: int = 0
    warning_count: int = 0

    @property
    def summary(self) -> str:
        parts = []
        if self.passed:
            parts.append("PASS")
        else:
            parts.append("FAIL")
        parts.append(f"{self.total_events} events")
        parts.append(f"{self.total_issues} issues")
        parts.append(f"{self.error_count} errors")
        parts.append(f"{self.warning_count} warnings")
        return " | ".join(parts)
