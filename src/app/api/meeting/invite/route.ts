// src/app/api/meeting/invite/route.ts
// إرسال دعوات لمشاركين إضافيين أثناء الاجتماع
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { meetingId, invitedBy, participants } = body;

    if (!meetingId || !participants || !participants.length) {
      return NextResponse.json(
        { error: 'meetingId و participants مطلوبان' },
        { status: 400 }
      );
    }

    // 1. التحقق من وجود الاجتماع
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('id, title')
      .eq('id', meetingId)
      .eq('is_active', true)
      .single();

    if (meetingErr || !meeting) {
      return NextResponse.json(
        { error: 'الاجتماع غير موجود أو منتهي' },
        { status: 404 }
      );
    }

    // 2. إرسال الإشعار
    const osAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const osApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!osAppId || !osApiKey) {
      return NextResponse.json(
        { error: 'متغيرات OneSignal مفقودة' },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://noortech.vercel.app';
    const meetingUrl = `${siteUrl}/meeting/${meetingId}`;

    const osBody: any = {
      app_id: osAppId,
      contents: {
        'en': `${invitedBy} is inviting you to join a meeting`,
        'ar': `📹 ${invitedBy} يدعوك للانضمام إلى اجتماع`
      },
      headings: {
        'en': 'Meeting Invitation',
        'ar': '🔔 دعوة للانضمام'
      },
      web_url: meetingUrl,
      data: {
        meetingId: meetingId,
        url: `/meeting/${meetingId}`
      },
      chrome_web_icon: `${siteUrl}/icon-dark.jpg`,
      chrome_web_badge: `${siteUrl}/icon-light.jpg`,
      priority: 10,
      ttl: 120,
      android_visibility: 1,
      android_sound: 'notification',
      require_interaction: true,
      include_external_user_ids: participants,
    };

    const osResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${osApiKey}`
      },
      body: JSON.stringify(osBody)
    });

    const responseData = await osResponse.json();
    console.log('Invite notification response:', JSON.stringify(responseData));

    if (responseData.errors) {
      return NextResponse.json({
        success: false,
        error: responseData.errors,
      });
    }

    return NextResponse.json({
      success: true,
      notificationId: responseData.id,
      recipientCount: responseData.recipients,
    });
  } catch (error: any) {
    console.error('Invite Error:', error);
    return NextResponse.json(
      { error: 'فشل إرسال الدعوة', details: error.message },
      { status: 500 }
    );
  }
}
