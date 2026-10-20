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

    # We simulate a web server event loop where tasks are being spawned to handle incoming requests.
    # We do not use asyncio.to_thread in the benchmark wrapper itself because we want to see if
    # the underlying code blocks the event loop. Wait, actually, if the underlying code uses
    # requests.get, it WILL block the event loop if we just run it directly.
    # To truly see the benefit of async I/O over sync I/O, we can just run the tasks concurrently
    # and compare the total time against (num_requests * time_for_one_request).
    # But wait, if they block the loop, asyncio.gather will just execute them serially!
    # Let's just do that and show it's serial vs concurrent.

    async def task(url):
        # We need to see if it is awaited. Since it's currently sync, it can't be awaited.
        # But wait! If we modify check_file_info to be async, we would await it.
        # So our benchmark needs to call the method appropriately depending on if it's a coroutine or not.
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
