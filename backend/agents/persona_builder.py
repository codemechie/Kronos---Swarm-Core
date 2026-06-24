from __future__ import annotations

_SIGNAL_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "Market Pragmatist": {
        "pressing": ["PPDA", "block height", "block_height", "pressing", "BLOCK HEIGHT"],
        "scoreline": ["score", "differential", "betting", "goal margin", "GOAL DIFFERENTIAL"],
    },
    "Mood Ring": {
        "crowd": ["crowd", "decibels", "noise", "atmos", "CROWD"],
        "panic": ["panic", "fragility", "behavioral", "PANIC"],
        "fatigue": ["recovery", "fatigue", "energy", "RECOVERY"],
    },
    "Gambler": {
        "desperation": ["desperation", "chase", "losing", "desperate", "LOSING-SIDE"],
        "variance": ["variance", "volatility", "unpredictable", "VOLATILITY"],
        "subs": ["sub", "substitution", "shock", "SUB"],
    },
    "Judge": {
        "discipline": ["foul", "card", "discipline", "disciplinary", "red card", "FOUL"],
        "contradiction": ["contradiction", "inconsistent", "conflicting"],
        "pressure": ["pressing", "PPDA", "block height", "tackle", "BLOCK HEIGHT"],
    },
    "Anarchist": {
        "environment": ["pitch", "slickness", "slippery", "wind", "fog", "visibility", "PITCH"],
        "consensus": ["consensus", "agreement", "confidence", "expected", "CONSENSUS"],
    },
}

_TEMPLATES: dict[str, dict[str, dict[str, list[str]]]] = {
    "Market Pragmatist": {
        "NOMINAL": {
            "pressing": [
                "Pressing efficiency is holding within expected ranges. No structural degradation detected.",
                "Defensive organization metrics remain stable. Pressing efficiency is consistent.",
            ],
            "scoreline": [
                "Scoreline is consistent with expected-goal projections. No correction signal.",
                "Market conditions remain aligned with expected outcomes. Scoreline is sustainable.",
            ],
            "default": [
                "Underlying efficiency indicators remain within expected parameters.",
                "Efficiency metrics support current match state. No anomalies detected.",
            ],
        },
        "HIGH_RISK": {
            "pressing": [
                "Pressing efficiency continues to deteriorate. Expected-goal indicators suggest declining output.",
                "Defensive efficiency is degrading. xG trends no longer support the current match state.",
            ],
            "scoreline": [
                "The current scoreline is not supported by underlying efficiency metrics. Correction likely.",
                "Expected-goal differential does not justify match state. Market inefficiency detected.",
            ],
            "default": [
                "Efficiency indicators are diverging from expected trends. Elevated risk detected.",
                "Underlying metrics no longer support current match state. Risk is increasing.",
            ],
        },
    },
    "Mood Ring": {
        "NOMINAL": {
            "crowd": [
                "Crowd noise is within manageable levels. Psychological pressure remains stable.",
                "Atmospheric conditions are steady. No psychological disruption detected.",
            ],
            "panic": [
                "Panic index is low. Player decision-making appears composed.",
                "No behavioral distress signals detected. Emotional baseline is stable.",
            ],
            "fatigue": [
                "Physical recovery rates are normal. Mental fatigue is not influencing play.",
                "Player energy levels are stable. No psychological fragility indicators.",
            ],
            "default": [
                "Crowd tension levels are moderate. Player composure appears stable.",
                "Emotional temperature of the match remains within normal range.",
            ],
        },
        "HIGH_RISK": {
            "crowd": [
                "Crowd pressure is beginning to affect player decision-making. Composure degrading.",
                "Crowd tension is visibly influencing player composure. Emotional instability rising.",
            ],
            "panic": [
                "Panic index is rising. Players are showing signs of psychological distress.",
                "Emotional fragility is spreading across the pitch. Decision quality declining.",
            ],
            "fatigue": [
                "Physical fatigue is compounding psychological pressure. Fragility accelerating.",
                "Recovery rates suggest mounting mental fatigue. Error probability elevated.",
            ],
            "default": [
                "Emotional instability is accelerating. Player composure is degrading across the pitch.",
                "Psychological pressure is reaching critical levels. Fragility indicators are active.",
            ],
        },
    },
    "Gambler": {
        "NOMINAL": {
            "desperation": [
                "Desperation metrics are low. Both teams are playing within their structure.",
                "No significant desperation indicators. Match is following expected patterns.",
            ],
            "variance": [
                "Variance is within acceptable thresholds. No unusual risk patterns.",
                "Risk distribution is stable. No high-variance scenarios emerging.",
            ],
            "subs": [
                "Recent substitutions have not introduced significant volatility.",
                "Substitution patterns are conventional. No variance spike detected.",
            ],
            "default": [
                "Variance remains within acceptable bounds. No unusual patterns detected.",
                "Risk parameters are stable. No high-variance inflection points.",
            ],
        },
        "HIGH_RISK": {
            "desperation": [
                "Desperation metrics are spiking. High-variance chase mode detected.",
                "Losing-side desperation is introducing significant volatility. Risk parameters breached.",
            ],
            "variance": [
                "Volatility is accelerating beyond predicted thresholds. Risk envelope expanding.",
                "Variance is significantly exceeding expected ranges. Chaos probability rising.",
            ],
            "subs": [
                "Substitutions have introduced unexpected variance. Volatility spike detected.",
                "Sub shock index is elevated. Match state is becoming less predictable.",
            ],
            "default": [
                "Volatility is accelerating beyond expected thresholds. Risk increasing.",
                "This environment is becoming increasingly unpredictable. Variance elevated.",
            ],
        },
    },
    "Judge": {
        "NOMINAL": {
            "discipline": [
                "Disciplinary indicators are normal. No elevated card risk detected.",
                "Foul frequency is within expected range. No disciplinary concerns.",
            ],
            "contradiction": [
                "No evidence contradictions detected. Assessment consistency is intact.",
                "All indicators align. No conflicting signals in the current data.",
            ],
            "pressure": [
                "Pressing intensity is measured. Reckless challenge risk is low.",
                "Tactical discipline is holding. No pattern of escalating fouls.",
            ],
            "default": [
                "Evidence supports the current assessment. No threshold violations.",
                "Observed indicators remain within acceptable parameters.",
            ],
        },
        "HIGH_RISK": {
            "discipline": [
                "Disciplinary indicators are escalating. Red-card probability is elevated.",
                "Foul frequency and intensity suggest imminent disciplinary action.",
            ],
            "contradiction": [
                "Evidence contradictions are accumulating. Assessment confidence is decreasing.",
                "Multiple contradictory indicators detected. Validation thresholds breached.",
            ],
            "pressure": [
                "Pressing intensity is crossing into reckless territory. Card risk elevated.",
                "Aggressive tackling patterns detected. Disciplinary threshold approaching.",
            ],
            "default": [
                "Validation thresholds have been exceeded. Evidence supports escalation.",
                "Current observations exceed acceptable parameters. Escalation warranted.",
            ],
        },
    },
    "Anarchist": {
        "NOMINAL": {
            "environment": [
                "Environmental factors are within normal parameters. No friction expected.",
                "Pitch and weather conditions are stable. No hidden variables introduced.",
            ],
            "consensus": [
                "Consensus confidence appears justified. No contrarian indicators present.",
                "No significant disagreement to exploit. Standard conditions prevail.",
            ],
            "default": [
                "Surface-level stability detected. Blind spot probability remains minimal.",
                "The obvious explanation aligns with current observations. No hidden threats.",
            ],
        },
        "HIGH_RISK": {
            "environment": [
                "Environmental friction is introducing hidden variables into expected performance.",
                "Pitch and weather degradation is creating unpredictable conditions. Blind spots emerging.",
            ],
            "consensus": [
                "Consensus confidence is high, but blind spot probability is increasing. Hidden risk likely.",
                "The swarm may be overlooking a developing threat. Contrarian indicators are emerging.",
            ],
            "default": [
                "Excessive consensus may be masking unseen risk. Additional scrutiny warranted.",
                "The obvious explanation deserves further scrutiny. Something may be hidden.",
            ],
        },
    },
}

_FALLBACK_NOMINAL: list[str] = [
    "Conditions are within expected parameters. No significant deviation detected.",
    "Standard assessment. All indicators remain within normal range.",
]

_FALLBACK_HIGH_RISK: list[str] = [
    "Elevated risk indicators detected. Variance exceeds acceptable thresholds.",
    "Risk parameters have been breached. Escalation is recommended.",
]


def _detect_signal(agent_name: str, prompt: str) -> str:
    signals = _SIGNAL_KEYWORDS.get(agent_name)
    if not signals:
        return "default"
    for signal_key, keywords in signals.items():
        if any(kw in prompt for kw in keywords):
            return signal_key
    return "default"


def _select_template(agent_name: str, prompt: str, is_risk: bool) -> str:
    state = "HIGH_RISK" if is_risk else "NOMINAL"
    signal = _detect_signal(agent_name, prompt)

    agent_templates = _TEMPLATES.get(agent_name, {})
    state_templates = agent_templates.get(state, {})
    candidates = state_templates.get(signal) or state_templates.get("default", [])

    if not candidates:
        candidates = _FALLBACK_HIGH_RISK if is_risk else _FALLBACK_NOMINAL

    index = hash(prompt) % len(candidates)
    return candidates[index]


def build(agent_name: str, prompt: str, is_risk: bool) -> str:
    text = _select_template(agent_name, prompt, is_risk)
    prefix = "High-risk: " if is_risk else "Nominal: "
    return f"[{agent_name.upper()}]: {prefix}{text}"
