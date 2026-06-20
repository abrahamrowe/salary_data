#!/usr/bin/env python3
"""Minimal static file server for local preview of the salary-benchmarks site."""
import functools
import http.server
import os
import socketserver

DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salary-benchmarks")
PORT = 8765

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)

with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Serving {DIRECTORY} at http://127.0.0.1:{PORT}")
    httpd.serve_forever()
