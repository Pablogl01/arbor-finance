import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrade() {
  const accountId = 'put-acct-id-here'; // We will fetch one
  const ticker = 'TEST';
  
  // Let's use anon key and sign up a fresh user
  console.log("Signing up temporary user...");
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: `test-${Date.now()}@test.com`,
    password: 'password123'
  });

  if (authErr) {
    console.error('Failed to sign up:', authErr);
    return;
  }
  console.log("Signed up user:", authData.user?.id);

  // 1. Create an account
  console.log("Creating account...");
  const { data: acctData, error: acctErr } = await supabase
    .from('accounts')
    .insert({ user_id: authData.user?.id, name: 'Test Account', type: 'investment', balance_cache: 0 })
    .select()
    .single();

  if (acctErr || !acctData) {
    console.error('Failed to create account', acctErr);
    return;
  }
  const acct = acctData;
  console.log('Using account:', acct.id);
  const { error: upsertErr } = await supabase
    .from('assets')
    .upsert({
      ticker: ticker,
      name: 'Test Asset',
      type: 'ETF',
      current_price: 150.00,
      last_updated: new Date().toISOString()
    }, { onConflict: 'ticker' });
    
  if (upsertErr) {
    console.error('Error upserting asset:', upsertErr);
    return;
  }
  console.log('Asset upserted successfully');

  // 3. Trade Asset
  console.log('Trading asset...');
  const { data: tradeData, error: tradeErr } = await supabase
    .from('investment_transactions')
    .insert({
      account_id: acct.id,
      asset_ticker: ticker,
      type: 'buy',
      quantity: 1,
      price: 150.00,
    })
    .select()
    .single();

  if (tradeErr) {
    console.error('Error trading asset:', tradeErr);
    return;
  }

  console.log('Trade successful!', tradeData);
}

testTrade().catch(console.error);
