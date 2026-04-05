// src/app/api/meeting/leave/route.ts
// مغادرة المشارك للاجتماع + تنظيف الموارد
import { NextResponse } from 'next/server';
import { closeTracks } from '@/lib/cloudflare';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { meetingId, userId, sessionId } = body;

    if (!meetingId || !userId) {
      return NextResponse.json(
        { error: 'meetingId و userId مطلوبان' },
        { status: 400 }
      );
    }

    // 1. إغلاق tracks في Cloudflare (اختياري - لا يُفشل العملية)
    if (sessionId) {
      try {
        await closeTracks(sessionId, {
          tracks: [],
          force: true,
        });
      } catch (e) {
        console.warn('closeTracks warning (non-fatal):', e);
      }
    }

    // 2. تحديث وقت المغادرة في DB
    const { error: updateErr } = await supabase
      .from('meeting_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);

    if (updateErr) {
      console.error('DB leave error:', updateErr);
    }

    // 3. التحقق من بقاء مشاركين نشطين
    const { data: remaining } = await supabase
      .from('meeting_participants')
      .select('id')
      .eq('meeting_id', meetingId)
      .is('left_at', null);

    // 4. إذا لم يبقَ أحد → نُنهي الاجتماع
    if (!remaining || remaining.length === 0) {
      await supabase
        .from('meetings')
        .update({ is_active: false })
        .eq('id', meetingId);
    }

    return NextResponse.json({
      success: true,
      meetingEnded: !remaining || remaining.length === 0,
    });
  } catch (error: any) {
    console.error('Meeting Leave Error:', error);
    return NextResponse.json(
      { error: 'فشل المغادرة', details: error.message },
      { status: 500 }
    );
  }
}
