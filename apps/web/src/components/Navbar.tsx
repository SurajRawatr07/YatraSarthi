"use client";

import { useState, useEffect } from 'react';
import { Bell, User as UserIcon, ChevronRight, X, Menu, ArrowRight, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trips', label: 'My Trips' },
  { id: 'group', label: 'Group' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'suraksha', label: 'Suraksha' },
  { 
    id: 'digital-twin', label: 'Digital Twin', icon: '⚡', highlight: true, 
    activeBg: '#172017', activeText: '#C5D82D', idleBg: '#C5D82D', idleText: '#172017', border: '#172017' 
  },
  { 
    id: 'assistant', label: 'Assistant', icon: '🤖', highlight: true, 
    activeBg: '#172017', activeText: '#A78BFA', idleBg: '#F3E8FF', idleText: '#6D28D9', border: '#D8B4FE' 
  },
];


/* SVG logo mark — Deep forest path with lime beacon */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 26 Q6 18 16 16 Q26 14 26 6" stroke="#172017" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="6" cy="26" r="3" fill="#172017" />
      <circle cx="26" cy="6" r="5.5" fill="#C5D82D" />
      <path d="M26 3.5 L27.2 5.8 L26 5.2 L24.8 5.8 Z" fill="#172017" />
      <path d="M26 8.5 L24.8 6.2 L26 6.8 L27.2 6.2 Z" fill="#172017" opacity="0.6" />
      <path d="M23.5 6 L25.8 4.8 L25.2 6 L25.8 7.2 Z" fill="#172017" opacity="0.6" />
      <path d="M28.5 6 L26.2 7.2 L26.8 6 L26.2 4.8 Z" fill="#172017" />
      <circle cx="16" cy="16" r="2.5" fill="#C5D82D" stroke="#172017" strokeWidth="1.5" />
    </svg>
  );
}

export function Navbar({ activePage, onNavigate }: NavbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, startAuthFlow } = useAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-40 transition-all"
        style={{
          background: scrolled ? 'rgba(245, 242, 232, 0.96)' : 'rgba(245, 242, 232, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid #D5D9CC' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-8">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer"
            style={{ textDecoration: 'none' }}
          >
            <LogoMark size={30} />
            <span className="font-extrabold text-lg tracking-tight text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
              YatraSarthi
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map((link: any) => {
              const isActive = activePage === link.id;
              if (link.highlight) {
                return (
                  <button
                    key={link.id}
                    onClick={() => onNavigate(link.id)}
                    className="ml-2 px-4 py-2 text-[13px] font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    style={{
                      background: isActive ? link.activeBg : link.idleBg,
                      color: isActive ? link.activeText : link.idleText,
                      border: `1.5px solid ${isActive ? 'transparent' : link.border}`,
                      boxShadow: isActive ? '0 4px 12px rgba(23,32,23,0.15)' : 'none'
                    }}
                  >
                    <span>{link.icon}</span>
                    {link.label}
                  </button>
                );
              }
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className="px-3.5 py-2 text-sm font-medium transition-all cursor-pointer relative whitespace-nowrap"
                  style={{
                    color: isActive ? '#172017' : '#5F665B',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-3.5 right-3.5 h-[2.5px] rounded-full"
                      style={{ background: '#C5D82D' }}
                    />
                  )}
                </button>
              );
            })}

          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <button className="btn-ghost relative cursor-pointer" style={{ padding: '8px 10px' }} title="Notifications">
              <Bell size={17} style={{ color: '#172017' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#C5D82D' }} />
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="btn-ghost flex items-center gap-2 transition-all cursor-pointer"
                  style={{
                    padding: '6px 12px',
                    background: activePage === 'dashboard' ? '#E8F0E2' : '#EDE9D8',
                    color: '#172017',
                    border: '1px solid #D5D9CC',
                    borderRadius: '9999px',
                  }}
                  title={user.phone}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#F5F2E8]"
                    style={{ background: '#172017' }}
                  >
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold">{user.name || user.phone}</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="btn-ghost text-xs p-2 text-[#5F665B] hover:text-[#D93829] transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => startAuthFlow('signin')}
                className="btn-ghost flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D5D9CC] text-xs font-bold text-[#172017] hover:bg-[#E8F0E2] transition-all cursor-pointer"
              >
                <LogIn size={15} style={{ color: '#172017' }} />
                <span>Log In / Sign Up</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('new-trip')}
              className="btn-accent text-xs px-5 py-2.5 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Plan a trip</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile right */}
          <div className="md:hidden ml-auto flex items-center gap-1">
            {user ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="btn-ghost"
                style={{ padding: '8px 10px', color: activePage === 'dashboard' ? '#172017' : '#5F665B' }}
                title="User Dashboard"
              >
                <UserIcon size={18} />
              </button>
            ) : (
              <button
                onClick={() => startAuthFlow('signin')}
                className="px-3 py-1 text-xs font-bold rounded-full bg-[#E8F0E2] text-[#172017]"
              >
                Sign in
              </button>
            )}
            <button className="btn-ghost relative" style={{ padding: '8px 10px' }}>
              <Bell size={17} style={{ color: '#172017' }} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#C5D82D' }} />
            </button>
            <button onClick={() => setDrawerOpen(true)} className="btn-ghost" style={{ padding: '8px 10px' }}>
              <Menu size={20} style={{ color: '#172017' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div
            className="fixed right-0 top-0 h-full z-50 flex flex-col"
            style={{ width: 300, background: '#F5F2E8', borderLeft: '1px solid #D5D9CC', transform: 'translateX(0)', animation: 'slide-up 0.2s ease' }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#D5D9CC' }}>
              <div className="flex items-center gap-2">
                <LogoMark size={24} />
                <span className="font-bold text-[#172017]">YatraSarthi</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="btn-ghost" style={{ padding: '6px 8px' }}>
                <X size={18} />
              </button>
            </div>

            {user ? (
              <div className="p-4 mx-4 mt-3 rounded-2xl bg-[#E8F0E2] border border-[#D5D9CC] flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[#172017]">{user.name}</div>
                  <div className="text-xs text-[#5F665B]">{user.phone}</div>
                </div>
                <button
                  onClick={() => { logout(); setDrawerOpen(false); }}
                  className="text-xs font-bold text-[#D93829] hover:underline"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="p-4">
                <button
                  onClick={() => { startAuthFlow('signin'); setDrawerOpen(false); }}
                  className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <LogIn size={14} />
                  <span>Sign In / Register</span>
                </button>
              </div>
            )}

            <nav className="flex flex-col gap-1 p-4 flex-1">
              {(navLinks as any[]).map((link: any) => (
                <button
                  key={link.id}
                  onClick={() => { onNavigate(link.id); setDrawerOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
                  style={{
                    background: link.highlight
                      ? (activePage === link.id ? '#172017' : '#C5D82D')
                      : (activePage === link.id ? '#E8F0E2' : 'transparent'),
                    color: link.highlight
                      ? (activePage === link.id ? '#C5D82D' : '#172017')
                      : (activePage === link.id ? '#172017' : '#5F665B'),
                    fontWeight: activePage === link.id || link.highlight ? 700 : 500,
                    border: link.highlight ? '1.5px solid #172017' : undefined,
                  }}
                >
                  <span className="flex items-center gap-2">
                    {activePage === link.id && !link.highlight && <span className="w-1.5 h-1.5 rounded-full bg-[#C5D82D]" />}
                    {link.label}
                  </span>
                  <ChevronRight size={14} style={{ color: link.highlight ? '#172017' : '#5F665B', opacity: activePage === link.id || link.highlight ? 1 : 0 }} />
                </button>
              ))}

            </nav>

            <div className="p-4 border-t" style={{ borderColor: '#D5D9CC' }}>
              <button
                onClick={() => { onNavigate('new-trip'); setDrawerOpen(false); }}
                className="btn-accent w-full py-3 text-sm font-bold flex items-center justify-center gap-1.5"
              >
                Plan a trip <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
