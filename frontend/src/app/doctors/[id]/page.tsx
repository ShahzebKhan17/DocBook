'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { DoctorDetail, DoctorLocation, TimeSlot } from '@/types';
import SlotPicker from '@/components/booking/SlotPicker';
import BookingConfirmationModal from '@/components/booking/BookingConfirmationModal';
import {
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  ExternalLink,
  IndianRupee,
  GraduationCap,
  Globe,
  Award,
  ChevronLeft,
  CalendarCheck,
} from 'lucide-react';

function DoctorDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorId = Number(params.id);

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingLocation, setBookingLocation] = useState<DoctorLocation | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingSlot, setBookingSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    if (!doctorId) return;

    api
      .getDoctorDetail(doctorId)
      .then((data) => {
        setDoctor(data);
        // If query string has ?book=true, auto-scroll to booking section
        if (searchParams.get('book') === 'true') {
          setTimeout(() => {
            const el = document.getElementById('booking-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 400);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Doctor not found or unavailable');
      })
      .finally(() => setLoading(false));
  }, [doctorId, searchParams]);

  const handleSlotSelected = (location: DoctorLocation, date: string, slot: TimeSlot) => {
    setBookingLocation(location);
    setBookingDate(date);
    setBookingSlot(slot);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading doctor details...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Doctor Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'The requested doctor profile is not available.'}</p>
        <button
          onClick={() => router.push('/doctors')}
          className="px-5 py-2.5 bg-brand-600 text-white font-semibold rounded-xl text-sm"
        >
          Back to Doctors
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to listings
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Doctor Avatar */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            {doctor.profile_photo ? (
              <Image
                src={doctor.profile_photo}
                alt={doctor.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-700 font-bold text-4xl">
                {doctor.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {doctor.name}
              </h1>
              {doctor.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Doctor
                </span>
              )}
            </div>

            <p className="text-brand-600 font-bold text-base sm:text-lg mb-2">
              {doctor.specialization}
            </p>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 mb-4">
              <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{doctor.qualification}</span>
            </div>

            {/* Badges Row */}
            <div className="flex items-center gap-3 flex-wrap text-xs font-semibold">
              <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl">
                <Clock className="w-4 h-4 text-slate-500" />
                {doctor.experience_years} Years Experience
              </span>
              <span className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl border border-brand-100">
                <Users className="w-4 h-4 text-brand-600" />
                {doctor.consultations_display}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl">
                <Globe className="w-4 h-4 text-slate-500" />
                {doctor.languages}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Summary Strip */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Consultation Fee
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
              ₹{Number(doctor.consultation_fee).toFixed(0)}
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Follow-up Fee
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-700 mt-1 block">
              ₹{Number(doctor.follow_up_fee).toFixed(0)}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center">
            <a
              href="#booking-section"
              className="w-full py-4 text-center bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl text-sm shadow-md shadow-brand-500/20 transition flex items-center justify-center gap-2"
            >
              <CalendarCheck className="w-4 h-4" />
              Book Appointment
            </a>
          </div>
        </div>
      </div>

      {/* About Section */}
      {doctor.about && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            About Doctor
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {doctor.about}
          </p>
        </div>
      )}

      {/* Clinic Locations Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-600" />
          Clinic / Hospital Locations ({doctor.locations.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctor.locations.map((loc, idx) => (
            <div
              key={loc.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-100">
                    Location {idx + 1}
                  </span>
                  {loc.room_number && (
                    <span className="text-xs font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                      {loc.room_number}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {loc.clinic_name}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {loc.address}, {loc.locality}, {loc.city}, {loc.state} — {loc.pincode}
                </p>
              </div>

              {loc.google_maps_url && (
                <a
                  href={loc.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mt-2"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  View on Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Appointment Slot Booking Engine */}
      <div id="booking-section">
        <SlotPicker doctor={doctor} onSlotSelected={handleSlotSelected} />
      </div>

      {/* Booking Review & Confirmation Modal */}
      {isModalOpen && bookingLocation && bookingSlot && (
        <BookingConfirmationModal
          doctor={doctor}
          location={bookingLocation}
          date={bookingDate}
          slot={bookingSlot}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function DoctorDetailPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-slate-400">Loading Doctor Profile...</div>}>
      <DoctorDetailContent />
    </Suspense>
  );
}
