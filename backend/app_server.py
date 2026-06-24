from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# Ensure the project root is on sys.path so backend package is importable
# regardless of whether the user runs from backend/ or from the root.
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from backend.orchestrator.core_supervisor import KronosOrchestrator


orchestrator = KronosOrchestrator()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/stream":
            self._handle_stream()
        elif self.path == "/minute":
            self._handle_minute()
        else:
            self._handle_index()

    def _handle_index(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        html = (
            "<!DOCTYPE html>\n"
            "<html>\n"
            "<head><title>Kronos Swarm Core</title></head>\n"
            "<body>\n"
            "<pre id=\"out\">Connecting...</pre>\n"
            "<script>\n"
            "var es = new EventSource('/stream');\n"
            "es.onmessage = function(e) {\n"
            "  document.getElementById('out').textContent = e.data;\n"
            "};\n"
            "es.onerror = function() {\n"
            "  document.getElementById('out').textContent = 'Disconnected';\n"
            "};\n"
            "</script>\n"
            "</body>\n"
            "</html>\n"
        )
        self.wfile.write(html.encode("utf-8"))

    @staticmethod
    def _build_telemetry(result: dict) -> dict:
        tel = result["telemetry"]
        flat = {"minute": tel["match_minute"]}
        for cat in ("tactical", "physical", "psychology", "game_theory", "environment"):
            flat.update(tel[cat])
        flat["score_home"] = tel["score_home"]
        flat["score_away"] = tel["score_away"]
        return flat

    @staticmethod
    def _build_payload(result: dict) -> dict:
        return {
            "telemetry": Handler._build_telemetry(result),
            "fracture_index": result["swarm_metrics"]["fracture_index"],
            "chaos_probability": result["swarm_metrics"]["chaos_probability"],
            "debate_outputs": result["debate_outputs"],
            "validation": result.get("validation", {"skipped": True}),
            "granite_review": result["granite_review"],
        }

    def _handle_minute(self):
        result = orchestrator.process_next_tick()
        payload = self._build_payload(result)
        body = json.dumps(payload) + "\n"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def _handle_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        while True:
            try:
                result = orchestrator.process_next_tick()
                payload = self._build_payload(result)
                data = json.dumps(payload)
                self.wfile.write(f"data: {data}\n\n".encode("utf-8"))
                self.wfile.flush()
                time.sleep(1)
            except BrokenPipeError:
                break

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    port = 3000
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Serving at http://localhost:{port}")
    server.serve_forever()
