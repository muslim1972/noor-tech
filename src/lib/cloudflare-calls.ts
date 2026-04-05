// src/lib/cloudflare-calls.ts

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const APP_ID = process.env.CLOUDFLARE_APP_ID;

export async function createSession() {
  const response = await fetch(
    `https://rtc.wikimedia.org/v1/apps/${APP_ID}/sessions`, // هذا هو الـ Endpoint الخاص بـ Calls
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return await response.json();
}