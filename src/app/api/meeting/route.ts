// src/app/api/meeting/route.ts
import { NextResponse } from 'next/server';
import { createMeetingSession } from '@/lib/cloudflare';
import { supabase } from '@/lib/supabase';
import * as OneSignal from 'onesignal-node';

// إعداد عميل OneSignal باستخدام المتغيرات
const oneSignalClient = new OneSignal.Client(
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
  process.env.ONESIGNAL_REST_API_KEY!
);

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
          created_by: created_by, // الرقم الوظيفي أو UUID من جدول profiles
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

    // 3. إرسال الإشعار عبر OneSignal
    const notification: any = {
      contents: {
        'en': 'A new private video meeting has started!',
        'ar': `إتصال فيديو خاص: ${title || 'انقر للرد'}`
        // 'ar': `إتصال فيديو: ${title || 'انقر للرد'}` // Original
      },
      // إعدادات تجعل الإشعار يبدو كأنه اتصال
      android_channel_id: process.env.ONESIGNAL_ANDROID_CHANNEL_ID || undefined, // لتعيين نغمة رنين طويلة
      data: {
        meetingId: meeting.id,
        url: `/meeting/${meeting.id}` // الرابط الذي يفتح عند لمس الإشعار
      }
    };

    const participants = body.participants;
    if (participants && Array.isArray(participants) && participants.length > 0) {
      // الاعتماد فقط على include_external_user_ids لحقل الاستهداف (إزالة include_aliases لتجنب التعارض)
      notification.include_external_user_ids = participants;
    } else {
      notification.included_segments = ['Subscribed Users'];
    }

    let notificationResult = null;
    let notificationError = null;

    try {
      const osResponse = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          include_external_user_ids: notification.include_external_user_ids,
          included_segments: notification.included_segments,
          contents: notification.contents,
          data: notification.data,
          // android_channel_id: notification.android_channel_id // Optional: uncomment if needed
        })
      });

      const responseData = await osResponse.json();
      
      if (!osResponse.ok || responseData.errors) {
        throw new Error(JSON.stringify(responseData.errors || responseData));
      }

      notificationResult = responseData;
      console.log('OneSignal Fetch Success:', notificationResult);
    } catch (osError: any) {
      console.error('OneSignal Fetch Error:', osError.message || osError);
      notificationError = osError.message || osError.toString();
    }

    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      sessionId: sessionData.sessionId,
      token: sessionData.token,
      notification_status: {
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