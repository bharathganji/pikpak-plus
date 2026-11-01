"""
Account information, storage quota, VIP status, and user profile operations.
"""

from __future__ import annotations

import logging
from typing import Any

from .client import BaseClient
from .exceptions import PikpakException
from .models import AccountInfo, StorageQuota, UserProfile, VipInfo

logger = logging.getLogger("pikpakapi.account")


class AccountMixin(BaseClient):
    """Mixin providing user profile, storage quota, VIP details, and invitation information."""

    async def get_profile(self) -> dict[str, Any]:
        """Gets user profile details from the user service."""
        url = f"https://{self.PIKPAK_USER_HOST}/v1/user/me"
        return await self._request_get(url)

    async def get_quota_info(self) -> dict[str, Any]:
        """Gets storage quota and usage information from the drive service."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/about"
        return await self._request_get(url)

    async def vip_info(self) -> dict[str, Any]:
        """Gets VIP status, privileges, and subscription expiration."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/privilege/vip"
        return await self._request_get(url)

    async def get_transfer_quota(self) -> dict[str, Any]:
        """Gets data transfer / traffic quota consumption details."""
        url = f"https://{self.PIKPAK_API_HOST}/vip/v1/quantity/list?type=transfer"
        return await self._request_get(url)

    async def get_invite_code(self) -> str:
        """Gets the user's invitation referral code."""
        url = f"https://{self.PIKPAK_API_HOST}/vip/v1/activity/inviteCode"
        res = await self._request_get(url)
        return str(res.get("code", ""))

    async def account_info(self, raw: bool = False) -> dict[str, Any]:
        """
        Retrieves a comprehensive account overview aggregating user profile,
        VIP subscription, and storage quotas. Matches MCP 'account_info' tool.

        :param raw: If True, returns combined dictionary with original response sub-keys.
        """
        try:
            profile_data = await self.get_profile()
        except PikpakException as exc:
            logger.debug("Profile fetch failed, using fallback identity: %s", exc)
            profile_data = {"sub": self.user_id or "", "name": self.username or ""}

        quota_data = await self.get_quota_info()
        vip_data = await self.vip_info()

        storage_quota = StorageQuota.from_dict(quota_data)
        vip_info_model = VipInfo.from_dict(vip_data)
        user_profile = UserProfile.from_dict(profile_data)

        account = AccountInfo(
            user_id=user_profile.user_id or self.user_id or "",
            name=user_profile.name or self.username or "",
            email=user_profile.email
            or (self.username if self.username and "@" in self.username else ""),
            status=user_profile.status,
            vip=vip_info_model,
            storage=storage_quota,
            additional_quotas=quota_data.get("quotas", {}),
            raw_response={
                "profile": profile_data,
                "quota": quota_data,
                "vip": vip_data,
            },
        )

        if raw:
            return account.raw_response
        return account.to_dict()
