from datetime import datetime, timezone
import logging
from typing import Optional
import httpx
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.notification import Notification, NotificationStatus, NotificationType

logger = logging.getLogger("docbook.telegram")


async def send_telegram_admin_notification(
    db: Session,
    appointment_id: str,
    patient_name: str,
    patient_age: Optional[str],
    patient_mobile: Optional[str],
    doctor_name: str,
    specialization: str,
    appointment_date_str: str,
    appointment_time_str: str,
    clinic_name: str,
    consultation_fee: str,
) -> bool:
    """
    Sends Telegram notification to Admin when an appointment is booked.
    Logs result to notifications table. Does not raise exceptions so appointment stays saved.
    """
    age_display = patient_age if patient_age else "Not specified"
    mobile_display = patient_mobile if patient_mobile else "Not specified"

    text = (
        f"🔔 <b>NEW APPOINTMENT</b>\n\n"
        f"<b>Patient:</b>\n{patient_name}\n\n"
        f"<b>Age:</b>\n{age_display}\n\n"
        f"<b>Mobile:</b>\n{mobile_display}\n\n"
        f"<b>Doctor:</b>\n{doctor_name}\n\n"
        f"<b>Specialization:</b>\n{specialization}\n\n"
        f"<b>Date:</b>\n{appointment_date_str}\n\n"
        f"<b>Time:</b>\n{appointment_time_str}\n\n"
        f"<b>Location:</b>\n{clinic_name}\n\n"
        f"<b>Consultation Fee:</b>\n₹{consultation_fee}\n\n"
        f"<b>Appointment ID:</b>\n{appointment_id}"
    )

    # Check credentials
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_ADMIN_CHAT_ID:
        msg = "Telegram Bot Token or Admin Chat ID not configured in environment"
        logger.warning("[TELEGRAM] %s", msg)
        print(f"\n=======================================================")
        print(f"[DEV TELEGRAM NOTIFICATION] - (Credentials missing)")
        try:
            print(text.encode("ascii", "replace").decode("ascii"))
        except Exception:
            pass
        print(f"=======================================================\n")
        notification = Notification(
            appointment_id=appointment_id,
            type=NotificationType.TELEGRAM,
            status=NotificationStatus.FAILED,
            error_message=msg,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(notification)
        db.commit()
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_ADMIN_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                logger.info("Telegram notification successfully sent for appointment %s", appointment_id)
                notification = Notification(
                    appointment_id=appointment_id,
                    type=NotificationType.TELEGRAM,
                    status=NotificationStatus.SENT,
                    error_message=None,
                    sent_at=datetime.now(timezone.utc),
                )
                db.add(notification)
                db.commit()
                return True
            else:
                err_text = f"Telegram HTTP {response.status_code}: {response.text}"
                logger.error(err_text)
                notification = Notification(
                    appointment_id=appointment_id,
                    type=NotificationType.TELEGRAM,
                    status=NotificationStatus.FAILED,
                    error_message=err_text,
                    sent_at=datetime.now(timezone.utc),
                )
                db.add(notification)
                db.commit()
                return False
    except Exception as exc:
        err_msg = f"Telegram dispatch exception: {str(exc)}"
        logger.exception(err_msg)
        notification = Notification(
            appointment_id=appointment_id,
            type=NotificationType.TELEGRAM,
            status=NotificationStatus.FAILED,
            error_message=err_msg,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(notification)
        db.commit()
        return False
