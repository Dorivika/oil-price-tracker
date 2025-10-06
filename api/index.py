"""
Vercel Serverless Function Entry Point
This file adapts the FastAPI app for Vercel's serverless environment using Mangum
"""
import sys
from pathlib import Path

# Add the python_backend directory to the path
backend_path = Path(__file__).parent.parent / 'python_backend'
sys.path.insert(0, str(backend_path))

# Import the FastAPI app
from main import app
from mangum import Mangum

# Wrap FastAPI app with Mangum for serverless compatibility
handler = Mangum(app, lifespan="off")


