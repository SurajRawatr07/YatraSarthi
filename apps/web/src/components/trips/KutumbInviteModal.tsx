"use client";

import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, Send, Users, Shield, ArrowRight } from 'lucide-react';
import type { TripData } from '../../types';
import { useAuth } from '@/context/AuthContext';

interface KutumbInviteModalProps {
  trip: TripData;
  isOpen: boolean;
  onClose: () => void;
  onTripUpdated?: () => void;
}

export function KutumbInviteModal({ trip, isOpen, onClose, onTripUpdated }: KutumbInviteModalProps) {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const joinCode = trip.joinCode || 'GOA123';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yatrasarthi.in';
  const shareLink = `${origin}/join?code=${joinCode}`;
  const shareMessage = `Join our ${trip.destination || trip.name} trip on YatraSarthi so we can track everyone's bookings in one place: ${shareLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  };

  const handleShareSMS = () => {
    const url = `sms:?&body=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  };

  const isOwner = user ? (trip.ownerId === user.id || trip.ownerId === 'demo') : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(27, 33, 28, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative animate-scale-up"
        style={{ background: '#FFFFFF', border: '1px solid #D5D9CC' }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ background: '#DCE8D2', color: '#172017' }}
          >
            Kutumb Invite Link
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
          Bring the rest of the group in
        </h2>
        <p className="text-sm text-[#5F665B] mb-6 leading-relaxed">
          Anyone with this link can add their own bookings to this trip and see the shared plan.
        </p>

        {/* Join Code Card */}
        <div className="p-4 rounded-2xl bg-[#F5F2E8]/40 border border-[#D5D9CC] shadow-sm mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#5F665B] mb-1">
            Trip Join Code
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-black text-[#172017] tracking-widest">
              {joinCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              style={{
                background: copied ? '#E8F0E2' : '#DCE8D2',
                color: copied ? '#4E8752' : '#172017',
                border: `1px solid ${copied ? '#D5D9CC' : '#D5D9CC'}`,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={handleShareWhatsApp}
            className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col items-center gap-1.5 hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <MessageCircle size={20} className="text-emerald-600" />
            <span className="text-xs font-bold">WhatsApp</span>
          </button>

          <button
            onClick={handleShareSMS}
            className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 flex flex-col items-center gap-1.5 hover:bg-blue-100 transition-all cursor-pointer"
          >
            <Send size={20} className="text-blue-600" />
            <span className="text-xs font-bold">SMS</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="p-3 rounded-2xl bg-white border border-[#D5D9CC] text-[#172017] flex flex-col items-center gap-1.5 hover:bg-[#F5F2E8] transition-all cursor-pointer"
          >
            <Share2 size={20} className="text-[#172017]" />
            <span className="text-xs font-bold">Copy Link</span>
          </button>
        </div>

        {/* Current Members Section */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5F665B] mb-2.5">
            Joined Members ({trip.travellers?.length || 1})
          </div>
          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto no-scrollbar">
            {trip.travellers && trip.travellers.length > 0 ? (
              trip.travellers.map((traveller, i) => (
                <div
                  key={traveller.id || i}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-[#D5D9CC] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#DCE8D2] flex items-center justify-center font-bold text-[#172017]">
                      {traveller.name ? traveller.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="font-semibold text-[#172017]">{traveller.name || 'Traveler'}</span>
                    {traveller.phone && <span className="text-[#5F665B]">({traveller.phone})</span>}
                  </div>
                  {i === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#DCE8D2] text-[#172017] font-bold text-[10px]">
                      Owner
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl bg-white border border-[#D5D9CC] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#172017]">You</span>
                <span className="px-2 py-0.5 rounded-full bg-[#DCE8D2] text-[#172017] font-bold text-[10px]">
                  Owner
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#D5D9CC]">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#5F665B] hover:text-[#172017] cursor-pointer"
          >
            Skip for now
          </button>
          <button
            onClick={onClose}
            className="btn-accent px-5 py-2.5 text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
