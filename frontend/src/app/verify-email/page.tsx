'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw, KeyRound } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email') || '';

  const { refreshUser } = useAuth();

  // State
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState(tokenFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // If token is present in URL (e.g. user clicked email link), auto-verify immediately
  useEffect(() => {
    if (tokenFromUrl) {
      setAutoVerifying(true);
      setError(null);
      api
        .verifyEmail(tokenFromUrl)
        .then(() => {
          setSuccess(true);
          refreshUser().catch(() => {});
        })
        .catch((err) => {
          setError(err.message || 'Verification link is invalid or expired. Please enter your 6-digit code below.');
        })
        .finally(() => {
          setAutoVerifying(false);
        });
    }
  }, [tokenFromUrl, refreshUser]);

  // Resend countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Manual 6-digit verification submission
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Please enter your 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      await api.verifyEmail(cleanCode, email ? email.trim() : undefined);
      setSuccess(true);
      await refreshUser().catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Code
  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your registered email address to resend code.');
      return;
    }
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await api.resendVerification(email.trim());
      setInfoMessage(res.message || 'A fresh 6-digit verification code has been sent to your email.');
      setCooldown(60); // 60s cooldown
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code. Please try again in a few moments.');
    } finally {
      setResending(false);
    }
  };

  // 1. Auto-verifying state (when clicking link in email)
  if (autoVerifying) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center">
          <div className="w-12 h-12 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Verifying Your Account...</h2>
          <p className="text-xs text-slate-500 mt-1">Please wait a moment while we confirm your email.</p>
        </div>
      </div>
    );
  }

  // 2. Success state
  if (success) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Email Verified!</h2>
          <p className="text-sm text-slate-600 leading-relaxed mt-2 mb-6">
            Your DocBook account is now fully active. You can sign in and start booking specialist appointments.
          </p>

          <Link
            href="/login"
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition inline-flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
          >
            Sign In to Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 3. 6-Digit Code Input State
  return (
    <div className="max-w-md mx-auto py-8 sm:py-12">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-brand-100">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Verify Your Email</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            We have sent a 6-digit verification code to
            {email ? (
              <strong className="block text-slate-900 font-semibold mt-0.5">{email}</strong>
            ) : (
              ' your registered email address.'
            )}
          </p>
        </div>

        {/* Info or Error Alerts */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 6-Digit Form */}
        <form onSubmit={handleVerifyCode} className="space-y-4">
          {!emailFromUrl && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider text-center">
              Enter 6-Digit Code
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCode(val);
                }}
                placeholder="• • • • • •"
                className="w-full py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-brand-500 rounded-2xl text-center font-mono text-2xl font-extrabold tracking-[0.4em] text-slate-900 focus:bg-white focus:outline-none transition placeholder:tracking-[0.2em] placeholder:text-slate-300"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Check your inbox (or spam folder) for the code from DocBook.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-brand-500/20 text-sm transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" /> Verify Code & Activate
              </>
            )}
          </button>
        </form>

        {/* Resend & Secondary Links */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>Didn&apos;t receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="font-bold text-brand-600 hover:text-brand-700 disabled:text-slate-400 disabled:cursor-not-allowed transition inline-flex items-center gap-1"
            >
              {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
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
