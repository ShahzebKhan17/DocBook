'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DoctorPhotoPicker from '@/components/admin/DoctorPhotoPicker';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DoctorDetail } from '@/types';
import AdminSidebar from '@/components/layout/AdminSidebar';
import {
  Stethoscope,
  Plus,
  Edit2,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Calendar,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';

const DAYS_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function AdminDoctorsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [doctors, setDoctors] = useState<DoctorDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Doctor Form Modal (Add / Edit)
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorDetail | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [gender, setGender] = useState('Male');
  const [specialization, setSpecialization] = useState('Cardiologist');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState(10);
  const [about, setAbout] = useState('');
  const [consultationFee, setConsultationFee] = useState(500);
  const [followUpFee, setFollowUpFee] = useState(300);
  const [languages, setLanguages] = useState('English, Hindi');
  const [submittingDoctor, setSubmittingDoctor] = useState(false);

  // Location Modal
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [activeDoctorForLocation, setActiveDoctorForLocation] = useState<DoctorDetail | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicLocality, setClinicLocality] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicState, setClinicState] = useState('');
  const [clinicPincode, setClinicPincode] = useState('');
  const [clinicMapsUrl, setClinicMapsUrl] = useState('');
  const [clinicRoom, setClinicRoom] = useState('');

  // Availability Modal
  const [isAvailModalOpen, setIsAvailModalOpen] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);
  const [availDate, setAvailDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [availDay, setAvailDay] = useState<number>(0);
  const [availStartTime, setAvailStartTime] = useState('10:00');
  const [availEndTime, setAvailEndTime] = useState('13:00');

  const fetchDoctors = () => {
    setLoading(true);
    api
      .getAdminDoctors()
      .then((data) => setDoctors(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/doctors');
        return;
      }
      fetchDoctors();
      if (searchParams.get('action') === 'add') {
        openAddDoctorModal();
      }
    }
  }, [user, authLoading]);

  const openAddDoctorModal = () => {
    setEditingDoctor(null);
    setName('');
    setProfilePhoto('https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400');
    setGender('Male');
    setSpecialization('Cardiologist');
    setQualification('MBBS, MD');
    setExperienceYears(10);
    setAbout('');
    setConsultationFee(500);
    setFollowUpFee(300);
    setLanguages('English, Hindi');
    setIsDoctorModalOpen(true);
  };

  const openEditDoctorModal = (doc: DoctorDetail) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setProfilePhoto(doc.profile_photo || '');
    setGender(doc.gender || 'Male');
    setSpecialization(doc.specialization);
    setQualification(doc.qualification);
    setExperienceYears(doc.experience_years);
    setAbout(doc.about || '');
    setConsultationFee(Number(doc.consultation_fee));
    setFollowUpFee(Number(doc.follow_up_fee));
    setLanguages(doc.languages);
    setIsDoctorModalOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDoctor(true);

    const payload = {
      name,
      profile_photo: profilePhoto || null,
      gender,
      specialization,
      qualification,
      experience_years: Number(experienceYears),
      about: about || null,
      consultation_fee: Number(consultationFee),
      follow_up_fee: Number(followUpFee),
      languages,
      is_verified: true,
      is_active: true,
    };

    try {
      if (editingDoctor) {
        await api.updateDoctor(editingDoctor.id, payload);
      } else {
        await api.createDoctor(payload);
      }
      setIsDoctorModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Error saving doctor');
    } finally {
      setSubmittingDoctor(false);
    }
  };

  const handleToggleDoctorStatus = async (doc: DoctorDetail) => {
    try {
      await api.updateDoctor(doc.id, { is_active: !doc.is_active });
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Error updating doctor status');
    }
  };

  // Location Handlers
  const openAddLocationModal = (doc: DoctorDetail) => {
    setActiveDoctorForLocation(doc);
    setClinicName('');
    setClinicAddress('');
    setClinicLocality('');
    setClinicCity('Ayodhya');
    setClinicState('Uttar Pradesh');
    setClinicPincode('224001');
    setClinicMapsUrl('');
    setClinicRoom('');
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctorForLocation) return;

    try {
      await api.addDoctorLocation(activeDoctorForLocation.id, {
        clinic_name: clinicName,
        address: clinicAddress,
        locality: clinicLocality,
        city: clinicCity,
        state: clinicState,
        pincode: clinicPincode,
        google_maps_url: clinicMapsUrl || null,
        room_number: clinicRoom || null,
        is_active: true,
      });
      setIsLocationModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to save location');
    }
  };

  // Availability Handlers
  const openAvailabilityModal = (locationId: number) => {
    setActiveLocationId(locationId);
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setAvailDate(formatted);
    // (dateObj.getDay() + 6) % 7 -> Monday=0 ... Sunday=6
    const dayOfWeek = (today.getDay() + 6) % 7;
    setAvailDay(dayOfWeek);
    setAvailStartTime('10:00');
    setAvailEndTime('13:00');
    setIsAvailModalOpen(true);
  };

  const handleDateChange = (dateStr: string) => {
    setAvailDate(dateStr);
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = (dateObj.getDay() + 6) % 7;
      setAvailDay(dayOfWeek);
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLocationId) return;

    try {
      await api.addAvailability(activeLocationId, {
        day_of_week: Number(availDay),
        start_time: `${availStartTime}:00`,
        end_time: `${availEndTime}:00`,
        slot_duration: 60,
        is_active: true,
      });
      setIsAvailModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to add schedule');
    }
  };

  const handleDeleteAvailability = async (availId: number) => {
    if (!confirm('Remove this availability schedule slot?')) return;
    try {
      await api.deleteAvailability(availId);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to delete availability');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading Doctor Management...</p>
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
              <Stethoscope className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-bold text-slate-900">Doctor Management</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Onboard doctors, configure clinic locations, update fees, and setup weekly availability
            </p>
          </div>

          <button
            onClick={openAddDoctorModal}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/20 transition"
          >
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        </div>

        {/* Doctors List */}
        <div className="space-y-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className={`bg-white rounded-3xl border p-6 shadow-sm transition ${
                doc.is_active ? 'border-slate-200/80' : 'border-slate-200 bg-slate-50/60 opacity-75'
              }`}
            >
              {/* Doctor Main Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border">
                    {doc.profile_photo ? (
                      <img src={doc.profile_photo} alt={doc.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-50 font-bold text-xl text-brand-700">
                        {doc.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">{doc.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          doc.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {doc.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-brand-600">{doc.specialization} • {doc.qualification}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.experience_years} Years Experience</p>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Consultation Fee
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      ₹{Number(doc.consultation_fee).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditDoctorModal(doc)}
                      className="p-2 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200 transition"
                      title="Edit Doctor Info & Fees"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleDoctorStatus(doc)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                        doc.is_active
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {doc.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Clinic Locations Section */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-600" /> Clinic Locations ({doc.locations.length})
                  </h4>
                  <button
                    onClick={() => openAddLocationModal(doc)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Clinic Location
                  </button>
                </div>

                {doc.locations.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    No clinic locations added yet. Click &ldquo;Add Clinic Location&rdquo; above.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {doc.locations.map((loc) => (
                      <div key={loc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-bold text-slate-900 text-sm">{loc.clinic_name}</span>
                          {loc.room_number && (
                            <span className="bg-white px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 border border-slate-200">
                              {loc.room_number}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 mb-3">
                          {loc.address}, {loc.locality}, {loc.city}
                        </p>

                        {/* Availabilities for this location */}
                        <div className="pt-2 border-t border-slate-200/60">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> Working Schedule
                            </span>
                            <button
                              onClick={() => openAvailabilityModal(loc.id)}
                              className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
                            >
                              + Add Slots
                            </button>
                          </div>

                          {loc.availabilities && loc.availabilities.length > 0 ? (
                            <div className="space-y-1">
                              {loc.availabilities.map((av) => (
                                <div
                                  key={av.id}
                                  className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {DAYS_NAMES[av.day_of_week]}: {av.start_time.slice(0, 5)} - {av.end_time.slice(0, 5)} (Hourly · 40/hr)
                                  </span>
                                  <button
                                    onClick={() => handleDeleteAvailability(av.id)}
                                    className="text-slate-400 hover:text-red-600 p-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No active slots configured</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* MODAL 1: Add / Edit Doctor */}
        {isDoctorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingDoctor ? 'Edit Doctor Profile & Fees' : 'Onboard New Doctor'}
                </h3>
                <button
                  onClick={() => setIsDoctorModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
                {/* Doctor Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Doctor Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Amit Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>

                {/* Doctor Photo Picker (Camera / Upload / URL) */}
                <DoctorPhotoPicker value={profilePhoto} onChange={setProfilePhoto} />

                {/* Gender */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Specialization & Qualifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Specialization
                    </label>
                    <input
                      type="text"
                      required
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="Cardiologist"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Qualifications
                    </label>
                    <input
                      type="text"
                      required
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="MBBS, MD, DM Cardiology"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Experience & Languages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Languages Spoken
                    </label>
                    <input
                      type="text"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="English, Hindi"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Fees (Section 8: Admin manages price) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-brand-50/60 rounded-xl border border-brand-100">
                  <div>
                    <label className="block font-bold text-brand-900 mb-1 uppercase tracking-wider">
                      Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-brand-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-brand-900 mb-1 uppercase tracking-wider">
                      Follow-up Fee (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={followUpFee}
                      onChange={(e) => setFollowUpFee(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-brand-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* About Bio */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    About Doctor
                  </label>
                  <textarea
                    rows={3}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Brief background and expertise..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingDoctor}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                  >
                    {submittingDoctor ? 'Saving Doctor...' : editingDoctor ? 'Update Doctor' : 'Onboard Doctor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Add Clinic Location */}
        {isLocationModalOpen && activeDoctorForLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Clinic Location</h3>
                  <p className="text-[11px] text-slate-500">for {activeDoctorForLocation.name}</p>
                </div>
                <button
                  onClick={() => setIsLocationModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveLocation} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Clinic Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma Clinic"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Address</label>
                  <input
                    type="text"
                    required
                    placeholder="12 Civil Lines, Near Chowk"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Locality</label>
                    <input
                      type="text"
                      required
                      placeholder="Civil Lines"
                      value={clinicLocality}
                      onChange={(e) => setClinicLocality(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      required
                      placeholder="Ayodhya"
                      value={clinicCity}
                      onChange={(e) => setClinicCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">State</label>
                    <input
                      type="text"
                      required
                      placeholder="Uttar Pradesh"
                      value={clinicState}
                      onChange={(e) => setClinicState(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">PIN Code</label>
                    <input
                      type="text"
                      required
                      placeholder="224001"
                      value={clinicPincode}
                      onChange={(e) => setClinicPincode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Room / OPD No.</label>
                    <input
                      type="text"
                      placeholder="Room 102"
                      value={clinicRoom}
                      onChange={(e) => setClinicRoom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Google Maps URL</label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={clinicMapsUrl}
                      onChange={(e) => setClinicMapsUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                  >
                    Save Clinic Location
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Add Availability Schedule */}
        {isAvailModalOpen && activeLocationId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Add Working Schedule</h3>
                <button
                  onClick={() => setIsAvailModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAvailability} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Select Appointment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={availDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] bg-slate-100/80 px-2.5 py-1 rounded-lg">
                    <span className="text-slate-500">Day:</span>
                    <span className="font-bold text-brand-700">{DAYS_NAMES[availDay]}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Start Time</label>
                    <input
                      type="time"
                      required
                      value={availStartTime}
                      onChange={(e) => setAvailStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">End Time</label>
                    <input
                      type="time"
                      required
                      value={availEndTime}
                      onChange={(e) => setAvailEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-brand-50/70 border border-brand-100 rounded-xl text-brand-900">
                  <p className="font-semibold text-[11px]">Automatic Hourly Slots</p>
                  <p className="text-[10px] text-brand-700 mt-0.5">
                    Schedule will be split into 1-hour slots automatically (e.g. 10:00 - 11:00 AM). Each 1-hour slot allows a maximum of 40 bookings.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                  >
                    Save Working Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminDoctorsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-slate-400">Loading Doctor Management...</div>}>
      <AdminDoctorsContent />
    </Suspense>
  );
}
