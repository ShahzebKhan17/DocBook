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


async def send_telegram_cancellation_notification(
    db: Session,
    appointment_id: str,
    patient_name: str,
    doctor_name: str,
    specialization: str,
    appointment_date_str: str,
    appointment_time_str: str,
    clinic_name: str,
) -> bool:
    """
    Sends Telegram notification to Admin/Clinic when an appointment is cancelled.
    """
    text = (
        f"🚨 <b>APPOINTMENT CANCELLED</b>\n\n"
        f"<b>Patient:</b>\n{patient_name}\n\n"
        f"<b>Doctor:</b>\n{doctor_name}\n\n"
        f"<b>Specialization:</b>\n{specialization}\n\n"
        f"<b>Date:</b>\n{appointment_date_str}\n\n"
        f"<b>Time:</b>\n{appointment_time_str}\n\n"
        f"<b>Location:</b>\n{clinic_name}\n\n"
        f"<b>Appointment ID:</b>\n{appointment_id}"
    )

    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_ADMIN_CHAT_ID:
        logger.warning("[TELEGRAM] Bot Token or Chat ID missing for cancellation alert")
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
                logger.info("Telegram cancellation notification sent for appointment %s", appointment_id)
                return True
            else:
                logger.error("Telegram cancellation error HTTP %s: %s", response.status_code, response.text)
                return False
    except Exception as exc:
        logger.exception("Telegram cancellation exception: %s", exc)
        return False


import mimetypes

async def send_telegram_prescription(
    file_bytes: bytes,
    filename: str,
    file_type: str,
    patient_name: str,
    contact_mobile: str,
    delivery_address: str,
    doctor_name: Optional[str] = None,
    appointment_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> bool:
    """
    Sends a patient's uploaded prescription (photo or document) to Telegram with delivery details.
    Attempts sendPhoto for images with automatic fallback to sendDocument.
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_ADMIN_CHAT_ID:
        logger.warning("[TELEGRAM] Bot Token or Chat ID not configured for prescription dispatch")
        return False

    caption_lines = [
        "💊 <b>NEW PRESCRIPTION ORDER</b>\n",
        f"👤 <b>Patient:</b> {patient_name}",
        f"📞 <b>Mobile:</b> {contact_mobile}",
    ]
    if doctor_name:
        caption_lines.append(f"👨‍⚕️ <b>Doctor:</b> {doctor_name}")
    if appointment_id:
        caption_lines.append(f"🏷️ <b>Appointment ID:</b> {appointment_id}")
    caption_lines.append(f"🏠 <b>Delivery Address:</b>\n{delivery_address}")
    if notes:
        caption_lines.append(f"📝 <b>Patient Notes:</b>\n{notes}")

    caption = "\n".join(caption_lines)

    mime_type, _ = mimetypes.guess_type(filename)
    mime_type = mime_type or ("image/jpeg" if file_type.lower() == "image" else "application/pdf")
    is_image = file_type.lower() == "image" or any(filename.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"])

    data = {
        "chat_id": settings.TELEGRAM_ADMIN_CHAT_ID,
        "caption": caption,
        "parse_mode": "HTML",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # If image, attempt sendPhoto
            if is_image:
                photo_url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendPhoto"
                files = {"photo": (filename, file_bytes, mime_type)}
                try:
                    resp = await client.post(photo_url, data=data, files=files)
                    if resp.status_code == 200:
                        logger.info("Prescription photo %s dispatched to Telegram successfully", filename)
                        return True
                    logger.warning("sendPhoto returned HTTP %s. Falling back to sendDocument.", resp.status_code)
                except Exception as photo_err:
                    logger.warning("sendPhoto exception: %s. Falling back to sendDocument.", photo_err)

            # Document dispatch (or fallback)
            doc_url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendDocument"
            files = {"document": (filename, file_bytes, mime_type)}
            resp = await client.post(doc_url, data=data, files=files)
            if resp.status_code == 200:
                logger.info("Prescription document %s dispatched to Telegram successfully", filename)
                return True
            else:
                logger.error("Failed to send prescription document to Telegram (HTTP %s): %s", resp.status_code, resp.text)
                return False
    except Exception as exc:
        logger.exception("Exception sending prescription to Telegram: %s", exc)
        return False

