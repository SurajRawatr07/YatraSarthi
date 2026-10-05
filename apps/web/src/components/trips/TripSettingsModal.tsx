"use client";

import React, { useState } from 'react';
import { X, Settings, Trash2, LogOut, UserMinus, Share2, Save, AlertTriangle, Check, Compass, Users } from 'lucide-react';
import type { TripData } from '../../types';
import { useAuth } from '@/context/AuthContext';

interface TripSettingsModalProps {
  trip: TripData;
  isOpen: boolean;
  onClose: () => void;
  onTripUpdated: () => void;
  onOpenInvite: () => void;
}

export function TripSettingsModal({ trip, isOpen, onClose, onTripUpdated, onOpenInvite }: TripSettingsModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(trip.name || trip.destination);
  const [tripType, setTripType] = useState<'solo' | 'group'>(
    trip.tripType || (trip.travellers?.length === 1 || trip.memberIds?.length === 1 ? 'solo' : 'group')
  );
  const [startDate, setStartDate] = useState(trip.startDate ? trip.startDate.split('T')[0] : '');
  const [endDate, setEndDate] = useState(trip.endDate ? trip.endDate.split('T')[0] : '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const isOwner = user ? (trip.ownerId === user.id || trip.ownerId === 'demo') : true;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseVersion: trip.version || 1,
          name,
          startDate,
          endDate,
          tripType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to save trip settings');
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      onTripUpdated();
    } catch (err: any) {
      setError(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the trip?')) return;
    try {
      const res = await fetch(`/api/trips/${trip.id}/members/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to remove member');
      }
      onTripUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLeaveTrip = async () => {
    if (!confirm('Are you sure you want to leave this trip?')) return;
    try {
      const res = await fetch(`/api/trips/${trip.id}/leave`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to leave trip');
      }
      onTripUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTrip = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to delete trip');
      }
      onTripUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message);
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(27, 33, 28, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto no-scrollbar"
        style={{ background: '#FFFFFF', border: '1px solid #D5D9CC' }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ background: '#DCE8D2', color: '#172017' }}
          >
            Trip Settings
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-[#DCE8D2] transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#DCE8D2' }}>
            <Settings size={22} style={{ color: '#172017' }} />
          </div>
          <div>
            <h2 className="font-extrabold text-2xl text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
              Settings: {trip.name || trip.destination}
            </h2>
            <p className="text-xs text-[#5F665B]">Manage details, Kutumb members, and preferences</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl mb-4 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#5F665B]">
              Travel Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTripType('solo')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tripType === 'solo'
                    ? 'bg-[#172017] text-[#C5D82D] border-[#172017] shadow-sm'
                    : 'bg-[#F5F2E8]/60 text-[#172017] border-[#D5D9CC] hover:bg-white'
                }`}
              >
                <Compass size={14} /> Solo Traveler
              </button>
              <button
                type="button"
                onClick={() => setTripType('group')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tripType === 'group'
                    ? 'bg-[#172017] text-[#C5D82D] border-[#172017] shadow-sm'
                    : 'bg-[#F5F2E8]/60 text-[#172017] border-[#D5D9CC] hover:bg-white'
                }`}
              >
                <Users size={14} /> Kutumb Group
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#5F665B]">
              Trip Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-sm font-semibold text-[#172017] outline-none focus:ring-2 focus:ring-[#C5D82D]"
            />
            <span className="text-[11px] text-[#5F665B] mt-1 block">
              {tripType === 'solo' ? 'Personal trip name' : 'Group members will see this name.'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#5F665B]">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-xs font-semibold text-[#172017] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#5F665B]">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-xs font-semibold text-[#172017] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-accent py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            {savedSuccess ? (
              <>
                <Check size={14} /> Saved Changes
              </>
            ) : saving ? (
              'Saving...'
            ) : (
              <>
                <Save size={14} /> Save Trip Details
              </>
            )}
          </button>
        </form>

        {/* Kutumb / Member Management */}
        <div className="mb-6 pt-4 border-t border-[#D5D9CC]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F665B]">
              Kutumb Members ({trip.travellers?.length || 1})
            </span>
            <button
              onClick={() => { onClose(); onOpenInvite(); }}
              className="text-xs font-bold text-[#172017] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Share2 size={13} /> Invite more
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto no-scrollbar">
            {trip.travellers && trip.travellers.length > 0 ? (
              trip.travellers.map((traveller, i) => {
                const memberIsOwner = i === 0 || traveller.id === trip.ownerId;
                return (
                  <div
                    key={traveller.id || i}
                    className="p-3 rounded-xl bg-white border border-[#D5D9CC] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#DCE8D2] flex items-center justify-center font-bold text-[#172017]">
                        {traveller.name ? traveller.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-[#172017]">{traveller.name || 'Traveler'}</div>
                        {traveller.phone && <div className="text-[11px] text-[#5F665B]">{traveller.phone}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {memberIsOwner ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#DCE8D2] text-[#172017] font-bold text-[10px]">
                          Owner
                        </span>
                      ) : (
                        isOwner && (
                          <button
                            onClick={() => handleRemoveMember(traveller.id)}
                            className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove Member"
                          >
                            <UserMinus size={14} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-xl bg-white border border-[#D5D9CC] text-xs" style={{ color: '#5F665B' }}>
                You are the only member in this trip.
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone: Leave or Delete */}
        <div className="pt-4 border-t border-[#D5D9CC]">
          {isOwner ? (
            showDeleteConfirm ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 animate-slide-up">
                <div className="flex items-start gap-2.5 mb-3 text-red-800 text-xs">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-red-600" />
                  <span>
                    Delete &ldquo;{trip.name || trip.destination}&rdquo;? This removes it for every member and can&apos;t be undone.
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary py-2 text-xs flex-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTrip}
                    disabled={deleting}
                    className="py-2 text-xs flex-1 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Trip'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 text-xs font-bold text-red-600 rounded-xl border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Delete Trip
              </button>
            )
          ) : (
            <button
              onClick={handleLeaveTrip}
              className="w-full py-2.5 text-xs font-bold text-red-600 rounded-xl border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} /> Leave Trip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
