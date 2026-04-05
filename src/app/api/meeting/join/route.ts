// src/app/api/meeting/join/route.ts
// انضمام مشارك إلى الاجتماع + إنشاء session + push tracks
import { NextResponse } from 'next/server';
import { createMeetingSession, addTracks } from '@/lib/cloudflare';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { meetingId, userId, userName, sdpOffer, trackHints } = body;

    if (!meetingId || !userId) {
      return NextResponse.json(
        { error: 'meetingId و userId مطلوبان' },
        { status: 400 }
      );
    }

    // 1. التحقق من وجود الاجتماع ونشاطه
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('is_active', true)
      .single();

    if (meetingErr || !meeting) {
      return NextResponse.json(
        { error: 'الاجتماع غير موجود أو منتهي' },
        { status: 404 }
      );
    }

    // 2. إنشاء session جديدة في Cloudflare Calls
    const sessionData = await createMeetingSession();
    const cfSessionId = sessionData.sessionId;

    // 3. Push local tracks إلى Cloudflare
    let pushResult = null;
    if (sdpOffer) {
      // بناء قائمة الـ tracks المحلية
      const localTracks = (trackHints || []).map((hint: any) => ({
        location: 'local' as const,
        trackName: hint.trackName,
        mid: hint.mid,
      }));

      pushResult = await addTracks(cfSessionId, {
        sessionDescription: {
          type: 'offer',
          sdp: sdpOffer,
        },
        tracks: localTracks,
      });
    }

    // 4. تسجيل المشارك في قاعدة البيانات (upsert)
    const { data: participant, error: partErr } = await supabase
      .from('meeting_participants')
      .upsert(
        {
          meeting_id: meetingId,
          user_id: userId,
          user_name: userName || 'مشارك',
          cloudflare_session_id: cfSessionId,
          is_audio_on: true,
          is_video_on: true,
          left_at: null,
        },
        { onConflict: 'meeting_id,user_id' }
      )
      .select()
      .single();

    if (partErr) {
      console.error('DB participant error:', partErr);
    }

    // 5. جلب قائمة المشاركين الحاليين (للـ pull)
    const { data: otherParticipants } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', meetingId)
      .neq('user_id', userId)
      .is('left_at', null);

    return NextResponse.json({
      success: true,
      sessionId: cfSessionId,
      sdpAnswer: pushResult?.sessionDescription?.sdp || null,
      tracks: pushResult?.tracks || [],
      participant,
      otherParticipants: otherParticipants || [],
    });
  } catch (error: any) {
    console.error('Meeting Join Error:', error);
    return NextResponse.json(
      { error: 'فشل الانضمام للاجتماع', details: error.message },
      { status: 500 }
    );
  }
}
