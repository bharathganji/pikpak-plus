"""
Hermetic In-Memory Services for PikPak-Plus Integration Testing.
Provides MemorySupabaseService, MemoryRedisClient, MemoryCacheManager,
MockPikPakService, and MockWebDAVManager without any external network calls.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock


class MemorySupabaseService:
    """Hermetic in-memory replacement for SupabaseService."""

    def __init__(self):
        self.users: dict[str, dict[str, Any]] = {}
        self.actions: list[dict[str, Any]] = []
        self.shares: list[dict[str, Any]] = []
        self.daily_stats: list[dict[str, Any]] = [
            {
                "date": "2026-10-20",
                "tasks_added": 12,
                "storage_used": 10737418240,
                "transfer_used": 5368709120,
                "downstream_traffic": 2147483648,
            },
            {
                "date": "2026-10-21",
                "tasks_added": 15,
                "storage_used": 12884901888,
                "transfer_used": 6442450944,
                "downstream_traffic": 3221225472,
            },
            {
                "date": "2026-10-22",
                "tasks_added": 18,
                "storage_used": 15032385536,
                "transfer_used": 7516192768,
                "downstream_traffic": 4294967296,
            },
        ]
        self.client = MagicMock()

    # User Management
    def create_user(self, email: str, password_hash: str, is_admin: bool = False) -> dict[str, Any]:
        email_clean = email.strip().lower()
        now_str = datetime.now(UTC).isoformat()
        user_record = {
            "id": len(self.users) + 1,
            "email": email_clean,
            "password_hash": password_hash,
            "is_admin": is_admin,
            "blocked": False,
            "created_at": now_str,
            "reset_token": None,
            "reset_token_expires_at": None,
        }
        self.users[email_clean] = user_record
        return user_record

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        email_clean = email.strip().lower()
        return self.users.get(email_clean)

    def update_user_password(self, email: str, password_hash: str) -> bool:
        email_clean = email.strip().lower()
        if email_clean in self.users:
            self.users[email_clean]["password_hash"] = password_hash
            return True
        return False

    def store_password_reset_token(self, email: str, token: str, expires_at: Any) -> bool:
        email_clean = email.strip().lower()
        if email_clean in self.users:
            self.users[email_clean]["reset_token"] = token
            self.users[email_clean]["reset_token_expires_at"] = (
                expires_at.isoformat() if hasattr(expires_at, "isoformat") else str(expires_at)
            )
            return True
        return False

    def get_user_by_reset_token(self, token: str) -> dict[str, Any] | None:
        for u in self.users.values():
            if u.get("reset_token") == token:
                return u
        return None

    def clear_password_reset_token(self, email: str) -> bool:
        email_clean = email.strip().lower()
        if email_clean in self.users:
            self.users[email_clean]["reset_token"] = None
            self.users[email_clean]["reset_token_expires_at"] = None
            return True
        return False

    def update_user_blocked_status(self, email: str, blocked: bool) -> bool:
        email_clean = email.strip().lower()
        if email_clean in self.users:
            self.users[email_clean]["blocked"] = blocked
            return True
        return False

    def update_user_admin_status(self, email: str, is_admin: bool) -> bool:
        email_clean = email.strip().lower()
        if email_clean in self.users:
            self.users[email_clean]["is_admin"] = is_admin
            return True
        return False

    def delete_user(self, email: str) -> bool:
        email_clean = email.strip().lower()
        if email_clean in self.users:
            del self.users[email_clean]
            return True
        return False

    def get_users_list(self, offset: int = 0, limit: int = 20, blocked_filter: bool | None = None, *args, **kwargs) -> dict[str, Any]:
        user_list = list(self.users.values())
        if blocked_filter is not None:
            user_list = [u for u in user_list if u.get("blocked") == blocked_filter]
        paginated = user_list[offset : offset + limit]
        return {
            "data": paginated,
            "count": len(user_list),
            "users": paginated,
            "total": len(user_list),
        }

    def get_admins_count(self) -> int:
        return sum(1 for u in self.users.values() if u.get("is_admin"))

    def log_action(self, url: str, task_result: dict, file_info: dict | None = None, user_email: str | None = None) -> dict[str, Any]:
        action_id = len(self.actions) + 1
        record = {
            "id": action_id,
            "action": "add",
            "url": url,
            "data": {
                "url": url,
                "task": task_result,
                "file_info": file_info,
            },
            "user_email": user_email.strip().lower() if user_email else None,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.actions.append(record)
        return record

    def get_tasks(self, offset: int = 0, limit: int = 20) -> dict[str, Any]:
        tasks = [a for a in self.actions if a.get("action") == "add"]
        return {
            "data": tasks[offset : offset + limit],
            "count": len(tasks),
        }

    def get_user_tasks(self, user_email: str, offset: int = 0, limit: int = 20) -> dict[str, Any]:
        email_clean = user_email.strip().lower()
        tasks = [a for a in self.actions if a.get("user_email") == email_clean]
        return {
            "data": tasks[offset : offset + limit],
            "count": len(tasks),
        }

    def get_task_by_id(self, task_id: int) -> dict[str, Any] | None:
        for a in self.actions:
            if a.get("id") == task_id:
                return a
        return None

    def get_action_by_id(self, action_id: int) -> dict[str, Any] | None:
        for a in self.actions:
            if a.get("id") == action_id:
                return a
        return None

    def delete_action_by_id(self, action_id: int) -> bool:
        before = len(self.actions)
        self.actions = [a for a in self.actions if a.get("id") != action_id]
        return len(self.actions) < before

    def check_existing_task_by_hash(self, file_hash: str) -> dict[str, Any] | None:
        for a in self.actions:
            url = a.get("url", "")
            if file_hash.lower() in url.lower():
                return a
        return None

    # Shares
    def store_share(self, url: str = "", share_result: dict[str, Any] | None = None, file_info: dict | None = None, user_email: str | None = None, file_name: str | None = None, **kwargs) -> dict[str, Any]:
        share_id = len(self.shares) + 1
        data_meta = dict(share_result or {})
        data_meta["file_id"] = url or data_meta.get("file_id", "")
        if file_name:
            data_meta["file_name"] = file_name
        elif file_info and "file_name" in file_info:
            data_meta["file_name"] = file_info["file_name"]

        record = {
            "id": share_id,
            "action": "share",
            "url": url,
            "data": data_meta,
            "user_email": user_email.strip().lower() if user_email else None,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.shares.append(record)
        return record

    def get_existing_share_by_file_id(self, file_id: str) -> dict[str, Any] | None:
        for s in self.shares:
            data = s.get("data", {})
            if data.get("file_id") == file_id or data.get("id") == file_id:
                return data
            share = data.get("share", {})
            if isinstance(share, dict) and (share.get("file_id") == file_id or share.get("id") == file_id):
                return share
        return None

    def get_user_shares(self, email: str, offset: int = 0, limit: int = 50) -> dict[str, Any]:
        normalized = email.strip().lower() if email else ""
        user_shares = [
            s for s in self.shares
            if s.get("action") == "share" and (s.get("user_email") == normalized or not s.get("user_email"))
        ]
        paged = user_shares[offset:offset + limit]
        shares_list = []
        for s in paged:
            data = s.get("data", {})
            shares_list.append({**data, "action_id": s.get("id"), "created_at": s.get("created_at")})
        return {
            "data": paged,
            "shares": shares_list,
            "count": len(user_shares),
        }

    def delete_user_share(self, email: str, action_id_or_share_id: str) -> bool:
        del email  # Unused in mock implementation
        target_str = str(action_id_or_share_id).strip()
        before = len(self.shares)
        if target_str.isdigit():
            target_id = int(target_str)
            self.shares = [
                s for s in self.shares
                if s.get("id") != target_id
            ]
        else:
            self.shares = [
                s for s in self.shares
                if not (
                    s.get("data", {}).get("share_id") == target_str or
                    s.get("data", {}).get("id") == target_str or
                    (isinstance(s.get("data", {}).get("share"), dict) and s.get("data", {}).get("share", {}).get("share_id") == target_str)
                )
            ]
        return len(self.shares) < before

    # Statistics & Health
    def get_admin_statistics(self) -> dict[str, Any]:
        return {
            "total_users": len(self.users),
            "total_tasks": len(self.actions),
            "active_users": max(1, len(self.users)),
        }

    def get_daily_stats(self, limit: int = 30) -> list[dict[str, Any]]:
        return self.daily_stats[:limit]

    def log_daily_stats(self, stats_data: dict) -> None:
        self.daily_stats.insert(0, stats_data)

    def health_check(self) -> tuple[bool, str | None]:
        return True, None


class MemoryRedisClient:
    """In-memory Redis fake with exact API matching redis.Redis."""

    def __init__(self):
        self._data: dict[str, str] = {}
        self._ttls: dict[str, int] = {}

    def get(self, key: str) -> str | None:
        return self._data.get(key)

    def set(self, key: str, value: Any, ex: int | None = None) -> bool:
        self._data[key] = str(value)
        if ex is not None:
            self._ttls[key] = ex
        return True

    def setex(self, key: str, time: int, value: Any) -> bool:
        self._data[key] = str(value)
        self._ttls[key] = time
        return True

    def delete(self, *keys: str) -> int:
        deleted = 0
        for k in keys:
            if k in self._data:
                del self._data[k]
                self._ttls.pop(k, None)
                deleted += 1
        return deleted

    def ttl(self, key: str) -> int:
        if key not in self._data:
            return -2
        return self._ttls.get(key, -1)

    def keys(self, pattern: str = "*") -> list[str]:
        return list(self._data.keys())

    def flushdb(self) -> bool:
        self._data.clear()
        self._ttls.clear()
        return True

    def ping(self) -> bool:
        return True

    def close(self) -> None:
        pass


class MemoryCacheManager:
    """In-memory implementation of CacheManager."""

    def __init__(self, ttl: int = 3600):
        self.ttl = ttl
        self.redis_client = MemoryRedisClient()

    def get(self, key: str) -> Any | None:
        val = self.redis_client.get(key)
        if val is not None:
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return val
        return None

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        expire_time = ttl if ttl is not None else self.ttl
        self.redis_client.setex(key, expire_time, json.dumps(value, default=str))

    def get_ttl(self, key: str) -> int:
        return self.redis_client.ttl(key)

    def clear(self) -> None:
        self.redis_client.flushdb()

    def invalidate_tasks(self) -> None:
        self.clear()


class MockPikPakService:
    """Hermetic async mock for PikPakService."""

    def __init__(self, username: str = "mock_user", password: str = "mock_pass"):
        self.username = username
        self.password = password
        self.client = MagicMock()
        self.client.access_token = "mock_access_token_12345"
        self.client.refresh_token = "mock_refresh_token_12345"
        self.client.expires_at = datetime.now(UTC) + timedelta(hours=2)
        self.closed = False

    async def aclose(self) -> None:
        self.closed = True

    def close(self) -> None:
        self.closed = True

    async def offline_download(self, url: str, **kwargs) -> dict[str, Any]:
        return {
            "task": {
                "id": "mock_task_001",
                "name": "mock_sample_video.mp4",
                "phase": "PHASE_TYPE_RUNNING",
                "progress": 50,
                "file_id": "mock_file_001",
            }
        }

    async def add_download(self, url: str, **kwargs) -> dict[str, Any]:
        return await self.offline_download(url, **kwargs)

    async def get_task_status(self, task_id: str) -> dict[str, Any]:
        return {
            "id": task_id,
            "phase": "PHASE_TYPE_COMPLETE",
            "progress": 100,
        }

    async def get_task_info(self, task_id: str) -> dict[str, Any]:
        return {
            "task": {
                "id": task_id,
                "name": "mock_sample_video.mp4",
                "phase": "PHASE_TYPE_COMPLETE",
            }
        }

    async def delete_task(self, task_id: str) -> bool:
        return True

    async def delete_file_forever(self, file_id: str) -> bool:
        return True

    async def vip_info(self) -> dict[str, Any]:
        return {
            "quota": {
                "limit": "1099511627776",
                "usage": "107374182400",
                "is_unlimited": False,
            },
            "status": "ok",
        }

    async def get_quota_info(self) -> dict[str, Any]:
        return await self.vip_info()

    async def get_transfer_quota(self) -> dict[str, Any]:
        return {
            "quota": {
                "limit": "3221225472000",
                "usage": "53687091200",
            },
            "status": "ok",
        }

    async def list_files(self, **kwargs) -> dict[str, Any]:
        return {
            "files": [
                {
                    "id": "mock_file_001",
                    "name": "sample.mp4",
                    "size": 1048576,
                    "kind": "drive#file",
                }
            ],
            "next_page_token": "",
        }

    async def get_file(self, file_id: str) -> dict[str, Any]:
        return {
            "id": file_id,
            "name": "sample.mp4",
            "size": 1048576,
            "created_time": datetime.now(UTC).isoformat(),
        }

    async def get_download_url(self, file_id: str) -> str:
        return f"https://mock.pikpak.me/download/{file_id}"

    async def create_folder(self, name: str, parent_id: str = "") -> dict[str, Any]:
        return {
            "id": f"folder_{name}",
            "name": name,
            "parent_id": parent_id,
        }

    async def delete_to_trash(self, file_id: str) -> bool:
        return True

    async def create_share(self, file_ids: list[str], need_password: bool = False, expiration_days: int = -1) -> dict[str, Any]:
        return {
            "share_id": "share_mock_888",
            "share_url": "https://mypikpak.com/s/share_mock_888",
            "pass_code": "secret123" if need_password else "",
            "file_id": file_ids[0] if file_ids else "file_001",
        }

    async def get_share_info(self, share_id_or_url: str) -> dict[str, Any]:
        return {
            "share_id": share_id_or_url,
            "title": "Shared Resource",
            "files": [{"id": "f1", "name": "sample.mp4"}],
        }

    async def restore_share(self, share_id: str, **kwargs) -> dict[str, Any]:
        return {"task_id": "restore_task_001"}

    async def list_shares(self, **kwargs) -> dict[str, Any]:
        return {"shares": []}

    async def delete_share(self, share_id: str, **kwargs) -> dict[str, Any]:
        return {"success": True}

    async def get_webdav_applications(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "enabled": True,
            "applications": [
                {
                    "username": "dav_user_mercury",
                    "name": "Mercury Client",
                    "read_only": False,
                    "status": "active",
                }
            ],
        }

    async def toggle_webdav(self, enable: bool) -> dict[str, Any]:
        return {"status": "ok", "enabled": enable}

    async def create_webdav_application(self, name: str, read_only: bool = False) -> dict[str, Any]:
        return {
            "status": "ok",
            "application": {
                "username": f"dav_user_{name.lower()}",
                "password": "gen_dav_password_123",
                "name": name,
                "read_only": read_only,
            },
        }

    async def delete_webdav_application(self, username: str, password: str = "", **kwargs) -> dict[str, Any]:
        return {"status": "ok", "deleted": True}

    async def modify_webdav_application(self, username: str, password: str = "", modify_props: dict[str, Any] | None = None, **kwargs) -> dict[str, Any]:
        return {
            "status": "ok",
            "application": {"username": username, **(modify_props or {})},
        }


class MockWebDAVManager:
    """Hermetic mock for WebDAVManager."""

    def __init__(self, pikpak_service=None, **kwargs):
        self.pikpak_service = pikpak_service

    async def get_active_clients(self) -> dict[str, Any]:
        return {
            "available": True,
            "message": "WebDAV clients active",
            "clients": [
                {
                    "username": "dav_user_mercury",
                    "name": "Mercury Client",
                    "created_at": datetime.now(UTC).isoformat(),
                }
            ],
        }

    async def create_daily_webdav_clients(self) -> dict[str, Any]:
        return {"success": True, "message": "Daily WebDAV clients created"}

    async def cleanup_expired_clients(self) -> int:
        return 0
