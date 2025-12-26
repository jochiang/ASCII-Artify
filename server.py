#!/usr/bin/env python3
"""
Custom HTTP server with CORS headers for SharedArrayBuffer support.
Required for FFMPEG.wasm to work properly.
"""

import http.server
import socketserver

PORT = 8080

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Required headers for SharedArrayBuffer support
        # Using 'credentialless' instead of 'require-corp' to allow CDN resources
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        super().end_headers()

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print("SharedArrayBuffer headers enabled for FFMPEG.wasm support")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
