import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCloudflare() {
  const APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;
  const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  console.log('Testing Cloudflare...');
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/apps/${APP_ID}/sessions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.error('Cloudflare failed:', await response.text());
    return null;
  }
  const data = await response.json();
  console.log('Cloudflare success:', data);
  return data;
}

async function testSupabase(sessionId) {
  console.log('Testing Supabase Insert...');
  const { data, error } = await supabase
    .from('meetings')
    .insert([
      {
        title: 'test error meeting',
        created_by: '9aa2eb6f-ced0-4497-a720-6d42e27b1404', // Just testing, might fail if foreign key constraint is strictly enforced and this uuid isn't in profiles
        cloudflare_session_id: sessionId,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
  } else {
    console.log('Supabase success:', data);
  }
}

async function run() {
  const session = await testCloudflare();
  if (session) {
    await testSupabase(session.sessionId);
  }
}

run();
