'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AdminStats, Appointment } from '@/types';
import AdminSidebar from '@/components/layout/AdminSidebar';
import {
  Users,
  Stethoscope,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Shield,
  Clock,
  MapPin,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'ADMIN') {
        router.push('/login?redirect=/admin');
        return;
      }

      Promise.all([api.getAdminStats(), api.getAdminAppointments()])
        .then(([statsData, apptsData]) => {
          setStats(statsData);
          setRecentAppointments(apptsData.slice(0, 5));
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 pb-12">
      <AdminSidebar />

      <main className="flex-1 space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Logged in as <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.email}) • Full Administrative Authority
            </p>
          </div>

          <Link
            href="/admin/doctors?action=add"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/20 transition"
          >
            <Plus className="w-4 h-4" /> Add New Doctor
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Patients
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats?.total_patients ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Doctors
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats?.total_doctors ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Today&apos;s Appointments
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats?.today_appointments ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Upcoming Visits
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats?.upcoming_appointments ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Completed
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats?.completed_appointments ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Cancelled
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats?.cancelled_appointments ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Appointments Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Appointments</h2>
            <Link
              href="/admin/appointments"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentAppointments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No appointments booked yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAppointments.map((appt) => (
                <div key={appt.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-600">{appt.id}</span>
                      <span className="font-semibold text-slate-900">{appt.patient_name}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      with <strong className="text-slate-700">{appt.doctor_name}</strong> • {appt.appointment_date} at {appt.time_display}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">₹{Number(appt.consultation_fee).toFixed(0)}</span>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">{appt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
