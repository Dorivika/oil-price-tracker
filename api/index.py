"""
Vercel Serverless Function Entry Point
This file adapts the FastAPI app for Vercel's serverless environment
"""
import sys
import os
from pathlib import Path

# Add the python_backend directory to the path
backend_path = Path(__file__).parent.parent / 'python_backend'
sys.path.insert(0, str(backend_path))

# Import the FastAPI app
from main import app

# Vercel serverless function handler
def handler(request, context):
    """
    Vercel expects this handler function
    """
    return app

# Also expose app directly for ASGI
# Vercel will use this
app = app

