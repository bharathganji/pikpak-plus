"""WebDAV Manager - Handles automated WebDAV client lifecycle"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

# Solar system planet names (excluding Pluto)
PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]

# Planet emojis for UI
PLANET_EMOJIS = {
    "Mercury": "☿️",
    "Venus": "♀️",
    "Earth": "🌍",
    "Mars": "♂️",
    "Jupiter": "♃",
    "Saturn": "♄",
    "Uranus": "♅",
    "Neptune": "♆"
}


class WebDAVManager:
    """Manages automated WebDAV client creation and lifecycle"""
    
    def __init__(self, pikpak_service, ttl_hours: int = 24):
        """
        Initialize WebDAV Manager
        
        Args:
            pikpak_service: PikPakService instance
            ttl_hours: Time-to-live for WebDAV clients in hours
        """
        self.pikpak_service = pikpak_service
        self.ttl_hours = ttl_hours
        self.active_clients: List[Dict[str, Any]] = []
        self.creation_timestamp: Optional[datetime] = None
        
    async def is_downstream_traffic_available(self) -> bool:
        """
        Check if downstream traffic quota is available (not 100% exhausted)
        
        Returns:
            bool: True if traffic is available, False if exhausted
        """
        try:
            transfer_quota = await self.pikpak_service.get_transfer_quota()
            
            # Extract quota information
            quota_info = transfer_quota.get('quota_info', {})
            limit = quota_info.get('limit', 0)
            usage = quota_info.get('usage', 0)
            
            if limit == 0:
                # No limit set, traffic is available
                return True
            
            # Check if usage is less than limit (not 100% exhausted)
            is_available = usage < limit
            
            logger.info(f"Downstream traffic check: {usage}/{limit} bytes used. Available: {is_available}")
            return is_available
            
        except Exception as e:
            logger.error(f"Failed to check downstream traffic: {e}")
            # Default to False (no traffic available) on error for safety
            return False
    
    async def create_daily_webdav_clients(self) -> Dict[str, Any]:
        """
        Create 8 WebDAV clients with planet names, delete old ones
        
        Returns:
            dict: Result with created clients or error message
        """
        try:
            # Check if downstream traffic is available
            if not await self.is_downstream_traffic_available():
                logger.warning("Downstream traffic exhausted, skipping WebDAV client creation")
                return {
                    "success": False,
                    "message": "Downstream traffic quota exhausted",
                    "clients": []
                }
            
            # Clean up old clients first
            await self.cleanup_expired_clients()
            
            created_clients = []
            server_url = "https://dav.mypikpak.com"
            
            # Create 8 clients with planet names
            for planet_name in PLANET_NAMES:
                try:
                    # Create WebDAV application
                    result = await self.pikpak_service.create_webdav_application(planet_name)
                    
                    # Extract credentials from result
                    username = result.get('username', '')
                    password = result.get('password', '')
                    
                    # Build client info
                    created_at = datetime.utcnow()
                    expires_at = created_at + timedelta(hours=self.ttl_hours)
                    
                    client_info = {
                        "planetName": planet_name,
                        "planetEmoji": PLANET_EMOJIS.get(planet_name, "🪐"),
                        "username": username,
                        "password": password,
                        "serverUrl": server_url,
                        "createdAt": created_at.isoformat() + "Z",
                        "expiresAt": expires_at.isoformat() + "Z",
                        "ttlHours": self.ttl_hours
                    }
                    
                    created_clients.append(client_info)
                    logger.info(f"Created WebDAV client: {planet_name}")
                    
                except Exception as e:
                    logger.error(f"Failed to create WebDAV client for {planet_name}: {e}")
                    continue
            
            # Store active clients and timestamp
            self.active_clients = created_clients
            self.creation_timestamp = datetime.utcnow()
            
            logger.info(f"Successfully created {len(created_clients)} WebDAV clients")
            
            return {
                "success": True,
                "message": f"Created {len(created_clients)} WebDAV clients",
                "clients": created_clients
            }
            
        except Exception as e:
            logger.error(f"Failed to create daily WebDAV clients: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}",
                "clients": []
            }
    
    async def cleanup_expired_clients(self) -> int:
        """
        Delete all existing WebDAV clients (cleanup before creating new ones)
        
        Returns:
            int: Number of clients deleted
        """
        try:
            # Get current WebDAV applications
            result = await self.pikpak_service.get_webdav_applications()
            applications = result.get('applications', [])
            
            deleted_count = 0
            
            for app in applications:
                try:
                    username = app.get('username', '')
                    password = app.get('password', '')
                    
                    if username and password:
                        await self.pikpak_service.delete_webdav_application(username, password)
                        deleted_count += 1
                        logger.info(f"Deleted WebDAV client: {username}")
                        
                except Exception as e:
                    logger.error(f"Failed to delete WebDAV client {username}: {e}")
                    continue
            
            logger.info(f"Cleaned up {deleted_count} expired WebDAV clients")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired clients: {e}")
            return 0
    
    async def get_active_clients(self) -> Dict[str, Any]:
        """
        Get list of active WebDAV clients with TTL info
        
        Returns:
            dict: Active clients or message if none available
        """
        try:
            # Check if downstream traffic is available
            if not await self.is_downstream_traffic_available():
                return {
                    "available": False,
                    "message": "Downstream traffic quota exhausted. No WebDAV clients available.",
                    "clients": []
                }
            
            # Check if we have active clients
            if not self.active_clients or not self.creation_timestamp:
                # Try to fetch from PikPak API
                result = await self.pikpak_service.get_webdav_applications()
                applications = result.get('applications', [])
                
                if not applications:
                    return {
                        "available": True,
                        "message": "No WebDAV clients currently active. They will be created on the next scheduled run.",
                        "clients": []
                    }
                
                # Build client list from existing applications
                server_url = "https://dav.mypikpak.com"
                clients = []
                
                for idx, app in enumerate(applications[:8]):  # Limit to 8
                    planet_name = PLANET_NAMES[idx] if idx < len(PLANET_NAMES) else f"Client-{idx+1}"
                    
                    client_info = {
                        "planetName": planet_name,
                        "planetEmoji": PLANET_EMOJIS.get(planet_name, "🪐"),
                        "username": app.get('username', ''),
                        "password": app.get('password', ''),
                        "serverUrl": server_url,
                        "createdAt": app.get('created_time', datetime.utcnow().isoformat() + "Z"),
                        "expiresAt": (datetime.utcnow() + timedelta(hours=self.ttl_hours)).isoformat() + "Z",
                        "ttlHours": self.ttl_hours
                    }
                    clients.append(client_info)
                
                return {
                    "available": True,
                    "message": f"{len(clients)} WebDAV clients active",
                    "clients": clients
                }
            
            # Return cached active clients
            return {
                "available": True,
                "message": f"{len(self.active_clients)} WebDAV clients active",
                "clients": self.active_clients
            }
            
        except Exception as e:
            logger.error(f"Failed to get active clients: {e}")
            return {
                "available": False,
                "message": f"Error retrieving WebDAV clients: {str(e)}",
                "clients": []
            }
