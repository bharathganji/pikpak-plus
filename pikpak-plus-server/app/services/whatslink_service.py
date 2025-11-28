"""WhatsLink Service Module"""
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class WhatsLinkService:
    """Service for WhatsLink.info API operations"""

    BASE_URL = "https://whatslink.info/api/v1/link"

    @staticmethod
    def check_file_info(url: str, timeout: int = 10) -> Dict[str, Any]:
        """
        Check file information using WhatsLink.info API

        Args:
            url: The URL to check
            timeout: Request timeout in seconds

        Returns:
            Dictionary containing file metadata:
            - type: Content type
            - file_type: Type of content (unknown, folder, video, text, image, audio, archive, font, document)
            - name: Content name
            - size: Total size in bytes
            - count: Number of included files
            - screenshots: List of screenshots
            - error: Error message if request failed
        """
        try:
            logger.info(f"Checking file info for URL: {url}")
            response = requests.get(
                WhatsLinkService.BASE_URL,
                params={"url": url},
                timeout=timeout
            )

            if response.status_code == 200:
                data = response.json()
                logger.info(f"WhatsLink response for {url}: {data}")
                return data
            else:
                logger.warning(f"WhatsLink returned status {response.status_code} for {url}")
                return {"error": f"WhatsLink API returned status {response.status_code}"}

        except requests.exceptions.Timeout:
            logger.error(f"WhatsLink API timeout for {url}")
            return {"error": "WhatsLink API request timed out"}
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsLink API error for {url}: {e}")
            return {"error": f"WhatsLink API error: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error checking file info for {url}: {e}")
            return {"error": f"Unexpected error: {str(e)}"}

    @staticmethod
    def check_file_size_limit(url: str, max_size_gb: float) -> tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Check if file size is within the allowed limit

        Args:
            url: The URL to check
            max_size_gb: Maximum allowed size in GB

        Returns:
            Tuple of (is_valid, error_message, file_info)
            - is_valid: True if file is within limit or size couldn't be determined
            - error_message: Error message if file exceeds limit
            - file_info: File metadata from WhatsLink API
        """
        file_info = WhatsLinkService.check_file_info(url)

        # If there's an error getting file info, log it but allow the download
        # (fail open - don't block downloads if the API is unavailable)
        if file_info.get("error"):
            logger.warning(f"Could not check file size for {url}: {file_info['error']}")
            return True, None, file_info

        # Check if size information is available
        size_bytes = file_info.get("size")
        if size_bytes is None:
            logger.warning(f"No size information available for {url}")
            return True, None, file_info

        # Convert bytes to GB
        size_gb = size_bytes / (1024 ** 3)
        logger.info(f"File size for {url}: {size_gb:.2f} GB (limit: {max_size_gb} GB)")

        if size_gb > max_size_gb:
            error_msg = f"File size ({size_gb:.2f} GB) exceeds the maximum allowed size of {max_size_gb} GB"
            logger.warning(f"File size limit exceeded for {url}: {error_msg}")
            return False, error_msg, file_info

        return True, None, file_info
