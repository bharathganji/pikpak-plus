"""
Anti-429 Defense: Rate Throttler and Circuit Breaker for PikPak API.

Protects accounts from IP bans and aggressive 24-hour lockouts caused by
bursting requests or duplicate authentication exchanges.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import deque

from .constants import DEFAULT_MAX_REQUESTS_PER_SECOND, LOGIN_COOLDOWN_SECONDS
from .exceptions import PikPakCircuitBreakerOpenError

logger = logging.getLogger("pikpakapi.throttler")


class CircuitState:
    CLOSED = "CLOSED"        # Normal operations
    OPEN = "OPEN"            # Tripped; blocking all requests immediately
    HALF_OPEN = "HALF_OPEN"  # Testing recovery with single probe request


class Throttler:
    """
    Sliding-window rate limiter coupled with an active circuit breaker.

    - Global ceiling: Max requests per window (default 3 req/sec).
    - Login cooldown: Max 1 login attempt per 60 seconds.
    - Circuit Breaker: Trips upon encountering HTTP 429 and halts all requests
      until the cooling period expires.
    """

    def __init__(
        self,
        max_rate: float = DEFAULT_MAX_REQUESTS_PER_SECOND,
        time_window: float = 1.0,
        login_cooldown: float = LOGIN_COOLDOWN_SECONDS,
        probe_timeout: float = 30.0,
    ) -> None:
        self.max_rate = max_rate
        self.time_window = time_window
        self.login_cooldown = login_cooldown
        self.probe_timeout = probe_timeout

        self._lock = asyncio.Lock()
        self._timestamps: deque[float] = deque()
        self._last_login_time: float = 0.0

        # Circuit breaker state
        self._state: str = CircuitState.CLOSED
        self._circuit_open_until: float = 0.0
        self._last_retry_after: float | None = None
        self._probe_in_flight: bool = False
        self._probe_started_at: float = 0.0

    @property
    def state(self) -> str:
        return self._state

    @property
    def circuit_open_until(self) -> float:
        return self._circuit_open_until

    @property
    def probe_in_flight(self) -> bool:
        """Whether a single canary probe is currently active in HALF_OPEN state."""
        return self._probe_in_flight

    async def acquire(self, is_login: bool = False) -> None:
        """
        Request permission to perform an HTTP call.

        - Checks and enforces circuit breaker status.
        - Enforces login cooldown for auth endpoints.
        - Delays execution if the sliding window rate ceiling is reached.
        """
        async with self._lock:
            now = time.time()

            # 1. Circuit Breaker Check
            if self._state == CircuitState.OPEN:
                if now < self._circuit_open_until:
                    remaining = round(self._circuit_open_until - now, 2)
                    msg = (
                        f"Anti-429 Circuit Breaker is active! All requests halted to prevent account bans. "
                        f"Retry allowed in {remaining}s."
                    )
                    logger.warning(msg)
                    raise PikPakCircuitBreakerOpenError(
                        message=msg,
                        retry_after=remaining,
                        state=CircuitState.OPEN,
                    )
                else:
                    # Cooldown has passed; transition to HALF_OPEN to test recovery
                    logger.info("Circuit breaker cooldown expired; entering HALF_OPEN state.")
                    self._state = CircuitState.HALF_OPEN
                    self._probe_in_flight = True
                    self._probe_started_at = now

            elif self._state == CircuitState.HALF_OPEN:
                if self._probe_in_flight:
                    # Check if previous probe timed out
                    if (now - self._probe_started_at) > self.probe_timeout:
                        logger.warning(
                            "HALF_OPEN probe request timed out after %.1fs; replacing with new canary probe.",
                            self.probe_timeout,
                        )
                        self._probe_in_flight = True
                        self._probe_started_at = now
                    else:
                        msg = "Circuit is half-open; probe in progress"
                        logger.warning(
                            "Anti-429 Circuit Breaker is HALF_OPEN: canary probe in-flight. Halting concurrent request."
                        )
                        raise PikPakCircuitBreakerOpenError(
                            message=msg,
                            retry_after=round(
                                max(0.1, self.probe_timeout - (now - self._probe_started_at)), 2
                            ),
                            state=CircuitState.HALF_OPEN,
                        )
                else:
                    # Breaker is HALF_OPEN and no probe is active: claim probe permit
                    self._probe_in_flight = True
                    self._probe_started_at = now

            # 2. Login-Specific Cooldown Check
            if is_login:
                elapsed_since_login = now - self._last_login_time
                if elapsed_since_login < self.login_cooldown:
                    wait_for_login = self.login_cooldown - elapsed_since_login
                    logger.warning(
                        "Anti-429 Defense: Throttling login attempt by %.2fs to prevent authentication ban.",
                        wait_for_login,
                    )
                    await asyncio.sleep(wait_for_login)
                    now = time.time()
                self._last_login_time = now

            # 3. Global Sliding-Window Rate Ceiling
            if self.max_rate > 0:
                # Purge timestamps outside the current window
                window_start = now - self.time_window
                while self._timestamps and self._timestamps[0] <= window_start:
                    self._timestamps.popleft()

                if len(self._timestamps) >= self.max_rate:
                    oldest = self._timestamps[0]
                    sleep_time = (oldest + self.time_window) - now
                    if sleep_time > 0:
                        logger.debug("Rate limit ceiling reached. Backing off for %.3fs", sleep_time)
                        await asyncio.sleep(sleep_time)
                        now = time.time()
                        # Re-purge after sleep
                        window_start = now - self.time_window
                        while self._timestamps and self._timestamps[0] <= window_start:
                            self._timestamps.popleft()

                self._timestamps.append(now)

    def record_429(self, retry_after: float | None = None) -> None:
        """
        Trip the circuit breaker immediately upon receiving HTTP 429.

        :param retry_after: Number of seconds to pause, extracted from the Retry-After header.
        """
        cooldown = retry_after if retry_after and retry_after > 0 else 60.0
        self._last_retry_after = cooldown
        self._circuit_open_until = time.time() + cooldown
        self._state = CircuitState.OPEN
        self._probe_in_flight = False
        self._probe_started_at = 0.0
        logger.error(
            "CRITICAL: HTTP 429 received from PikPak API! Circuit breaker TRIPPED for %.1fs. "
            "Halting all subsequent requests to prevent long-term ban.",
            cooldown,
        )

    def record_success(self) -> None:
        """Record successful response. Restores circuit to CLOSED if it was HALF_OPEN."""
        if self._state == CircuitState.HALF_OPEN:
            logger.info("Probe request succeeded. Resetting circuit breaker to CLOSED.")
            self._state = CircuitState.CLOSED
            self._circuit_open_until = 0.0
            self._probe_in_flight = False
            self._probe_started_at = 0.0

    def record_failure(self, cooldown: float | None = None) -> None:
        """
        Record non-429 probe failure (e.g. 5xx status or network transport failure).
        If in HALF_OPEN state, trips circuit back to OPEN.
        """
        if self._state == CircuitState.HALF_OPEN:
            cooldown_period = (
                cooldown if cooldown and cooldown > 0 else (self._last_retry_after or 60.0)
            )
            self._last_retry_after = cooldown_period
            self._circuit_open_until = time.time() + cooldown_period
            self._state = CircuitState.OPEN
            self._probe_in_flight = False
            self._probe_started_at = 0.0
            logger.warning(
                "Canary probe failed in HALF_OPEN. Tripping circuit breaker back to OPEN for %.1fs.",
                cooldown_period,
            )

    def reset(self) -> None:
        """Reset the throttler and circuit breaker state."""
        self._state = CircuitState.CLOSED
        self._circuit_open_until = 0.0
        self._last_retry_after = None
        self._timestamps.clear()
        self._last_login_time = 0.0
        self._probe_in_flight = False
        self._probe_started_at = 0.0
