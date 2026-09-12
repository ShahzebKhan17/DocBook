# 🏥 DocBook — Modern Doctor Appointment Booking PWA

A mobile-first, production-ready **Doctor Appointment Booking Progressive Web Application (PWA)** built with **FastAPI**, **PostgreSQL / SQLite**, and **Next.js 14 (App Router, TypeScript, Tailwind CSS)**.

DocBook provides a seamless, transparent experience for patients to discover doctors, explore clinic locations, inspect real-time available time slots, and book appointments, with instant **Telegram Bot notifications** to the Admin and **Brevo email verification**.

---

## 🌟 Key Features & Architecture

### 👤 Patient Experience
- **Mobile-First PWA:** Installable as a native app on Android, iOS, and Desktop with offline caching, custom app icons, and responsive bottom navigation.
- **Smart Multi-Location Availability (Green / Red Indicators):**
  - For doctors consulting at multiple clinics/hospitals, each clinic card dynamically indicates its status for the selected appointment date:
    - 🟢 **Green (`OPD Available`):** Doctor is actively consulting at this clinic on the chosen date.
    - 🔴 **Red (`No OPD Today`):** Doctor is not consulting here on this date; displays alternate days when this clinic is open.
  - **Smart Auto-Focus:** Automatically focuses the patient on an active clinic when selecting a date.
- **Hourly 40-Bookings Capacity System:**
  - Schedules automatically partition into standard 1-hour slots (e.g., `10:00 AM - 11:00 AM`).
  - Strict 40 bookings/hour maximum per slot (e.g., 3-hour OPD shift allows $3 \times 40 = 120$ appointments).
  - **Privacy-First Frontend:** Never leaks or exposes remaining booking counts. Once 40 bookings are reached, the slot is disabled with the exact message: *"No More Bookings Are Allowed for this Particular Time Slot"*.
- **Timezone-Safe Date Selector:** Local date parsing ensures that date pills and server queries match 1-to-1 without UTC day-shift offsets.
- **Doctor Discovery & Filters:** Filter by doctor name, specialization (Cardiology, Pediatrics, Dermatology, Orthopedics, Gynecology), city (e.g. Ayodhya, Lucknow), and consultation fee (e.g. Under ₹500).
- **Comprehensive Doctor Profiles:** Qualifications, experience, verified badges, dynamically calculated completed consultations count, clinic addresses with Google Maps navigation links, and consultation/follow-up fees.
- **Authentication Guard:** Logged-in users visiting `/login` or `/register` are automatically redirected to `/dashboard` or `/admin` without re-entering credentials.
- **Patient Dashboard:** Manage upcoming and completed appointments with live status badges (`BOOKED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`) and cancellation capabilities.

### 🛡️ Admin Control Center
- **Live Statistics Overview:** Total Patients, Total Doctors, Today's Appointments, Upcoming Visits, Completed, and Cancelled appointments.
- **Doctor Management:** Onboard doctors (basic info, profile photo, gender, bio, specialization, qualification, experience).
- **Dynamic Fee Management:** Set and adjust consultation & follow-up fees anytime (historical bookings maintain guaranteed fee immutability).
- **Multi-Location Management:** Manage multiple clinics/hospitals per doctor (clinic name, address, room/OPD number, Google Maps link). Safe deactivation preserves past booking history.
- **Automated Hourly Schedules:** Set working days and start/end times. Slot duration is automatically handled as 1-hour slots with 40-patient capacity.
- **Appointment Lifecycle Management:** Filter appointments by doctor, date, or status; update status (`CONFIRMED`, `COMPLETED`, `CANCELLED`). Marking as `COMPLETED` automatically increments the doctor's consultation counter.
- **Instant Telegram Bot Alerts:** Dispatches formatted alerts to the Admin Telegram group/chat whenever an appointment is booked or cancelled.
- **Patients Directory:** View all registered patients with verification status and contact details.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **PWA** | Web App Manifest (`manifest.json`), Service Worker (`sw.js`), Mobile Meta |
| **Backend** | FastAPI, Python 3.12 / 3.13, Uvicorn, Pydantic v2 |
| **Database** | PostgreSQL (Render/Prod) / SQLite (Local dev), SQLAlchemy 2.0 |
| **Authentication** | JWT (python-jose), bcrypt password hashing, Role-Based Access Control |
| **Email Verification** | Brevo REST API v3 (with dev console fallback) |
| **Admin Notifications** | Telegram Bot API (`sendMessage` with HTML formatting) |

---

## 🚀 Local Development Setup

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

3. (Optional) Run database seed script to populate initial Admin and realistic doctors:
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

## ⚙️ Environment Variables

### Backend (`backend/.env` or Render Dashboard)
```env
PROJECT_NAME="DocBook API"
VERSION="1.0.0"

# Database Configuration
# Local SQLite default:
DATABASE_URL="sqlite:///./docbook.db"
# Or PostgreSQL for Render / Production:
# DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Security
SECRET_KEY="your-secret-key"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Brevo Email API (Optional for dev; OTP codes log to console if left empty)
BREVO_API_KEY=""
BREVO_SENDER_EMAIL="noreply@docbook.app"
BREVO_SENDER_NAME="DocBook Healthcare"

# Telegram Admin Notification (Set your Bot token & Admin chat ID)
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_ADMIN_CHAT_ID="your_chat_id"
```

### Frontend (`frontend/.env.local` or Vercel Dashboard)
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
```
*(Defaults automatically to `http://localhost:8000/api/v1` in local development).*

---

## 📱 Telegram Notification Format

When a patient books an appointment, the Admin Telegram group receives:

```
🔔 NEW APPOINTMENT

Patient:
Mohammad Khan

Age:
26

Mobile:
98XXXXXXXX

Doctor:
Dr. Atul Verma

Specialization:
Orthopedics

Date:
12 September 2026

Time:
10:00 AM - 11:00 AM

Location:
Deva Hospital

Consultation Fee:
₹500

Appointment ID:
APT-1024
```

---

## 🚢 Production Deployment

### Frontend (Vercel)
- **Framework:** Next.js
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com/api/v1`

### Backend (Render)
- **Environment:** Python 3
- **Build Command:** `pip install -r backend/requirements.txt`
- **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:** Set `DATABASE_URL`, `SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, and `BREVO_API_KEY`.
