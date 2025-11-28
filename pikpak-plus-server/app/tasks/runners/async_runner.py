"""Async Runner - Utilities for running async functions in sync contexts."""
import logging
import asyncio

logger = logging.getLogger(__name__)


def run_async_job(async_func, *args, **kwargs):
    """
    Run an async function in a synchronous context.

    This utility creates a new event loop if one doesn't exist in the current thread,
    which is necessary for running async code in background threads.

    Args:
        async_func: The async function to run
        *args: Positional arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function

    Returns:
        The return value of the async function

    Raises:
        Any exception raised by the async function
    """
    try:
        # Always create a new event loop for this thread/job
        # This avoids conflicts with gevent or other loops
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            return loop.run_until_complete(async_func(*args, **kwargs))
        finally:
            try:
                # Cancel all running tasks
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()

                # Run loop until tasks done
                if pending:
                    loop.run_until_complete(asyncio.gather(
                        *pending, return_exceptions=True))

                loop.close()
            except Exception as cleanup_error:
                logger.warning(
                    f"Error cleaning up event loop: {cleanup_error}")

    except Exception as e:
        logger.error(
            f"Failed to run async job {async_func.__name__}: {e}", exc_info=True)
        raise
