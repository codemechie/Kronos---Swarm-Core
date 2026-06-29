"""Integration tests for app_server HistoricalRuntimeProvider injection.

Verifies that _build_payload correctly injects provider-derived match
state (minute, score, phase, events, statistics) while preserving the
existing payload shape.
"""

from __future__ import annotations

from backend.app_server import Handler, historical_provider


def test_build_payload_injects_provider_state():
    """SSE payload must include provider-derived match state fields
    on top of the existing pipeline fields."""
    mock_result = {
        "telemetry": {
            "match_minute": 1,
            "score_home": 0,
            "score_away": 0,
            "tactical": {"ppda": 10.0, "block_height_m": 30.0},
            "physical": {"sprint_drop_off": 5.0},
            "psychology": {"panic_index": 0.2},
            "game_theory": {"xg_delta": 0.1},
            "environment": {"pitch_slickness": 0.5},
            "vertical_disconnect": 0.3,
            "field_tilt": 55.0,
            "hid_deficit_km": 0.2,
            "recovery_time_sec": 60.0,
            "defensive_fatigue": 0.3,
            "crowd_decibels": 85.0,
            "foul_escalation": 0.1,
            "rest_defense_count": 4.0,
            "box_overload_count": 1.0,
            "gk_sweeper_dist": 20.0,
            "sub_shock_index": 0.0,
            "wind_interference": 0.2,
            "fog_visibility": 0.9,
        },
        "swarm_metrics": {"fracture_index": 15.0, "chaos_probability": 0.1},
        "debate_outputs": {"pragmatist": "Prediction: LOW_RISK"},
        "granite_review": {"skipped": True, "escalation_triggered": False},
    }

    payload = Handler._build_payload(mock_result)

    # Provider fields added
    assert "match_phase" in payload, "payload must include match_phase from provider"
    assert "timeline_events" in payload, "payload must include timeline_events from provider"
    assert "match_statistics" in payload, "payload must include match_statistics from provider"

    # Timeline events are a list
    assert isinstance(payload["timeline_events"], list)
    assert isinstance(payload["match_statistics"], dict)

    # Existing pipeline fields preserved
    assert "telemetry" in payload
    assert "fracture_index" in payload
    assert "chaos_probability" in payload
    assert "debate_outputs" in payload
    assert "granite_review" in payload

    # Minute and score overridden by provider
    mt = historical_provider.get_current_match_time()
    sc = historical_provider.get_current_score()
    assert payload["telemetry"]["minute"] == mt.current_minute, (
        f"minute should come from provider ({mt.current_minute}), "
        f"got {payload['telemetry']['minute']}"
    )
    assert payload["telemetry"]["score_home"] == sc["home"]
    assert payload["telemetry"]["score_away"] == sc["away"]

    # Telemetry metric fields still present (not replaced)
    assert payload["telemetry"]["ppda"] == 10.0
    assert payload["telemetry"]["panic_index"] == 0.2
    assert payload["telemetry"]["pitch_slickness"] == 0.5


def test_build_telemetry_flattens_correctly():
    """_build_telemetry must flatten metric groups into a single dict."""
    mock_result = {
        "telemetry": {
            "match_minute": 42,
            "score_home": 1,
            "score_away": 0,
            "tactical": {"ppda": 8.5, "block_height_m": 28.0},
            "physical": {"sprint_drop_off": 4.2},
            "psychology": {"panic_index": 0.15},
            "game_theory": {"xg_delta": 0.05},
            "environment": {"pitch_slickness": 0.6},
        },
        "swarm_metrics": {"fracture_index": 10.0, "chaos_probability": 0.05},
        "debate_outputs": {"pragmatist": "Nominal"},
        "granite_review": {"skipped": True, "escalation_triggered": False},
    }

    telemetry = Handler._build_telemetry(mock_result)
    # minute is set (will be overridden by provider in _build_payload)
    assert telemetry["minute"] == 42
    assert telemetry["score_home"] == 1
    assert telemetry["score_away"] == 0
    assert telemetry["ppda"] == 8.5
    assert telemetry["block_height_m"] == 28.0
    assert telemetry["sprint_drop_off"] == 4.2
    assert telemetry["panic_index"] == 0.15
    assert telemetry["xg_delta"] == 0.05
    assert telemetry["pitch_slickness"] == 0.6
