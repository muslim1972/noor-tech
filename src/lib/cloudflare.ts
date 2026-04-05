// src/lib/cloudflare.ts
// مكتبة Cloudflare Calls SFU - تعمل على السيرفر فقط

const APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const BASE_URL = `https://rtc.live.cloudflare.com/v1/apps/${APP_ID}`;

function getHeaders() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * إنشاء جلسة جديدة في Cloudflare Calls
 */
export async function createMeetingSession() {
  const response = await fetch(`${BASE_URL}/sessions/new`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Cloudflare createSession Error:', response.status, errText);
    throw new Error(`فشل إنشاء الجلسة: ${response.status} - ${errText}`);
  }

  return await response.json();
}

/**
 * إضافة tracks جديدة (Push أو Pull)
 * Push: إرسال الـ local media إلى Cloudflare
 * Pull: سحب media من مشارك آخر
 */
export async function addTracks(
  sessionId: string,
  body: {
    sessionDescription?: { type: string; sdp: string };
    tracks?: Array<{
      location: 'local' | 'remote';
      trackName?: string;
      mid?: string;
      sessionId?: string; // session الطرف الآخر (للـ pull)
    }>;
  }
) {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/tracks/new`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Cloudflare addTracks Error:', response.status, errText);
    throw new Error(`فشل إضافة tracks: ${response.status} - ${errText}`);
  }

  return await response.json();
}

/**
 * إعادة التفاوض على الجلسة (renegotiate)
 * يُستخدم عند إضافة/حذف tracks
 */
export async function renegotiateSession(
  sessionId: string,
  body: { sessionDescription: { type: string; sdp: string } }
) {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/renegotiate`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Cloudflare renegotiate Error:', response.status, errText);
    throw new Error(`فشل التفاوض: ${response.status} - ${errText}`);
  }

  return await response.json();
}

/**
 * إغلاق tracks معينة
 */
export async function closeTracks(
  sessionId: string,
  body: {
    tracks: Array<{ mid: string }>;
    force?: boolean;
  }
) {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/tracks/close`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Cloudflare closeTracks Error:', response.status, errText);
    throw new Error(`فشل إغلاق tracks: ${response.status} - ${errText}`);
  }

  return await response.json();
}

/**
 * الحصول على معلومات الجلسة
 */
export async function getSessionInfo(sessionId: string) {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Cloudflare getSession Error:', response.status, errText);
    throw new Error(`فشل جلب معلومات الجلسة: ${response.status} - ${errText}`);
  }

  return await response.json();
}