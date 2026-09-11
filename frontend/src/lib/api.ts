const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('docbook_token');
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('docbook_token', token);
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('docbook_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const data = await response.json();
      errorDetail = data.detail || data.message || JSON.stringify(data);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  verifyEmail: (token: string, email?: string) =>
    request<any>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token, email }) }),
  resendVerification: (email: string) =>
    request<any>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),

  // Patients
  getPatientProfile: () => request<any>('/patients/profile'),
  updatePatientProfile: (data: any) => request<any>('/patients/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getPatientAppointments: () => request<any[]>('/patients/appointments'),

  // Doctors
  listDoctors: (params?: { search?: string; specialization?: string; city?: string; max_fee?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.specialization) query.append('specialization', params.specialization);
    if (params?.city) query.append('city', params.city);
    if (params?.max_fee !== undefined) query.append('max_fee', String(params.max_fee));
    const qs = query.toString();
    return request<any[]>(`/doctors${qs ? `?${qs}` : ''}`);
  },
  getDoctorDetail: (id: number) => request<any>(`/doctors/${id}`),
  getSpecializations: () => request<string[]>('/doctors/specializations'),
  getCities: () => request<string[]>('/doctors/cities'),

  // Appointments
  getSlots: (doctorId: number, locationId: number, date: string) =>
    request<any>(`/appointments/slots?doctor_id=${doctorId}&doctor_location_id=${locationId}&appointment_date=${date}`),
  bookAppointment: (data: { doctor_id: number; doctor_location_id: number; appointment_date: string; appointment_time: string; notes?: string }) =>
    request<any>('/appointments/book', { method: 'POST', body: JSON.stringify(data) }),
  cancelAppointment: (id: string) =>
    request<any>(`/appointments/${id}/cancel`, { method: 'PUT' }),

  // Admin
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminDoctors: () => request<any[]>('/admin/doctors'),
  getAdminDoctor: (id: number) => request<any>(`/admin/doctors/${id}`),
  createDoctor: (data: any) => request<any>('/admin/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id: number, data: any) => request<any>(`/admin/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  disableDoctor: (id: number) => request<any>(`/admin/doctors/${id}`, { method: 'DELETE' }),

  addDoctorLocation: (doctorId: number, data: any) => request<any>(`/admin/doctors/${doctorId}/locations`, { method: 'POST', body: JSON.stringify(data) }),
  updateDoctorLocation: (locationId: number, data: any) => request<any>(`/admin/locations/${locationId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctorLocation: (locationId: number) => request<any>(`/admin/locations/${locationId}`, { method: 'DELETE' }),

  addAvailability: (locationId: number, data: any) => request<any>(`/admin/locations/${locationId}/availability`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAvailability: (availabilityId: number) => request<any>(`/admin/availability/${availabilityId}`, { method: 'DELETE' }),

  getAdminAppointments: (params?: { doctor_id?: number; status?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.doctor_id) query.append('doctor_id', String(params.doctor_id));
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    const qs = query.toString();
    return request<any[]>(`/admin/appointments${qs ? `?${qs}` : ''}`);
  },
  updateAppointmentStatus: (id: string, status: string) =>
    request<any>(`/admin/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getAdminPatients: () => request<any[]>('/admin/patients'),
};
