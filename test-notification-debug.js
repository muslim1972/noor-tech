// test-notification-debug.js
// اختبار الإشعار عبر API المنشور على Vercel

async function testNotification() {
  const API_URL = 'https://noortech.vercel.app/api/meeting';
  
  // مسلم (المُرسِل): d2c4eef8-72cc-4dd1-a734-00d5ebe94f6d  
  // جلنار (المُستقبِل): ca0db5b3-1080-41bc-ba97-894d5f01445d

  const body = {
    title: 'اختبار إشعار - تشخيص',
    created_by: 'd2c4eef8-72cc-4dd1-a734-00d5ebe94f6d',
    participants: ['ca0db5b3-1080-41bc-ba97-894d5f01445d']
  };

  console.log('=== إرسال طلب إنشاء اجتماع ===');
  console.log('URL:', API_URL);
  console.log('Body:', JSON.stringify(body, null, 2));

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('\n=== استجابة السيرفر ===');
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.notification_debug) {
      console.log('\n=== تشخيص الإشعار ===');
      const nd = data.notification_debug;
      console.log('App ID موجود:', nd.app_id_exists);
      console.log('API Key موجود:', nd.api_key_exists);
      console.log('المشاركين المُرسلين:', nd.participants_sent);
      console.log('نتيجة OneSignal:', JSON.stringify(nd.result, null, 2));
      console.log('خطأ OneSignal:', JSON.stringify(nd.error, null, 2));
    }
  } catch (err) {
    console.error('خطأ:', err);
  }
}

testNotification();
