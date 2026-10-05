import { ArrowRight, ChevronRight, Shield, Zap, Sparkles, CheckCircle2, CreditCard } from 'lucide-react';
import { useState } from 'react';

interface HeroProps {
  onNavigate: (page: string) => void;
}

/* ──────────────────────────────────────────────
   BEACH SCENE — signature hero visual
────────────────────────────────────────────── */
/* ──────────────────────────────────────────────
   MOUNTAIN & ROAD JOURNEY SCENE — Seamless Pastel Hero Visual
   Features:
   - 100% borderless, merged into website background (#F5F2E8)
   - Soft, harmonious pastel color palette
   - Aeroplane taking off and climbing high UP into the sky
   - Animated flow on dashed flight trajectory
   - Gentle cruising mini-bus on pastel road
   - Gentle floating sun halos & drifting clouds
────────────────────────────────────────────── */
function BeachScene() {
  const W = 560;
  const H = 380;

  return (
    <div className="relative w-full flex items-center justify-center overflow-visible" style={{ maxWidth: 580 }}>
      {/* Scoped Keyframe Animations */}
      <style>{`
        @keyframes sun-halo-breathe {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.06); opacity: 0.55; }
        }
        @keyframes cloud-float-left {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(14px); }
        }
        @keyframes cloud-float-right {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(-12px); }
        }
        @keyframes flight-takeoff-ascent {
          0% {
            transform: translate(125px, 260px) rotate(-33deg) scale(0.75);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translate(160px, 238px) rotate(-33deg) scale(0.85);
          }
          50% {
            transform: translate(275px, 165px) rotate(-33deg) scale(1);
            opacity: 1;
          }
          85% {
            transform: translate(395px, 89px) rotate(-33deg) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translate(455px, 51px) rotate(-33deg) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes dash-flight-trail {
          to { stroke-dashoffset: -30; }
        }
        @keyframes badge-float-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .anim-sun-halo {
          transform-origin: 418px 105px;
          animation: sun-halo-breathe 4.5s ease-in-out infinite;
        }
        .anim-cloud-a {
          animation: cloud-float-left 7s ease-in-out infinite;
        }
        .anim-cloud-b {
          animation: cloud-float-right 8s ease-in-out infinite;
        }
        .anim-airplane-soar {
          animation: flight-takeoff-ascent 5.2s cubic-bezier(0.25, 0.8, 0.45, 1) infinite;
        }
        .anim-flight-path {
          animation: dash-flight-trail 1.2s linear infinite;
        }
        .anim-pill-badge {
          animation: badge-float-subtle 4s ease-in-out infinite;
        }
      `}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        style={{ height: 'auto', aspectRatio: `${W}/${H}`, display: 'block', background: 'transparent' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Ambient Radial Wash behind mountains */}
          <radialGradient id="pastel-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EAF3EC" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#F5F2E8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F5F2E8" stopOpacity="0" />
          </radialGradient>

          {/* Solid rich pastel blue land layers matching left, center, right and downside */}
          <linearGradient id="pastel-hill-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8D2DF" />
            <stop offset="100%" stopColor="#96C5D4" />
          </linearGradient>

          <linearGradient id="pastel-hill-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8EC3D5" />
            <stop offset="100%" stopColor="#76B5C7" />
          </linearGradient>

          {/* Soft Floating Pill Badge Shadow */}
          <filter id="soft-pill-shadow" x="-10%" y="-20%" width="125%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(23,32,23,0.08)" />
          </filter>

          {/* Very Subtle Dot Texture merging on #F5F2E8 */}
          <pattern id="pastel-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#758A80" opacity="0.08" />
          </pattern>
        </defs>

        {/* ── 1. Seamless Background Wash (No bounding box) ── */}
        <ellipse cx="280" cy="210" rx="275" ry="170" fill="url(#pastel-glow)" />
        <rect x="40" y="30" width="480" height="280" fill="url(#pastel-dots)" opacity="0.75" />

        {/* ── 2. Sun & Concentric Warm Halos (Top Right) ── */}
        <g>
          {/* Outer gentle halo */}
          <circle cx="418" cy="105" r="90" fill="#FDF3D4" className="anim-sun-halo" />
          {/* Inner gentle halo */}
          <circle cx="418" cy="105" r="64" fill="#FDE7AA" opacity="0.4" />
          {/* Core Sun (Soft pastel golden amber) */}
          <circle cx="418" cy="105" r="40" fill="#F9D072" />
        </g>

        {/* ── 3. Soft Floating White Clouds ── */}
        {/* Cloud 1: Upper Center */}
        <g className="anim-cloud-a" style={{ transformOrigin: '280px 48px' }}>
          <circle cx="265" cy="45" r="16" fill="#FFFFFF" opacity="0.9" />
          <circle cx="285" cy="36" r="22" fill="#FFFFFF" opacity="0.95" />
          <circle cx="308" cy="44" r="15" fill="#FFFFFF" opacity="0.9" />
          <rect x="250" y="44" width="70" height="18" rx="9" fill="#FFFFFF" opacity="0.92" />
        </g>

        {/* Cloud 2: Middle Left */}
        <g className="anim-cloud-b" style={{ transformOrigin: '150px 92px' }}>
          <circle cx="132" cy="90" r="14" fill="#FFFFFF" opacity="0.9" />
          <circle cx="150" cy="82" r="18" fill="#FFFFFF" opacity="0.94" />
          <circle cx="168" cy="90" r="13" fill="#FFFFFF" opacity="0.9" />
          <rect x="120" y="88" width="60" height="16" rx="8" fill="#FFFFFF" opacity="0.92" />
        </g>

        {/* Cloud 3: Right (passing near sun) */}
        <g className="anim-cloud-a" style={{ transformOrigin: '468px 146px' }}>
          <circle cx="452" cy="144" r="14" fill="#FFFFFF" opacity="0.92" />
          <circle cx="470" cy="135" r="19" fill="#FFFFFF" opacity="0.95" />
          <circle cx="488" cy="144" r="13" fill="#FFFFFF" opacity="0.92" />
          <rect x="438" y="142" width="64" height="16" rx="8" fill="#FFFFFF" opacity="0.93" />
        </g>

        {/* ── 4. Soft Pastel Triangular Mountain Peaks ── */}
        {/* Far Left Step Block */}
        <polygon points="78,320 78,285 150,285 180,312 180,340 78,340" fill="#9CC5B7" opacity="0.75" />
        <polygon points="78,285 150,285 180,296 108,296" fill="#BFE0D5" opacity="0.85" />

        {/* Distant Ridge Peak (between left and center) */}
        <polygon points="175,246 265,335 88,335" fill="#B2DDD0" opacity="0.8" />

        {/* Left Mountain (Pastel Sage) */}
        <polygon points="155,188 228,330 82,330" fill="#8EBEAF" />
        {/* Left Mountain Snowcap */}
        <path d="M 132 230 Q 155 235 178 230 L 155 188 Z" fill="#CDE8DE" />

        {/* Center Mountain (Tallest Peak - Pastel Pine Teal) */}
        <polygon points="275,165 378,335 172,335" fill="#5AA899" />
        {/* Center Mountain Snowcap */}
        <path d="M 241 221 Q 275 227 309 221 L 275 165 Z" fill="#BCE0D1" />

        {/* Right Mountain (Pastel Jade Sage) */}
        <polygon points="426,176 520,335 332,335" fill="#78B3A4" />
        {/* Right Mountain Snowcap */}
        <path d="M 394 222 Q 426 228 458 222 L 426 176 Z" fill="#D3EBE4" />

        {/* ── 5. Flight Trajectory & Continuously Ascending Airplane ── */}
        {/* Dashed trajectory line extending up across the sky */}
        <line
          x1="130"
          y1="258"
          x2="450"
          y2="55"
          stroke="#72A89C"
          strokeWidth="2"
          strokeDasharray="6 5"
          strokeLinecap="round"
          className="anim-flight-path"
          opacity="0.8"
        />

        {/* The Aeroplane — Soaring UPWARD along the flight path */}
        <g className="anim-airplane-soar">
          {/* Stylized Monoplane (Crisp pastel teal & white) */}
          <g>
            {/* Left wing */}
            <path d="M 0 -2 L -13 -13 L -6 -14 L 4 -4 Z" fill="#246D63" stroke="#246D63" strokeWidth="1" />
            {/* Right wing */}
            <path d="M 0 2 L -13 13 L -6 14 L 4 4 Z" fill="#246D63" stroke="#246D63" strokeWidth="1" />
            {/* Tail fin */}
            <path d="M -16 -1 L -23 -7 L -20 -8 L -13 -2 Z" fill="#246D63" />
            <path d="M -16 1 L -23 7 L -20 8 L -13 2 Z" fill="#246D63" />
            {/* Fuselage */}
            <path
              d="M 13 0 C 13 -4.5, -17 -4.5, -19 0 C -17 4.5, 13 4.5, 13 0 Z"
              fill="#FFFFFF"
              stroke="#246D63"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            {/* Cockpit windshield */}
            <ellipse cx="7" cy="0" rx="3.5" ry="1.6" fill="#246D63" />
          </g>
        </g>

        {/* ── 6. Rolling Ground Hills & Winding Road ── */}
        {/* Back rolling hill */}
        <path
          d="M -20 326 Q 140 308 280 318 Q 420 328 580 312 L 580 380 L -20 380 Z"
          fill="url(#pastel-hill-back)"
        />
        {/* Front rolling hill (matching consistent pastel blue across left, right, and downside) */}
        <path
          d="M -20 338 Q 180 322 360 330 Q 480 336 580 322 L 580 380 L -20 380 Z"
          fill="url(#pastel-hill-front)"
        />

        {/* Road (Smooth pastel golden ribbon) */}
        <path
          d="M -50 348 Q 180 335 360 324 T 610 300"
          fill="none"
          stroke="#E5AF5E"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* ── 7. Animated Pastel Travel Mini-Bus (Drives directly along the yellow line) ── */}
        <g>
          <animateMotion
            path="M -50 348 Q 180 335 360 324 T 610 300"
            dur="9s"
            repeatCount="indefinite"
            rotate="auto"
          />
          <animate
            attributeName="opacity"
            values="0; 1; 1; 1; 0"
            keyTimes="0; 0.05; 0.92; 0.98; 1"
            dur="9s"
            repeatCount="indefinite"
          />
          {/* Bus shadow touching the road */}
          <ellipse cx="0" cy="0.5" rx="23" ry="2" fill="rgba(23,32,23,0.16)" />

          {/* Main Body (Soft Warm Honey/Amber) */}
          <rect x="-24" y="-23.5" width="48" height="19.5" rx="5" fill="#F5BA58" />
          {/* Roof tint layer */}
          <path d="M -24 -19 Q -24 -23.5 -19 -23.5 L 19 -23.5 Q 24 -23.5 24 -19 L 24 -16 L -24 -16 Z" fill="#F9CA77" />

          {/* Windows (3 passenger windows + front windshield) */}
          <rect x="-19" y="-19.5" width="7.5" height="6.5" rx="1.8" fill="#FFF7EA" />
          <rect x="-9" y="-19.5" width="7.5" height="6.5" rx="1.8" fill="#FFF7EA" />
          <rect x="1" y="-19.5" width="7.5" height="6.5" rx="1.8" fill="#FFF7EA" />
          <rect x="11" y="-19.5" width="8" height="6.5" rx="1.8" fill="#FFF7EA" />

          {/* Headlight (Soft pastel gold) */}
          <rect x="23" y="-11" width="2" height="3" rx="1" fill="#FFF2BD" />

          {/* Wheels (placed directly on the yellow road surface) */}
          {/* Rear Wheel */}
          <circle cx="-13" cy="-4.5" r="5" fill="#253A3A" />
          <circle cx="-13" cy="-4.5" r="2" fill="#A1BCBC" />
          <circle cx="-13" cy="-4.5" r="0.8" fill="#253A3A" />

          {/* Front Wheel */}
          <circle cx="14" cy="-4.5" r="5" fill="#253A3A" />
          <circle cx="14" cy="-4.5" r="2" fill="#A1BCBC" />
          <circle cx="14" cy="-4.5" r="0.8" fill="#253A3A" />
        </g>

        {/* ── 8. Soft Floating Pastel Pill Badge (Right Pill only: Connected Trip) ── */}
        <g transform="translate(376, 218)">
          <g className="anim-pill-badge" style={{ animationDelay: '1.5s' }} filter="url(#soft-pill-shadow)">
            <rect width="164" height="42" rx="21" fill="rgba(255,255,255,0.92)" stroke="#D5D9CC" strokeWidth="1" />
            <circle cx="21" cy="21" r="11" fill="#DCE8D2" />
            <text x="14" y="25" fontSize="11">✈</text>
            <text x="38" y="18" fontSize="8" fill="#5F665B" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" letterSpacing="0.04em">CONNECTED TRIP</text>
            <text x="38" y="31" fontSize="10.5" fill="#172017" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
              Flight + Cab + Stay
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}


/* ──────────────────────────────────────────────
   STAT
────────────────────────────────────────────── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center lg:text-left">
      <div className="font-extrabold text-2xl tracking-tight" style={{ color: '#172017' }}>{value}</div>
      <div className="text-sm mt-0.5" style={{ color: '#5F665B' }}>{label}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   HERO
────────────────────────────────────────────── */
export function Hero({ onNavigate }: HeroProps) {
  return (
    <>
      {/* ── SECTION 1: Hero (warm cream background) ── */}
      <section style={{ background: '#F5F2E8', paddingTop: '1.5rem', paddingBottom: '3.5rem' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col lg:flex-row items-center gap-10 lg:gap-14">

          {/* Left */}
          <div className="flex-1 text-center lg:text-left" style={{ maxWidth: 530 }}>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 tracking-wide"
              style={{ background: '#DCE8D2', color: '#172017', border: '1px solid #D5D9CC', letterSpacing: '0.04em' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#172017]" />
              INTELLIGENT GROUP TRAVEL RECOVERY
            </div>

            <h1
              className="font-extrabold leading-tight mb-4"
              style={{ fontSize: 'clamp(2rem, 3.8vw, 3.1rem)', color: '#172017', letterSpacing: '-0.025em', lineHeight: 1.1 }}
            >
              Your trip can change.
              <br />
              <span className="text-gradient">Your plans</span>
              <br />
              don't have to.
            </h1>

            <p className="mb-6 leading-relaxed text-sm sm:text-[15px]" style={{ color: '#5F665B', maxWidth: 440 }}>
              YatraSarthi watches the connections between your flights, trains, cabs, hotels and activities — analyzing dependencies, calculating slack, and coordinating verified vendor actions when disruptions strike.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <button
                onClick={() => onNavigate('new-trip')}
                className="btn-accent px-5 py-3 text-sm flex items-center justify-center gap-2 shadow-sm font-bold"
              >
                Plan a trip
                <ArrowRight size={16} />
              </button>
              
              <button
                onClick={() => onNavigate('dashboard')}
                className="btn-secondary px-4 py-3 text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles size={15} style={{ color: '#172017' }} />
                User Dashboard
              </button>

              <button
                onClick={() => onNavigate('recovery')}
                className="btn-secondary px-4 py-3 text-sm flex items-center justify-center gap-1.5"
              >
                See Recovery
                <ChevronRight size={15} style={{ color: '#5F665B' }} />
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
              <Stat value="4.8k+" label="Trips protected" />
              <div className="w-px self-stretch" style={{ background: '#D5D9CC' }} />
              <Stat value="94%" label="Recovery success" />
              <div className="w-px self-stretch" style={{ background: '#D5D9CC' }} />
              <Stat value="2.3 min" label="Avg. detection time" />
              <div className="w-px self-stretch" style={{ background: '#D5D9CC' }} />
              <Stat value="100%" label="Honest state proof" />
            </div>
            <p className="text-xs mt-2.5 font-medium" style={{ color: '#4E8752' }}>✓ Built for Indian multi-modal group journeys</p>
          </div>

          {/* Right — beach scene */}
          <div className="flex-1 w-full flex justify-center">
            <BeachScene />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Solution v2 Architectural Pillars ── */}
      <SolutionV2PillarsSection onNavigate={onNavigate} />

      {/* ── SECTION 3: Group Journey ── */}
      <GroupJourneySection onNavigate={onNavigate} />

      {/* ── SECTION 4: Plan or Import ── */}
      <PlanOrImportSection onNavigate={onNavigate} />

      {/* ── SECTION 5: How it works ── */}
      <HowItWorksSection />

      {/* ── SECTION 6: Disruption story ── */}
      <DisruptionStorySection onNavigate={onNavigate} />

      {/* ── SECTION 7: Final CTA ── */}
      <FinalCTASection onNavigate={onNavigate} />
    </>
  );
}

/* ──────────────────────────────────────────────
   SECTION: Solution v2 Pillars
────────────────────────────────────────────── */
function SolutionV2PillarsSection({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <section style={{ background: '#EDE9D8', padding: '4.5rem 0', borderTop: '1px solid #D5D9CC', borderBottom: '1px solid #D5D9CC' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ color: '#172017', letterSpacing: '0.12em' }}>
            ENGINEERED FOR REAL INDIAN TRAVEL
          </div>
          <h2 className="font-extrabold text-2xl sm:text-3xl mb-3 tracking-tight" style={{ color: '#172017' }}>
            What makes YatraSarthi v2 different
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#5F665B' }}>
            It doesn't just guess or alert. It understands what breaks, calculates buffer slack, orchestrates regulated aggregator payments, and enforces honest vendor confirmation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Pillar 1 */}
          <div className="card p-5 bg-white border hover:shadow-md transition-all" style={{ borderColor: '#D5D9CC' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold mb-3" style={{ background: '#DCE8D2', color: '#172017' }}>
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-base mb-1.5" style={{ color: '#172017' }}>Honest State Engine</h3>
            <p className="text-xs leading-relaxed" style={{ color: '#5F665B' }}>
              Your itinerary turns <strong style={{ color: '#2E7D32' }}>Green</strong> only when the vendor confirms with real API proof or signed response. Never on user tap alone. Red = broken, Amber = awaiting vendor.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="card p-5 bg-white border hover:shadow-md transition-all" style={{ borderColor: '#D5D9CC' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold mb-3" style={{ background: '#E8F0E2', color: '#172017' }}>
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-base mb-1.5" style={{ color: '#172017' }}>Slack-Aware Cascade</h3>
            <p className="text-xs leading-relaxed" style={{ color: '#5F665B' }}>
              Delays flow through buffers. Hard constraints (fixed cabs, flight departures) break; soft constraints (hotel check-in windows, dinner reservations) absorb the delay gracefully without false alarms.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="card p-5 bg-white border hover:shadow-md transition-all" style={{ borderColor: '#D5D9CC' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold mb-3" style={{ background: '#DCE8D2', color: '#172017' }}>
              <CreditCard size={20} />
            </div>
            <h3 className="font-bold text-base mb-1.5" style={{ color: '#172017' }}>Aggregator Split-Pay Rail</h3>
            <p className="text-xs leading-relaxed" style={{ color: '#5F665B' }}>
              Compliant with RBI digital lending & UPI P2P collect regulations (October 2025). Unique payment links via Razorpay/Cashfree class aggregators with signed webhooks and auto-refund timeouts.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="card p-5 bg-white border hover:shadow-md transition-all" style={{ borderColor: '#D5D9CC' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold mb-3" style={{ background: '#FDECEA', color: '#D93829' }}>
              <CheckCircle2 size={20} />
            </div>
            <h3 className="font-bold text-base mb-1.5" style={{ color: '#172017' }}>DGCA Passenger Rights</h3>
            <p className="text-xs leading-relaxed" style={{ color: '#5F665B' }}>
              Models statutory compensation under CAR Section 3, Series M, Part IV. Distinguishes airline fault from extraordinary monsoon/ATC circumstances without misleadingly netting compensation into quotes.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   SECTION: Group Journey
────────────────────────────────────────────── */
function GroupJourneySection({ onNavigate }: { onNavigate: (p: string) => void }) {
  const travelers = [
    { name: 'Harsh', origin: 'Mumbai', mode: 'Flight', color: '#172017', status: 'on_track' },
    { name: 'Tanvi', origin: 'Pune', mode: 'Train', color: '#D93829', status: 'delayed', delay: '+4h' },
    { name: 'Nupur', origin: 'Nashik', mode: 'Bus', color: '#4E8752', status: 'on_track' },
    { name: 'Shravani', origin: 'Bangalore', mode: 'Flight', color: '#858B80', status: 'on_track' },
  ];

  return (
    <section style={{ background: '#F5F2E8', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">

          {/* Text side */}
          <div className="flex-1" style={{ maxWidth: 460 }}>
            <div className="text-xs font-bold tracking-widest mb-4 uppercase" style={{ color: '#5F665B', letterSpacing: '0.12em' }}>
              THE GROUP JOURNEY
            </div>
            <h2
              className="font-extrabold mb-4 leading-tight"
              style={{ fontSize: 'clamp(2rem, 3.8vw, 2.8rem)', color: '#172017', letterSpacing: '-0.02em' }}
            >
              Four travelers.
              <br />
              Four starting points.
              <br />
              <span className="px-2 py-0.5 rounded-lg bg-[#DCE8D2] text-[#172017]">One journey.</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: '#5F665B' }}>
              YatraSarthi understands every traveler individually — then connects the journeys that depend on each other. A group trip is not one itinerary. It's multiple journeys becoming one connected trip.
            </p>
            <button
              onClick={() => onNavigate('group')}
              className="btn-primary px-5 py-3 text-sm flex items-center gap-2"
            >
              See group journey
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Visual side */}
          <div className="flex-1 w-full" style={{ maxWidth: 500 }}>
            <div className="space-y-3">
              {/* Individual travelers */}
              {travelers.map(t => (
                <div
                  key={t.name}
                  className="card-sm px-4 py-3 flex items-center gap-4 bg-white border"
                  style={{ borderLeft: `4px solid ${t.color}`, borderColor: '#D5D9CC' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: t.color }}
                  >
                    {t.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: '#172017' }}>{t.name}</span>
                      {t.delay && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold badge-danger">{t.delay}</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#5F665B' }}>{t.origin} → {t.mode} → Goa</div>
                  </div>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: t.status === 'on_track' ? '#4E8752' : '#D93829' }}
                  />
                </div>
              ))}

              {/* Convergence arrow */}
              <div className="flex items-center gap-3 py-1 px-4">
                <div className="flex-1 h-px" style={{ background: '#D5D9CC' }} />
                <div className="text-xs font-semibold" style={{ color: '#5F665B' }}>All routes converge</div>
                <div className="flex-1 h-px" style={{ background: '#D5D9CC' }} />
              </div>

              {/* Meetup */}
              <div className="card px-4 py-4 border bg-white" style={{ borderColor: '#D5D9CC' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold" style={{ color: '#172017', fontSize: 13, letterSpacing: '0.06em' }}>GOA MEETUP POINT</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCE8D2] text-[#172017]">14:30</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Shared Cab', icon: '🚕' },
                    { label: 'Hotel', icon: '🏨' },
                    { label: 'Sunset Dinner', icon: '🌅' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#E8F0E2', color: '#172017', border: '1px solid #D5D9CC' }}>
                      <span>{s.icon}</span>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   SECTION: Plan or Import
────────────────────────────────────────────── */
function PlanOrImportSection({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <section style={{ background: '#EDE9D8', padding: '5rem 0' }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center mb-10">
        <div className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ color: '#5F665B', letterSpacing: '0.12em' }}>
          GET STARTED
        </div>
        <h2 className="font-extrabold mb-3" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', color: '#172017', letterSpacing: '-0.02em' }}>
          Start from scratch — or bring your bookings.
        </h2>
        <p style={{ color: '#5F665B', fontSize: '1rem' }}>
          YatraSarthi works with what you have.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create from scratch */}
        <div className="card p-7 flex flex-col bg-white border" style={{ borderColor: '#D5D9CC' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#172017', color: '#C5D82D' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 3v16M3 11h16" stroke="#C5D82D" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="font-bold text-xl mb-2" style={{ color: '#172017' }}>Plan a new trip</h3>
          <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: '#5F665B' }}>
            Tell YatraSarthi where each traveler is coming from, set preferences, and get connected itinerary recommendations — flights, trains, hotels and more.
          </p>
          <ul className="flex flex-col gap-2 mb-6">
            {['Set destinations & dates', 'Add multiple travelers + origins', 'Get personalized recommendations', 'Build the connected graph'].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#5F665B' }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#DCE8D2' }}>
                  <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4L3.5 6L6.5 2" stroke="#172017" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button onClick={() => onNavigate('new-trip')} className="btn-accent py-3 text-sm w-full font-bold">
            Plan a trip <ArrowRight size={14} />
          </button>
        </div>

        {/* Import */}
        <div className="card p-7 flex flex-col bg-white border" style={{ borderColor: '#D5D9CC' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#DCE8D2', color: '#172017' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M19 14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#172017" strokeWidth="2" strokeLinecap="round" />
              <polyline points="7 10 11 14 15 10" stroke="#172017" strokeWidth="2" strokeLinecap="round" />
              <line x1="11" y1="14" x2="11" y2="3" stroke="#172017" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="font-bold text-xl mb-2" style={{ color: '#172017' }}>Import existing bookings</h3>
          <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: '#5F665B' }}>
            Already have bookings? Import them once. YatraSarthi extracts, connects, and monitors them. No re-upload needed when disruptions happen.
          </p>
          <ul className="flex flex-col gap-2 mb-6">
            {['PDF, screenshot, SMS, email', 'Automatic extraction + review', 'Connections built once', 'Trip saved — always ready'].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#5F665B' }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#DCE8D2' }}>
                  <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4L3.5 6L6.5 2" stroke="#172017" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button onClick={() => onNavigate('new-trip')} className="btn-secondary py-3 text-sm w-full">
            Import itinerary
            <ArrowRight size={14} style={{ color: '#172017' }} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   SECTION: How it works
────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'Connect', desc: 'Import or plan your trip once. Every traveler\'s journey is mapped individually into a connected graph.' },
    { n: '02', title: 'Monitor', desc: 'YatraSarthi watches live status across flights, trains, roads, and bookings — continuously.' },
    { n: '03', title: 'Detect', desc: 'A disruption triggers cascade analysis. Only actually affected nodes are marked at risk — not everything.' },
    { n: '04', title: 'Recover', desc: 'Feasible recovery paths are ranked by your group\'s preferences. The group approves. Vendors are coordinated.' },
  ];

  return (
    <section style={{ background: '#F5F2E8', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12">
          <div className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ color: '#5F665B', letterSpacing: '0.12em' }}>HOW IT WORKS</div>
          <h2 className="font-extrabold" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', color: '#172017', letterSpacing: '-0.02em' }}>
            Plan → Connect → Monitor → Recover
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 relative">
          {/* Connector line */}
          <div
            className="hidden lg:block absolute top-8 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(to right, transparent, #D5D9CC, #D5D9CC, transparent)', top: 24 }}
          />

          {steps.map((s) => (
            <div key={s.n} className="flex flex-col items-center lg:items-start px-6 py-5 relative">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-base mb-4 relative z-10"
                style={{ background: '#DCE8D2', border: '2px solid #C5D82D', color: '#172017', fontVariantNumeric: 'tabular-nums' }}
              >
                {s.n}
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: '#172017' }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5F665B' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   SECTION: Disruption story
────────────────────────────────────────────── */
function DisruptionStorySection({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [active, setActive] = useState<number>(0);

  const states = [
    {
      label: 'Healthy trip',
      nodes: [
        { label: "Tanvi's Train", status: 'confirmed', note: 'On time' },
        { label: 'Shared Cab', status: 'confirmed', note: 'Booked' },
        { label: 'Hotel Check-in', status: 'confirmed', note: 'Confirmed' },
        { label: 'Group Dinner', status: 'confirmed', note: 'Reserved' },
      ],
    },
    {
      label: 'Disruption detected',
      nodes: [
        { label: "Tanvi's Train", status: 'disrupted', note: '+4h delay' },
        { label: 'Shared Cab', status: 'disrupted', note: 'Buffer exceeded' },
        { label: 'Hotel Check-in', status: 'pending', note: 'AT RISK' },
        { label: 'Group Dinner', status: 'confirmed', note: '6h buffer · SAFE' },
      ],
    },
    {
      label: 'Recovery approved',
      nodes: [
        { label: "Tanvi's Train", status: 'disrupted', note: '+4h delay' },
        { label: 'Cab pushed to 14:00', status: 'pending', note: 'Pending vendor' },
        { label: 'Hotel Check-in', status: 'pending', note: 'Notified' },
        { label: 'Group Dinner', status: 'confirmed', note: 'Preserved' },
      ],
    },
    {
      label: 'Trip recovered',
      nodes: [
        { label: "Tanvi's Train", status: 'disrupted', note: '+4h (arrived)' },
        { label: 'Cab rescheduled', status: 'confirmed', note: 'Vendor confirmed' },
        { label: 'Hotel Check-in', status: 'confirmed', note: 'Confirmed 14:30' },
        { label: 'Group Dinner', status: 'confirmed', note: 'Preserved' },
      ],
    },
  ];

  const colorMap: Record<string, string> = { confirmed: '#2E7D32', pending: '#8D6E1A', disrupted: '#D93829' };
  const bgMap: Record<string, string> = { confirmed: '#E8F0E2', pending: '#FAF5D8', disrupted: '#FDECEA' };

  return (
    <section style={{ background: '#EDE9D8', padding: '5rem 0' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">

          {/* Left text */}
          <div className="flex-1" style={{ maxWidth: 430 }}>
            <div className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ color: '#5F665B', letterSpacing: '0.12em' }}>
              DISRUPTION RECOVERY
            </div>
            <h2 className="font-extrabold mb-4" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.7rem)', color: '#172017', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Only what breaks
              <br />
              gets flagged.
              <br />
              <span className="px-2 py-0.5 rounded-lg bg-[#C5D82D] text-[#172017]">The rest stays safe.</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: '#5F665B' }}>
              YatraSarthi calculates the actual slack in each connection. A delayed train doesn't automatically break dinner — only the nodes with exhausted buffers are affected.
            </p>

            {/* Step pills */}
            <div className="flex flex-col gap-2 mb-6">
              {states.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
                  style={{
                    background: active === i ? '#FFFFFF' : 'transparent',
                    border: active === i ? '1px solid #172017' : '1px solid transparent',
                    color: active === i ? '#172017' : '#5F665B',
                    fontWeight: active === i ? 700 : 500,
                    boxShadow: active === i ? '0 2px 10px rgba(23,32,23,0.08)' : 'none',
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: active === i ? '#172017' : '#DCE8D2',
                      color: active === i ? '#F5F2E8' : '#172017',
                    }}
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>

            <button onClick={() => onNavigate('recovery')} className="btn-primary px-5 py-3 text-sm">
              Simulate a disruption →
            </button>
          </div>

          {/* Right — state visualization */}
          <div className="flex-1 w-full" style={{ maxWidth: 420 }}>
            <div className="card p-6 bg-white shadow-sm border" style={{ borderColor: '#D5D9CC' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-sm" style={{ color: '#172017' }}>
                  {states[active].label}
                </span>
                {active > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F0E2] text-[#172017]">
                    Simulated
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {states[active].nodes.map((node, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all animate-fade-in border"
                    style={{ background: bgMap[node.status], borderColor: '#D5D9CC' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorMap[node.status] }} />
                    <div className="flex-1">
                      <div className="font-medium text-sm" style={{ color: '#172017' }}>{node.label}</div>
                      <div className="text-xs font-semibold" style={{ color: colorMap[node.status] }}>{node.note}</div>
                    </div>
                  </div>
                ))}
              </div>

              {active === 3 && (
                <div className="mt-4 p-3 rounded-xl text-center border" style={{ background: '#E8F0E2', borderColor: '#D5D9CC' }}>
                  <div className="font-bold text-sm" style={{ color: '#172017' }}>Trip Health: 91/100 ↑</div>
                  <div className="text-xs mt-0.5" style={{ color: '#4E8752' }}>Recovered — all bookings preserved</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   SECTION: Final CTA
────────────────────────────────────────────── */
function FinalCTASection({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <section style={{ background: 'linear-gradient(135deg, #172017 0%, #202D20 50%, #172017 100%)', padding: '6rem 0' }}>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <h2
          className="font-extrabold mb-4"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', color: '#F5F2E8', letterSpacing: '-0.03em', lineHeight: 1.15 }}
        >
          Travel changes.
          <br />
          <span style={{ color: '#C5D82D' }}>Your plans don't have to fall apart.</span>
        </h2>
        <p className="text-base sm:text-lg mb-8" style={{ color: '#DCE8D2' }}>
          Connect your journey once. YatraSarthi takes care of the changes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onNavigate('new-trip')}
            className="btn-accent px-7 py-3.5 text-sm font-bold shadow-md"
          >
            Plan my trip <ArrowRight size={16} />
          </button>
          <button
            onClick={() => onNavigate('new-trip')}
            className="px-7 py-3.5 text-sm font-semibold rounded-full border border-[#D5D9CC] text-[#F5F2E8] hover:bg-[#202D20] transition-all"
          >
            Import itinerary
          </button>
        </div>
      </div>
    </section>
  );
}
