'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatLocalDate } from '@/lib/utils';
import { Appointment } from '@/types';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  User,
  Plus,
  Pill,
} from 'lucide-react';
import UploadPrescriptionModal from '@/components/prescriptions/UploadPrescriptionModal';

export default function PatientDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedApptForPrescription, setSelectedApptForPrescription] = useState<Appointment | null>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);

  const fetchAppointments = () => {
    setLoading(true);
    api
      .getPatientAppointments()
      .then((data) => setAppointments(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    if (user) {
      fetchAppointments();
      api.getPatientProfile().then((p) => setPatientProfile(p)).catch(() => {});
    }
  }, [user, authLoading]);

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setCancellingId(id);
    try {
      await api.cancelAppointment(id);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || (loading && !appointments.length)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading your dashboard...</p>
      </div>
    );
  }

  const todayStr = formatLocalDate(new Date());

  const upcomingAppointments = appointments.filter(
    (a) => a.appointment_date >= todayStr && a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
  );

  const pastAppointments = appointments.filter(
    (a) => a.appointment_date < todayStr || a.status === 'COMPLETED' || a.status === 'CANCELLED'
  );

  const displayedList = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
            <Clock className="w-3.5 h-3.5" /> Booked
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/60">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-100">
            Patient Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Hello, {user?.name || 'Patient'}!
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 mt-1">
            Track your scheduled in-clinic doctor consultations and health history.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/profile"
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl text-xs font-semibold border border-white/20 transition flex items-center gap-1.5"
          >
            <User className="w-4 h-4" /> Edit Profile
          </Link>
          <Link
            href="/doctors"
            className="px-4 py-2.5 bg-white text-brand-700 hover:bg-brand-50 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Book Doctor
          </Link>
        </div>
      </div>

      {/* Have Prescription Quick Action Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-brand-50 to-sky-50 border border-purple-100/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Need Medicines Delivered?</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Upload your doctor's prescription and our clinic pharmacy will process and dispatch your medicines.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedApptForPrescription(null);
            setIsPrescriptionModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition whitespace-nowrap text-center"
        >
          Upload Prescription
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === 'upcoming'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Upcoming Appointments ({upcomingAppointments.length})
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === 'past'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Past & Cancelled ({pastAppointments.length})
        </button>
      </div>

      {/* Appointments List */}
      {displayedList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {activeTab === 'upcoming' ? 'No Upcoming Appointments' : 'No Past Appointments'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            {activeTab === 'upcoming'
              ? 'You do not have any confirmed upcoming visits. Browse doctors to schedule an appointment.'
              : 'Your past appointment history will show up here.'}
          </p>
          <Link
            href="/doctors"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            Find a Doctor
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedList.map((appt) => {
            const formattedDate = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            const canCancel = appt.status === 'BOOKED' || appt.status === 'CONFIRMED';

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow transition flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {appt.id}
                    </span>
                    {getStatusBadge(appt.status)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-brand-600" />
                      {appt.doctor_name}
                    </h3>
                    <p className="text-xs text-brand-600 font-semibold">{appt.doctor_specialization}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formattedDate}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {appt.time_display}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">{appt.clinic_name}</strong> — {appt.clinic_address},{' '}
                      {appt.clinic_city}
                    </span>
                  </div>
                </div>

                <div className="sm:border-l sm:border-slate-100 sm:pl-5 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 shrink-0">
                  <div className="sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Consultation Fee
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      ₹{Number(appt.consultation_fee).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-col sm:items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApptForPrescription(appt);
                        setIsPrescriptionModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-lg transition whitespace-nowrap"
                      title="Upload doctor prescription for medicine delivery"
                    >
                      <Pill className="w-3.5 h-3.5 text-purple-600" />
                      <span>Order Medicines</span>
                    </button>

                    {canCancel && (
                      <button
                        onClick={() => handleCancelAppointment(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition whitespace-nowrap"
                      >
                        {cancellingId === appt.id ? 'Cancelling...' : 'Cancel Visit'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prescription Upload Modal */}
      <UploadPrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => {
          setIsPrescriptionModalOpen(false);
          setSelectedApptForPrescription(null);
        }}
        appointment={selectedApptForPrescription}
        defaultMobile={patientProfile?.mobile || ''}
        defaultAddress={
          patientProfile?.address
            ? `${patientProfile.address}${patientProfile.city ? `, ${patientProfile.city}` : ''}${patientProfile.pincode ? ` - ${patientProfile.pincode}` : ''}`
            : ''
        }
      />
    </div>
  );
}
