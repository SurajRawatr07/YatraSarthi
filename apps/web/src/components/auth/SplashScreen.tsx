"use client";

import React from 'react';

export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in"
      style={{ background: '#F5F2E8' }}
    >
      <style>{`
        @keyframes fly-plane {
          0% { transform: translate(-30px, 200px) rotate(-15deg) scale(0.6); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(300px, 20px) rotate(-15deg) scale(0.6); opacity: 0; }
        }
        @keyframes cloud-drift-1 {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(20px); }
        }
        @keyframes cloud-drift-2 {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(-15px); }
        }
        @keyframes sun-breathe {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes dash-move {
          to { stroke-dashoffset: -40; }
        }
        .anim-plane { animation: fly-plane 4s linear infinite; }
        .anim-cloud1 { animation: cloud-drift-1 6s ease-in-out infinite; }
        .anim-cloud2 { animation: cloud-drift-2 8s ease-in-out infinite; }
        .anim-sun { animation: sun-breathe 4s ease-in-out infinite; transform-origin: 180px 70px; }
        .anim-dash { animation: dash-move 2s linear infinite; }
      `}</style>

      <div className="flex flex-col items-center max-w-sm mx-auto">
        
        {/* Animated Circle Portal */}
        <div 
          className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden mb-8 shadow-2xl border-[6px] border-white transition-transform hover:scale-105"
          style={{ background: '#E0F2F1' }}
        >
          <svg viewBox="0 0 250 250" className="w-full h-full absolute inset-0">
            {/* Sun (Pastel Orange) */}
            <circle cx="180" cy="70" r="30" fill="#FFCC80" className="anim-sun" />
            
            {/* Background Mountains (Pastel Green) */}
            <path d="M-20,250 L-20,180 Q50,100 125,180 T270,180 L270,250 Z" fill="#C8E6C9" opacity="0.8" />
            
            {/* Foreground Mountains (Slightly darker pastel green) */}
            <path d="M-10,250 L-10,200 Q90,130 175,200 T300,200 L300,250 Z" fill="#A5D6A7" opacity="0.9" />
            
            {/* Clouds */}
            <g fill="#FFFFFF" opacity="0.95">
              <path d="M40,100 Q40,85 55,85 Q65,70 80,75 Q95,70 105,85 Q120,85 120,100 Z" className="anim-cloud1" />
              <path d="M160,130 Q160,120 170,120 Q175,110 185,115 Q195,110 200,120 Q210,120 210,130 Z" className="anim-cloud2" transform="scale(0.8) translate(30, 20)" />
            </g>

            {/* Dashed Flight Path (Pastel Green) */}
            <path 
              d="M-20,180 Q100,120 270,40" 
              fill="none" stroke="#81C784" strokeWidth="3" strokeDasharray="12,8" strokeLinecap="round" opacity="0.7" 
              className="anim-dash" 
            />

            {/* Airplane (Soft Slate and White) */}
            <g className="anim-plane">
              {/* Airplane body */}
              <path d="M-30,15 L30,-12 L35,-7 L-25,20 Z" fill="#455A64" />
              {/* Top Wing */}
              <path d="M-5,2 L10,-28 L15,-25 L0,5 Z" fill="#FFFFFF" />
              {/* Bottom Wing */}
              <path d="M-12,10 L0,35 L-5,37 L-17,12 Z" fill="#FFFFFF" />
              {/* Tail */}
              <path d="M-25,15 L-35,-5 L-27,-2 Z" fill="#455A64" />
            </g>
          </svg>
        </div>

        {/* Wordmark */}
        <h1 className="font-extrabold text-4xl sm:text-5xl tracking-tight mb-3" style={{ color: '#172017', letterSpacing: '-0.03em' }}>
          YatraSarthi
        </h1>

        {/* Tagline */}
        <p className="text-base sm:text-lg font-medium leading-relaxed mb-10 max-w-xs" style={{ color: '#5F665B' }}>
          Your trip, still on track — no matter who broke it.
        </p>

        {/* Loading Indicator (Matching Pastel Colors) */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full animate-bounce shadow-sm" style={{ background: '#455A64', animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full animate-bounce shadow-sm" style={{ background: '#FFCC80', animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full animate-bounce shadow-sm" style={{ background: '#81C784', animationDelay: '300ms' }} />
        </div>

      </div>
    </div>
  );
}
