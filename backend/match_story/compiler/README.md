# Timeline Compiler

## Purpose

The Timeline Compiler transforms canonical narrative anchor datasets into runtime timeline JSON consumed by the Kronos frontend.

This is Phase 5.3D.1 — the compiler foundation. It implements parsing, validation, and dataset representation only. Runtime JSON generation belongs to Phase 5.3D.2.

## Architecture

```
backend/match_story/compiler/
├── __init__.py       Public API
├── compiler.py       Orchestration layer
├── parser.py         Markdown dataset parser
├── validator.py      Dataset validation
├── models.py         Strongly typed dataclasses
├── exceptions.py     Custom exception hierarchy
└── README.md         This file
```

## Compiler Pipeline

```
Load Document  ──►  Parse  ──►  Validate  ──►  Return Dataset
     │                 │             │               │
  FileFormat      ParseError    ValidationResult   CanonicalDataset
```

Pipeline stages:

1. **Load** — open and read the canonical markdown file. Rejects non-`.md` files.
2. **Parse** — extract header metadata, locate narrative anchors, parse field tables, build strongly typed objects.
3. **Validate** — run schema validation, required field checks, chronology checks, duplicate ID detection, score progression validation.
4. **Return** — return a `CanonicalDataset` with structured validation results.

## Module Responsibilities

### `parser.py`

Responsible for:
- Loading the canonical markdown document
- Locating narrative anchors via `### Event — TYPE` headers
- Parsing field tables into typed values
- Creating `CanonicalAnchor` objects
- Creating the `CanonicalDataset` with header metadata

Does NOT perform validation or conversion.

### `validator.py`

Responsible for:
- Required field presence
- `event_id` uniqueness
- Chronological ordering by `(minute, stoppage_time)`
- Score progression correctness (GOAL events increment by 1; non-GOAL events do not change score)
- `match_period` consistency with `minute`
- `importance` range (0–100)

Returns `ValidationResult` with structured issues. Does not throw exceptions for validation failures.

### `compiler.py`

Orchestration layer. Exposes:
- `TimelineCompiler` class with `load()`, `validate()`, `compile()`, `get_metadata()` methods
- `compile_dataset()` convenience function

Pipeline: load → parse → validate → return parsed dataset. Does NOT generate runtime JSON.

### `models.py`

Strongly typed dataclasses:
- `CanonicalDataset` — header metadata + anchor list + source path
- `CanonicalAnchor` — all fields from the canonical anchor table
- `DatasetMetadata` — document-level header metadata
- `ValidationResult` — structured validation output
- `ValidationIssue` — single issue with severity, code, message
- `CompilerMetadata` — compiler provenance data
- Enums: `EventType`, `MatchPeriod`, `Confidence`, `CardType`, `ValidationSeverity`

### `exceptions.py`

- `CompilerError` — base exception
- `ParseError` — parsing failures
- `ValidationError` — blocking validation failures
- `FileFormatError` — unsupported file format

## Usage

```python
from backend.match_story.compiler import TimelineCompiler

compiler = TimelineCompiler()
dataset = compiler.compile("path/to/argentina_france_2022_source.md")
validation = compiler.validation

print(validation.summary)
print(f"Anchors: {len(dataset.anchors)}")
```

## Future Phases

| Phase | Scope |
|---|---|
| **5.3D.2** | Conversion Engine — weight calculation, runtime_flags, timeline groups, visual metadata |
| **5.3D.3** | Runtime JSON Generation — emit timeline JSON documents per `timeline_json_schema.md` |
