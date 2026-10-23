"""
Request Input Validation and Sanitization Engine
Provides robust validation for JSON bodies, query strings, emails, passwords, and identifiers.
"""
from __future__ import annotations

import re
from typing import Any

from flask import Request, Response, jsonify

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
SAFE_IDENTIFIER_REGEX = re.compile(r"^[a-zA-Z0-9_-]+$")


def get_json_body(
    req: Request,
    required_fields: list[str] | None = None,
    field_types: dict[str, type | tuple[type, ...]] | None = None,
) -> tuple[dict[str, Any] | None, tuple[Response, int] | None]:
    """
    Safely extract and validate JSON body from request.

    Returns:
        (data_dict, None) on success
        (None, (json_response, status_code)) on validation failure
    """
    data = req.get_json(silent=True)
    if data is None or not isinstance(data, dict):
        return None, (jsonify({
            "error": "Bad Request",
            "message": "Malformed or missing JSON request body"
        }), 400)

    if required_fields:
        missing = [f for f in required_fields if f not in data or data[f] is None]
        if missing:
            return None, (jsonify({
                "error": "Missing required fields",
                "message": f"Required fields missing: {', '.join(missing)}"
            }), 400)

    if field_types:
        for field, expected_type in field_types.items():
            if field in data and data[field] is not None and not isinstance(data[field], expected_type):
                type_name = getattr(expected_type, "__name__", str(expected_type))
                return None, (jsonify({
                    "error": "Invalid field type",
                    "message": f"Field '{field}' must be of type {type_name}"
                }), 400)

    return data, None


def validate_email(email_raw: Any) -> tuple[bool, str, str | None]:
    """
    Validate and sanitize email address.

    Returns:
        (is_valid, sanitized_email, error_message)
    """
    if not isinstance(email_raw, str):
        return False, "", "Email must be a string"

    email = email_raw.strip().lower()
    if len(email) < 5 or len(email) > 254:
        return False, email, "Email length must be between 5 and 254 characters"

    if any(c in email for c in "\r\n\0 "):
        return False, email, "Email contains illegal control characters"

    if not EMAIL_REGEX.match(email):
        return False, email, "Please provide a valid email address"

    return True, email, None


def validate_password(password_raw: Any, min_len: int = 6, max_len: int = 128) -> tuple[bool, str | None]:
    """
    Validate password string length and format (guards against bcrypt DoS).

    Returns:
        (is_valid, error_message)
    """
    if not isinstance(password_raw, str):
        return False, "Password must be a string"

    if len(password_raw) < min_len:
        return False, f"Password must be at least {min_len} characters long"

    if len(password_raw) > max_len:
        return False, f"Password cannot exceed {max_len} characters"

    return True, None


def validate_pagination(
    args: dict[str, Any],
    default_page: int = 1,
    default_limit: int = 25,
    max_limit: int = 100,
) -> tuple[int, int, tuple[Response, int] | None]:
    """
    Parse and validate pagination query parameters.

    Returns:
        (page, limit, None) on success
        (0, 0, (json_response, status_code)) on invalid parameter format
    """
    try:
        page_raw = args.get("page", default_page)
        limit_raw = args.get("limit", default_limit)

        page = int(page_raw)
        limit = int(limit_raw)

        if page < 1 or page > 10000:
            return 0, 0, (jsonify({
                "error": "Invalid page parameter",
                "message": "Page must be an integer between 1 and 10,000"
            }), 400)

        if limit < 1 or limit > max_limit:
            return 0, 0, (jsonify({
                "error": "Invalid limit parameter",
                "message": f"Limit must be an integer between 1 and {max_limit}"
            }), 400)

        return page, limit, None
    except (ValueError, TypeError):
        return 0, 0, (jsonify({
            "error": "Invalid pagination parameters",
            "message": "Page and limit must be valid integers"
        }), 400)


def sanitize_identifier(
    raw: Any,
    field_or_len: int | str = 128,
    max_len: int = 128,
) -> tuple[bool, str, str | None]:
    """
    Validate and sanitize an identifier (file ID, application name, hash).

    Supports:
        sanitize_identifier(raw)
        sanitize_identifier(raw, 128)
        sanitize_identifier(raw, "id")
        sanitize_identifier(raw, "id", 128)

    Returns:
        (is_valid, sanitized_val, error_message)
    """
    if isinstance(field_or_len, str):
        field_name = field_or_len
    else:
        field_name = "Identifier"
        max_len = field_or_len

    if not isinstance(raw, str):
        return False, "", f"{field_name} must be a string"

    val = raw.strip()
    if not val or len(val) > max_len:
        return False, val, f"{field_name} must be between 1 and {max_len} characters"

    if ".." in val or "/" in val or "\\" in val or "\0" in val:
        return False, val, f"{field_name} contains illegal characters or path traversal sequences"

    return True, val, None

