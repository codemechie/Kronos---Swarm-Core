import type {
  RuntimeTimeline,
} from "./timelineTypes";

const SUPPORTED_SCHEMA_VERSIONS = ["2.1"];

const DEFAULT_TIMELINE_PATH = "/datasets/argentina_france_2022_timeline.json";

export interface LoadTimelineResult {
  timeline: RuntimeTimeline;
  source: string;
}

export class TimelineLoadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TimelineLoadError";
  }
}

export async function loadTimeline(
  path: string = DEFAULT_TIMELINE_PATH,
): Promise<LoadTimelineResult> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new TimelineLoadError(
      `Failed to load timeline from ${path}: ${response.status} ${response.statusText}`,
      "HTTP_ERROR",
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new TimelineLoadError(
      `Failed to parse timeline JSON from ${path}: invalid JSON`,
      "PARSE_ERROR",
    );
  }

  const timeline = data as RuntimeTimeline;

  if (!timeline.schema_version || typeof timeline.schema_version !== "string") {
    throw new TimelineLoadError(
      "Timeline document is missing schema_version",
      "MISSING_SCHEMA_VERSION",
    );
  }

  if (!SUPPORTED_SCHEMA_VERSIONS.includes(timeline.schema_version)) {
    throw new TimelineLoadError(
      `Unsupported schema version: ${timeline.schema_version}. Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}`,
      "UNSUPPORTED_SCHEMA_VERSION",
    );
  }

  if (!timeline.timeline || !Array.isArray(timeline.timeline)) {
    throw new TimelineLoadError(
      "Timeline document is missing or has invalid timeline array",
      "MISSING_TIMELINE",
    );
  }

  if (!timeline.match || !timeline.match.home_team) {
    throw new TimelineLoadError(
      "Timeline document is missing or has invalid match info",
      "MISSING_MATCH_INFO",
    );
  }

  return { timeline, source: path };
}
