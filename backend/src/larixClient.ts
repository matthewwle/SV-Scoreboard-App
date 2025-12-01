import axios from 'axios';

const LARIX_API_URL = process.env.LARIX_API_URL || '';
const LARIX_API_TOKEN = process.env.LARIX_API_TOKEN || '';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

interface LarixResponse {
  success: boolean;
  message?: string;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start recording on Larix via LarixTuner API
 * Retries up to MAX_RETRIES times with exponential backoff
 */
export async function startRecording(courtId: number, matchId: number): Promise<LarixResponse> {
  if (!LARIX_API_URL || !LARIX_API_TOKEN) {
    console.warn('⚠️  Larix API not configured (LARIX_API_URL or LARIX_API_TOKEN missing)');
    return { success: false, message: 'Larix API not configured' };
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📹 [Court ${courtId}] Starting Larix recording (attempt ${attempt}/${MAX_RETRIES})...`);
      
      const response = await axios.post(
        `${LARIX_API_URL}/api/v1/recorder/start`,
        {
          court_id: courtId,
          match_id: matchId,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${LARIX_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        }
      );

      console.log(`✅ [Court ${courtId}] Larix recording started successfully`);
      return { success: true, message: 'Recording started' };

    } catch (error: any) {
      lastError = error;
      console.error(`❌ [Court ${courtId}] Larix start recording failed (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        const delayTime = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.log(`⏳ Retrying in ${delayTime}ms...`);
        await delay(delayTime);
      }
    }
  }

  // All retries failed
  console.error(`🚫 [Court ${courtId}] Failed to start Larix recording after ${MAX_RETRIES} attempts`);
  return { 
    success: false, 
    message: lastError?.message || 'Failed to start recording after retries' 
  };
}

/**
 * Stop recording on Larix via LarixTuner API
 * Retries up to MAX_RETRIES times with exponential backoff
 */
export async function stopRecording(courtId: number, matchId: number): Promise<LarixResponse> {
  if (!LARIX_API_URL || !LARIX_API_TOKEN) {
    console.warn('⚠️  Larix API not configured (LARIX_API_URL or LARIX_API_TOKEN missing)');
    return { success: false, message: 'Larix API not configured' };
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🛑 [Court ${courtId}] Stopping Larix recording (attempt ${attempt}/${MAX_RETRIES})...`);
      
      const response = await axios.post(
        `${LARIX_API_URL}/api/v1/recorder/stop`,
        {
          court_id: courtId,
          match_id: matchId,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${LARIX_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      console.log(`✅ [Court ${courtId}] Larix recording stopped successfully`);
      return { success: true, message: 'Recording stopped' };

    } catch (error: any) {
      lastError = error;
      console.error(`❌ [Court ${courtId}] Larix stop recording failed (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
      
      if (attempt < MAX_RETRIES) {
        const delayTime = RETRY_DELAY_MS * attempt;
        console.log(`⏳ Retrying in ${delayTime}ms...`);
        await delay(delayTime);
      }
    }
  }

  console.error(`🚫 [Court ${courtId}] Failed to stop Larix recording after ${MAX_RETRIES} attempts`);
  return { 
    success: false, 
    message: lastError?.message || 'Failed to stop recording after retries' 
  };
}

/**
 * Test Larix connection
 */
export async function testLarixConnection(): Promise<boolean> {
  if (!LARIX_API_URL || !LARIX_API_TOKEN) {
    console.warn('⚠️  Larix API not configured');
    return false;
  }

  try {
    // Try to ping the API (you might need to adjust this endpoint based on Larix docs)
    const response = await axios.get(`${LARIX_API_URL}/api/v1/status`, {
      headers: {
        'Authorization': `Bearer ${LARIX_API_TOKEN}`
      },
      timeout: 3000
    });
    
    console.log('✅ Larix API connection successful');
    return true;
  } catch (error) {
    console.error('❌ Larix API connection failed:', error);
    return false;
  }
}

