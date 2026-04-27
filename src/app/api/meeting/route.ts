// src/app/api/meeting/route.ts
import { NextResponse } from 'next/server';
import { createMeetingSession } from '@/lib/cloudflare';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, created_by } = body;

    // 1. إنشاء جلسة الفيديو في Cloudflare
    const sessionData = await createMeetingSession();

    // 2. حفظ بيانات الاجتماع في Supabase
    const { data: meeting, error: dbError } = await supabase
      .from('meetings')
      .insert([
        {
          title: title || 'اجتماع طارئ',
          created_by: created_by,
          cloudflare_session_id: sessionData.sessionId,
          is_active: true
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database Error:', dbError);
      throw new Error(`فشل في حفظ الاجتماع في قاعدة البيانات: ${dbError.message || JSON.stringify(dbError)}`);
    }

    // 2.5 حفظ المشاركين المدعوين في meeting_participants مع is_read = false
    // هذا يُحفّز Supabase Realtime → يظهر الجرس فوراً عند المدعوين
    const participants = body.participants;
    if (participants && Array.isArray(participants) && participants.length > 0) {
      // جلب أسماء المشاركين من profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', participants);

      const nameMap = new Map<string, string>();
      if (profilesData) {
        for (const p of profilesData) {
          nameMap.set(p.id, p.full_name);
        }
      }

      const participantRows = participants.map((userId: string) => ({
        meeting_id: meeting.id,
        user_id: userId,
        user_name: nameMap.get(userId) || 'مشارك',
        is_read: false,
      }));

      const { error: partError } = await supabase
        .from('meeting_participants')
        .upsert(participantRows, { onConflict: 'meeting_id,user_id' });

      if (partError) {
        console.error('Error saving participants:', partError);
        // لا نوقف العملية - الاجتماع تم إنشاؤه بنجاح
      } else {
        console.log(`Saved ${participantRows.length} participants with is_read=false`);
      }
    }

    // 3. إرسال الإشعار عبر OneSignal (fetch مباشر - بدون مكتبة)
    const osAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const osApiKey = process.env.ONESIGNAL_REST_API_KEY;

    // تشخيص: التأكد من وجود المتغيرات
    console.log('=== OneSignal Debug ===');
    console.log('App ID exists:', !!osAppId);
    console.log('API Key exists:', !!osApiKey);
    console.log('API Key first 10 chars:', osApiKey ? osApiKey.substring(0, 10) + '...' : 'MISSING');
    console.log('Participants from body:', body.participants);

    let notificationResult = null;
    let notificationError = null;

    if (!osAppId || !osApiKey) {
      notificationError = 'المتغيرات البيئية ONESIGNAL مفقودة على السيرفر';
      console.error(notificationError);
    } else {
      // بناء جسم الإشعار
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://noortech.vercel.app';
      const meetingUrl = `${siteUrl}/meeting/${meeting.id}`;

      const osBody: any = {
        app_id: osAppId,
        contents: {
          'en': 'A new private video meeting has started!',
          'ar': `📹 إتصال فيديو خاص: ${title || 'انقر للإنضمام'}`
        },
        headings: {
          'en': 'NoorTech Meeting',
          'ar': '🔔 اجتماع نور تيك'
        },
        // رابط الفتح عند النقر على الإشعار
        web_url: meetingUrl,
        data: {
          meetingId: meeting.id,
          url: `/meeting/${meeting.id}`
        },
        // أيقونة مخصصة
        chrome_web_icon: `${siteUrl}/icon-dark.jpg`,
        chrome_web_badge: `${siteUrl}/icon-light.jpg`,
        // إعدادات الأولوية القصوى لظهور كبانر منسدل
        priority: 10,
        ttl: 120,
        // أندرويد: إشعار عاجل يظهر أعلى الشاشة
        android_visibility: 1,
        android_sound: 'notification',
        // إشعار مستمر حتى يتفاعل المستخدم
        require_interaction: true
      };

      const participants = body.participants;
      if (participants && Array.isArray(participants) && participants.length > 0) {
        osBody.include_external_user_ids = participants;
        console.log('Targeting external_user_ids:', participants);
      } else {
        osBody.included_segments = ['Subscribed Users'];
        console.log('Broadcasting to all Subscribed Users');
      }

      console.log('OneSignal Request Body:', JSON.stringify(osBody, null, 2));

      try {
        const osResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${osApiKey}`
          },
          body: JSON.stringify(osBody)
        });

        const responseData = await osResponse.json();
        console.log('OneSignal Response Status:', osResponse.status);
        console.log('OneSignal Response Body:', JSON.stringify(responseData, null, 2));

        if (responseData.errors) {
          notificationError = responseData.errors;
        } else {
          notificationResult = responseData;
        }
      } catch (fetchErr: any) {
        console.error('OneSignal Fetch Exception:', fetchErr);
        notificationError = fetchErr.message || fetchErr.toString();
      }
    }

    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      sessionId: sessionData.sessionId,
      token: sessionData.token,
      notification_debug: {
        app_id_exists: !!osAppId,
        api_key_exists: !!osApiKey,
        participants_sent: body.participants || 'none',
        result: notificationResult,
        error: notificationError
      }
    });
  } catch (error: any) {
    console.error('Meeting Creation Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'حدث خطأ في إنشاء الاجتماع', 
      details: error.message || error.toString() 
    }, { status: 500 });
  }
}