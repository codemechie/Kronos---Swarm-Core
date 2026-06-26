from __future__ import annotations

import datetime
import os
from typing import Optional

from backend.match_story.compiler.converter import Converter
from backend.match_story.compiler.exceptions import CompilerError, FileFormatError, ParseError
from backend.match_story.compiler.models import (
    CanonicalDataset,
    CompilerMetadata,
    ConversionResult,
    MatchInfo,
    RuntimeTimeline,
    RuntimeValidationResult,
    ValidationResult,
)
from backend.match_story.compiler.parser import parse_dataset
from backend.match_story.compiler.runtime_validator import validate_runtime
from backend.match_story.compiler.serializer import RuntimeSerializer
from backend.match_story.compiler.validator import validate_dataset


JSON_OUTPUT_DIR = "backend/docs/datasets/json"
REPORT_OUTPUT_DIR = "backend/docs/datasets/canonical"


class TimelineCompiler:
    COMPILER_VERSION = "1.0.0"

    def __init__(
        self,
        schema_version: str = "2.1",
        match_info: Optional[MatchInfo] = None,
        json_output_dir: str = JSON_OUTPUT_DIR,
        report_output_dir: str = REPORT_OUTPUT_DIR,
        date: str = "",
        competition: str = "",
        venue: str = "",
    ) -> None:
        self.schema_version = schema_version
        self._match_info = match_info
        self._date = date
        self._competition = competition
        self._venue = venue
        self._json_output_dir = json_output_dir
        self._report_output_dir = report_output_dir
        self._dataset: Optional[CanonicalDataset] = None
        self._validation: Optional[ValidationResult] = None
        self._conversion: Optional[ConversionResult] = None
        self._runtime_validation: Optional[RuntimeValidationResult] = None
        self._timeline: Optional[RuntimeTimeline] = None
        self._json_path: Optional[str] = None
        self._report_path: Optional[str] = None

    @property
    def dataset(self) -> Optional[CanonicalDataset]:
        return self._dataset

    @property
    def validation(self) -> Optional[ValidationResult]:
        return self._validation

    @property
    def conversion(self) -> Optional[ConversionResult]:
        return self._conversion

    @property
    def runtime_validation(self) -> Optional[RuntimeValidationResult]:
        return self._runtime_validation

    @property
    def timeline(self) -> Optional[RuntimeTimeline]:
        return self._timeline

    @property
    def json_path(self) -> Optional[str]:
        return self._json_path

    @property
    def report_path(self) -> Optional[str]:
        return self._report_path

    def compile(self, filepath: str) -> RuntimeTimeline:
        self._dataset = self.load(filepath)
        self._validation = self.validate(self._dataset)
        self._timeline = self.convert(self._dataset)
        self._runtime_validation = self.validate_runtime(self._timeline)
        self._json_path = self.write_json(self._timeline)
        self._report_path = self.write_validation_report()
        return self._timeline

    def load(self, filepath: str) -> CanonicalDataset:
        if not os.path.isfile(filepath):
            raise FileFormatError(f"File not found: {filepath}")
        if not filepath.endswith(".md"):
            raise FileFormatError(f"Unsupported file format: {filepath}")

        try:
            dataset = parse_dataset(filepath)
        except ParseError as exc:
            raise ParseError(f"Failed to parse {filepath}: {exc}") from exc

        return dataset

    def validate(self, dataset: CanonicalDataset) -> ValidationResult:
        return validate_dataset(dataset)

    def convert(self, dataset: CanonicalDataset) -> RuntimeTimeline:
        match_info = self._match_info
        if match_info is not None:
            if self._date:
                match_info.date = self._date
            if self._competition:
                match_info.competition = self._competition
            if self._venue:
                match_info.venue = self._venue
        converter = Converter(
            match_info=match_info,
            date=self._date,
            competition=self._competition,
            venue=self._venue,
        )
        timeline = converter.convert(dataset)
        self._conversion = converter.validation
        return timeline

    def validate_runtime(self, timeline: RuntimeTimeline) -> RuntimeValidationResult:
        return validate_runtime(timeline)

    def write_json(self, timeline: RuntimeTimeline) -> str:
        basename = os.path.basename(self._dataset.source_path) if self._dataset else "unknown"
        json_name = basename.replace("_source.md", "_timeline.json").replace(".md", "_timeline.json")
        filepath = os.path.join(self._json_output_dir, json_name)
        serializer = RuntimeSerializer()
        return serializer.write_json(timeline, filepath)

    def write_validation_report(self) -> str:
        basename = os.path.basename(self._dataset.source_path) if self._dataset else "unknown"
        stem = basename.replace("_source.md", "").replace(".md", "")
        report_name = f"{stem}_validation_report.md"
        filepath = os.path.join(self._report_output_dir, report_name)

        report_md = RuntimeSerializer.generate_validation_report(
            canonical_validation_result=self._validation,
            runtime_validation_result=self._runtime_validation,
            conversion_result=self._conversion,
            compiler_version=self.COMPILER_VERSION,
            source_dataset=os.path.basename(self._dataset.source_path) if self._dataset else "unknown",
            total_events=len(self._timeline.timeline) if self._timeline else 0,
        )
        return RuntimeSerializer.write_validation_report(report_md, filepath)

    def get_metadata(self) -> CompilerMetadata:
        if self._dataset is None:
            raise CompilerError("No dataset has been compiled. Call compile() first.")

        status = "PASS"
        if self._validation is not None:
            status = "PASS" if self._validation.passed else "FAIL"

        return CompilerMetadata(
            generation_time=datetime.datetime.now(datetime.timezone.utc),
            compiler_version=self.COMPILER_VERSION,
            source_dataset=os.path.basename(self._dataset.source_path),
            total_events=len(self._dataset.anchors),
            validation_status=status,
            schema_version=self.schema_version,
        )


def compile_dataset(
    filepath: str,
    schema_version: str = "2.1",
    match_info: Optional[MatchInfo] = None,
    json_output_dir: str = JSON_OUTPUT_DIR,
    report_output_dir: str = REPORT_OUTPUT_DIR,
) -> RuntimeTimeline:
    compiler = TimelineCompiler(
        schema_version=schema_version,
        match_info=match_info,
        json_output_dir=json_output_dir,
        report_output_dir=report_output_dir,
    )
    return compiler.compile(filepath)
