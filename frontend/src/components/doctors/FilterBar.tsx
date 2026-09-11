'use client';

import React from 'react';
import { Search, MapPin, Stethoscope, IndianRupee, X } from 'lucide-react';

interface FilterBarProps {
  search: string;
  setSearch: (val: string) => void;
  selectedSpecialization: string;
  setSelectedSpecialization: (val: string) => void;
  selectedCity: string;
  setSelectedCity: (val: string) => void;
  maxFee: string;
  setMaxFee: (val: string) => void;
  specializations: string[];
  cities: string[];
  resetFilters: () => void;
}

export default function FilterBar({
  search,
  setSearch,
  selectedSpecialization,
  setSelectedSpecialization,
  selectedCity,
  setSelectedCity,
  maxFee,
  setMaxFee,
  specializations,
  cities,
  resetFilters,
}: FilterBarProps) {
  const hasActiveFilters = search || selectedSpecialization || selectedCity || maxFee;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by doctor name or condition..."
          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns & Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Specialization */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Stethoscope className="w-4 h-4" />
          </div>
          <select
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Specializations</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        {/* City / Location */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <MapPin className="w-4 h-4" />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Cities / Localities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Max Fee */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <IndianRupee className="w-4 h-4" />
          </div>
          <select
            value={maxFee}
            onChange={(e) => setMaxFee(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Any Consultation Fee</option>
            <option value="500">Under ₹500</option>
            <option value="700">Under ₹700</option>
            <option value="1000">Under ₹1000</option>
          </select>
        </div>
      </div>

      {/* Reset filters */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Filtering active results</span>
          <button
            onClick={resetFilters}
            className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
