"use client";

import React, { useState } from 'react';
import { ArrowRight, Plane, Clock, Users, ShieldAlert, Sparkles } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

const slides = [
  {
    step: '01',
    headline: "One flight's delay is another booking's problem.",
    description: "Your flight, hotel and cab are all connected — even when you booked them separately.",
    badge: "Connected Graph",
    icon: Plane,
    accent: '#172017',
    visual: (
      <div className="relative w-full h-44 rounded-2xl flex items-center justify-center p-4 overflow-hidden" style={{ background: '#EDE9D8' }}>
        <div className="flex items-center gap-3 relative z-10">
          <div className="px-3.5 py-2 rounded-xl bg-white shadow-sm flex items-center gap-2 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-gray-800">Flight +2h Delay</span>
          </div>
          <span className="text-sm font-bold text-[#172017]">➔</span>
          <div className="px-3.5 py-2 rounded-xl bg-white shadow-sm flex items-center gap-2 border border-[#D5D9CC]">
            <span className="w-2 h-2 rounded-full bg-[#8D6E1A]" />
            <span className="text-xs font-bold text-gray-800">Cab Pickup Missed</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: '02',
    headline: "We catch it before you do.",
    description: "Add every booking, and we'll flag what a delay breaks downstream.",
    badge: "Proactive Cascade Engine",
    icon: Clock,
    accent: '#4E8752',
    visual: (
      <div className="relative w-full h-44 rounded-2xl flex items-center justify-center p-4 overflow-hidden" style={{ background: '#E8F0E2' }}>
        <div className="flex flex-col gap-2 relative z-10 w-full max-w-xs">
          <div className="px-3.5 py-2.5 rounded-xl bg-white shadow-sm flex items-center justify-between border border-[#D5D9CC]">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#4E8752]" />
              <span className="text-xs font-semibold text-gray-800">Buffer Calculated</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#4E8752]">45m Slack</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#DCE8D2] text-[#172017] text-[11px] font-semibold text-center">
            ✓ Auto-rebooked earlier cab without missed check-in
          </div>
        </div>
      </div>
    ),
  },
  {
    step: '03',
    headline: "Travelling as a group? We track everyone.",
    description: "Link your trip with friends and family — one delay, one shared plan to fix it.",
    badge: "Kutumb Sync",
    icon: Users,
    accent: '#172017',
    visual: (
      <div className="relative w-full h-44 rounded-2xl flex items-center justify-center p-4 overflow-hidden" style={{ background: '#EDE9D8' }}>
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-full bg-[#DCE8D2] border-2 border-[#172017] flex items-center justify-center font-bold text-[#172017] text-xs shadow-sm">
            You
          </div>
          <div className="h-0.5 w-6 bg-[#D5D9CC]" />
          <div className="w-10 h-10 rounded-full bg-white border-2 border-[#172017] flex items-center justify-center font-bold text-[#172017] text-xs shadow-sm">
            Rohan
          </div>
          <div className="h-0.5 w-6 bg-[#D5D9CC]" />
          <div className="w-10 h-10 rounded-full bg-[#E8F0E2] border-2 border-[#4E8752] flex items-center justify-center font-bold text-[#4E8752] text-xs shadow-sm">
            Priya
          </div>
        </div>
      </div>
    ),
  },
];

export function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(s => s + 1);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('yatrasarthi_seen_onboarding', 'true');
      }
      onComplete();
    }
  };

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yatrasarthi_seen_onboarding', 'true');
    }
    onSkip();
  };

  const slide = slides[currentSlide];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(23, 32, 23, 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative animate-scale-up"
        style={{ background: '#FFFFFF', minHeight: 520, border: '1px solid #D5D9CC' }}
      >
        {/* Header: Progress & Skip */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ background: '#DCE8D2', color: '#172017' }}
          >
            {slide.badge}
          </span>
          <button
            onClick={handleSkip}
            className="text-sm font-semibold hover:opacity-75 transition-opacity px-2 py-1"
            style={{ color: '#5F665B' }}
          >
            Skip
          </button>
        </div>

        {/* Visual card */}
        <div className="my-3">
          {slide.visual}
        </div>

        {/* Text Content */}
        <div className="my-4">
          <div className="text-xs font-mono font-bold mb-1" style={{ color: '#172017' }}>
            STEP {slide.step} / 03
          </div>
          <h2
            className="font-extrabold text-xl sm:text-2xl mb-2.5 leading-snug"
            style={{ color: '#172017', letterSpacing: '-0.02em' }}
          >
            {slide.headline}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#5F665B' }}>
            {slide.description}
          </p>
        </div>

        {/* Bottom controls: Dots & Next/Get Started */}
        <div className="flex items-center justify-between pt-4 border-t border-[#D5D9CC] mt-auto">
          {/* Dots indicator */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className="h-2 rounded-full transition-all"
                style={{
                  width: currentSlide === i ? 24 : 8,
                  background: currentSlide === i ? '#172017' : '#D5D9CC',
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Action button */}
          <button
            onClick={handleNext}
            className="btn-accent px-6 py-2.5 text-sm font-bold flex items-center gap-2 group cursor-pointer shadow-sm"
          >
            {currentSlide === slides.length - 1 ? (
              <>
                Get started <Sparkles size={16} />
              </>
            ) : (
              <>
                Next <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
