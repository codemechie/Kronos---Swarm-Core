from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from backend.match_story.compiler.exceptions import FileFormatError, ParseError
from backend.match_story.compiler.models import (
    CanonicalAnchor,
    CanonicalDataset,
    CardType,
    Confidence,
    DatasetMetadata,
    EventType,
    MatchPeriod,
    SourceReference,
)


def _parse_value(raw: str) -> Any:
    stripped = raw.strip()
    if stripped.startswith("`") and stripped.endswith("`") and len(stripped) > 1:
        inner = stripped[1:-1]
        if inner == "null":
            return None
        try:
            return json.loads(inner)
        except (json.JSONDecodeError, TypeError):
            return inner
    if stripped == "null":
        return None
    try:
        return json.loads(stripped)
    except (json.JSONDecodeError, TypeError):
        return stripped


def _parse_int(raw: str) -> Optional[int]:
    val = _parse_value(raw)
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _parse_table_row(line: str) -> Tuple[str, str]:
    parts = [p.strip() for p in line.strip().split("|")]
    if len(parts) < 3:
        raise ParseError(f"Malformed table row: {line}")
    field_raw = parts[1]
    value_raw = parts[2]
    field_name = field_raw.strip("* ")
    return field_name, value_raw


def _is_table_row(line: str) -> bool:
    s = line.strip()
    return s.startswith("|") and s.endswith("|")


def _is_separator(line: str) -> bool:
    s = line.strip()
    return s == "---"


def _is_event_header(line: str) -> bool:
    return line.strip().startswith("### Event") or line.strip().startswith("###Event")


def _is_part_header(line: str) -> bool:
    return line.strip().startswith("## Part")


def _extract_event_type_from_header(line: str) -> str:
    m = re.search(r"###\s*Event\s*[—\-–]\s*(\S+)", line)
    if m:
        return m.group(1).strip()
    raise ParseError(f"Cannot extract event type from header: {line}")


def _build_anchor(
    fields: Dict[str, str], line_number: int
) -> CanonicalAnchor:
    try:
        event_type_raw = _parse_value(fields.get("event_type", ""))
        if isinstance(event_type_raw, str):
            event_type = EventType(event_type_raw)
        elif event_type_raw is None:
            raise ParseError(f"Line {line_number}: event_type is required")
        else:
            event_type = EventType(str(event_type_raw))

        match_period_raw = _parse_value(fields.get("match_period", ""))
        if isinstance(match_period_raw, str):
            match_period = MatchPeriod(match_period_raw)
        elif match_period_raw is None:
            raise ParseError(f"Line {line_number}: match_period is required")
        else:
            match_period = MatchPeriod(str(match_period_raw))

        confidence_raw = _parse_value(fields.get("source_confidence", ""))
        if isinstance(confidence_raw, str):
            source_confidence = Confidence(confidence_raw)
        elif confidence_raw is None:
            raise ParseError(f"Line {line_number}: source_confidence is required")
        else:
            source_confidence = Confidence(str(confidence_raw))

        event_id = _parse_value(fields.get("event_id", ""))
        if not isinstance(event_id, str) or not event_id:
            raise ParseError(f"Line {line_number}: event_id must be a non-empty string")

        minute = _parse_int(fields.get("minute", ""))
        if minute is None:
            raise ParseError(f"Line {line_number}: minute is required and must be an integer")

        stoppage_raw = _parse_value(fields.get("stoppage_time", ""))
        stoppage_time: Optional[int] = None
        if stoppage_raw is not None:
            stoppage_time = int(stoppage_raw)

        team = _parse_value(fields.get("team", ""))
        if not isinstance(team, (str, type(None))):
            team = str(team) if team is not None else None

        player = _parse_value(fields.get("player", ""))
        if not isinstance(player, (str, type(None))):
            player = str(player) if player is not None else None

        importance = _parse_int(fields.get("importance", ""))
        if importance is None:
            raise ParseError(f"Line {line_number}: importance is required and must be an integer")

        score_raw = _parse_value(fields.get("score_after_event", ""))
        if not isinstance(score_raw, dict):
            raise ParseError(f"Line {line_number}: score_after_event must be a JSON object")
        score_after_event = score_raw

        shootout_raw = _parse_value(fields.get("shootout_score", ""))
        shootout_score: Optional[dict] = None
        if isinstance(shootout_raw, dict):
            shootout_score = shootout_raw

        narrative = _parse_value(fields.get("narrative_notes", ""))
        if not isinstance(narrative, str):
            narrative = str(narrative) if narrative is not None else ""
        description: str = narrative

        source_refs_raw = _parse_value(fields.get("source_references", ""))
        source_references: List[SourceReference] = []
        if isinstance(source_refs_raw, list):
            for item in source_refs_raw:
                if isinstance(item, dict):
                    source_references.append(
                        SourceReference(
                            source=str(item.get("source", "")),
                            detail=str(item.get("detail", "")),
                        )
                    )

        card_type_raw = _parse_value(fields.get("card_type", ""))
        card_type: Optional[CardType] = None
        if card_type_raw is not None and isinstance(card_type_raw, str):
            try:
                card_type = CardType(card_type_raw)
            except ValueError:
                pass

        creation_raw = _parse_value(fields.get("creation_reason", ""))
        creation_reason: Optional[str] = None
        if isinstance(creation_raw, str) and creation_raw:
            creation_reason = creation_raw

        sig_raw = _parse_value(fields.get("supporting_signals", ""))
        supporting_signals: Optional[List[str]] = None
        if isinstance(sig_raw, list):
            supporting_signals = [str(s) for s in sig_raw]

        press_raw = _parse_value(fields.get("pressure_indicators", ""))
        pressure_indicators: Optional[List[str]] = None
        if isinstance(press_raw, list):
            pressure_indicators = [str(s) for s in press_raw]

        phase_raw = _parse_value(fields.get("phase_transition", ""))
        phase_transition: Optional[str] = None
        if isinstance(phase_raw, str) and phase_raw:
            phase_transition = phase_raw

        return CanonicalAnchor(
            event_id=event_id,
            minute=minute,
            stoppage_time=stoppage_time,
            match_period=match_period,
            event_type=event_type,
            team=team,
            player=player,
            importance=importance,
            score_after_event=score_after_event,
            shootout_score=shootout_score,
            source_confidence=source_confidence,
            narrative_notes=description,
            source_references=source_references,
            card_type=card_type,
            creation_reason=creation_reason,
            supporting_signals=supporting_signals,
            pressure_indicators=pressure_indicators,
            phase_transition=phase_transition,
        )

    except (KeyError, ValueError, TypeError) as exc:
        raise ParseError(f"Line {line_number}: {exc}") from exc


def _parse_header_table(lines: List[str], start: int) -> Tuple[DatasetMetadata, int]:
    metadata: Dict[str, str] = {}
    i = start
    while i < len(lines):
        line = lines[i].strip()
        if _is_table_row(line) and "| Field | Value |" not in line and "|---|---|" not in line:
            try:
                field, value = _parse_table_row(line)
                raw_val = _parse_value(value)
                if isinstance(raw_val, str):
                    metadata[field] = raw_val
                elif raw_val is None:
                    metadata[field] = "null"
                else:
                    metadata[field] = str(raw_val)
            except ParseError:
                pass
        elif line == "" or _is_separator(line):
            pass
        elif line.startswith("#") or _is_table_row(line) is False:
            break
        i += 1

    ds_metadata = DatasetMetadata(
        match_id=metadata.get("match_id", ""),
        schema_version=metadata.get("schema_version", ""),
        anchor_version=metadata.get("anchor_version", ""),
        total_anchors=_parse_int(metadata.get("total_anchors", "")),
        source_parts=_parse_int(metadata.get("source_parts", "")),
        coverage=metadata.get("coverage", "").split(", ") if metadata.get("coverage") else None,
    )
    return ds_metadata, i


def parse_dataset(filepath: str) -> CanonicalDataset:
    if not os.path.isfile(filepath):
        raise FileFormatError(f"File not found: {filepath}")
    if not filepath.endswith(".md"):
        raise FileFormatError(f"Unsupported file format: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    lines = text.split("\n")
    anchors: List[CanonicalAnchor] = []
    header_metadata: Optional[DatasetMetadata] = None
    in_header = False
    in_header_table = False
    in_toc = False
    in_merge_summary = False
    header_table_start = -1

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if line.startswith("## Merge Table of Contents"):
            in_toc = True
            i += 1
            continue

        if in_toc:
            if line.startswith("## ") or line.startswith("---"):
                in_toc = False
            else:
                i += 1
                continue

        if line == "## Merge Summary":
            in_merge_summary = True
            break

        if in_merge_summary:
            break

        if _is_part_header(line):
            in_header = False
            i += 1
            continue

        if _is_event_header(line):
            in_header = False
            event_type_str = _extract_event_type_from_header(line)
            fields: Dict[str, str] = {}
            i += 1

            while i < len(lines):
                current = lines[i].strip()
                if _is_separator(current) or _is_event_header(current) or _is_part_header(current):
                    break
                if _is_table_row(current) and "|---|---|" not in current and "| Field | Value |" not in current:
                    try:
                        field, value = _parse_table_row(current)
                        fields[field] = value
                    except ParseError:
                        pass
                i += 1

            if fields:
                anchor = _build_anchor(fields, i)
                if anchor.event_type.value != event_type_str:
                    raise ParseError(
                        f"Line {i}: header event type '{event_type_str}' "
                        f"does not match field event_type '{anchor.event_type.value}'"
                    )
                anchors.append(anchor)
            continue

        if line.startswith("# Argentina vs France"):
            in_header = True
            in_header_table = False
            i += 1
            continue

        if in_header:
            if _is_table_row(line) and "|---|---|" not in line:
                if not in_header_table:
                    in_header_table = True
                    header_table_start = i
            elif in_header_table and not _is_table_row(line) and not line.startswith("|"):
                if header_metadata is None:
                    header_metadata = _parse_header_table(lines, header_table_start)[0]
                in_header_table = False
                in_header = False
            elif line.startswith("## "):
                in_header = False

        i += 1

    if header_metadata is None:
        header_metadata = DatasetMetadata(
            match_id="",
            schema_version="",
            anchor_version="",
        )

    if header_metadata.total_anchors is not None:
        if header_metadata.total_anchors != len(anchors):
            pass

    return CanonicalDataset(
        metadata=header_metadata,
        anchors=anchors,
        source_path=os.path.abspath(filepath),
    )
