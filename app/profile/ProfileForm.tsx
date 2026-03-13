'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Settings as SettingsIcon, Link2, Check, Edit2, Plus, Landmark, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Toast from '@/components/ui/Toast';
import { updateProfile, updatePassword } from './actions';
import { createClient } from '@/utils/supabase/client';

interface ProfileFormProps {
  fullName: string;
  email: string;
  phone: string;
  timezone: string;
  baseCurrency: string;
  avatarUrl: string;
  isGoogleProvider: boolean;
  is2FAInitiallyEnabled: boolean;
  accounts: {
    id: string;
    name: string;
    type: string;
  }[];
}

export default function ProfileForm({
  fullName,
  email,
  phone,
  timezone,
  baseCurrency,
  avatarUrl,
  isGoogleProvider,
  is2FAInitiallyEnabled,
  accounts,
}: ProfileFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Controlled form state
  const [formDataState, setFormDataState] = useState({
    fullName,
    phone,
    timezone,
    baseCurrency
  });

  // Sync state if server data changes (e.g. after successful revalidation)
  useEffect(() => {
    setFormDataState({ fullName, phone, timezone, baseCurrency });
  }, [fullName, phone, timezone, baseCurrency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormDataState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  async function handlePasswordSubmit(formData: FormData) {
    setIsPasswordPending(true);
    setPasswordError('');
    
    // Type checking handles standard string responses here as well via actions return pattern
    const result = await updatePassword(formData);
    
    if (result.success) {
      setIsPasswordModalOpen(false);
      setShowToast(true); // Reuse toast to notify success
    } else {
      setPasswordError(result.error as string);
    }
    
    setIsPasswordPending(false);
  }

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(is2FAInitiallyEnabled);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isMfaPending, setIsMfaPending] = useState(false);

  async function handleSetup2FA() {
    setIsMfaPending(true);
    setMfaError('');
    const supabase = createClient();

    try {
      // First, clean up any existing unverified factors to avoid the "already exists" error
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      // Supabase TS types currently limit status to 'verified', but the API returns 'unverified' for pending ones
      const unverifiedFactors = factorsData?.totp?.filter(f => (f.status as string) === 'unverified') || [];
      
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Now enroll a new factor
      const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp',
        friendlyName: 'Arbor Finance Authenticator'
      });
      
      if (error) {
        alert('Error initializing 2FA: ' + error.message);
        setIsMfaPending(false);
        return;
      }
      
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setIs2FAModalOpen(true);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    
    setIsMfaPending(false);
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    setIsMfaPending(true);
    setMfaError('');
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setMfaError(challenge.error.message);
      setIsMfaPending(false);
      return;
    }
    const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: verifyCode });
    if (verify.error) {
      setMfaError(verify.error.message);
      setIsMfaPending(false);
      return;
    }
    setIs2FAModalOpen(false);
    setIs2FAEnabled(true);
    setShowToast(true);
    setIsMfaPending(false);
  }

  async function handleDisable2FA() {
    // Ideally this would show a confirmation dialog, but for simplicity we directly unenroll
    if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) return;
    
    setIsMfaPending(true);
    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];
    if (totpFactor) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      if (!error) {
        setIs2FAEnabled(false);
        setShowToast(true);
      } else {
        alert('Error disabling 2FA: ' + error.message);
      }
    }
    setIsMfaPending(false);
  }

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    const result = await updateProfile(formData);
    
    if (result.success) {
      setShowToast(true);
    } else {
      // You could handle error state/toast here if desired
      alert('Error updating profile: ' + result.error);
    }
    setIsPending(false);
  }

  return (
    <>
      <form action={handleSubmit} className="flex flex-1 flex-col gap-6">
        
        {/* Personal Information Card */}
        <section id="profile" className="rounded-2xl bg-white p-6 shadow-soft border border-arbor-border/40">
          <div className="flex items-center gap-2 mb-6 text-arbor-green">
            <User className="h-5 w-5 font-semibold" strokeWidth={2.5} />
            <h2 className="text-lg font-bold">Personal Information</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar */}
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative h-28 w-28 rounded-full border-4 border-arbor-mint bg-orange-100 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <Image 
                    src={avatarUrl} 
                    alt="Profile Avatar" 
                    fill 
                    className="object-cover"
                    unoptimized // For external Google avatar URLs
                  />
                ) : (
                  <div className="h-16 w-16 bg-white border-2 border-orange-200 flex items-center justify-center rounded-sm">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-arbor-green">
                      <path d="M17 5.92L9 2v18H7v-1.73c-1.79 1.22-3 3.28-3 5.73h2c0-3.31 2.69-6 6-6s6 2.69 6 6h2c0-2.45-1.21-4.51-3-5.73V5.92V5.92z" />
                    </svg>
                  </div>
                )}
              </div>
              <button type="button" className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-arbor-green text-white shadow-micro hover:bg-arbor-green/90 transition-colors" style={{transform: 'translate(40px, -24px)'}}>
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-arbor-text">Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formDataState.fullName}
                  onChange={handleChange}
                  className="rounded-lg border border-arbor-border/50 bg-arbor-bg px-4 py-2.5 text-sm text-arbor-text focus:border-arbor-darkmint focus:outline-none focus:ring-1 focus:ring-arbor-darkmint"
                  disabled={isGoogleProvider}
                  title={isGoogleProvider ? "Managed by Google" : ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-arbor-text">Email Address</label>
                <input 
                  type="email" 
                  value={email} // Email is immutable here via form field disabled status
                  readOnly
                  className="rounded-lg border border-arbor-border/50 bg-arbor-bg px-4 py-2.5 text-sm text-arbor-text focus:border-arbor-darkmint focus:outline-none focus:ring-1 focus:ring-arbor-darkmint opacity-70"
                  disabled
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-arbor-text">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formDataState.phone}
                  onChange={handleChange}
                  className="rounded-lg border border-arbor-border/50 bg-arbor-bg px-4 py-2.5 text-sm text-arbor-text focus:border-arbor-darkmint focus:outline-none focus:ring-1 focus:ring-arbor-darkmint"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-arbor-text">Timezone</label>
                <div className="relative">
                  <select 
                    name="timezone"
                    value={formDataState.timezone}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-lg border border-arbor-border/50 bg-arbor-bg px-4 py-2.5 pr-10 text-sm text-arbor-text focus:border-arbor-darkmint focus:outline-none focus:ring-1 focus:ring-arbor-darkmint"
                  >
                    <option value="Eastern Time (ET)">Eastern Time (ET)</option>
                    <option value="Central Time (CT)">Central Time (CT)</option>
                    <option value="Mountain Time (MT)">Mountain Time (MT)</option>
                    <option value="Pacific Time (PT)">Pacific Time (PT)</option>
                    <option value="Europe/Madrid">Europe/Madrid</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="UTC">UTC</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-arbor-textmuted">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Security Card */}
        <section id="security" className="rounded-2xl bg-white p-6 shadow-soft border border-arbor-border/40">
           <div className="flex items-center gap-2 mb-6 text-arbor-green">
            <Lock className="h-5 w-5 font-semibold" strokeWidth={2.5} />
            <h2 className="text-lg font-bold">Account Security</h2>
          </div>
          
          {isGoogleProvider ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-1">Authenticated with Google</p>
              <p className="text-blue-700">
                Your password and 2FA settings are managed directly through your Google account. You do not need to set a password here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arbor-border/50 pb-6">
                <div>
                  <h3 className="font-semibold text-arbor-text text-sm">Two-Factor Authentication (2FA)</h3>
                  <p className="text-sm text-arbor-textmuted mt-1">Secure your account with a secondary verification method.</p>
                </div>
                <div className="flex items-center gap-4">
                  {is2FAEnabled ? (
                    <>
                      <span className="rounded-full bg-arbor-mint/20 px-2.5 py-1 text-xs font-bold text-arbor-green">ACTIVE</span>
                      <button type="button" onClick={handleDisable2FA} disabled={isMfaPending} className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">Disable 2FA</button>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">INACTIVE</span>
                      <button type="button" onClick={handleSetup2FA} disabled={isMfaPending} className="text-sm font-bold text-arbor-green hover:text-arbor-darkmint transition-colors disabled:opacity-50">Set up 2FA</button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-arbor-text text-sm">Password</h3>
                  <p className="text-sm text-arbor-textmuted mt-1">Manage your account password.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="rounded-lg bg-arbor-bg border border-arbor-border/50 px-4 py-2 text-sm font-bold text-arbor-green hover:bg-arbor-border/30 transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Preferences Card */}
        <section id="preferences" className="rounded-2xl bg-white p-6 shadow-soft border border-arbor-border/40">
           <div className="flex items-center gap-2 mb-6 text-arbor-green">
            <SettingsIcon className="h-5 w-5 font-semibold" strokeWidth={2.5} />
            <h2 className="text-lg font-bold">Preferences</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-arbor-text text-sm mb-3">Base Currency</h3>
              <div className="flex h-11 w-full max-w-[240px] rounded-full p-1 border border-arbor-border bg-arbor-bg relative">
                {/* Hidden inputs for form data */}
                <input type="radio" name="baseCurrency" value="USD" id="currency-usd" className="peer/usd hidden" checked={formDataState.baseCurrency === 'USD'} onChange={handleChange} />
                <input type="radio" name="baseCurrency" value="EUR" id="currency-eur" className="peer/eur hidden" checked={formDataState.baseCurrency === 'EUR'} onChange={handleChange} />
                
                {/* USD Label */}
                <label 
                  htmlFor="currency-usd"
                  className="flex-1 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-arbor-textmuted peer-checked/usd:bg-white peer-checked/usd:text-arbor-green peer-checked/usd:shadow-micro peer-checked/usd:border peer-checked/usd:border-arbor-green"
                >
                  <span className="text-arbor-darkmint peer-checked/eur:text-slate-400 peer-checked/usd:text-arbor-darkmint">$</span> USD
                </label>

                {/* EUR Label */}
                <label 
                  htmlFor="currency-eur"
                  className="flex-1 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-arbor-textmuted peer-checked/eur:bg-white peer-checked/eur:text-arbor-green peer-checked/eur:shadow-micro peer-checked/eur:border peer-checked/eur:border-arbor-green"
                >
                  <span className="text-slate-400 peer-checked/usd:text-slate-400 peer-checked/eur:text-arbor-darkmint">€</span> EUR
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-arbor-text text-sm mb-3">Notifications</h3>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-arbor-textmuted group-hover:text-arbor-text transition-colors">Market Alerts</span>
                  <div className="relative flex items-center justify-center h-5 w-5 rounded bg-arbor-green text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-arbor-textmuted group-hover:text-arbor-text transition-colors">Account Activity</span>
                  <div className="relative flex items-center justify-center h-5 w-5 rounded bg-arbor-green text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

         {/* Linked Accounts */}
         <section id="accounts" className="rounded-2xl bg-white p-6 shadow-soft border border-arbor-border/40">
           <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-arbor-green">
              <Link2 className="h-5 w-5 font-semibold" strokeWidth={2.5} />
              <h2 className="text-lg font-bold">Linked Accounts</h2>
            </div>
            <button type="button" className="flex items-center gap-1.5 text-sm font-bold text-arbor-green hover:text-arbor-darkmint transition-colors">
              <Plus className="h-4 w-4" strokeWidth={3} /> Add New
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-xl bg-arbor-bg border border-arbor-border/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-micro">
                      {account.type === 'investment' ? (
                        <svg className="h-5 w-5 text-arbor-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                      ) : (
                        <Landmark className="h-5 w-5 text-arbor-text" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-arbor-text">{account.name}</h4>
                      <p className="text-xs text-arbor-textmuted capitalize">{account.type} Account</p>
                    </div>
                  </div>
                  <button type="button" className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full py-6 text-center text-sm text-arbor-textmuted">
                No accounts linked yet. Create one via the dashboard to see it here.
              </div>
            )}
          </div>
        </section>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-4 mt-4 mb-20">
          <Link href="/" className="px-6 py-2.5 text-sm font-bold text-arbor-text hover:text-arbor-green transition-colors">
            Cancel
          </Link>
          <button 
            type="submit" 
            disabled={isPending}
            className="rounded-xl bg-arbor-green px-6 py-2.5 text-sm font-bold text-white shadow-soft transition-colors hover:bg-arbor-green/90 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">{isPending ? 'Saving...' : 'Save Changes'}</span>
            {!isPending && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>}
          </button>
        </div>

      </form>

      {/* Password Update Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-arbor-border/50">
            <h3 className="mb-2 text-lg font-bold text-arbor-green">Update Password</h3>
            <p className="mb-6 text-sm text-arbor-textmuted">Please enter your new password below. It must be at least 6 characters long.</p>
            
            <form action={handlePasswordSubmit} className="flex flex-col gap-4">
              {passwordError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {passwordError}
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-arbor-text">New Password</label>
                <input 
                  type="password" 
                  name="newPassword" 
                  autoFocus
                  required
                  disabled={isPasswordPending}
                  className="rounded-lg border border-arbor-border/50 bg-arbor-bg px-4 py-2.5 text-sm text-arbor-text focus:border-arbor-darkmint focus:outline-none focus:ring-1 focus:ring-arbor-darkmint" 
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-arbor-text">Confirm New Password</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  required
                  disabled={isPasswordPending}
                  className="rounded-lg border border-arbor-border/50 bg-arbor-bg px-4 py-2.5 text-sm text-arbor-text focus:border-arbor-darkmint focus:outline-none focus:ring-1 focus:ring-arbor-darkmint" 
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isPasswordPending}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-arbor-text hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isPasswordPending}
                  className="rounded-xl bg-arbor-green px-5 py-2 text-sm font-bold text-white shadow-soft hover:bg-arbor-green/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isPasswordPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-arbor-border/50">
            <h3 className="mb-2 text-lg font-bold text-arbor-green">Set Up Two-Factor Authentication</h3>
            <p className="mb-4 text-sm text-arbor-textmuted">Scan the QR code below with your authenticator app (like Google Authenticator or Authy), then enter the 6-digit code.</p>
            
            <form onSubmit={handleVerify2FA} className="flex flex-col gap-4">
              {mfaError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {mfaError}
                </div>
              )}
              
              <div className="flex justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                {qrCode ? (
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400">Loading...</div>
                )}
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-arbor-text">Verification Code</label>
                <input 
                  type="text" 
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  autoFocus
                  required
                  maxLength={6}
                  placeholder="000000"
                  disabled={isMfaPending}
                  className="rounded-lg border border-arbor-border/50 bg-arbor-bg px-4 py-2.5 text-sm text-arbor-text text-center tracking-widest text-lg font-mono focus:border-arbor-darkmint focus:outline-none focus:ring-1 focus:ring-arbor-darkmint" 
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIs2FAModalOpen(false)}
                  disabled={isMfaPending}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-arbor-text hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isMfaPending || verifyCode.length < 6}
                  className="rounded-xl bg-arbor-green px-5 py-2 text-sm font-bold text-white shadow-soft hover:bg-arbor-green/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isMfaPending ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast 
        message="Your settings have been saved successfully." 
        isVisible={showToast} 
        onClose={() => setShowToast(false)} 
      />
    </>
  );
}
