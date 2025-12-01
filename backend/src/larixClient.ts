import axios from 'axios';

const LARIX_API_URL = process.env.LARIX_API_URL || '';
const LARIX_CLIENT_ID = process.env.LARIX_CLIENT_ID || '';
const LARIX_API_KEY = process.env.LARIX_API_KEY || '';
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
 * Start recording on Larix via Softvelum's LarixTuner Cloud API
 * Retries up to MAX_RETRIES times with exponential backoff
 * @param courtId - Court ID for logging purposes
 * @param matchId - Match ID for logging purposes
 * @param deviceId - Unique device ID from LarixTuner (e.g., "668d111e83d3c488d1e91eeb")
 */
export async function startRecording(
  courtId: number, 
  matchId: number,
  deviceId: string | null | undefined
): Promise<LarixResponse> {
  if (!LARIX_API_URL || !LARIX_CLIENT_ID || !LARIX_API_KEY) {
    console.warn('⚠️  Larix API not configured (LARIX_API_URL, LARIX_CLIENT_ID, or LARIX_API_KEY missing)');
    return { success: false, message: 'Larix API not configured' };
  }

  if (!deviceId) {
    console.warn(`⚠️  [Court ${courtId}] No Larix device ID configured for this court`);
    return { success: false, message: 'No device ID configured for this court' };
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📹 [Court ${courtId}] Starting Larix recording for device "${deviceId}" (attempt ${attempt}/${MAX_RETRIES})...`);
      
      // Softvelum API format: GET /api/v1/public/remote_control/[device_id]/broadcast/start?client_id=X&api_key=Y
      const url = `${LARIX_API_URL}/api/v1/public/remote_control/${deviceId}/broadcast/start`;
      const response = await axios.get(url, {
        params: {
          client_id: LARIX_CLIENT_ID,
          api_key: LARIX_API_KEY
        },
        timeout: 5000 // 5 second timeout
      });

      if (response.data?.status === 'ok') {
        console.log(`✅ [Court ${courtId}] Larix recording started successfully`);
        return { success: true, message: 'Recording started' };
      } else {
        throw new Error(response.data?.message || 'Unknown error from Larix API');
      }

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
 * Stop recording on Larix via Softvelum's LarixTuner Cloud API
 * Retries up to MAX_RETRIES times with exponential backoff
 * @param courtId - Court ID for logging purposes
 * @param matchId - Match ID for logging purposes
 * @param deviceId - Unique device ID from LarixTuner
 */
export async function stopRecording(
  courtId: number, 
  matchId: number,
  deviceId: string | null | undefined
): Promise<LarixResponse> {
  if (!LARIX_API_URL || !LARIX_CLIENT_ID || !LARIX_API_KEY) {
    console.warn('⚠️  Larix API not configured (LARIX_API_URL, LARIX_CLIENT_ID, or LARIX_API_KEY missing)');
    return { success: false, message: 'Larix API not configured' };
  }

  if (!deviceId) {
    console.warn(`⚠️  [Court ${courtId}] No Larix device ID configured for this court`);
    return { success: false, message: 'No device ID configured for this court' };
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🛑 [Court ${courtId}] Stopping Larix recording for device "${deviceId}" (attempt ${attempt}/${MAX_RETRIES})...`);
      
      // Softvelum API format: GET /api/v1/public/remote_control/[device_id]/broadcast/stop?client_id=X&api_key=Y
      const url = `${LARIX_API_URL}/api/v1/public/remote_control/${deviceId}/broadcast/stop`;
      const response = await axios.get(url, {
        params: {
          client_id: LARIX_CLIENT_ID,
          api_key: LARIX_API_KEY
        },
        timeout: 5000
      });

      if (response.data?.status === 'ok') {
        console.log(`✅ [Court ${courtId}] Larix recording stopped successfully`);
        return { success: true, message: 'Recording stopped' };
      } else {
        throw new Error(response.data?.message || 'Unknown error from Larix API');
      }

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
 * Test Larix connection using Softvelum's API format
 */
export async function testLarixConnection(): Promise<boolean> {
  if (!LARIX_API_URL || !LARIX_CLIENT_ID || !LARIX_API_KEY) {
    console.warn('⚠️  Larix API not configured (missing LARIX_API_URL, LARIX_CLIENT_ID, or LARIX_API_KEY)');
    return false;
  }

  try {
    // Test connection by attempting to access the API with credentials
    // Note: Softvelum's API doesn't have a dedicated /status endpoint, 
    // so we just verify the URL and credentials are configured
    console.log('✅ Larix API credentials configured:', {
      url: LARIX_API_URL,
      client_id: LARIX_CLIENT_ID ? '***' + LARIX_CLIENT_ID.slice(-4) : 'missing',
      api_key: LARIX_API_KEY ? '***' + LARIX_API_KEY.slice(-4) : 'missing'
    });
    return true;
  } catch (error) {
    console.error('❌ Larix API connection test failed:', error);
    return false;
  }
}

