const fs = require('fs');

async function testDirectMessage() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const appId = env.match(/NEXT_PUBLIC_ONESIGNAL_APP_ID=([a-zA-Z0-9\-]+)/)[1];
    const apiKey = env.match(/ONESIGNAL_REST_API_KEY=[\"']?([^\"'\r\n]+)[\"']?/)[1];
    
    // استخدام أحد الـ External IDs الذي اكتشفناه
    const testExternalId = 'ca0db5b3-1080-41bc-ba97-894d5f01445d';
    
    console.log('Sending direct message to:', testExternalId);

    // التجربة بالطريقة رقم 1: include_external_user_ids (المتوافقة مع v1)
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + apiKey
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: [testExternalId],
        contents: { en: 'Direct Test', ar: 'رسالة مباشرة' }
      })
    });
    
    const data = await response.json();
    console.log('RESULT v1:', JSON.stringify(data, null, 2));

    // إذا تم رفضه، ربما المشروع يستخدم API متقدمة v2، لذلك نجرب include_aliases
    if (data.errors && data.errors.includes("All included players are not subscribed")) {
      console.log('\nTrying API v2 format (target_channel + include_aliases)...');
      const responseV2 = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + apiKey
        },
        body: JSON.stringify({
          app_id: appId,
          target_channel: 'push',
          include_aliases: {
            external_id: [testExternalId]
          },
          contents: { en: 'Direct Test V2', ar: 'رسالة مباشرة V2' }
        })
      });
      const dataV2 = await responseV2.json();
      console.log('RESULT v2:', JSON.stringify(dataV2, null, 2));
    }
  } catch (error) {
    console.error('ERROR:', error);
  }
}

testDirectMessage();
