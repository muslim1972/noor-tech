const fs = require('fs');

async function checkSubscribers() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const appId = env.match(/NEXT_PUBLIC_ONESIGNAL_APP_ID=([a-zA-Z0-9\-]+)/)[1];
    const apiKey = env.match(/ONESIGNAL_REST_API_KEY=[\"']?([^\"'\r\n]+)[\"']?/)[1];
    
    console.log('Fetching devices list for App ID:', appId);

    const response = await fetch(`https://onesignal.com/api/v1/players?app_id=${appId}&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + apiKey
      }
    });
    
    const data = await response.json();
    if (data.players) {
        console.log(`\nFound ${data.players.length} devices.`);
        data.players.forEach((p, index) => {
            console.log(`\n--- Device ${index + 1} ---`);
            console.log(`ID (Player ID): ${p.id}`);
            console.log(`External ID: ${p.external_user_id || 'Not Set'}`);
            console.log(`Device Type: ${p.device_type === 1 ? 'iOS' : p.device_type === 2 ? 'Android' : 'Web'}`);
            console.log(`Subscribed (opted_in): ${!p.invalid_identifier}`);
            /* invalid_identifier usually tracking if they have a valid push token */
            console.log(`Status details: identifier=${p.identifier ? 'Yes' : 'No'}, session_count=${p.session_count}`);
        });
    } else {
        console.log('ONESIGNAL RESPONSE:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('ERROR:', error);
  }
}

checkSubscribers();
