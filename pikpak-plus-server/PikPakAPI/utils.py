import asyncio
import hashlib
import time
from typing import Any, Self
from uuid import uuid4


class AsyncRLock:
    """
    Reentrant asyncio lock.
    Allows the same asyncio Task to acquire the lock multiple times
    without deadlocking, while serializing concurrent tasks.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._owner: asyncio.Task[Any] | None = None
        self._count: int = 0

    def locked(self) -> bool:
        """Return True if the lock is held, False otherwise."""
        return self._lock.locked()

    async def acquire(self) -> bool:
        """Acquire the lock with reentrancy for the owning task."""
        current = asyncio.current_task()
        if self._owner is not None and self._owner == current:
            self._count += 1
            return True
        await self._lock.acquire()
        self._owner = current
        self._count = 1
        return True

    def release(self) -> None:
        """Release the lock, decrementing recursion depth."""
        current = asyncio.current_task()
        if self._owner != current:
            raise RuntimeError("Cannot release un-acquired lock")
        self._count -= 1
        if self._count == 0:
            self._owner = None
            self._lock.release()

    async def __aenter__(self) -> Self:
        await self.acquire()
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None:
        self.release()


CLIENT_ID = "YNxT9w7GMdWvEOKa"
CLIENT_SECRET = "dbw2OtmVEeuUvIptb1Coyg"
CLIENT_VERSION = "1.47.1"
PACKAGE_NAME = "com.pikcloud.pikpak"
PACKAG_ENAME = PACKAGE_NAME  # Backward compatibility alias
SDK_VERSION = "2.0.4.204000"
APP_NAME = PACKAGE_NAME


def get_timestamp() -> int:
    """Get current timestamp in milliseconds."""
    return int(time.time() * 1000)


def device_id_generator() -> str:
    """Generate a random 32-character hexadecimal device id."""
    return str(uuid4()).replace("-", "")


SALTS = [
    "Gez0T9ijiI9WCeTsKSg3SMlx",
    "zQdbalsolyb1R/",
    "ftOjr52zt51JD68C3s",
    "yeOBMH0JkbQdEFNNwQ0RI9T3wU/v",
    "BRJrQZiTQ65WtMvwO",
    "je8fqxKPdQVJiy1DM6Bc9Nb1",
    "niV",
    "9hFCW2R1",
    "sHKHpe2i96",
    "p7c5E6AcXQ/IJUuAEC9W6",
    "",
    "aRv9hjc9P+Pbn+u3krN6",
    "BzStcgE8qVdqjEH16l4",
    "SqgeZvL5j9zoHP95xWHt",
    "zVof5yaJkPe3VFpadPof",
]


def captcha_sign(device_id: str, timestamp: str) -> str:
    """Generate a captcha sign hash."""
    sign = CLIENT_ID + CLIENT_VERSION + PACKAGE_NAME + device_id + timestamp
    for salt in SALTS:
        sign = hashlib.md5((sign + salt).encode()).hexdigest()
    return f"1.{sign}"


def generate_device_sign(device_id: str, package_name: str) -> str:
    """Generate device signature for custom User-Agent."""
    signature_base = f"{device_id}{package_name}1appkey"

    sha1_hash = hashlib.sha1()
    sha1_hash.update(signature_base.encode("utf-8"))
    sha1_result = sha1_hash.hexdigest()

    md5_hash = hashlib.md5()
    md5_hash.update(sha1_result.encode("utf-8"))
    md5_result = md5_hash.hexdigest()

    return f"div101.{device_id}{md5_result}"


def build_custom_user_agent(device_id: str, user_id: str) -> str:
    """Construct a full Android client User-Agent header string."""
    device_sign = generate_device_sign(device_id, PACKAGE_NAME)

    user_agent_parts = [
        f"ANDROID-{APP_NAME}/{CLIENT_VERSION}",
        "protocolVersion/200",
        "accesstype/",
        f"clientid/{CLIENT_ID}",
        f"clientversion/{CLIENT_VERSION}",
        "action_type/",
        "networktype/WIFI",
        "sessionid/",
        f"deviceid/{device_id}",
        "providername/NONE",
        f"devicesign/{device_sign}",
        "refresh_token/",
        f"sdkversion/{SDK_VERSION}",
        f"datetime/{get_timestamp()}",
        f"usrno/{user_id}",
        f"appname/{APP_NAME}",
        "session_origin/",
        "grant_type/",
        "appid/",
        "clientip/",
        "devicename/Xiaomi_M2004j7ac",
        "osversion/13",
        "platformversion/10",
        "accessmode/",
        "devicemodel/M2004J7AC",
    ]

    return " ".join(user_agent_parts)
