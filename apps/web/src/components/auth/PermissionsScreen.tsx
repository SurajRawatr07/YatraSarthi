"use client";

import React, { useState } from 'react';
import { MapPin, Bell, UserCheck, Check, ArrowRight, Shield } from 'lucide-react';

interface PermissionsScreenProps {
  onComplete: () => void;
}

export function PermissionsScreen({ onComplete }: PermissionsScreenProps) {
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false,
    contacts: false,
  });

  const requestPermission = async (type: 'location' | 'notifications' | 'contacts') => {
    if (type === 'notifications' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          setPermissions(p => ({ ...p, notifications: true }));
          return;
        }
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }

    if (type === 'location' && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setPermissions(p => ({ ...p, location: true })),
        () => setPermissions(p => ({ ...p, location: true })) // allow soft toggle
      );
      return;
    }

    // Default toggle for browser / contacts demo
    setPermissions(p => ({ ...p, [type]: !p[type] }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(23, 32, 23, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative animate-scale-up"
        style={{ background: '#FFFFFF', border: '1px solid #D5D9CC' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ background: '#DCE8D2', color: '#172017' }}
          >
            Permissions & Privacy
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: '#DCE8D2', color: '#172017' }}
          >
            A4
          </div>
        </div>

        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#DCE8D2' }}>
          <Shield size={24} style={{ color: '#172017' }} />
        </div>

        <h2 className="font-extrabold text-2xl mb-1.5 text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
          Help YatraSarthi protect your journey
        </h2>
        <p className="text-sm text-[#5F665B] mb-6">
          Enable permissions to allow real-time delay warnings and automated safety monitoring.
        </p>

        {/* Permission Rows */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Location */}
          <div
            className="p-4 rounded-2xl bg-white border flex items-center justify-between gap-4 transition-all"
            style={{ borderColor: permissions.location ? '#4E8752' : '#D5D9CC' }}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DCE8D2' }}>
                <MapPin size={20} style={{ color: '#172017' }} />
              </div>
              <div>
                <div className="font-bold text-sm text-[#172017] mb-0.5">Location</div>
                <div className="text-xs text-[#5F665B] leading-relaxed">
                  Used to time your phantom-node legs and to share your position if you ever tap Suraksha.
                </div>
              </div>
            </div>
            <button
              onClick={() => requestPermission('location')}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
              style={{
                background: permissions.location ? '#E8F0E2' : '#EDE9D8',
                color: permissions.location ? '#4E8752' : '#172017',
                border: `1px solid ${permissions.location ? '#4E8752' : '#D5D9CC'}`,
              }}
            >
              {permissions.location ? (
                <>
                  <Check size={13} /> Allowed
                </>
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {/* Notifications */}
          <div
            className="p-4 rounded-2xl bg-white border flex items-center justify-between gap-4 transition-all"
            style={{ borderColor: permissions.notifications ? '#4E8752' : '#D5D9CC' }}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DCE8D2' }}>
                <Bell size={20} style={{ color: '#172017' }} />
              </div>
              <div>
                <div className="font-bold text-sm text-[#172017] mb-0.5">Notifications</div>
                <div className="text-xs text-[#5F665B] leading-relaxed">
                  Used to alert you the moment a delay affects your plan.
                </div>
              </div>
            </div>
            <button
              onClick={() => requestPermission('notifications')}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
              style={{
                background: permissions.notifications ? '#E8F0E2' : '#EDE9D8',
                color: permissions.notifications ? '#4E8752' : '#172017',
                border: `1px solid ${permissions.notifications ? '#4E8752' : '#D5D9CC'}`,
              }}
            >
              {permissions.notifications ? (
                <>
                  <Check size={13} /> Allowed
                </>
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {/* Contacts */}
          <div
            className="p-4 rounded-2xl bg-white border flex items-center justify-between gap-4 transition-all"
            style={{ borderColor: permissions.contacts ? '#4E8752' : '#D5D9CC' }}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DCE8D2' }}>
                <UserCheck size={20} style={{ color: '#172017' }} />
              </div>
              <div>
                <div className="font-bold text-sm text-[#172017] mb-0.5">Contacts</div>
                <div className="text-xs text-[#5F665B] leading-relaxed">
                  Used only to let you pick emergency contacts for Suraksha. Nothing is uploaded until you choose someone.
                </div>
              </div>
            </div>
            <button
              onClick={() => requestPermission('contacts')}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
              style={{
                background: permissions.contacts ? '#E8F0E2' : '#EDE9D8',
                color: permissions.contacts ? '#4E8752' : '#172017',
                border: `1px solid ${permissions.contacts ? '#4E8752' : '#D5D9CC'}`,
              }}
            >
              {permissions.contacts ? (
                <>
                  <Check size={13} /> Allowed
                </>
              ) : (
                'Allow'
              )}
            </button>
          </div>
        </div>

        {/* Data note per spec */}
        <div className="p-3.5 rounded-xl bg-[#EDE9D8]/50 border border-[#D5D9CC] text-xs text-[#5F665B] leading-relaxed mb-6">
          Group members only see the parts of your trip you share with them.{' '}
          <span className="underline cursor-pointer font-medium hover:text-[#172017]">Read the full privacy policy.</span>
        </div>

        {/* Continue button */}
        <button
          onClick={onComplete}
          className="btn-accent w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          Continue to Trips <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
