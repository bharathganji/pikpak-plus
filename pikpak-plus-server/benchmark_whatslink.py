import asyncio
import time
import sys
import os

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))
from app.services.whatslink_service import WhatsLinkService

# We need to simulate concurrent calls to WhatsLinkService.check_file_info
# Since it is synchronous right now, calling it from asyncio.gather without to_thread will block the loop and effectively execute serially.
# We'll measure the time taken to run 10 requests concurrently.

async def run_benchmark(num_requests=5):
    start_time = time.time()

    async def task(url):
        if asyncio.iscoroutinefunction(WhatsLinkService.check_file_size_limit):
            return await WhatsLinkService.check_file_size_limit(url, 100)
        else:
            return WhatsLinkService.check_file_size_limit(url, 100)

    url = "magnet:?xt=urn:btih:d1234567890"

    tasks = [task(url) for _ in range(num_requests)]

    await asyncio.gather(*tasks)

    duration = time.time() - start_time
    print(f"Total time for {num_requests} concurrent requests: {duration:.4f} seconds")
    return duration

if __name__ == "__main__":
    asyncio.run(run_benchmark(10))
