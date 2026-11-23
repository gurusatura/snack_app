import os
import subprocess
import sys
import time
import httpx

def main():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    
    print("[1/3] Starting temporary Uvicorn server on port 8000...")
    proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    
    server_healthy = False
    for i in range(30):
        try:
            r = httpx.get("http://127.0.0.1:8000/health", timeout=1.0)
            if r.status_code == 200:
                server_healthy = True
                print("  ✓ Server is healthy and listening on http://127.0.0.1:8000")
                break
        except Exception:
            time.sleep(0.5)

    if not server_healthy:
        proc.kill()
        print("ERROR: Server failed to start within timeout.")
        sys.exit(1)

    exit_code = 0
    try:
        print("\n[2/3] Running Exploratory QA Suite...")
        qa_result = subprocess.run([python_exe, "exploratory_qa.py"], cwd=backend_dir)
        exit_code = qa_result.returncode
    finally:
        print("\n[3/3] Shutting down temporary Uvicorn server...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        print("  ✓ Server terminated cleanly.")

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
