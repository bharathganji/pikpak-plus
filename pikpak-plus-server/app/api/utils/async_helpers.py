"""Async Helper Utilities for Flask Routes"""
import asyncio
import threading
from collections.abc import Coroutine
from typing import Any, TypeVar

import nest_asyncio

T = TypeVar("T")

_thread_locals = threading.local()


def _get_current_loop_policy() -> Any:
    """Safely obtain the current event loop policy without emitting DeprecationWarning."""
    # Python 3.14+ deprecated get_event_loop_policy in favor of internal _get_event_loop_policy
    getter = getattr(asyncio.events, "_get_event_loop_policy", None)
    if getter is not None:
        return getter()
    # Python 3.10-3.13 fallback
    policy_getter = getattr(asyncio, "get_event_loop_policy", None)
    if policy_getter is not None:
        return policy_getter()
    return None


def _get_thread_event_loop() -> asyncio.AbstractEventLoop | None:
    """
    Get the event loop currently bound to the current thread if available and open.
    Falls back to custom policy attributes or thread-local storage when _local._loop is absent.
    """
    policy = _get_current_loop_policy()
    local = getattr(policy, "_local", None)
    if local is not None and hasattr(local, "_loop"):
        thread_loop = getattr(local, "_loop", None)
        if thread_loop is None:
            _thread_locals.loop = None
            return None
        if not thread_loop.is_closed():
            return thread_loop
        return None

    # Custom policy or missing standard _local attribute
    if policy is not None and hasattr(policy, "_current_loop"):
        custom_loop = getattr(policy, "_current_loop", None)
        if custom_loop is None:
            _thread_locals.loop = None
            return None
        if not custom_loop.is_closed():
            return custom_loop
        return None

    cached = getattr(_thread_locals, "loop", None)
    if cached is not None and not cached.is_closed():
        return cached

    return None


def run_async(coro: Coroutine[Any, Any, T]) -> T:
    """
    Helper function to run async coroutines in Flask routes and synchronous contexts.
    Handles both cases: when an event loop is running (e.g., gevent / async context)
    and when no active event loop exists.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None and loop.is_running():
        # If loop is already running (e.g., with gevent), make it reentrant and execute
        nest_asyncio.apply(loop)
        return loop.run_until_complete(coro)

    # Check if an active, unclosed event loop is already bound to the current thread
    thread_loop = _get_thread_event_loop()
    if thread_loop is not None:
        return thread_loop.run_until_complete(coro)

    # Create and set a persistent event loop for the current thread
    new_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(new_loop)
    _thread_locals.loop = new_loop
    return new_loop.run_until_complete(coro)


# Backward-compatible alias
run_sync = run_async

__all__ = ["run_async", "run_sync"]
