import uvicorn
import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"================================================================")
    print(f" Starting CIPHERTRACE X Intelligence Server (Phase 1)")
    print(f" Listening on: http://{host}:{port}")
    print(f" Interactive API Docs: http://localhost:{port}/docs")
    print(f"================================================================")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
