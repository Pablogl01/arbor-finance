'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User, LogOut } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    
    // Fetch user
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    // Also listen for auth changes to update the avatar if the user changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="flex h-20 items-center justify-between bg-arbor-bg px-10 py-4">
      <div className="flex items-center gap-3">
        {/* Simple tree logo representation */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-arbor-mint text-arbor-green">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-arbor-green">Arbor Wealth</h1>
      </div>

      <div className="flex items-center gap-6">
        <button className="rounded-full bg-white p-2 text-arbor-textmuted shadow-micro transition-colors hover:text-arbor-green">
          <Bell className="h-5 w-5" />
        </button>
        <button className="rounded-full bg-white p-2 text-arbor-textmuted shadow-micro transition-colors hover:text-arbor-green">
          <Settings className="h-5 w-5" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-micro transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-arbor-mint"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            {user?.user_metadata?.avatar_url ? (
              <Image 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                width={40} 
                height={40} 
                className="h-full w-full object-cover" 
                unoptimized
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-tr from-arbor-green to-arbor-darkmint flex items-center justify-center text-white font-bold text-sm">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          <div
            className={`absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden 
              border border-arbor-border/50 
              transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
              ${isMenuOpen
                ? 'opacity-100 translate-y-0 scale-100 visible pointer-events-auto'
                : 'opacity-0 -translate-y-2 scale-95 invisible pointer-events-none'
              }`}
          >
            <div className="py-1">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push('/profile');
                }}
                className="group flex w-full items-center px-4 py-2.5 text-sm text-arbor-text hover:bg-slate-50 hover:text-arbor-green transition-colors"
              >
                <User className="mr-3 h-4 w-4 text-slate-400 group-hover:text-arbor-green transition-colors" />
                Mi perfil
              </button>
              <div className="h-px w-full bg-arbor-border/50"></div>
              <button
                onClick={handleSignOut}
                className="group flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-600 transition-colors" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
