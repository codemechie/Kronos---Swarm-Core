from backend.match_story.compiler import TimelineCompiler

compiler = TimelineCompiler()
timeline = compiler.compile(
    "backend/docs/datasets/canonical/argentina_france_2022_source.md"
)

print(f"=== Pipeline Stages ===")
print(f"  Load + Validate: {compiler.validation.passed}")
print(f"  Convert:         {compiler.conversion.passed}")
print(f"  Runtime Validate: {compiler.runtime_validation.passed}")
print(f"  JSON output:     {compiler.json_path}")
print(f"  Report output:   {compiler.report_path}")
print()

print("=== Runtime Validation Issues ===")
for iss in compiler.runtime_validation.issues:
    print(f"  [{iss.severity.value}] {iss.code}: {iss.message}")
print()

print("=== Metadata ===")
print(f"  total_events: {timeline.metadata.total_events}")
print(f"  validation_status: {timeline.metadata.validation_status}")
print(f"  compiler_version: {timeline.metadata.compiler_version}")
