"""
Vercel Serverless Function Entry Point
This file adapts the FastAPI app for Vercel's serverless environment
"""
import sys
import os

# Add the python_backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python_backend'))

from main import app

# Vercel expects a handler
handler = app
