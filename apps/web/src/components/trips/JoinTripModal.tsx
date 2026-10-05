"use client";

import React, { useState } from 'react';
import { X, Users, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface JoinTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tripId: string) => void;
}

export function JoinTripModal({ isOpen, onClose, onSuccess }: JoinTripModalProps) {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user, startAuthFlow } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    if (!user) {
      startAuthFlow('signin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/trips/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to join trip');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(data.data.id);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Invalid join code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(27, 33, 28, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative animate-scale-up"
        style={{ background: '#FFFFFF', border: '1px solid #D5D9CC' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ background: '#DCE8D2', color: '#172017' }}
          >
            Join Group
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-[#DCE8D2] transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#DCE8D2' }}>
          <Users size={22} style={{ color: '#172017' }} />
        </div>

        <h2 className="font-extrabold text-2xl mb-1.5 text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
          Join an existing trip
        </h2>
        <p className="text-sm text-[#5F665B] mb-6">
          Enter the Kutumb code shared by your trip organizer (e.g. GOA123).
        </p>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 size={16} />
            <span>Successfully joined the trip! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. GOA204"
              className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-lg font-mono font-bold tracking-widest text-[#172017] uppercase outline-none focus:ring-2 focus:ring-[#C5D82D]"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!joinCode.trim() || loading || success}
            className="btn-accent w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            style={{
              opacity: joinCode.trim() && !loading ? 1 : 0.6,
              cursor: joinCode.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Joining trip...
              </>
            ) : (
              <>
                Join Trip <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
