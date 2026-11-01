"""Unit tests for async helper utilities (run_async and run_sync)."""
import asyncio
import inspect
import warnings

import app.api.utils.async_helpers as async_helpers_module
import pytest
from app.api.utils import run_async, run_sync
from app.api.utils.async_helpers import (
    run_async as direct_run_async,
)
from app.api.utils.async_helpers import (
    run_sync as direct_run_sync,
)


def test_public_api_exports():
    """Verify that both run_async and run_sync are exposed and identical."""
    assert callable(run_async)
    assert callable(run_sync)
    assert run_async is run_sync
    assert direct_run_async is run_async
    assert direct_run_sync is run_sync


def test_run_sync_without_active_loop():
    """Verify executing coroutine when no event loop is currently running."""
    async def sample_coro(val: int) -> int:
        await asyncio.sleep(0.001)
        return val * 2

    with warnings.catch_warnings(record=True) as recorded_warnings:
        warnings.simplefilter("always")
        result = run_sync(sample_coro(21))

    assert result == 42
    # Verify no DeprecationWarning was emitted for event loop operations
    event_loop_warnings = [
        w for w in recorded_warnings
        if issubclass(w.category, DeprecationWarning) and "event loop" in str(w.message).lower()
    ]
    assert len(event_loop_warnings) == 0


def test_run_async_without_active_loop():
    """Verify run_async backward compatibility when no event loop is active."""
    async def sample_coro() -> str:
        return "success"

    with warnings.catch_warnings(record=True) as recorded_warnings:
        warnings.simplefilter("always")
        result = run_async(sample_coro())

    assert result == "success"
    event_loop_warnings = [
        w for w in recorded_warnings
        if issubclass(w.category, DeprecationWarning) and "event loop" in str(w.message).lower()
    ]
    assert len(event_loop_warnings) == 0


def test_run_sync_with_active_running_loop():
    """Verify executing coroutine when an event loop is already running (e.g. gevent / async runner)."""
    async def inner_coro() -> str:
        await asyncio.sleep(0.001)
        return "nested-ok"

    async def enclosing_coro() -> str:
        # Here an event loop is active and running
        loop = asyncio.get_running_loop()
        assert loop.is_running()
        return run_sync(inner_coro())

    with warnings.catch_warnings(record=True) as recorded_warnings:
        warnings.simplefilter("always")
        result = asyncio.run(enclosing_coro())

    assert result == "nested-ok"
    event_loop_warnings = [
        w for w in recorded_warnings
        if issubclass(w.category, DeprecationWarning) and "event loop" in str(w.message).lower()
    ]
    assert len(event_loop_warnings) == 0


def test_run_sync_nested_calls():
    """Verify multiple levels of nesting with run_sync and run_async."""
    async def level_2(val: str) -> str:
        return f"L2:{val}"

    async def level_1(val: str) -> str:
        sub = run_async(level_2(val))
        return f"L1:{sub}"

    with warnings.catch_warnings(record=True) as recorded_warnings:
        warnings.simplefilter("always")
        result = run_sync(level_1("data"))

    assert result == "L1:L2:data"
    event_loop_warnings = [
        w for w in recorded_warnings
        if issubclass(w.category, DeprecationWarning) and "event loop" in str(w.message).lower()
    ]
    assert len(event_loop_warnings) == 0


def test_run_sync_propagates_exceptions():
    """Verify that exceptions raised inside the coroutine are faithfully propagated."""
    async def faulty_coro():
        raise ValueError("coroutine error occurred")

    with pytest.raises(ValueError, match="coroutine error occurred"):
        run_sync(faulty_coro())


def test_no_deprecated_get_event_loop_in_async_helpers():
    """Verify statically that asyncio.get_event_loop is not referenced in async_helpers.py."""
    source = inspect.getsource(async_helpers_module)
    assert "get_event_loop()" not in source
    assert "asyncio.get_event_loop" not in source


def test_run_sync_with_existing_unstarted_loop():
    """Verify run_sync reuses and preserves an event loop already bound to the current thread."""
    thread_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(thread_loop)
    try:
        async def sample_coro() -> str:
            return "thread_loop_ok"

        with warnings.catch_warnings(record=True) as recorded_warnings:
            warnings.simplefilter("always")
            res = run_sync(sample_coro())

        assert res == "thread_loop_ok"
        assert not thread_loop.is_closed()
        policy = asyncio.get_event_loop_policy()
        current = getattr(getattr(policy, "_local", None), "_loop", None)
        assert current is thread_loop
        event_loop_warnings = [
            w for w in recorded_warnings
            if issubclass(w.category, DeprecationWarning) and "event loop" in str(w.message).lower()
        ]
        assert len(event_loop_warnings) == 0
    finally:
        thread_loop.close()
        asyncio.set_event_loop(None)


def test_run_sync_non_coroutine_raises_type_error():
    """Verify that passing a non-awaitable to run_sync raises a TypeError."""
    with pytest.raises(TypeError):
        run_sync(123)  # type: ignore[arg-type]


def test_run_sync_preserves_thread_event_loop_across_calls():
    """Verify that consecutive run_sync calls reuse and preserve the active event loop without closing it."""
    async def get_running():
        return asyncio.get_running_loop()

    loop1 = run_sync(get_running())
    loop2 = run_sync(get_running())

    assert loop1 is loop2
    assert not loop1.is_closed()


def test_run_sync_with_custom_policy_without_local():
    """Verify run_sync reuses loop via thread-local fallback when policy lacks _local attribute."""
    class DummyPolicy(asyncio.DefaultEventLoopPolicy):
        def __init__(self):
            self._current_loop = None

        def get_event_loop(self):
            raise NotImplementedError

        def set_event_loop(self, loop):
            self._current_loop = loop

        def new_event_loop(self):
            return super().new_event_loop()

        def get_child_watcher(self):
            raise NotImplementedError

        def set_child_watcher(self, watcher):
            raise NotImplementedError

    old_policy = asyncio.get_event_loop_policy()
    asyncio.set_event_loop_policy(DummyPolicy())
    async_helpers_module._thread_locals.loop = None
    try:
        async def sample():
            return "dummy_policy_ok"

        res1 = run_sync(sample())
        res2 = run_sync(sample())
        assert res1 == "dummy_policy_ok"
        assert res2 == "dummy_policy_ok"
    finally:
        asyncio.set_event_loop_policy(old_policy)
        asyncio.set_event_loop(None)


def test_run_sync_when_loop_is_closed():
    """Verify run_sync handles an externally closed loop and initializes a new open loop."""
    closed_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(closed_loop)
    closed_loop.close()
    try:
        async def sample_coro() -> str:
            return "recovered_from_closed"

        res = run_sync(sample_coro())
        assert res == "recovered_from_closed"
    finally:
        asyncio.set_event_loop(None)


def test_run_sync_resets_loop_when_set_event_loop_none_called():
    """Verify run_sync does not resurrect a loop after asyncio.set_event_loop(None)."""
    async def get_running():
        return asyncio.get_running_loop()

    loop1 = run_sync(get_running())
    asyncio.set_event_loop(None)
    loop2 = run_sync(get_running())

    assert loop1 is not loop2
    assert not loop2.is_closed()



