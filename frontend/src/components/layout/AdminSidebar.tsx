'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserPlus, Users, CalendarDays, Settings } from 'lucide-react';

const links = [
  { name: 'Dashboard Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Doctors Management', href: '/admin/doctors', icon: UserPlus },
  { name: 'Appointments', href: '/admin/appointments', icon: CalendarDays },
  { name: 'Patients Directory', href: '/admin/patients', icon: Users },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-fit">
      <div className="px-3 py-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Admin Console
        </span>
        <h2 className="text-lg font-bold text-slate-800">DocBook Admin</h2>
      </div>

      <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
