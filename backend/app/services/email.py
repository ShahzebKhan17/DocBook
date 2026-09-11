import logging
from typing import Optional
import httpx
from backend.app.core.config import settings

logger = logging.getLogger("docbook.email")


async def send_verification_email(to_email: str, to_name: str, token: str) -> bool:
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify Your Email — DocBook Appointment Booking"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }}
            .logo {{ font-size: 24px; font-weight: 700; color: #0284c7; margin-bottom: 24px; display: inline-block; }}
            .title {{ font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }}
            .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }}
            .footer {{ font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">🏥 DocBook</div>
            <div class="title">Welcome, {to_name}!</div>
            <p>Thank you for creating an account with DocBook. Please verify your email address to complete your registration and start booking doctor appointments.</p>
            <div style="text-align: center;">
                <a href="{verification_link}" class="btn" target="_blank">Verify Email Address</a>
            </div>
            <p style="font-size: 13px; color: #64748b;">Or copy this link into your browser:<br><a href="{verification_link}" style="color: #0284c7; word-break: break-all;">{verification_link}</a></p>
            <div class="footer">
                If you did not create an account on DocBook, please safely ignore this email.
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
