'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { DoctorCard as DoctorCardType } from '@/types';
import DoctorCard from '@/components/doctors/DoctorCard';
import FilterBar from '@/components/doctors/FilterBar';
import { Stethoscope } from 'lucide-react';

function DoctorsContent() {
  const searchParams = useSearchParams();

  const [doctors, setDoctors] = useState<DoctorCardType[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedSpecialization, setSelectedSpecialization] = useState(searchParams.get('specialization') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');
  const [maxFee, setMaxFee] = useState(searchParams.get('max_fee') || '');

  const [specializations, setSpecializations] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Load filter options (specializations, cities)
  useEffect(() => {
    Promise.all([api.getSpecializations(), api.getCities()])
      .then(([specs, cts]) => {
        setSpecializations(specs);
        setCities(cts);
      })
      .catch((err) => console.error('Error loading filter options:', err));
  }, []);

  // Fetch doctors whenever filters change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .listDoctors({
        search: search.trim() || undefined,
        specialization: selectedSpecialization || undefined,
        city: selectedCity || undefined,
        max_fee: maxFee ? Number(maxFee) : undefined,
      })
      .then((data) => {
        if (isMounted) setDoctors(data);
      })
      .catch((err) => console.error('Error fetching doctors:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, selectedSpecialization, selectedCity, maxFee]);

  const resetFilters = () => {
    setSearch('');
    setSelectedSpecialization('');
    setSelectedCity('');
    setMaxFee('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
          <Stethoscope className="w-7 h-7 text-brand-600" />
          Find & Book Doctors
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Browse top verified medical specialists and choose your preferred clinic location.
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        search={search}
        setSearch={setSearch}
        selectedSpecialization={selectedSpecialization}
        setSelectedSpecialization={setSelectedSpecialization}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        maxFee={maxFee}
        setMaxFee={setMaxFee}
        specializations={specializations}
        cities={cities}
        resetFilters={resetFilters}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
        <span>Showing {doctors.length} verified doctor{doctors.length === 1 ? '' : 's'}</span>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No doctors match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Try adjusting your search terms, removing filters, or searching for another specialty.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-slate-400">Loading Doctors...</div>}>
      <DoctorsContent />
    </Suspense>
  );
}
