"""Async Helper Utilities for Flask Routes"""
import asyncio
import nest_asyncio


def run_async(coro):
    """
    Helper function to run async coroutines in Flask routes.
    Handles both cases: when event loop is running (gevent) and when it's not.
    """
    try:
        loop = asyncio.get_event_loop()
        # Check if loop is closed
        if loop.is_closed():
           # Create a new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(coro)
        elif loop.is_running():
            # If loop is already running (e.g., with gevent), use nest_asyncio
            nest_asyncio.apply()
            return asyncio.run(coro)
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        # No event loop exists, create a new one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
