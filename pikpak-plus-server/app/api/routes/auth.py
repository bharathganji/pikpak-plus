"""Authentication API Routes"""
import logging
from flask import Blueprint, request, jsonify
from app.core.auth import create_access_token, get_current_user, require_auth
from app.core.config import AppConfig
from app.api.utils.dependencies import get_supabase_service
from app.services.user_service import UserService

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('auth', __name__)


@bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint

    Request body:
        {
            "email": "user@example.com",
            "password": "securePassword123"
        }
    """
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({
                "error": "Missing required fields",
                "message": "Email and password are required"
            }), 400

        # Basic email validation
        if '@' not in email or '.' not in email:
            return jsonify({
                "error": "Invalid email",
                "message": "Please provide a valid email address"
            }), 400

        # Basic password validation
        if len(password) < 6:
            return jsonify({
                "error": "Weak password",
                "message": "Password must be at least 6 characters long"
            }), 400

        # Create user
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        try:
            user = user_service.register_user(email, password)
        except ValueError as e:
            return jsonify({
                "error": "Registration failed",
                "message": str(e)
            }), 400

        # Generate JWT token
        token = create_access_token(
            user, AppConfig.JWT_SECRET_KEY, AppConfig.JWT_EXPIRATION_HOURS)

        return jsonify({
            "message": "Registration successful",
            "user": {
                "email": user['email'],
                "is_admin": user['is_admin']
            },
            "token": token
        }), 201

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to register user"
        }), 500


@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint

    Request body:
        {
            "email": "user@example.com",
            "password": "securePassword123"
        }
    """
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({
                "error": "Missing credentials",
                "message": "Email and password are required"
            }), 400

        # Authenticate user
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        user = user_service.authenticate_user(email, password)

        if not user:
            return jsonify({
                "error": "Authentication failed",
                "message": "Invalid email or password"
            }), 401

        # Check if user is blocked
        if user.get('blocked', False):
            return jsonify({
                "error": "Account blocked",
                "message": "Your account has been blocked. Please contact support."
            }), 403

        # Generate JWT token
        token = create_access_token(
            user, AppConfig.JWT_SECRET_KEY, AppConfig.JWT_EXPIRATION_HOURS)

        return jsonify({
            "message": "Login successful",
            "user": {
                "email": user['email'],
                "is_admin": user['is_admin'],
                "blocked": user['blocked']
            },
            "token": token
        }), 200

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to process login"
        }), 500


@bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """User logout endpoint (client-side token removal)

    Note: JWT tokens are stateless, so logout is handled client-side
    by removing the token from storage.
    """
    return jsonify({
        "message": "Logout successful",
        "note": "Please remove the token from client storage"
    }), 200


@bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    """Get current user information from JWT token"""
    try:
        user_data = get_current_user()

        if not user_data:
            return jsonify({
                "error": "Authentication required",
                "message": "Invalid or expired token"
            }), 401

        # Fetch fresh user data from database
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        user = user_service.get_user_by_email(user_data['email'])

        if not user:
            return jsonify({
                "error": "User not found",
                "message": "User account no longer exists"
            }), 404

        return jsonify({
            "user": {
                "email": user['email'],
                "is_admin": user['is_admin'],
                "blocked": user['blocked'],
                "created_at": user['created_at']
            }
        }), 200

    except Exception as e:
        logger.error(f"Get current user error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch user information"
        }), 500


@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset token

    Request body:
        {
            "email": "user@example.com"
        }
    """
    try:
        data = request.json
        email = data.get('email')

        if not email:
            return jsonify({
                "error": "Missing email",
                "message": "Email is required"
            }), 400

        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        # Request password reset (always returns success to prevent user enumeration)
        user_service.request_password_reset(email)

        return jsonify({
            "message": "If the email exists, a password reset link has been sent",
            "note": "Check your email for reset instructions"
        }), 200

    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to process password reset request"
        }), 500


@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token

    Request body:
        {
            "token": "reset_token_here",
            "new_password": "newSecurePassword123"
        }
    """
    try:
        data = request.json
        token = data.get('token')
        new_password = data.get('new_password')

        if not token or not new_password:
            return jsonify({
                "error": "Missing required fields",
                "message": "Token and new password are required"
            }), 400

        # Password validation
        if len(new_password) < 6:
            return jsonify({
                "error": "Weak password",
                "message": "Password must be at least 6 characters long"
            }), 400

        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        # Reset password
        success = user_service.reset_password(token, new_password)

        if not success:
            return jsonify({
                "error": "Invalid or expired token",
                "message": "Password reset token is invalid or has expired"
            }), 400

        return jsonify({
            "message": "Password reset successful",
            "note": "You can now login with your new password"
        }), 200

    except Exception as e:
        logger.error(f"Reset password error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to reset password"
        }), 500
