import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DoctorCard as DoctorCardType } from '@/types';
import { CheckCircle2, MapPin, Users, Award, Clock } from 'lucide-react';

interface DoctorCardProps {
  doctor: DoctorCardType;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  const primaryLoc = doctor.primary_location;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Header with Photo & Basic Info */}
        <div className="flex items-start gap-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
            {doctor.profile_photo ? (
              <Image
                src={doctor.profile_photo}
                alt={doctor.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 80px, 96px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-700 font-bold text-2xl">
                {doctor.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-slate-900 text-lg sm:text-xl truncate">
                {doctor.name}
              </h3>
              {doctor.is_verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Doctor
                </span>
              )}
            </div>

            <p className="text-brand-600 font-semibold text-sm mt-0.5">
              {doctor.specialization}
            </p>

            <p className="text-slate-500 text-xs mt-1 truncate">
              {doctor.qualification}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {doctor.experience_years} Years Exp.
              </span>
              <span className="flex items-center gap-1 text-brand-700 font-medium bg-brand-50 px-2 py-0.5 rounded-md">
                <Users className="w-3.5 h-3.5 text-brand-600" />
                {doctor.consultations_display}
              </span>
            </div>
          </div>
        </div>

        {/* Location & Fee Details */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {primaryLoc && (
            <div className="flex items-start gap-1.5 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">
                  {primaryLoc.clinic_name}
                </span>
                <span className="text-slate-500 truncate block">
                  {primaryLoc.locality}, {primaryLoc.city}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:items-end justify-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
              Consultation Fee
            </span>
            <span className="text-lg font-bold text-slate-900">
              ₹{Number(doctor.consultation_fee).toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Link
          href={`/doctors/${doctor.id}`}
          className="w-full text-center py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
        >
          View Profile
        </Link>
        <Link
          href={`/doctors/${doctor.id}?book=true`}
          className="w-full text-center py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm shadow-brand-500/20 transition"
        >
          Book Appointment
        </Link>
      </div>
    </div>
  );
}
