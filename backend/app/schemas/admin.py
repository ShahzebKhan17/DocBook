from pydantic import BaseModel


class AdminStatsResponse(BaseModel):
    total_patients: int
    total_doctors: int
    today_appointments: int
    upcoming_appointments: int
    completed_appointments: int
    cancelled_appointments: int
