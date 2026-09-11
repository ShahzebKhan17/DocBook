# 🏥 DocBook — Modern Doctor Appointment Booking PWA

A mobile-first, production-ready **Doctor Appointment Booking Progressive Web Application (PWA)** built with **FastAPI**, **PostgreSQL / SQLite**, and **Next.js (App Router, TypeScript, Tailwind CSS)**.

DocBook provides a seamless, transparent experience for patients to discover doctors, explore clinic locations, inspect real-time available time slots, and book appointments, with instant **Telegram Bot notifications** to the Admin and **Brevo email verification**.

---

## 🌟 Core Features

### 👤 Patient Experience
- **Mobile-First PWA:** Installable as a native app on Android, iOS, and Desktop with offline caching, custom app icons, and responsive bottom navigation.
- **Registration & Email Verification:** Secure registration with Brevo verification link dispatch (with console fallback for local development).
- **Patient Profile Management:** Complete health profile (Age/Date of Birth, Gender, Mobile, Residential Address, Blood Group, Allergies, Emergency Contact).
- **Doctor Discovery & Filters:** Filter by doctor name, specialization (Cardiology, Pediatrics, Dermatology, Orthopedics, Gynecology), city (e.g. Ayodhya, Lucknow), and consultation fee (e.g. Under ₹500).
- **Comprehensive Doctor Profiles:** Qualifications, years of experience, dynamically calculated consultations count, multiple clinic locations with Google Maps links, consultation & follow-up fees, and availability schedules.
- **Real-Time Slot Engine:** Instant day-of-week availability slot generation (e.g. 10:00 AM – 1:00 PM, 5:00 PM – 8:00 PM with 30-min duration) with backend double-booking prevention.
- **Appointment Review & Confirmation:** Transparent summary before booking showing Doctor, Clinic, Date, Time, Consultation Fee, and Patient details.
- **Patient Dashboard:** View upcoming and past visits with live status badges (`BOOKED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`) and cancellation capabilities.

### 🛡️ Admin Control Center
- **Overview Dashboard:** Live counters for Total Patients, Total Doctors, Today's Appointments, Upcoming Visits, Completed, and Cancelled appointments.
- **Doctor Management:** Onboard doctors (basic info, profile photo, gender, bio, specialization, qualification, experience).
- **Dynamic Fee Management:** Set and adjust consultation & follow-up fees anytime (with guaranteed fee snapshot immutability for past bookings).
- **Multi-Location Management:** Manage clinic/hospital addresses, localities, cities, states, pin codes, room/OPD numbers, and Google Maps links.
- **Availability Scheduler:** Configure working days (Monday–Sunday), shift timings, and slot duration per clinic location.
- **Appointment Lifecycle Hub:** Filter appointments by doctor, date, or status; inspect patient contact info; update status (`CONFIRMED`, `COMPLETED`, `CANCELLED`).
- **Instant Telegram Bot Notifications:** Dispatches formatted Telegram message to Admin whenever a new appointment is booked.
- **Patients Directory:** View all registered patients with verified email badges and contact details.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **PWA** | Web App Manifest (`manifest.json`), Service Worker (`sw.js`), Mobile Meta |
| **Backend** | FastAPI, Python 3.13, Uvicorn, Pydantic v2 |
| **Database** | PostgreSQL (Render/Prod) / SQLite (Local dev), SQLAlchemy 2.0, Alembic |
| **Authentication** | JWT (python-jose), bcrypt password hashing, Role-Based Access Control |
| **Email Verification** | Brevo REST API v3 (with dev console fallback) |
| **Admin Notifications** | Telegram Bot API (`sendMessage` with HTML formatting) |

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

1. Open terminal and navigate to the project directory:
   ```bash
   cd DocBook
   ```

2. Activate the Python virtual environment:
   ```bash
   # Windows PowerShell:
   backend\venv\Scripts\Activate.ps1
   # Or Unix/macOS:
   source backend/venv/bin/activate
   ```

3. Run the database seed script to populate initial Admin, demo patient, and realistic doctors/schedules:
   ```bash
   python -m backend.app.seed
   ```

4. Start the FastAPI backend server:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```
   - API Root: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`

### 2. Frontend Setup

1. In another terminal, navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   - Frontend Application: `http://localhost:3000`

---

## 🧪 Running Automated Tests

A comprehensive end-to-end test suite is included in `backend/tests/test_backend.py`.

Run the test suite:
```bash
backend\venv\Scripts\python.exe backend/tests/test_backend.py
```

### Verified Test Cases:
1. **Health Check & Root Endpoints**
2. **Doctor Search & Multi-Criteria Filters** (specialization, city, consultation fee)
3. **Patient Registration & Email Verification Token Flow**
4. **Role-Based Authorization** (normal patients receiving HTTP 403 on admin routes)
5. **Slot Generation Engine** (accurate date, day-of-week, duration slicing)
6. **Appointment Booking & Fee Snapshot**
7. **Double-Booking Prevention** (atomic DB validation returning HTTP 409 Conflict)
8. **Consultation Fee Immutability** (doctor fee update preserves historical appointment fee)
9. **Admin Lifecycle** (`BOOKED` -> `CONFIRMED` -> `COMPLETED`)

---

## 🔑 Default Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@docbook.com` | `Admin@123` | Full control over doctors, clinics, schedules, and bookings |
| **Patient** | `rahul.sharma@example.com` | `Patient@123` | Verified demo patient with upcoming appointment |

*(Both accounts are also pre-configured with 1-click autofill buttons on the `/login` page)*

---

## ⚙️ Environment Variables

Configure `backend/.env`:
```env
PROJECT_NAME="DocBook API"
VERSION="1.0.0"

# Database Configuration
DATABASE_URL="sqlite:///./docbook.db"
# For PostgreSQL on Render / Production:
# DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Security
SECRET_KEY="your-secret-key"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Brevo Email API (Optional for dev, verification links print to console if empty)
BREVO_API_KEY=""
BREVO_SENDER_EMAIL="noreply@docbook.app"
BREVO_SENDER_NAME="DocBook Healthcare"

# Telegram Admin Notification (Optional for dev, notifications log to console/DB if empty)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_ADMIN_CHAT_ID=""
```

---

## 📱 Telegram Notification Format

When a patient books an appointment, the Admin receives:

```
🔔 NEW APPOINTMENT

Patient:
Rahul Sharma

Age:
28

Mobile:
98XXXXXXXX

Doctor:
Dr. Amit Kumar

Specialization:
Cardiologist

Date:
15 September 2026

Time:
11:30 AM

Location:
Sharma Clinic

Consultation Fee:
₹500

Appointment ID:
APT-1024
```

---

## 🚢 Production Deployment

### Frontend (Vercel)
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `.next`
- Environment Variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1`

### Backend (Render)
- Environment: Python 3
- Build Command: `pip install -r backend/requirements.txt`
- Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- Database: Attach Render Managed PostgreSQL and set `DATABASE_URL`
