"""User Service Module - Handles user management operations"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.core.auth import (
    hash_password,
    verify_password,
    create_password_reset_token,
    verify_reset_token
)
from app.core.config import AppConfig

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management operations"""

    def __init__(self, supabase_service):
        """Initialize UserService with SupabaseService dependency

        Args:
            supabase_service: Instance of SupabaseService for database operations
        """
        self.supabase_service = supabase_service

    def register_user(self, email: str, password: str) -> Dict[str, Any]:
        """Create a new user account

        Args:
            email: User's email address
            password: Plain text password

        Returns:
            Dictionary containing user information

        Raises:
            ValueError: If email already exists or validation fails
        """
        # Check if user already exists
        existing_user = self.supabase_service.get_user_by_email(email)
        if existing_user:
            raise ValueError("Email already registered")

        # Hash password
        password_hash = hash_password(password)

        # Create user in database
        user = self.supabase_service.create_user(
            email, password_hash, is_admin=False)

        logger.info(f"New user registered: {email}")

        # Return user without password hash
        return {
            'email': user['email'],
            'is_admin': user.get('is_admin', False),
            'blocked': user.get('blocked', False),
            'created_at': user.get('created_at')
        }

    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Verify login credentials

        Args:
            email: User's email address
            password: Plain text password

        Returns:
            User information if credentials are valid, None otherwise
        """
        user = self.supabase_service.get_user_by_email(email)

        if not user:
            logger.warning(f"Login attempt for non-existent user: {email}")
            return None

        # Verify password
        if not verify_password(password, user['password_hash']):
            logger.warning(f"Failed login attempt for user: {email}")
            return None

        logger.info(f"Successful login: {email}")

        # Return user without password hash
        return {
            'email': user['email'],
            'is_admin': user.get('is_admin', False),
            'blocked': user.get('blocked', False),
            'created_at': user.get('created_at')
        }

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve user information

        Args:
            email: User's email address

        Returns:
            User information without password hash, or None if not found
        """
        user = self.supabase_service.get_user_by_email(email)

        if not user:
            return None

        # Return user without password hash
        return {
            'email': user['email'],
            'is_admin': user.get('is_admin', False),
            'blocked': user.get('blocked', False),
            'created_at': user.get('created_at')
        }

    def request_password_reset(self, email: str) -> bool:
        """Generate and store password reset token

        Args:
            email: User's email address

        Returns:
            True if reset token was generated, False if user not found
        """
        user = self.supabase_service.get_user_by_email(email)

        if not user:
            logger.warning(
                f"Password reset requested for non-existent user: {email}")
            # Return True anyway to prevent user enumeration
            return True

        # Generate reset token
        reset_token = create_password_reset_token()
        expires_at = datetime.utcnow() + timedelta(
            hours=AppConfig.PASSWORD_RESET_TOKEN_EXPIRATION_HOURS
        )

        # Store token in database
        self.supabase_service.store_password_reset_token(
            email, reset_token, expires_at)

        logger.info(f"Password reset token generated for: {email}")

        # In a real application, send email with reset link here
        # For now, just log the token (remove in production!)
        logger.info(f"Reset token (dev only): {reset_token}")

        return True

    def reset_password(self, token: str, new_password: str) -> bool:
        """Verify token and update password

        Args:
            token: Password reset token
            new_password: New plain text password

        Returns:
            True if password was reset successfully, False otherwise
        """
        # Get user by reset token
        user = self.supabase_service.get_user_by_reset_token(token)

        if not user:
            logger.warning("Invalid reset token provided")
            return False

        # Verify token is still valid
        if not verify_reset_token(
            token,
            user.get('reset_token'),
            user.get('reset_token_expires_at')
        ):
            return False

        # Hash new password
        password_hash = hash_password(new_password)

        # Update password
        self.supabase_service.update_user_password(
            user['email'], password_hash)

        # Clear reset token
        self.supabase_service.clear_password_reset_token(user['email'])

        logger.info(f"Password reset successful for: {user['email']}")

        return True

    def block_user(self, email: str) -> bool:
        """Block a user account

        Args:
            email: User's email address

        Returns:
            True if user was blocked successfully
        """
        self.supabase_service.update_user_blocked_status(email, True)
        logger.info(f"User blocked: {email}")
        return True

    def unblock_user(self, email: str) -> bool:
        """Unblock a user account

        Args:
            email: User's email address

        Returns:
            True if user was unblocked successfully
        """
        self.supabase_service.update_user_blocked_status(email, False)
        logger.info(f"User unblocked: {email}")
        return True

    def is_user_blocked(self, email: str) -> bool:
        """Check if user is blocked

        Args:
            email: User's email address

        Returns:
            True if user is blocked, False otherwise
        """
        user = self.supabase_service.get_user_by_email(email)

        if not user:
            return False

        return user.get('blocked', False)

    def get_all_users(self, offset: int = 0, limit: int = 25, blocked_filter: Optional[bool] = None) -> Dict[str, Any]:
        """Get paginated user list

        Args:
            offset: Pagination offset
            limit: Number of users to return
            blocked_filter: Filter by blocked status (None = all, True = blocked only, False = active only)

        Returns:
            Dictionary containing users and total count
        """
        return self.supabase_service.get_users_list(offset, limit, blocked_filter)

    def get_user_stats(self, email: str) -> Dict[str, Any]:
        """Get user activity statistics

        Args:
            email: User's email address

        Returns:
            Dictionary containing user statistics
        """
        # Get user's task count
        user_tasks = self.supabase_service.get_user_tasks(email, 0, 1)
        task_count = user_tasks.get('count', 0)

        return {
            'email': email,
            'total_tasks': task_count
        }

    def bootstrap_admin_user(self) -> None:
        """Create admin user from environment variables on startup

        This is called during application initialization to ensure
        admin account exists based on ADMIN_EMAIL and ADMIN_PASSWORD env vars.
        """
        if not AppConfig.ADMIN_EMAIL or not AppConfig.ADMIN_PASSWORD:
            logger.warning(
                "ADMIN_EMAIL or ADMIN_PASSWORD not configured. Skipping admin bootstrap.")
            return

        # Check if admin already exists
        existing_admin = self.supabase_service.get_user_by_email(
            AppConfig.ADMIN_EMAIL)

        if existing_admin:
            # Update is_admin flag if needed
            if not existing_admin.get('is_admin'):
                logger.info(
                    f"Updating existing user to admin: {AppConfig.ADMIN_EMAIL}")
                # TODO: Add update_user_admin_status method to supabase_service
            else:
                logger.info(
                    f"Admin user already exists: {AppConfig.ADMIN_EMAIL}")
            return

        # Create admin user
        logger.info(f"Creating admin user: {AppConfig.ADMIN_EMAIL}")
        password_hash = hash_password(AppConfig.ADMIN_PASSWORD)

        self.supabase_service.create_user(
            AppConfig.ADMIN_EMAIL,
            password_hash,
            is_admin=True
        )

        logger.info(
            f"Admin user created successfully: {AppConfig.ADMIN_EMAIL}")
