"""Vercel Serverless Function entry point for FastAPI backend."""

import sys
import os

# Ensure the backend directory is in the Python search path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app

# Export app for Vercel's ASGI runner
__all__ = ["app"]
