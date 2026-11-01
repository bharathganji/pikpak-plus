"""
Data models and typed structures for PikPak API responses.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


def format_bytes(size_bytes: int) -> str:
    """Format bytes into human-readable string (e.g., '10.00 TB', '9.85 GB')."""
    if size_bytes <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    unit_index = 0
    size = float(size_bytes)
    while size >= 1024.0 and unit_index < len(units) - 1:
        size /= 1024.0
        unit_index += 1
    return f"{size:.2f} {units[unit_index]}"


def _parse_int(val: object | None) -> int | None:
    """Safely parse integer from string/number or return None."""
    if val is not None and str(val).isdigit():
        return int(str(val))
    return None


@dataclass
class StorageQuota:
    total_bytes: int = 0
    used_bytes: int = 0
    in_trash_bytes: int = 0
    is_unlimited: bool = False
    total_formatted: str = ""
    used_formatted: str = ""
    in_trash_formatted: str = ""

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> StorageQuota:
        quota: dict[str, Any] = data.get("quota", {})
        total = _parse_int(quota.get("limit")) or 0
        used = _parse_int(quota.get("usage")) or 0
        in_trash = _parse_int(quota.get("usage_in_trash")) or 0
        is_unlimited = bool(quota.get("is_unlimited", False))
        return cls(
            total_bytes=total,
            used_bytes=used,
            in_trash_bytes=in_trash,
            is_unlimited=is_unlimited,
            total_formatted="Unlimited" if is_unlimited else format_bytes(total),
            used_formatted=format_bytes(used),
            in_trash_formatted=format_bytes(in_trash),
        )


@dataclass
class VipInfo:
    type: str = ""
    status: str = ""
    expire_time: str = ""
    items: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> VipInfo:
        inner_data: dict[str, Any] = data.get("data", {}) if "data" in data else data
        return cls(
            type=str(inner_data.get("type", "")),
            status=str(inner_data.get("status", "")),
            expire_time=str(
                inner_data.get("expire", inner_data.get("expire_time", ""))
            ),
            items=list(inner_data.get("items", [])),
        )


@dataclass
class UserProfile:
    user_id: str = ""
    name: str = ""
    email: str = ""
    status: str = ""

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> UserProfile:
        return cls(
            user_id=str(data.get("sub", data.get("user_id", ""))),
            name=str(data.get("name", "")),
            email=str(data.get("email", "")),
            status=str(data.get("status", "")),
        )


@dataclass
class AccountInfo:
    user_id: str = ""
    name: str = ""
    email: str = ""
    status: str = ""
    vip: VipInfo | None = None
    storage: StorageQuota | None = None
    additional_quotas: dict[str, Any] = field(default_factory=dict)
    raw_response: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "status": self.status,
            "vip": {
                "type": self.vip.type if self.vip else "",
                "status": self.vip.status if self.vip else "",
                "expire_time": self.vip.expire_time if self.vip else "",
                "items": self.vip.items if self.vip else [],
            }
            if self.vip
            else None,
            "storage": {
                "total": self.storage.total_formatted if self.storage else "",
                "used": self.storage.used_formatted if self.storage else "",
                "in_trash": self.storage.in_trash_formatted if self.storage else "",
                "is_unlimited": self.storage.is_unlimited if self.storage else False,
            }
            if self.storage
            else None,
            "additional_quotas": self.additional_quotas,
        }


@dataclass
class FileInfo:
    id: str = ""
    name: str = ""
    kind: str = ""
    size: int = 0
    size_formatted: str = ""
    mime_type: str = ""
    modified_time: str = ""
    hash: str = ""
    starred: bool = False
    trashed: bool = False
    download_url: str | None = None
    play_url: str | None = None
    duration: str | None = None
    width: int | None = None
    height: int | None = None
    medias: list[dict[str, Any]] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> FileInfo:
        raw_size = _parse_int(data.get("size")) or 0
        medias_val = data.get("medias", [])
        medias: list[dict[str, Any]] = (
            medias_val if isinstance(medias_val, list) else []
        )
        params_val = data.get("params", {})
        params: dict[str, Any] = params_val if isinstance(params_val, dict) else {}

        # Extract play_url from medias or links
        play_url: str | None = None
        for media in medias:
            if isinstance(media, dict):
                link_obj = media.get("link")
                if isinstance(link_obj, dict) and link_obj.get("url"):
                    play_url = str(link_obj["url"])
                    break

        # Extract download_url
        download_url_val = data.get("web_content_link")
        download_url: str | None = (
            str(download_url_val) if download_url_val else play_url
        )

        duration_val = params.get("duration")
        duration = str(duration_val) if duration_val is not None else None
        width = _parse_int(params.get("width"))
        height = _parse_int(params.get("height"))

        kind_str = str(data.get("kind", ""))
        clean_kind = "folder" if "folder" in kind_str else "file"

        return cls(
            id=str(data.get("id", "")),
            name=str(data.get("name", "")),
            kind=clean_kind,
            size=raw_size,
            size_formatted=format_bytes(raw_size) if clean_kind == "file" else "-",
            mime_type=str(data.get("mime_type", "")),
            modified_time=str(data.get("modified_time", "")),
            hash=str(data.get("hash", "")),
            starred=bool(data.get("starred", False)),
            trashed=bool(data.get("trashed", False)),
            download_url=download_url,
            play_url=play_url,
            duration=duration,
            width=width,
            height=height,
            medias=medias,
            raw=data,
        )

    def to_mcp_format(self) -> dict[str, Any]:
        """Convert to clean dictionary matching MCP get/ls tool shape."""
        out: dict[str, Any] = {
            "id": self.id,
            "name": self.name,
            "kind": self.kind,
            "size": self.size_formatted,
            "mime_type": self.mime_type,
            "modified": self.modified_time,
            "hash": self.hash,
            "star": self.starred,
            "trashed": self.trashed,
        }
        if self.download_url:
            out["download_url"] = self.download_url
        if self.play_url:
            out["play_url"] = self.play_url
        if self.duration:
            out["duration"] = self.duration
        if self.width and self.height:
            out["resolution"] = f"{self.width}x{self.height}"
        return out


@dataclass
class FolderStats:
    total_size: int = 0
    total_size_formatted: str = ""
    file_count: int = 0
    folder_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_size": self.total_size,
            "total_size_formatted": self.total_size_formatted,
            "file_count": self.file_count,
            "folder_count": self.folder_count,
        }
