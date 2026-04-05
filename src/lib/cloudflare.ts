// src/lib/cloudflare.ts

export async function createMeetingSession() {
  const APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;
  const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  // طلب إنشاء جلسة جديدة من Cloudflare
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/apps/${APP_ID}/sessions/new`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Cloudflare Error:', response.status, errText);
    throw new Error(`فشل الاتصال بسيرفرات Cloudflare: ${response.status} - ${errText}`);
  }

  return await response.json();
}