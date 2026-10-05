"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Lock, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { User } from '@yatrasarthi/types';

interface PhoneSignInProps {
  onSuccess: (user: User, isNewUser: boolean) => void;
  onBack?: () => void;
  onClose?: () => void;
}

export function PhoneSignIn({ onSuccess, onBack, onClose }: PhoneSignInProps) {
  const [mode, setMode] = useState<'select' | 'login' | 'signup'>('select');
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const cleanDigits = phone.replace(/\D/g, '');
  const isValidPhone = cleanDigits.length === 10;
  const isValidForm = mode === 'signup' ? isValidPhone && name.trim().length > 1 : isValidPhone;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidForm || isSending) return;

    setIsSending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const fullPhone = `+91${cleanDigits}`;
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send verification code');
      }

      setStep(2);
      setCountdown(30);
      setSuccessMsg(`OTP sent to +91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`);
      // Focus first OTP input
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err: any) {
      setError(err.message || 'Error sending OTP');
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);
    setError(null);

    // Auto-advance
    if (char && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto verify if all filled
    const joined = newOtp.join('');
    if (joined.length === 6) {
      triggerVerify(joined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtp(newOtp);
    if (pastedData.length === 6) {
      triggerVerify(pastedData);
    } else {
      otpInputsRef.current[pastedData.length]?.focus();
    }
  };

  const triggerVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join('');
    if (code.length !== 6 || isVerifying) return;

    setIsVerifying(true);
    setError(null);

    try {
      const fullPhone = `+91${cleanDigits}`;
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code, name: mode === 'signup' ? name.trim() : undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "That code didn't match. Check the message and try again.");
      }

      const { user, isNewUser } = data.data;

      // Handle login / signup strictness based on the mode requested
      if (mode === 'login' && isNewUser) {
        throw new Error("No account found with this number. Please Sign Up instead.");
      } else if (mode === 'signup' && !isNewUser) {
        // Just let them log in anyway if they already have an account, but we can warn them if needed.
        // Let's just proceed seamlessly for better UX.
      }

      onSuccess(user, isNewUser);
    } catch (err: any) {
      setError(err.message || "That code didn't match. Check the message and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToSelect = () => {
    setMode('select');
    setPhone('');
    setName('');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(23, 32, 23, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative animate-scale-up"
        style={{ background: '#FFFFFF', border: '1px solid #D5D9CC', minHeight: 450 }}
      >
        {/* Top Back/Close bar */}
        <div className="flex items-center justify-between mb-6">
          {step === 2 && mode !== 'select' ? (
            <button
              onClick={() => {
                setStep(1);
                setOtp(['', '', '', '', '', '']);
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5F665B] hover:text-[#172017] transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : mode !== 'select' ? (
            <button
              onClick={handleBackToSelect}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5F665B] hover:text-[#172017] transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5F665B] hover:text-[#172017] transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#DCE8D2', color: '#172017' }}
            >
              A3
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5F665B] hover:text-[#172017] hover:bg-[#F5F2E8] transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Mode Select */}
        {mode === 'select' && (
          <div className="flex flex-col items-center justify-center flex-1 py-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: '#172017', color: '#C5D82D' }}>
              <Lock size={28} />
            </div>
            
            <h2 className="font-extrabold text-2xl mb-2 text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
              Welcome to YatraSarthi
            </h2>
            <p className="text-sm text-[#5F665B] mb-8 text-center max-w-xs">
              Log in to manage your connected group trips or create a new account to get started.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => setMode('login')}
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-sm"
              >
                Log In
              </button>
              <button
                onClick={() => setMode('signup')}
                className="w-full py-3.5 text-sm font-bold bg-[#F5F2E8] text-[#172017] border border-[#D5D9CC] rounded-xl hover:bg-[#EDE9D8] transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Phone number (and Name if signup) entry */}
        {mode !== 'select' && step === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#DCE8D2' }}>
              {mode === 'signup' ? <UserIcon size={22} style={{ color: '#172017' }} /> : <Phone size={22} style={{ color: '#172017' }} />}
            </div>

            <h2 className="font-extrabold text-2xl mb-1.5 text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </h2>
            <p className="text-sm text-[#5F665B] mb-6">
              {mode === 'login' 
                ? "Enter your phone number to log in."
                : "Enter your name and phone number to sign up."}
            </p>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name Input (Signup only) */}
            {mode === 'signup' && (
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
                  Full Name
                </label>
                <div
                  className="flex items-center rounded-2xl bg-white transition-all shadow-sm focus-within:ring-2 focus-within:ring-[#C5D82D]"
                  style={{ border: '1px solid #D5D9CC' }}
                >
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="E.g. Tanvi"
                    className="flex-1 px-4 py-3.5 text-base font-semibold text-[#172017] bg-transparent outline-none tracking-wide"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Phone Input with Country Code */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
                Mobile Number
              </label>
              <div
                className="flex items-center rounded-2xl bg-white transition-all shadow-sm focus-within:ring-2 focus-within:ring-[#C5D82D]"
                style={{ border: '1px solid #D5D9CC' }}
              >
                <div className="px-4 py-3.5 flex items-center gap-2 border-r border-[#D5D9CC] font-semibold text-sm text-[#172017] bg-[#EDE9D8]/50 rounded-l-2xl">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  maxLength={12}
                  className="flex-1 px-4 py-3.5 text-base font-semibold text-[#172017] bg-transparent outline-none tracking-wide"
                  autoFocus={mode === 'login'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValidForm || isSending}
              className="btn-accent w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              style={{
                opacity: isValidForm && !isSending ? 1 : 0.6,
                cursor: isValidForm && !isSending ? 'pointer' : 'not-allowed',
              }}
            >
              {isSending ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  Send OTP <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP verification */}
        {mode !== 'select' && step === 2 && (
          <div className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#DCE8D2' }}>
              <Lock size={22} style={{ color: '#172017' }} />
            </div>

            <h2 className="font-extrabold text-2xl mb-1.5 text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
              Verify code
            </h2>
            <div className="flex items-center gap-2 text-sm text-[#5F665B] mb-6 flex-wrap">
              <span>Enter the code sent to +91 {cleanDigits}</span>
              <button
                onClick={() => {
                  setStep(1);
                  setOtp(['', '', '', '', '', '']);
                }}
                className="text-xs font-bold text-[#172017] underline hover:opacity-80"
              >
                Change
              </button>
            </div>

            {successMsg && !error && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed animate-shake">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 6 Digit OTP Fields */}
            <div className="flex justify-between gap-2 mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpInputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-extrabold rounded-2xl bg-white text-[#172017] shadow-sm outline-none transition-all focus:ring-2 focus:ring-[#C5D82D]"
                  style={{
                    border: digit ? '2px solid #172017' : '1px solid #D5D9CC',
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => triggerVerify()}
              disabled={otp.join('').length !== 6 || isVerifying}
              className="btn-accent w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all mb-4"
              style={{
                opacity: otp.join('').length === 6 && !isVerifying ? 1 : 0.6,
                cursor: otp.join('').length === 6 && !isVerifying ? 'pointer' : 'not-allowed',
              }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>

            {/* Resend timer */}
            <div className="text-center text-xs text-[#5F665B]">
              {countdown > 0 ? (
                <span>Resend code in {countdown}s</span>
              ) : (
                <button
                  onClick={() => handleSendOtp()}
                  disabled={isSending}
                  className="font-bold text-[#172017] hover:underline"
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
