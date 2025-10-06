"""
Vercel Serverless Function Entry Point
This file adapts the FastAPI app for Vercel's serverless environment using Mangum
"""
import sys
import os
from pathlib import Path

# Set environment flag for serverless BEFORE importing main
os.environ['SERVERLESS'] = 'true'

# Add the python_backend directory to the path
backend_path = Path(__file__).parent.parent / 'python_backend'
sys.path.insert(0, str(backend_path))

# Import after path is set
from mangum import Mangum

# Import the FastAPI app
from main import app as fastapi_app

# Create the handler for Vercel
# lifespan="off" prevents startup/shutdown events that don't work in serverless
handler = Mangum(fastapi_app, lifespan="off", api_gateway_base_path="/api")




