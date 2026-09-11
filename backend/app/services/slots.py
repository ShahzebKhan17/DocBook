from datetime import date, datetime, time, timedelta
from typing import List, Set
from sqlalchemy.orm import Session
from backend.app.models.appointment import Appointment, AppointmentStatus
from backend.app.models.doctor import DoctorAvailability
from backend.app.schemas.appointment import AvailableSlotsResponse, TimeSlot

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def format_time_display(t: time) -> str:
    hour = t.hour
    minute = t.minute
    am_pm = "AM" if hour < 12 else "PM"
    display_hour = hour % 12
    if display_hour == 0:
        display_hour = 12
    return f"{display_hour}:{minute:02d} {am_pm}"


def generate_available_slots(
    db: Session,
    doctor_id: int,
    doctor_location_id: int,
    target_date: date,
) -> AvailableSlotsResponse:
    day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
    day_name = DAYS[day_of_week]

    # Query active availability windows for this doctor location on this day
    availabilities = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_location_id == doctor_location_id,
            DoctorAvailability.day_of_week == day_of_week,
            DoctorAvailability.is_active == True,
        )
        .all()
    )

    if not availabilities:
        return AvailableSlotsResponse(
            doctor_id=doctor_id,
            doctor_location_id=doctor_location_id,
            date=target_date,
            day_name=day_name,
            is_working_day=False,
            slots=[],
        )

    # Query already booked appointments for this doctor + location + date
    booked_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.doctor_location_id == doctor_location_id,
            Appointment.appointment_date == target_date,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .all()
    )

    booked_times: Set[str] = {appt.appointment_time.strftime("%H:%M:%S") for appt in booked_appointments}

    now = datetime.now()
    is_today = target_date == date.today()
    current_time_str = now.strftime("%H:%M:%S")

    slots: List[TimeSlot] = []
    seen_times: Set[str] = set()

    # Sort availabilities by start_time
    sorted_availabilities = sorted(availabilities, key=lambda a: a.start_time)

    for avail in sorted_availabilities:
        start_dt = datetime.combine(target_date, avail.start_time)
        end_dt = datetime.combine(target_date, avail.end_time)
        step = timedelta(hours=1)

        curr_dt = start_dt
        while curr_dt + step <= end_dt:
            slot_start_t = curr_dt.time()
            slot_end_t = (curr_dt + step).time()
            time_raw = slot_start_t.strftime("%H:%M:%S")

            if time_raw not in seen_times:
                seen_times.add(time_raw)
                time_str = f"{format_time_display(slot_start_t)} - {format_time_display(slot_end_t)}"

                # Count active bookings in this 1-hour slot
                slot_bookings_count = sum(
                    1 for appt in booked_appointments
                    if slot_start_t <= appt.appointment_time < slot_end_t
                )

                # Each 1-hour slot allows up to 40 bookings
                is_full = slot_bookings_count >= 40

                # If date is today and time has passed, it cannot be booked
                is_past = is_today and (time_raw <= current_time_str)

                is_available = (not is_full) and (not is_past)

                message = None
                if is_full:
                    message = "No More Bookings Are Allowed for this Particular Time Slot"
                elif is_past:
                    message = "Time slot has passed"

                slots.append(
                    TimeSlot(
                        time_str=time_str,
                        time_raw=time_raw,
                        is_available=is_available,
                        is_full=is_full,
                        message=message,
                    )
                )

            curr_dt += step

    return AvailableSlotsResponse(
        doctor_id=doctor_id,
        doctor_location_id=doctor_location_id,
        date=target_date,
        day_name=day_name,
        is_working_day=True,
        slots=slots,
    )
