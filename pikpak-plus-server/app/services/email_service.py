"""Email Service Module - Handles transactional email delivery via SMTP (e.g., Brevo)"""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.core.config import AppConfig

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending transactional emails via SMTP"""

    def __init__(
        self,
        smtp_host: str | None = None,
        smtp_port: int | None = None,
        smtp_user: str | None = None,
        smtp_password: str | None = None,
        smtp_use_tls: bool | None = None,
        smtp_use_ssl: bool | None = None,
        from_email: str | None = None,
        from_name: str | None = None,
        frontend_url: str | None = None,
    ):
        self.smtp_host = smtp_host if smtp_host is not None else AppConfig.SMTP_HOST
        self.smtp_port = smtp_port if smtp_port is not None else AppConfig.SMTP_PORT
        self.smtp_user = smtp_user if smtp_user is not None else AppConfig.SMTP_USER
        self.smtp_password = (
            smtp_password if smtp_password is not None else AppConfig.SMTP_PASSWORD
        )
        self.smtp_use_tls = (
            smtp_use_tls if smtp_use_tls is not None else AppConfig.SMTP_USE_TLS
        )
        self.smtp_use_ssl = (
            smtp_use_ssl if smtp_use_ssl is not None else AppConfig.SMTP_USE_SSL
        )
        self.from_email = (
            from_email if from_email is not None else AppConfig.SMTP_FROM_EMAIL
        )
        self.from_name = (
            from_name if from_name is not None else AppConfig.SMTP_FROM_NAME
        )
        self.frontend_url = (
            frontend_url if frontend_url is not None else AppConfig.FRONTEND_URL
        ).rstrip("/")

    @property
    def is_configured(self) -> bool:
        """Check if SMTP has minimal required configuration to attempt delivery."""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    def send_password_reset_email(self, to_email: str, reset_token: str) -> bool:
        """Send a password reset email with the reset token link.

        Args:
            to_email: Recipient email address
            reset_token: Generated password reset token

        Returns:
            True if sent via SMTP, False if logged or delivery failed
        """
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"
        expiry_hours = AppConfig.PASSWORD_RESET_TOKEN_EXPIRATION_HOURS

        host = self.smtp_host
        # If SMTP is not configured, fall back to safe development logging
        if not self.is_configured or not host:
            logger.warning(
                "SMTP is not fully configured (SMTP_HOST/USER/PASSWORD). "
                "Password reset link for %s: %s",
                to_email,
                reset_link,
            )
            logger.info("Reset token (dev only): %s", reset_token)
            return False

        subject = "Reset Your PikPak Plus Password"
        text_body = self._build_plain_text_body(reset_link, expiry_hours)
        html_body = self._build_html_body(reset_link, expiry_hours)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((self.from_name, self.from_email))
        msg["To"] = to_email

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if self.smtp_use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(
                    host, self.smtp_port, context=context, timeout=15
                ) as server:
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(host, self.smtp_port, timeout=15) as server:
                    if self.smtp_use_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)

            logger.info(
                "Password reset email sent successfully via SMTP to %s", to_email
            )
            return True

        except (smtplib.SMTPException, OSError, ssl.SSLError) as e:
            logger.error(
                "Failed to send password reset email via SMTP to %s: %s", to_email, e
            )
            logger.info("Reset link fallback (dev log): %s", reset_link)
            return False

    def _build_plain_text_body(self, reset_link: str, expiry_hours: int) -> str:
        return (
            "Hello,\n\n"
            "We received a request to reset the password for your PikPak Plus account.\n"
            f"You can reset your password by opening the following link in your browser:\n\n"
            f"{reset_link}\n\n"
            f"This link will expire in {expiry_hours} hour(s).\n\n"
            "If you did not request this password reset, please ignore this email "
            "and your account will remain secure.\n\n"
            "Regards,\n"
            "The PikPak Plus Team\n"
        )

    def _build_html_body(self, reset_link: str, expiry_hours: int) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #131b2e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h2 style="margin: 0; color: #38bdf8; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">PikPak Plus</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h3 style="margin: 0; color: #f8fafc; font-size: 20px; font-weight: 600;">Password Reset Request</h3>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; font-size: 15px; line-height: 1.6; color: #94a3b8;">
              We received a request to reset your password. Click the button below to choose a new password. This link is valid for <strong>{expiry_hours} hour(s)</strong>.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="{reset_link}" target="_blank" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px; font-size: 13px; line-height: 1.5; color: #64748b;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="{reset_link}" style="color: #38bdf8; word-break: break-all;">{reset_link}</a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 12px; color: #475569; text-align: center;">
              If you didn't request a password reset, you can safely ignore this email.<br>
              &copy; PikPak Plus
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
