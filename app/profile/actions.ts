'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };
  
  const phone = formData.get('phone') as string;
  const timezone = formData.get('timezone') as string;
  const fullName = formData.get('fullName') as string;
  const baseCurrency = formData.get('baseCurrency') as string;

  const updates: any = {
    phone,
    timezone,
    base_currency: baseCurrency,
  };

  if (user.app_metadata?.provider !== 'google' && fullName) {
    updates.full_name = fullName;
  }

  const { error } = await supabase.auth.updateUser({
    data: updates
  });
  
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/profile');
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };
  if (user.app_metadata?.provider === 'google') return { success: false, error: 'Google users cannot change password here' };
  
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }
  
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match' };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
