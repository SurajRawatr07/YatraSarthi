interface FooterProps {
  onNavigate: (page: string) => void;
}

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M6 26 Q6 18 16 16 Q26 14 26 6" stroke="#C5D82D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="6" cy="26" r="3" fill="#C5D82D" />
      <circle cx="26" cy="6" r="5.5" fill="#C5D82D" />
      <path d="M26 3.5 L27.2 5.8 L26 5.2 L24.8 5.8 Z" fill="#172017" />
      <path d="M26 8.5 L24.8 6.2 L26 6.8 L27.2 6.2 Z" fill="#172017" opacity="0.6" />
      <circle cx="16" cy="16" r="2.5" fill="#172017" stroke="#C5D82D" strokeWidth="2" />
    </svg>
  );
}

export function Footer({ onNavigate }: FooterProps) {
  const links = {
    Product: ['My Trips', 'Group Travel', 'Recovery', 'Suraksha'],
    Support: ['How it works', 'Import bookings', 'Disruption guide'],
    Legal: ['Privacy', 'Terms', 'Data & Security'],
  };

  const pageMap: Record<string, string> = {
    'My Trips': 'trips',
    'Group Travel': 'group',
    'Recovery': 'recovery',
    'Suraksha': 'suraksha',
    'How it works': 'home',
    'Import bookings': 'new-trip',
    'Disruption guide': 'recovery',
  };

  return (
    <footer style={{ background: '#172017', color: '#EDE9D8' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="col-span-2">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5 mb-4">
              <LogoMark size={26} />
              <span className="font-extrabold text-lg" style={{ color: '#F5F2E8', letterSpacing: '-0.01em' }}>YatraSarthi</span>
            </button>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#858B80', maxWidth: 240 }}>
              An intelligent travel companion for group trips. Plan, connect, monitor, and recover.
            </p>
            <div className="font-bold text-sm tracking-wide" style={{ color: '#C5D82D' }}>
              Plan. Connect. Recover.
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs font-semibold mb-4 tracking-widest" style={{ color: '#6F756C', letterSpacing: '0.1em' }}>
                {group.toUpperCase()}
              </div>
              <ul className="flex flex-col gap-2.5">
                {items.map(item => (
                  <li key={item}>
                    <button
                      onClick={() => pageMap[item] && onNavigate(pageMap[item])}
                      className="text-sm transition-colors"
                      style={{ color: '#858B80', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => (e.target as HTMLElement).style.color = '#C5D82D'}
                      onMouseLeave={e => (e.target as HTMLElement).style.color = '#858B80'}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="section-divider my-10" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs" style={{ color: '#6F756C' }}>
            © 2024 YatraSarthi. Prototype — demo data only. Not a real travel booking service.
          </p>
          <p className="text-xs" style={{ color: '#6F756C' }}>
            Travel disruption recovery platform · India
          </p>
        </div>
      </div>
    </footer>
  );
}
