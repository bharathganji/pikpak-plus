"""
Lightweight interactive API documentation server.

Starts a local HTTP server that renders the PikPak OpenAPI specification
using the Swagger UI CDN (no framework dependencies required).

Usage
-----
    python -m pikpakapi.docs               # default port 8000
    python -m pikpakapi.docs --port 9090   # custom port

Then open http://localhost:8000 in your browser.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# ---------------------------------------------------------------------------
# Lazy-generate the OpenAPI spec if docs/openapi.json does not exist yet
# ---------------------------------------------------------------------------


def _get_spec_json() -> str:
    """Return the OpenAPI spec as a JSON string, generating it if needed."""
    # Prefer an already-generated file in the docs/ directory
    candidates = [
        Path(__file__).parent.parent / "docs" / "openapi.json",  # dev layout
        Path(os.getcwd()) / "docs" / "openapi.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.read_text(encoding="utf-8")

    # Fall back to generating in-memory
    try:
        from docs.generate_openapi import OPENAPI_SPEC  # type: ignore[import]
    except ImportError:
        try:
            # Allow running from the repo root
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from docs.generate_openapi import OPENAPI_SPEC  # type: ignore[import]
        except ImportError:
            return json.dumps({"openapi": "3.1.0", "info": {"title": "PikPak API"}, "paths": {}})

    return json.dumps(OPENAPI_SPEC, indent=2)


# ---------------------------------------------------------------------------
# HTML template (Swagger UI via CDN — no npm, no FastAPI)
# ---------------------------------------------------------------------------

_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PikPak API Docs</title>
  <link rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body {{ margin: 0; padding: 0; }}
    #swagger-ui {{ max-width: 1400px; margin: 0 auto; padding: 16px; }}
  </style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
<script>
  const spec = {spec_json};
  SwaggerUIBundle({{
    spec: spec,
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'StandaloneLayout',
    deepLinking: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
  }});
</script>
</body>
</html>
"""

# ---------------------------------------------------------------------------
# HTTP request handler
# ---------------------------------------------------------------------------


class _DocsHandler(BaseHTTPRequestHandler):
    spec_json: str = ""

    def do_GET(self) -> None:
        if self.path in ("/", "/index.html"):
            html = _HTML_TEMPLATE.format(spec_json=self.spec_json)
            body = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path in ("/openapi.json", "/spec"):
            body = self.spec_json.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        # Suppress per-request access logs for cleaner terminal output
        pass


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def serve(port: int = 8000, open_browser: bool = True) -> None:
    """Start the docs server and optionally open a browser tab."""
    spec = _get_spec_json()
    _DocsHandler.spec_json = spec

    server = HTTPServer(("127.0.0.1", port), _DocsHandler)
    url = f"http://localhost:{port}"
    print(f"[DOCS] PikPak API docs running at: {url}")
    print("   Press Ctrl+C to stop.\n")

    if open_browser:
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Interactive PikPak API documentation (Swagger UI)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Local port to listen on (default: 8000)",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not automatically open the browser",
    )
    args = parser.parse_args()
    serve(port=args.port, open_browser=not args.no_browser)


if __name__ == "__main__":
    main()
