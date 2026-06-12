from __future__ import annotations

import math
import random
from typing import Tuple

from backend.contracts.telemetry_dataclasses import (
    EnvironmentalMetrics,
    GameTheoryMetrics,
    KronosTelemetryPacket,
    PhysicalMetrics,
    PsychologicalMetrics,
    TacticalMetrics,
)


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _rand_gauss_clamped(mu: float, sigma: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return _clamp(random.gauss(mu, sigma), lo, hi)


class KronosMatchTicker:
    def __init__(self) -> None:
        self.current_minute: int = 1
        self.home_score: int = 0
        self.away_score: int = 0
        self.weather_mode: str = "CLEAR"
        self.intensity_index: float = 1.0

        # Smoothed values for gradual transitions
        self._field_tilt: float = 0.55
        self._pitch_slickness: float = 0.1
        self._wind_interference: float = 0.05
        self._panic_index: float = 0.05
        self._defensive_fatigue: float = 0.05

    def generate_tick(self) -> KronosTelemetryPacket:
        minute = self.current_minute

        # ------------------------------------------------------------------
        # 1. Weather / Environment triggers
        # ------------------------------------------------------------------
        if minute == 65:
            self.weather_mode = "RAIN"

        if minute >= 65:
            # Linear ramp: 0.1 -> 0.9 over minutes 65-90
            progress = (minute - 65) / 25.0
            self._pitch_slickness = _clamp(0.1 + 0.8 * progress)
            self._wind_interference = _clamp(0.05 + 0.6 * progress)
        else:
            # Pre-rain: low, with light noise
            self._pitch_slickness = _rand_gauss_clamped(0.12, 0.03, 0.05, 0.25)
            self._wind_interference = _rand_gauss_clamped(0.06, 0.04, 0.0, 0.15)

        fog = _rand_gauss_clamped(0.85, 0.08, 0.5, 1.0)
        if self.weather_mode == "RAIN":
            fog = _clamp(fog - 0.2)

        # ------------------------------------------------------------------
        # 2. Phase-based narrative logic
        # ------------------------------------------------------------------
        if minute <= 15:
            # The Warm Up — calm, controlled
            crowd = int(_rand_gauss_clamped(80, 3, 70, 88))
            fouls = int(_rand_gauss_clamped(0.5, 0.5, 0, 2))
            ppda = _rand_gauss_clamped(12.0, 1.5, 9.0, 16.0)
            block_h = _rand_gauss_clamped(38.0, 3.0, 32.0, 44.0)
            vdisc = _rand_gauss_clamped(8.0, 2.0, 5.0, 13.0)
            self._field_tilt = _clamp(self._field_tilt + random.uniform(-0.02, 0.02))
            sprint_do = _rand_gauss_clamped(-0.02, 0.02, -0.06, 0.02)
            hid_def = _rand_gauss_clamped(0.05, 0.05, 0.0, 0.15)
            recov = _rand_gauss_clamped(25.0, 4.0, 18.0, 34.0)
            self._defensive_fatigue = _clamp(self._defensive_fatigue + 0.01)
            xg_delta = _rand_gauss_clamped(0.1, 0.1, -0.15, 0.35)
            self._panic_index = _clamp(self._panic_index + random.uniform(-0.01, 0.02))
            rest_def = int(_rand_gauss_clamped(6, 1, 4, 8))
            box_ov = int(_rand_gauss_clamped(2.5, 0.7, 1, 4))
            gk_sweep = _rand_gauss_clamped(12.0, 2.0, 8.0, 16.0)
            sub_shock = _rand_gauss_clamped(0.0, 0.02, 0.0, 0.05)
        elif minute <= 60:
            # The Grind — gradual fatigue build
            crowd = int(_rand_gauss_clamped(85, 5, 75, 95))
            fouls = int(_rand_gauss_clamped(1.2, 0.8, 0, 4))
            ppda = _rand_gauss_clamped(10.5, 2.0, 7.0, 14.0)
            block_h = _rand_gauss_clamped(42.0, 4.0, 34.0, 50.0)
            vdisc = _rand_gauss_clamped(10.0, 2.5, 6.0, 16.0)
            self._field_tilt = _clamp(self._field_tilt + random.uniform(-0.04, 0.04))
            sprint_do = _clamp(sprint_do := _rand_gauss_clamped(-0.06, 0.03, -0.14, 0.0))
            hid_def = _clamp(hid_def := _rand_gauss_clamped(0.2, 0.1, 0.0, 0.5))
            recov = _rand_gauss_clamped(32.0, 5.0, 22.0, 44.0)
            self._defensive_fatigue = _clamp(self._defensive_fatigue + 0.015)
            xg_delta = _rand_gauss_clamped(0.0, 0.15, -0.3, 0.3)
            self._panic_index = _clamp(self._panic_index + random.uniform(-0.02, 0.04))
            rest_def = int(_rand_gauss_clamped(5.5, 1.0, 3, 7))
            box_ov = int(_rand_gauss_clamped(3.0, 1.0, 1, 5))
            gk_sweep = _rand_gauss_clamped(14.0, 3.0, 9.0, 20.0)
            sub_shock = _rand_gauss_clamped(0.02, 0.03, 0.0, 0.1)
        elif minute <= 75:
            # The Turning Point — rain arriving, chaos looming
            crowd = int(_rand_gauss_clamped(92, 4, 82, 100))
            fouls = int(_rand_gauss_clamped(2.5, 1.0, 0, 5))
            ppda = _rand_gauss_clamped(8.5, 1.8, 5.5, 12.0)
            block_h = _rand_gauss_clamped(45.0, 4.0, 36.0, 53.0)
            vdisc = _rand_gauss_clamped(13.0, 2.5, 8.0, 19.0)
            self._field_tilt = _clamp(self._field_tilt + random.uniform(-0.05, 0.03))
            sprint_do = _clamp(sprint_do := _rand_gauss_clamped(-0.12, 0.04, -0.2, -0.04))
            hid_def = _clamp(hid_def := _rand_gauss_clamped(0.5, 0.15, 0.2, 0.9))
            recov = _rand_gauss_clamped(40.0, 5.0, 30.0, 52.0)
            self._defensive_fatigue = _clamp(self._defensive_fatigue + 0.025)
            xg_delta = _rand_gauss_clamped(-0.15, 0.15, -0.5, 0.15)
            self._panic_index = _clamp(self._panic_index + random.uniform(0.0, 0.06))
            rest_def = int(_rand_gauss_clamped(4.5, 1.0, 2, 6))
            box_ov = int(_rand_gauss_clamped(3.5, 1.0, 2, 6))
            gk_sweep = _rand_gauss_clamped(18.0, 3.5, 12.0, 26.0)
            sub_shock = _rand_gauss_clamped(0.06, 0.04, 0.0, 0.15)
        else:
            # The Chaos — minutes 75-90
            if minute == 76 and self.away_score == 0:
                self.away_score += 1

            crowd = int(_rand_gauss_clamped(98, 3, 90, 110))
            fouls = int(_rand_gauss_clamped(4.0, 1.2, 1, 7))
            ppda = _rand_gauss_clamped(6.5, 1.5, 4.0, 10.0)
            block_h = _rand_gauss_clamped(48.0, 4.0, 39.0, 56.0)
            vdisc = _rand_gauss_clamped(16.0, 2.5, 10.0, 22.0)
            self._field_tilt = _clamp(self._field_tilt + random.uniform(-0.04, 0.06))
            sprint_do = _clamp(sprint_do := _rand_gauss_clamped(-0.2, 0.05, -0.3, -0.1))
            hid_def = _clamp(hid_def := _rand_gauss_clamped(0.9, 0.2, 0.4, 1.4))
            recov = _rand_gauss_clamped(50.0, 5.0, 40.0, 62.0)
            self._defensive_fatigue = _clamp(self._defensive_fatigue + 0.03)
            xg_delta = _rand_gauss_clamped(-0.35, 0.15, -0.7, -0.05)
            self._panic_index = _clamp(self._panic_index + random.uniform(0.03, 0.08))
            rest_def = int(_rand_gauss_clamped(3.0, 1.0, 1, 5))
            box_ov = int(_rand_gauss_clamped(4.5, 1.0, 2, 7))
            gk_sweep = _rand_gauss_clamped(24.0, 4.0, 16.0, 32.0)
            sub_shock = _rand_gauss_clamped(0.15, 0.06, 0.05, 0.3)

        # Force specific scripted triggers for minute >= 76 (The Chaos)
        if minute >= 76:
            self._panic_index = _clamp(max(self._panic_index, 0.9))
            fouls = max(fouls, 5)
            rest_def = min(rest_def, 2)  # Desperation mode
            sprint_do = min(sprint_do, -0.25)  # Exhaustion
            gk_sweep = max(gk_sweep, 25.0)  # GK pushing up

        # ------------------------------------------------------------------
        # 3. Cross-domain causal links
        # ------------------------------------------------------------------
        # If pitch_slickness > 0.8, GK sweeper distance must be high
        # (The Anarchist Argument)
        if self._pitch_slickness > 0.8:
            gk_sweep = max(gk_sweep, 22.0)

        # If panic_index > 0.8, vertical_disconnect must be high
        # (The Tactician Argument)
        if self._panic_index > 0.8:
            vdisc = max(vdisc, 15.0)

        # ------------------------------------------------------------------
        # 4. Score simulation (random goals, slight bias to home)
        # ------------------------------------------------------------------
        if minute > 10 and minute < 90:
            goal_prob = 0.015 * self.intensity_index
            if self.weather_mode == "RAIN":
                goal_prob *= 1.2
            if random.random() < goal_prob:
                if random.random() < 0.52:
                    self.home_score += 1
                elif minute != 76:
                    self.away_score += 1

        # ------------------------------------------------------------------
        # 5. Build packet
        # ------------------------------------------------------------------
        tactical = TacticalMetrics(
            ppda=round(ppda, 1),
            block_height_m=round(block_h, 1),
            vertical_disconnect=round(vdisc, 1),
            field_tilt=round(self._field_tilt, 2),
        )
        physical = PhysicalMetrics(
            sprint_drop_off=round(sprint_do, 2),
            hid_deficit_km=round(hid_def, 2),
            recovery_time_sec=round(recov, 1),
            defensive_fatigue=round(self._defensive_fatigue, 2),
        )
        psychology = PsychologicalMetrics(
            crowd_decibels=crowd,
            foul_escalation=fouls,
            xg_delta=round(xg_delta, 2),
            panic_index=round(self._panic_index, 2),
        )
        game_theory = GameTheoryMetrics(
            rest_defense_count=rest_def,
            box_overload_count=box_ov,
            gk_sweeper_dist=round(gk_sweep, 1),
            sub_shock_index=round(sub_shock, 2),
        )
        env = EnvironmentalMetrics(
            pitch_slickness=round(self._pitch_slickness, 2),
            wind_interference=round(self._wind_interference, 2),
            fog_visibility=round(fog, 2),
        )

        packet = KronosTelemetryPacket(
            match_minute=minute,
            score_home=self.home_score,
            score_away=self.away_score,
            tactical=tactical,
            physical=physical,
            psychology=psychology,
            game_theory=game_theory,
            environment=env,
        )

        self.current_minute += 1
        return packet
