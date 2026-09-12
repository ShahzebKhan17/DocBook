'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Appointment, DoctorDetail } from '@/types';
import AdminSidebar from '@/components/layout/AdminSidebar';
import {
  CalendarDays,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Stethoscope,
  User,
  Phone,
  MapPin,
  IndianRupee,
  Search,
} from 'lucide-react';

export default function AdminAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const filteredAppointments = appointments.filter((appt) => {
    // If a specific date is manually chosen in the date filter, let that filter take priority
    if (selectedDate) return true;

    if (activeTab === 'upcoming') {
      return appt.appointment_date >= todayStr;
    }
    if (activeTab === 'past') {
      return appt.appointment_date < todayStr;
    }
    return true;
  });

  const fetchAppointments = () => {
    setLoading(true);
    api
      .getAdminAppointments({
        doctor_id: selectedDoctorId ? Number(selectedDoctorId) : undefined,
        status: selectedStatus || undefined,
        date: selectedDate || undefined,
      })
      .then((data) => setAppointments(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/appointments');
        return;
      }
      api.getAdminDoctors().then((docs) => setDoctors(docs)).catch(() => {});
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAppointments();
    }
  }, [selectedDoctorId, selectedStatus, selectedDate, user]);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setUpdatingId(appointmentId);
    try {
      await api.updateAppointmentStatus(appointmentId, newStatus);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> Booked
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  if (authLoading || (loading && !appointments.length)) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading Appointments...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 pb-12">
      <AdminSidebar />

      <main className="flex-1 space-y-6 min-w-0">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-bold text-slate-900">Appointments Hub</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Filter by doctor, date, or status and manage appointment lifecycle
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Total: {appointments.length}
          </span>
        </div>

        {/* Filters Strip */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          {/* Quick Tabs: Upcoming & Today vs Past Appointments vs All */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-md">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                activeTab === 'upcoming'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming & Today
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                activeTab === 'past'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past / History
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Doctor Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filter by Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.specialization})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="BOOKED">Booked</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Specific Date Picker
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="absolute right-2 top-2 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-1.5 py-0.5 rounded"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Table / Cards */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Appointments Match Criteria</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'past'
                ? 'No past appointments found in history.'
                : 'Try checking the "Past / History" tab or resetting the filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appt) => (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow transition flex flex-col lg:flex-row justify-between gap-4"
              >
                {/* Left info: Patient & Doctor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-100">
                      {appt.id}
                    </span>
                    {getStatusBadge(appt.status)}
                    <span className="text-xs text-slate-400">
                      Booked on {new Date(appt.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Patient Details */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Patient Information
                      </span>
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" /> {appt.patient_name}
                      </p>
                      <p className="text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {appt.patient_mobile || 'Mobile not provided'}
                      </p>
                      {appt.patient_age_or_dob && (
                        <p className="text-slate-500">Age/DOB: {appt.patient_age_or_dob}</p>
                      )}
                    </div>

                    {/* Doctor Details */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Doctor & Consultation
                      </span>
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-brand-600" /> {appt.doctor_name}
                      </p>
                      <p className="text-brand-600 font-medium">{appt.doctor_specialization}</p>
                      <p className="text-slate-600 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{appt.clinic_name}, {appt.clinic_city}</span>
                      </p>
                    </div>
                  </div>

                  {/* Visit Timing */}
                  <div className="flex items-center gap-3 text-xs text-slate-700">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-semibold">
                      Date: {appt.appointment_date}
                    </span>
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-semibold">
                      Time: {appt.time_display}
                    </span>
                  </div>
                </div>

                {/* Right info: Fee snapshot & Status Control */}
                <div className="lg:border-l lg:border-slate-100 lg:pl-6 flex flex-row lg:flex-col justify-between lg:justify-center items-center lg:items-end gap-3 shrink-0">
                  <div className="lg:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Consultation Fee Snapshot
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      ₹{Number(appt.consultation_fee).toFixed(0)}
                    </span>
                  </div>

                  {/* Status Action Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 hidden lg:inline">Update Status:</label>
                    <select
                      disabled={updatingId === appt.id}
                      value={appt.status}
                      onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 transition"
                    >
                      <option value="BOOKED">BOOKED</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
