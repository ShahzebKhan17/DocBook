import logging
from typing import Optional
import httpx
from backend.app.core.config import settings

logger = logging.getLogger("docbook.email")


async def send_verification_email(to_email: str, to_name: str, token: str) -> bool:
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = f"{token} is your DocBook verification code"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }}
            .logo {{ font-size: 22px; font-weight: 700; color: #0284c7; margin-bottom: 20px; display: inline-block; }}
            .title {{ font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }}
            .code-box {{ background: #f0f9ff; border: 2px dashed #bae6fd; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
            .code {{ font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0284c7; font-family: 'Courier New', Courier, monospace; display: block; }}
            .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 8px 0 20px 0; }}
            .footer {{ font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">🏥 DocBook</div>
            <div class="title">Verify Your Email Address</div>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Hello {to_name},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for registering with DocBook. Enter the following 6-digit verification code on the verification screen to activate your account:</p>
            
            <div class="code-box">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0369a1; display: block; margin-bottom: 6px;">Your 6-Digit Code</span>
                <span class="code">{token}</span>
            </div>

            <div style="text-align: center;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 10px;">Or click the button below to verify automatically in one click:</p>
                <a href="{verification_link}" class="btn" target="_blank">Verify Email Address</a>
            </div>

            <p style="font-size: 12px; color: #64748b; word-break: break-all;">Verification Link: <a href="{verification_link}" style="color: #0284c7;">{verification_link}</a></p>

            <div class="footer">
                This verification code will expire in 24 hours. If you did not create an account on DocBook, please safely ignore this message.
            </div>
        </div>
    </body>
    </html>
    """

    # If Brevo API key is not configured, log verification link clearly for development
    if not settings.BREVO_API_KEY:
        logger.info("[DEV MODE EMAIL] Brevo API Key not configured. Verification link for %s: %s", to_email, verification_link)
        print(f"\n=======================================================")
        print(f"[DEV EMAIL] Verification Link for {to_email}:")
        print(f"   {verification_link}")
        print(f"=======================================================\n")
        return True

    try:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        }
        payload = {
            "sender": {
                "name": settings.BREVO_SENDER_NAME,
                "email": settings.BREVO_SENDER_EMAIL,
            },
            "to": [{"email": to_email, "name": to_name}],
            "subject": subject,
            "htmlContent": html_content,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                logger.info("Email verification sent to %s via Brevo", to_email)
                return True
            else:
                logger.error("Brevo API error (%s): %s", response.status_code, response.text)
                return False
    except Exception as exc:
        logger.exception("Failed to send Brevo verification email: %s", exc)
        return False


async def send_password_reset_email(to_email: str, to_name: str, otp: str) -> bool:
    reset_link = f"{settings.FRONTEND_URL}/forgot-password?email={to_email}&otp={otp}"
    subject = f"{otp} is your DocBook password reset code"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }}
            .logo {{ font-size: 22px; font-weight: 700; color: #0284c7; margin-bottom: 20px; display: inline-block; }}
            .title {{ font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }}
            .code-box {{ background: #fef2f2; border: 2px dashed #fecaca; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
            .code {{ font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #dc2626; font-family: 'Courier New', Courier, monospace; display: block; }}
            .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 8px 0 20px 0; }}
            .footer {{ font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">🏥 DocBook</div>
            <div class="title">Reset Your Password</div>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Hello {to_name},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">We received a request to reset the password for your DocBook account. Use the following 6-digit verification code to set a new password:</p>
            
            <div class="code-box">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #b91c1c; display: block; margin-bottom: 6px;">Password Reset Code</span>
                <span class="code">{otp}</span>
            </div>

            <div style="text-align: center;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 10px;">Or click the button below to reset your password directly:</p>
                <a href="{reset_link}" class="btn" target="_blank">Reset Password</a>
            </div>

            <p style="font-size: 12px; color: #64748b; word-break: break-all;">Reset Link: <a href="{reset_link}" style="color: #0284c7;">{reset_link}</a></p>

            <div class="footer">
                This verification code will expire in <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email or change your password if you suspect unauthorized access.
            </div>
        </div>
    </body>
    </html>
    """

    # If Brevo API key is not configured, log OTP and reset link clearly for development
    if not settings.BREVO_API_KEY:
        logger.info("[DEV MODE EMAIL] Brevo API Key not configured. Password Reset OTP for %s: %s", to_email, otp)
        print(f"\n=======================================================")
        print(f"[DEV EMAIL] Password Reset OTP for {to_email}:")
        print(f"   Code: {otp}")
        print(f"   Link: {reset_link}")
        print(f"=======================================================\n")
        return True

    try:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        }
        payload = {
            "sender": {
                "name": settings.BREVO_SENDER_NAME,
                "email": settings.BREVO_SENDER_EMAIL,
            },
            "to": [{"email": to_email, "name": to_name}],
            "subject": subject,
            "htmlContent": html_content,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                logger.info("Password reset email sent to %s via Brevo", to_email)
                return True
            else:
                logger.error("Brevo API error (%s): %s", response.status_code, response.text)
                return False
    except Exception as exc:
        logger.exception("Failed to send Brevo password reset email: %s", exc)
        return False
