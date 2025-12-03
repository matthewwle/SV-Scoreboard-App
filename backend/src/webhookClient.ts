import axios from 'axios';

const WEBHOOK_URL = 'https://eox46m41zgwlx3e.m.pipedream.net';

interface WebhookResponse {
  success: boolean;
  message?: string;
}

/**
 * Send webhook for match start
 */
export async function sendMatchStartWebhook(
  matchId: number,
  teamName1: string,
  teamName2: string
): Promise<WebhookResponse> {
  const startTime = new Date().toISOString();
  
  try {
    console.log(`🔔 Sending match START webhook for Match ${matchId}...`);
    
    const payload = {
      event: 'match_start',
      matchID: matchId,
      teamName1,
      teamName2,
      startTime
    };
    
    await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log(`✅ Match START webhook sent successfully:`, payload);
    return { success: true, message: 'Match start webhook sent' };
    
  } catch (error: any) {
    console.error(`❌ Failed to send match START webhook:`, error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Send webhook for match end
 */
export async function sendMatchEndWebhook(
  matchId: number,
  teamName1: string,
  teamName2: string
): Promise<WebhookResponse> {
  const stopTime = new Date().toISOString();
  
  try {
    console.log(`🔔 Sending match END webhook for Match ${matchId}...`);
    
    const payload = {
      event: 'match_end',
      matchID: matchId,
      teamName1,
      teamName2,
      stopTime
    };
    
    await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log(`✅ Match END webhook sent successfully:`, payload);
    return { success: true, message: 'Match end webhook sent' };
    
  } catch (error: any) {
    console.error(`❌ Failed to send match END webhook:`, error.message);
    return { success: false, message: error.message };
  }
}

