'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage('No verification token provided.');
      return;
    }

    api
      .verifyEmail(token)
      .then((res) => {
        setSuccess(true);
        setMessage(res.message || 'Email verified successfully!');
        refreshUser().catch(() => {});
      })
      .catch((err) => {
        setSuccess(false);
        setMessage(err.message || 'Verification token is invalid or has expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center">
        {loading ? (
          <div className="py-8">
            <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900">Verifying Email...</h2>
            <p className="text-xs text-slate-500 mt-1">Please wait while we confirm your account.</p>
          </div>
        ) : success ? (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">Email Verified!</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your account has been successfully verified. You can now log in and book doctor appointments.
            </p>

            <div className="pt-4">
              <Link
                href="/login"
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition inline-flex items-center justify-center gap-2"
              >
                Sign In to Your Account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">Verification Failed</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

            <div className="pt-4">
              <Link
                href="/login"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm transition inline-block"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-slate-400">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
