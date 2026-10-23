"""
Integration tests for Authentication API routes.
Covers: /register, /login, /logout, /me, /forgot-password, /reset-password.
"""
from __future__ import annotations


def test_register_success(test_client):
    """Test user registration with valid parameters."""
    response = test_client.post(
        "/register",
        json={"email": "newuser@example.com", "password": "securePassword123!"},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "Registration successful"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["is_admin"] is False


def test_register_validation_failures(test_client):
    """Test user registration validation edge cases."""
    # Missing fields
    res = test_client.post("/register", json={})
    assert res.status_code == 400
    assert "Missing required fields" in res.get_json()["error"]

    # Invalid email format
    res = test_client.post("/register", json={"email": "not-an-email", "password": "securePassword123!"})
    assert res.status_code == 400
    assert "Invalid email" in res.get_json()["error"]

    # Weak password (< 6 characters)
    res = test_client.post("/register", json={"email": "valid@example.com", "password": "123"})
    assert res.status_code == 400
    assert "Weak password" in res.get_json()["error"]


def test_register_duplicate_email(test_client):
    """Test user registration with already existing email."""
    # user@example.com is seeded in memory_supabase fixture
    res = test_client.post(
        "/register",
        json={"email": "user@example.com", "password": "securePassword123!"},
    )
    assert res.status_code == 400
    assert "Registration failed" in res.get_json()["error"]


def test_login_success(test_client):
    """Test user login with valid credentials."""
    res = test_client.post(
        "/login",
        json={"email": "user@example.com", "password": "userPassword123"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data
    assert data["message"] == "Login successful"
    assert data["user"]["email"] == "user@example.com"


def test_login_invalid_credentials(test_client):
    """Test login with wrong password and unknown email."""
    # Wrong password
    res = test_client.post(
        "/login",
        json={"email": "user@example.com", "password": "wrongPassword"},
    )
    assert res.status_code == 401
    assert "Authentication failed" in res.get_json()["error"]

    # Unknown email
    res = test_client.post(
        "/login",
        json={"email": "unknown@example.com", "password": "somePassword123"},
    )
    assert res.status_code == 401


def test_login_blocked_account(test_client):
    """Test login with blocked account is rejected with 403."""
    res = test_client.post(
        "/login",
        json={"email": "blocked@example.com", "password": "userPassword123"},
    )
    assert res.status_code == 403
    data = res.get_json()
    assert data["error"] == "Account blocked"


def test_logout(test_client, auth_headers):
    """Test user logout."""
    res = test_client.post("/logout", headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()["message"] == "Logout successful"


def test_get_current_user_me(test_client, auth_headers):
    """Test GET /me endpoint with valid auth headers."""
    res = test_client.get("/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["email"] == "user@example.com"
    assert data["user"]["is_admin"] is False


def test_get_current_user_unauthorized(test_client):
    """Test GET /me without auth headers fails with 401."""
    res = test_client.get("/me")
    assert res.status_code == 401

    res = test_client.get("/me", headers={"Authorization": "Bearer invalid_tampered_token"})
    assert res.status_code == 401


def test_forgot_and_reset_password_flow(test_client, memory_supabase):
    """Test full forgot-password and reset-password workflow."""
    # 1. Request password reset
    res = test_client.post("/forgot-password", json={"email": "user@example.com"})
    assert res.status_code == 200
    data = res.get_json()
    assert "reset link" in data["message"].lower() or "sent" in data["message"].lower()

    # Retrieve reset token from memory_supabase
    user = memory_supabase.get_user_by_email("user@example.com")
    reset_token = user.get("reset_token")
    assert reset_token is not None

    # 2. Reset password with token
    res = test_client.post(
        "/reset-password",
        json={"token": reset_token, "new_password": "NewSecurePassword456!"},
    )
    assert res.status_code == 200
    assert "Password reset successful" in res.get_json()["message"]

    # 3. Verify login works with new password
    login_res = test_client.post(
        "/login",
        json={"email": "user@example.com", "password": "NewSecurePassword456!"},
    )
    assert login_res.status_code == 200


def test_reset_password_invalid_token(test_client):
    """Test reset-password with invalid or missing token."""
    res = test_client.post(
        "/reset-password",
        json={"token": "completely_invalid_token", "new_password": "NewSecurePassword456!"},
    )
    assert res.status_code == 400
    assert "Invalid or expired token" in res.get_json()["error"]
