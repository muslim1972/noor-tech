const fs = require('fs');

async function testOneSignal() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const appIdMatch = env.match(/NEXT_PUBLIC_ONESIGNAL_APP_ID=([a-zA-Z0-9\-]+)/);
    const apiKeyMatch = env.match(/ONESIGNAL_REST_API_KEY=[\"']?([^\"'\r\n]+)[\"']?/);
    
    if (!appIdMatch || !apiKeyMatch) {
      console.error('لم يتم العثور على المفاتيح في ملف .env.local');
      return;
    }
    
    const appId = appIdMatch[1];
    const apiKey = apiKeyMatch[1];
    
    console.log('App ID:', appId);
    console.log('Sending broadcast notification to Subscribed Users...');

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + apiKey
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['Subscribed Users'],
        contents: { en: 'Test Broadcast Notification', ar: 'إشعار بث تجريبي' }
      })
    });
    
    const data = await response.json();
    console.log('ONESIGNAL RESPONSE:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('ERROR:', error);
  }
}

testOneSignal();
