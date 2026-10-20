import sys
import time
import requests_mock

sys.path.insert(0, "./pikpak-plus-server")
from app.utils.common import analyze_link

def run_benchmark():
    url = "https://example.com/test-link"

    with requests_mock.Mocker() as m:
        def request_callback(request, context):
            time.sleep(0.1) # Simulate 100ms latency
            return {"status": "ok"}

        m.get(f"https://whatslink.info/api/v1/link?url={url}", json=request_callback)

        start = time.perf_counter()
        for _ in range(10):
            analyze_link(url)
        end = time.perf_counter()

        print(f"Time for 10 calls without cache: {end - start:.4f} seconds")

if __name__ == "__main__":
    run_benchmark()
