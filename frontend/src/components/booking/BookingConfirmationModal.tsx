'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Appointment, DoctorDetail, DoctorLocation, TimeSlot } from '@/types';
import { CheckCircle2, AlertCircle, X, Calendar, Clock, MapPin, IndianRupee, User, Stethoscope } from 'lucide-react';

interface BookingConfirmationModalProps {
  doctor: DoctorDetail;
  location: DoctorLocation;
  date: string;
  slot: TimeSlot;
  onClose: () => void;
}

export default function BookingConfirmationModal({
  doctor,
  location,
  date,
  slot,
  onClose,
}: BookingConfirmationModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleConfirm = async () => {
    if (!user) {
      router.push(`/login?redirect=/doctors/${doctor.id}`);
      return;
    }

    if (!user.email_verified) {
      setError('Please verify your email address to book an appointment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data = await api.bookAppointment({
        doctor_id: doctor.id,
        doctor_location_id: location.id,
        appointment_date: date,
        appointment_time: slot.time_raw,
      });
      setConfirmedAppointment(data);
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        {!confirmedAppointment && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {confirmedAppointment ? (
          /* Success Screen */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Booking Confirmed
            </span>

            <h3 className="text-2xl font-bold text-slate-900 mt-3 mb-1">
              Appointment Booked!
            </h3>

            <p className="text-sm text-slate-500 mb-6">
              Appointment ID: <strong className="text-slate-900 font-mono text-base">{confirmedAppointment.id}</strong>
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2.5 mb-6 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-bold text-slate-800">{doctor.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="font-bold text-slate-800">{formattedDate}, {slot.time_str}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="font-bold text-slate-800">{location.clinic_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consultation Fee:</span>
                <span className="font-bold text-emerald-700">₹{Number(doctor.consultation_fee).toFixed(0)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md shadow-brand-500/20 text-sm transition"
              >
                Go to My Appointments
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation Review Summary */
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Review Appointment
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Please verify your appointment details before confirming.
            </p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 space-y-3.5 text-sm mb-6">
              {/* Doctor */}
              <div className="flex items-start gap-2.5">
                <Stethoscope className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium uppercase">Doctor</span>
                  <span className="font-bold text-slate-900">{doctor.name}</span>
                  <span className="text-xs text-brand-600 block">{doctor.specialization}</span>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60">
                <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium uppercase">Location</span>
                  <span className="font-bold text-slate-900">{location.clinic_name}</span>
                  <span className="text-xs text-slate-500 block">{location.address}, {location.city}</span>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium uppercase">Date</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{formattedDate}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium uppercase">Time</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{slot.time_str}</span>
                  </div>
                </div>
              </div>

              {/* Fee */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-slate-600 text-xs">Consultation Fee</span>
                </div>
                <span className="font-bold text-lg text-slate-900">
                  ₹{Number(doctor.consultation_fee).toFixed(0)}
                </span>
              </div>

              {/* Patient */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-600 text-xs">Patient</span>
                </div>
                <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                  {user ? user.name : 'Sign In Required'}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-brand-500/20 text-sm transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirming Booking...
                </>
              ) : (
                'Confirm Appointment'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
