'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DoctorCard as DoctorCardType } from '@/types';
import DoctorCard from '@/components/doctors/DoctorCard';
import { Search, Stethoscope, ShieldCheck, Heart, Baby, Bone, Activity, Sparkles, ArrowRight } from 'lucide-react';

const specialties = [
  { name: 'Cardiologist', icon: Heart, color: 'bg-rose-50 text-rose-600 border-rose-100' },
  { name: 'Pediatrician', icon: Baby, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { name: 'Dermatologist', icon: Sparkles, color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { name: 'Orthopedic Surgeon', icon: Bone, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { name: 'Gynecologist', icon: Activity, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function HomePage() {
  const [doctors, setDoctors] = useState<DoctorCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api
      .listDoctors()
      .then((data) => setDoctors(data.slice(0, 4)))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 pb-8">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-sky-800 text-white p-6 sm:p-10 shadow-xl overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-brand-100 mb-4 border border-white/20">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            Verified Doctors • Instant Appointments
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Find Top Doctors & Book In-Clinic Visits.
          </h1>

          <p className="text-sm sm:text-base text-brand-100 mb-8 leading-relaxed">
            Search verified specialists, explore clinic locations, transparent fees, and book guaranteed appointment slots seamlessly.
          </p>

          {/* Quick Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/doctors?search=${encodeURIComponent(searchQuery.trim())}`;
              } else {
                window.location.href = '/doctors';
              }
            }}
            className="bg-white p-2 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center gap-2"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Doctor name, specialty (e.g. Cardiologist)..."
                className="w-full pl-11 pr-4 py-3 text-slate-800 text-sm focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition shadow-sm"
            >
              Search Doctors
            </button>
          </form>
        </div>
      </section>

      {/* Specialties Browse */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Explore by Specialization</h2>
          <Link href="/doctors" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {specialties.map((spec) => {
            const Icon = spec.icon;
            return (
              <Link
                key={spec.name}
                href={`/doctors?specialization=${encodeURIComponent(spec.name)}`}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center text-center hover:shadow-md hover:border-brand-300 transition group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 border ${spec.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                  {spec.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Top Doctors Listing */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Featured Specialists</h2>
            <p className="text-xs text-slate-500 mt-0.5">Top-rated doctors with confirmed clinic availability</p>
          </div>
          <Link
            href="/doctors"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Browse All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Specialists Listed Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Real-time clinic schedules and consultation slots will appear here once doctors are onboarded by clinic management.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
