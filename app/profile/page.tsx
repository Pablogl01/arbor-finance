import Header from '@/components/layout/Header';
import { User, Shield, Landmark, Bell, Edit2, Lock, Settings as SettingsIcon, Link2, Check, RefreshCw, Trash2, Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { revalidatePath } from 'next/cache';

import { updateProfile } from './actions';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch linked accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Check 2FA Status
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const is2FAEnabled = (factors?.totp ?? []).some(factor => factor.status === 'verified');

  // Determine if logged in via Google
  const isGoogleProvider = user.app_metadata?.provider === 'google';

  // Extract user metadata
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const email = user.email || '';
  const avatarUrl = user.user_metadata?.avatar_url || '';

  // Custom fields stored in user_metadata or defaults
  const phone = user.user_metadata?.phone || '+1 (555) 000-1234';
  const timezone = user.user_metadata?.timezone || 'Eastern Time (ET)';
  const baseCurrency = user.user_metadata?.base_currency || 'USD';

  return (
    <div className="flex min-h-screen flex-col bg-arbor-bg font-sans">
      <Header />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-6 py-10 xl:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-arbor-green">Settings</h1>
          <p className="mt-2 text-arbor-textmuted">
            Manage your financial profile, security preferences, and connected institutions.
          </p>
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar Nav */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="flex flex-col gap-2">
              <a href="#profile" className="flex items-center gap-3 rounded-xl bg-arbor-green px-4 py-3 text-sm font-medium text-white shadow-micro">
                <User className="h-5 w-5" />
                Profile
              </a>
              <a href="#security" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-arbor-textmuted hover:bg-white hover:text-arbor-text transition-colors">
                <Shield className="h-5 w-5" />
                Security
              </a>
              <a href="#accounts" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-arbor-textmuted hover:bg-white hover:text-arbor-text transition-colors">
                <Landmark className="h-5 w-5" />
                Linked Accounts
              </a>
            </nav>
          </aside>

          {/* Main Content Area */}
          <ProfileForm
            fullName={fullName}
            email={email}
            phone={phone}
            timezone={timezone}
            baseCurrency={baseCurrency}
            avatarUrl={avatarUrl}
            isGoogleProvider={isGoogleProvider}
            accounts={accounts || []}
            is2FAInitiallyEnabled={is2FAEnabled}
          />
        </div>
      </main>
    </div>
  );
}
