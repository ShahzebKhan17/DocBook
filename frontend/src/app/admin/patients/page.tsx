'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PatientDetail } from '@/types';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { Users, CheckCircle2, AlertCircle, Phone, MapPin, Droplet, HeartPulse } from 'lucide-react';

export default function AdminPatientsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [patients, setPatients] = useState<PatientDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/patients');
        return;
      }
      api
        .getAdminPatients()
        .then((data) => setPatients(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading Patients...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 pb-12">
      <AdminSidebar />

      <main className="flex-1 space-y-6 min-w-0">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-bold text-slate-900">Registered Patients</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete list of registered patient accounts and their health profiles
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
            Total: {patients.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((p) => {
            const prof = p.profile;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </div>
                  {p.email_verified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <AlertCircle className="w-3 h-3" /> Unverified
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div className="text-slate-600">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Mobile</span>
                    {prof?.mobile || 'N/A'}
                  </div>

                  <div className="text-slate-600">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Age / Gender</span>
                    {prof?.date_of_birth ? `${prof.date_of_birth} yrs` : 'N/A'} • {prof?.gender || 'N/A'}
                  </div>

                  <div className="text-slate-600">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Blood Group</span>
                    <span className="font-bold text-red-600">{prof?.blood_group || 'N/A'}</span>
                  </div>

                  <div className="text-slate-600">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Emergency Phone</span>
                    {prof?.emergency_contact || 'N/A'}
                  </div>
                </div>

                {prof?.address && (
                  <p className="text-xs text-slate-500 pt-1 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{prof.address}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
