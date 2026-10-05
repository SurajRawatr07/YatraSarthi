import { Home, RotateCcw, Users, Shield, Zap, Bot } from 'lucide-react';


interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const items = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'recovery', label: 'Recover', icon: RotateCcw },
  { id: 'digital-twin', label: 'Twin', icon: Zap, accent: '#C5D82D' },
  { id: 'assistant', label: 'Assistant', icon: Bot, accent: '#A78BFA' },
  { id: 'group', label: 'Group', icon: Users },
];


export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ background: 'rgba(245,242,232,0.98)', backdropFilter: 'blur(16px)', borderColor: '#D5D9CC' }}
    >
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {items.map(({ id, label, icon: Icon, accent }: any) => {
          const active = activePage === id;
          const isAccent = Boolean(accent);
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{ color: active ? '#172017' : '#5F665B' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: isAccent ? (active ? '#172017' : accent) : (active ? '#DCE8D2' : 'transparent'),
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: isAccent ? (active ? accent : '#172017') : (active ? '#172017' : '#5F665B') }} />
              </div>
              <span className="text-xs font-semibold" style={{ fontSize: 10, fontWeight: isAccent ? 800 : undefined }}>{label}</span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}
