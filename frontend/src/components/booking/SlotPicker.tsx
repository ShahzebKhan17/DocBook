'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AvailableSlotsData, DoctorDetail, DoctorLocation, TimeSlot } from '@/types';
import { formatLocalDate } from '@/lib/utils';
import { Calendar as CalendarIcon, Clock, MapPin, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SlotPickerProps {
  doctor: DoctorDetail;
  onSlotSelected: (location: DoctorLocation, date: string, slot: TimeSlot) => void;
}

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SlotPicker({ doctor, onSlotSelected }: SlotPickerProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<number>(
    doctor.locations.length > 0 ? doctor.locations[0].id : 0
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return formatLocalDate(new Date());
  });
  const [slotsData, setSlotsData] = useState<AvailableSlotsData | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Calculate day_of_week for selectedDate (0=Monday ... 6=Sunday)
  const currentDayOfWeek = (() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return (dateObj.getDay() + 6) % 7;
  })();

  const currentDayName = DAYS_FULL[currentDayOfWeek];

  // If doctor has multiple locations and current selection has no OPD on selectedDate,
  // automatically focus on the location that has OPD
  useEffect(() => {
    if (!doctor.locations || doctor.locations.length <= 1) return;
    const curLoc = doctor.locations.find((l) => l.id === selectedLocationId);
    const curHasOPD = curLoc?.availabilities?.some(
      (av) => av.is_active && av.day_of_week === currentDayOfWeek
    );
    if (!curHasOPD) {
      const activeLoc = doctor.locations.find((l) =>
        l.availabilities?.some((av) => av.is_active && av.day_of_week === currentDayOfWeek)
      );
      if (activeLoc) {
        setSelectedLocationId(activeLoc.id);
      }
    }
  }, [selectedDate, currentDayOfWeek, doctor.locations, selectedLocationId]);

  const selectedLocation = doctor.locations.find((l) => l.id === selectedLocationId) || doctor.locations[0];

  // Fetch slots whenever location or date changes
  useEffect(() => {
    if (!doctor.id || !selectedLocationId || !selectedDate) return;

    let isMounted = true;
    setLoadingSlots(true);
    setSelectedSlot(null);

    api
      .getSlots(doctor.id, selectedLocationId, selectedDate)
      .then((data) => {
        if (isMounted) {
          setSlotsData(data);
        }
      })
      .catch((err) => {
        console.error('Error fetching slots:', err);
        if (isMounted) setSlotsData(null);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [doctor.id, selectedLocationId, selectedDate]);

  // Generate next 10 dates for quick date picker pills
  const nextDates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = formatLocalDate(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    return { dateStr, dayName, monthName, dayNum };
  });

  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.is_available) return;
    setSelectedSlot(slot);
    if (selectedLocation) {
      onSlotSelected(selectedLocation, selectedDate, slot);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-brand-600" />
        Book Appointment Slot
      </h3>

      {/* 1. Location Selector with Green (Consulting) vs Red (No OPD) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            1. Select Consultation Location
          </label>
          {doctor.locations.length > 1 && (
            <span className="text-[11px] font-medium hidden sm:inline-flex items-center">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Green: OPD Available
              </span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Red: No OPD
              </span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {doctor.locations.map((loc) => {
            const isSelected = loc.id === selectedLocationId;
            const isConsultingToday = Boolean(
              loc.availabilities &&
              loc.availabilities.length > 0 &&
              loc.availabilities.some((av) => av.is_active && av.day_of_week === currentDayOfWeek)
            );

            const workingDaysSummary = loc.availabilities
              ? Array.from(
                  new Set(
                    loc.availabilities
                      .filter((av) => av.is_active)
                      .map((av) => DAYS_SHORT[av.day_of_week])
                  )
                ).join(', ')
              : '';

            return (
              <div
                key={loc.id}
                onClick={() => setSelectedLocationId(loc.id)}
                className={`cursor-pointer rounded-2xl p-4 border transition-all text-left relative flex flex-col justify-between ${
                  isConsultingToday
                    ? isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/25'
                      : 'border-emerald-200/90 bg-white hover:border-emerald-400 hover:bg-emerald-50/30'
                    : isSelected
                    ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-400/20 shadow-xs'
                    : 'border-rose-200/80 bg-rose-50/20 hover:border-rose-300 hover:bg-rose-50/35 opacity-90'
                }`}
              >
                <div>
                  {/* Header with clinic name, pin icon & Green / Red Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                          isConsultingToday
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{loc.clinic_name}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {loc.address}, {loc.locality}, {loc.city}
                        </p>
                        {loc.room_number && (
                          <span className="inline-block mt-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {loc.room_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Green / Red Pill Badge */}
                    <div className="shrink-0">
                      {isConsultingToday ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          OPD Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          No OPD Today
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer banner explaining the exact status & Google Maps link */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  {isConsultingToday ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Doctor consulting here on {currentDayName}
                    </span>
                  ) : (
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      {workingDaysSummary ? `Open on: ${workingDaysSummary}` : `No OPD on ${currentDayName}`}
                    </span>
                  )}

                  {loc.google_maps_url && (
                    <a
                      href={loc.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 ml-2 shrink-0"
                    >
                      Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Date Selector */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          2. Select Appointment Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {nextDates.map(({ dateStr, dayName, monthName, dayNum }) => {
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`shrink-0 flex flex-col items-center justify-center w-16 py-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-500/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className={`text-[11px] font-medium uppercase ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                  {dayName}
                </span>
                <span className="text-base font-bold my-0.5">{dayNum}</span>
                <span className={`text-[10px] font-medium ${isSelected ? 'text-brand-100' : 'text-slate-500'}`}>
                  {monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Available Time Slots Grid */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          3. Available Time Slots {slotsData ? `(${slotsData.day_name})` : ''}
        </label>

        {loadingSlots ? (
          <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            Checking doctor availability...
          </div>
        ) : !slotsData || !slotsData.is_working_day ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Doctor does not practice at this location on {slotsData?.day_name || 'the selected date'}. Please pick another date.</span>
          </div>
        ) : slotsData.slots.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm text-center">
            No appointment slots scheduled for this day.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {slotsData.slots.map((slot) => {
              const isSelected = selectedSlot?.time_raw === slot.time_raw;
              const isFull = slot.is_full || slot.message === 'No More Bookings Are Allowed for this Particular Time Slot';

              return (
                <button
                  key={slot.time_raw}
                  type="button"
                  disabled={!slot.is_available}
                  onClick={() => handleSlotClick(slot)}
                  className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between min-h-[72px] ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-600 ring-2 ring-brand-500/30 shadow-sm'
                      : slot.is_available
                      ? 'bg-white hover:bg-brand-50/60 text-slate-800 border-slate-200 hover:border-brand-400 hover:shadow-xs'
                      : isFull
                      ? 'bg-rose-50/70 border-rose-200 text-rose-800 cursor-not-allowed opacity-95'
                      : 'bg-slate-100/70 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-white' : isFull ? 'text-rose-900' : 'text-slate-800'}`}>
                      {slot.time_str}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    {isFull && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                  </div>
                  <div className="mt-1.5 text-[11px] leading-tight">
                    {isSelected ? (
                      <span className="text-brand-100 font-medium">Selected Slot</span>
                    ) : isFull ? (
                      <span className="text-rose-600 font-semibold">
                        No More Bookings Are Allowed for this Particular Time Slot
                      </span>
                    ) : slot.is_available ? (
                      <span className="text-emerald-600 font-medium">Available</span>
                    ) : (
                      <span className="text-slate-400">Time Passed</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
