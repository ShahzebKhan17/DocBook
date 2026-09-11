export type UserRole = 'PATIENT' | 'ADMIN';

export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
}

export interface PatientProfile {
  id: number;
  user_id: number;
  date_of_birth?: string | null;
  gender?: string | null;
  mobile?: string | null;
  address?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientDetail {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  profile?: PatientProfile | null;
  created_at: string;
}

export interface DoctorAvailability {
  id: number;
  doctor_location_id: number;
  day_of_week: number; // 0=Mon, 6=Sun
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorLocation {
  id: number;
  doctor_id: number;
  clinic_name: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  google_maps_url?: string | null;
  room_number?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  availabilities?: DoctorAvailability[];
}

export interface DoctorCard {
  id: number;
  name: string;
  profile_photo?: string | null;
  gender?: string | null;
  specialization: string;
  qualification: string;
  experience_years: number;
  about?: string | null;
  consultation_fee: number | string;
  follow_up_fee: number | string;
  languages: string;
  is_verified: boolean;
  is_active: boolean;
  consultations_count: number;
  consultations_display: string;
  primary_location?: DoctorLocation | null;
  created_at: string;
}

export interface DoctorDetail extends DoctorCard {
  locations: DoctorLocation[];
  updated_at: string;
}

export interface TimeSlot {
  time_str: string; // e.g. "10:00 AM - 11:00 AM"
  time_raw: string; // e.g. "10:00:00"
  is_available: boolean;
  is_full?: boolean;
  message?: string | null;
}

export interface AvailableSlotsData {
  doctor_id: number;
  doctor_location_id: number;
  date: string;
  day_name: string;
  is_working_day: boolean;
  slots: TimeSlot[];
}

export interface Appointment {
  id: string;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  patient_mobile?: string | null;
  patient_age_or_dob?: string | null;
  doctor_id: number;
  doctor_name: string;
  doctor_specialization: string;
  doctor_location_id: number;
  clinic_name: string;
  clinic_address: string;
  clinic_city: string;
  google_maps_url?: string | null;
  appointment_date: string;
  appointment_time: string;
  time_display: string;
  consultation_fee: number | string;
  status: AppointmentStatus;
  notes?: string | null;
  created_at: string;
}

export interface AdminStats {
  total_patients: number;
  total_doctors: number;
  today_appointments: number;
  upcoming_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
}
