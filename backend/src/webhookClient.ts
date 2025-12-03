import axios from 'axios';

const WEBHOOK_URL = 'https://eox46m41zgwlx3e.m.pipedream.net';

// In-memory tournament label (synced from routes.ts)
let currentTournamentLabel = 'Winter Formal';

export function setTournamentLabel(label: string) {
  currentTournamentLabel = label;
}

export function getTournamentLabel(): string {
  return currentTournamentLabel;
}

interface WebhookResponse {
  success: boolean;
  message?: string;
}

/**
 * Send webhook for match start
 */
export async function sendMatchStartWebhook(
  courtId: number,
  externalMatchId: string | null | undefined
): Promise<WebhookResponse> {
  const time = new Date().toISOString();
  
  try {
    console.log(`🔔 Sending match START webhook for Court ${courtId}, MatchID ${externalMatchId}...`);
    
    const payload = {
      Court: courtId,
      Time: time,
      Event: 'Start',
      MatchID: externalMatchId || 'N/A',  // Use spreadsheet MatchID
      TournamentID: currentTournamentLabel
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
  courtId: number,
  externalMatchId: string | null | undefined
): Promise<WebhookResponse> {
  const time = new Date().toISOString();
  
  try {
    console.log(`🔔 Sending match END webhook for Court ${courtId}, MatchID ${externalMatchId}...`);
    
    const payload = {
      Court: courtId,
      Time: time,
      Event: 'Stop',
      MatchID: externalMatchId || 'N/A',  // Use spreadsheet MatchID
      TournamentID: currentTournamentLabel
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

