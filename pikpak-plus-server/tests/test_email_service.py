"""
Unit and integration tests for EmailService (SMTP / Brevo integration)
and UserService password reset email dispatch.
"""

from __future__ import annotations

import smtplib
from unittest.mock import MagicMock, patch

from app.services.email_service import EmailService
from app.services.user_service import UserService


def test_email_service_unconfigured_fallback(caplog):
    """When SMTP credentials are not configured, log dev fallback and return False."""
    service = EmailService(
        smtp_host=None,
        smtp_user=None,
        smtp_password=None,
        frontend_url="http://localhost:3000",
    )
    assert service.is_configured is False

    with caplog.at_level("INFO"):
        res = service.send_password_reset_email("user@example.com", "test_token_123")
    assert res is False
    assert (
        "SMTP is not fully configured" in caplog.text
        or "Reset token (dev only)" in caplog.text
    )
    assert "test_token_123" in caplog.text


def test_email_service_smtp_tls_success():
    """When SMTP is configured with TLS (port 587 default), deliver message successfully."""
    service = EmailService(
        smtp_host="smtp-relay.brevo.com",
        smtp_port=587,
        smtp_user="brevo_user@example.com",
        smtp_password="brevo_smtp_key_secret",
        smtp_use_tls=True,
        smtp_use_ssl=False,
        from_email="noreply@example.com",
        from_name="PikPak Plus",
        frontend_url="http://localhost:3000",
    )
    assert service.is_configured is True

    mock_server = MagicMock()
    with patch("smtplib.SMTP", return_value=mock_server) as mock_smtp_class:
        mock_server.__enter__.return_value = mock_server
        result = service.send_password_reset_email(
            "recipient@example.com", "sample_reset_token"
        )

        assert result is True
        mock_smtp_class.assert_called_once_with("smtp-relay.brevo.com", 587, timeout=15)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with(
            "brevo_user@example.com", "brevo_smtp_key_secret"
        )
        mock_server.send_message.assert_called_once()

        # Inspect message sent
        sent_msg = mock_server.send_message.call_args[0][0]
        assert sent_msg["Subject"] == "Reset Your PikPak Plus Password"
        assert sent_msg["To"] == "recipient@example.com"
        payloads = [
            part.get_payload(decode=True).decode("utf-8")
            for part in sent_msg.get_payload()
        ]
        assert any("sample_reset_token" in p for p in payloads)
        assert any(
            "http://localhost:3000/reset-password?token=sample_reset_token" in p
            for p in payloads
        )


def test_email_service_smtp_ssl_success():
    """When SMTP is configured with SSL (port 465), use smtplib.SMTP_SSL."""
    service = EmailService(
        smtp_host="smtp-relay.brevo.com",
        smtp_port=465,
        smtp_user="brevo_user@example.com",
        smtp_password="brevo_smtp_key_secret",
        smtp_use_tls=False,
        smtp_use_ssl=True,
        from_email="noreply@example.com",
        frontend_url="https://app.example.com",
    )

    mock_server = MagicMock()
    with patch("smtplib.SMTP_SSL", return_value=mock_server) as mock_ssl_class:
        mock_server.__enter__.return_value = mock_server
        result = service.send_password_reset_email("user@example.com", "token_ssl")

        assert result is True
        mock_ssl_class.assert_called_once()
        mock_server.login.assert_called_once_with(
            "brevo_user@example.com", "brevo_smtp_key_secret"
        )
        mock_server.send_message.assert_called_once()


def test_email_service_smtp_error_handled(caplog):
    """Network or SMTP authentication failures should be caught gracefully without crashing."""
    service = EmailService(
        smtp_host="smtp-relay.brevo.com",
        smtp_port=587,
        smtp_user="brevo_user@example.com",
        smtp_password="bad_password",
    )

    with patch(
        "smtplib.SMTP",
        side_effect=smtplib.SMTPAuthenticationError(535, b"Authentication failed"),
    ):
        with caplog.at_level("INFO"):
            result = service.send_password_reset_email("user@example.com", "token_fail")

        assert result is False
        assert "Failed to send password reset email via SMTP" in caplog.text
        assert "token_fail" in caplog.text  # Logged in fallback


def test_user_service_integrates_email_service(memory_supabase):
    """UserService.request_password_reset should trigger EmailService.send_password_reset_email."""
    mock_email_service = MagicMock()
    mock_email_service.send_password_reset_email.return_value = True

    user_service = UserService(memory_supabase, email_service=mock_email_service)

    # user@example.com exists in memory_supabase fixture
    success = user_service.request_password_reset("user@example.com")
    assert success is True

    mock_email_service.send_password_reset_email.assert_called_once()
    args = mock_email_service.send_password_reset_email.call_args[0]
    assert args[0] == "user@example.com"
    # Token should be a non-empty string
    assert len(args[1]) >= 20
