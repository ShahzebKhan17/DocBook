'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Home, Stethoscope, Calendar, User, Shield } from 'lucide-react';

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-1 flex justify-around items-center shadow-lg">
      <Link
        href="/"
        className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
          pathname === '/' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        Home
      </Link>

      <Link
        href="/doctors"
        className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
          pathname.startsWith('/doctors') ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Stethoscope className="w-5 h-5 mb-0.5" />
        Doctors
      </Link>

      {user && user.role === 'PATIENT' && (
        <Link
          href="/dashboard"
          className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
            pathname === '/dashboard' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          Bookings
        </Link>
      )}

      {user && user.role === 'ADMIN' && (
        <Link
          href="/admin"
          className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
            pathname.startsWith('/admin') ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-5 h-5 mb-0.5" />
          Admin
        </Link>
      )}

      <Link
        href={user ? (user.role === 'ADMIN' ? '/admin' : '/dashboard/profile') : '/login'}
        className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
          pathname.includes('/profile') || pathname === '/login' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <User className="w-5 h-5 mb-0.5" />
        {user ? 'Profile' : 'Account'}
      </Link>
    </nav>
  );
}
