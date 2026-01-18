import { createClient } from '@/lib/supabase/client'

interface AuthenticatedFetchOptions extends RequestInit {
  retries?: number
  retryDelay?: number
  onRetry?: (attempt: number, maxRetries: number) => void
}

/**
 * Makes an authenticated fetch request to the backend API
 * Automatically adds the Authorization header with the Supabase JWT token
 * Supports retry logic for cold starts (e.g., Render free tier)
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { retries = 0, retryDelay = 5000, onRetry, ...fetchOptions } = options
  console.log('[AUTH_FETCH] Starte authenticatedFetch für URL:', url);
  const supabase = createClient()
  
  // Get the current session token with timeout
  console.log('[AUTH_FETCH] Hole Session...');
  
  // Add timeout to prevent hanging
  const getSessionWithTimeout = Promise.race([
    supabase.auth.getSession(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout - bitte Seite neu laden')), 5000)
    )
  ]);
  
  let session;
  try {
    const result = await getSessionWithTimeout as any;
    session = result?.data?.session;
    console.log('[AUTH_FETCH] Session erhalten:', session ? 'JA' : 'NEIN', session?.user?.email);
  } catch (error) {
    console.error('[AUTH_FETCH] Fehler beim Abrufen der Session:', error);
    throw error;
  }
  
  if (!session?.access_token) {
    console.error('[AUTH_FETCH] FEHLER: Keine aktive Session!');
    throw new Error('No active session. Please login first.')
  }

  // Merge headers with authorization
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }

  console.log('[AUTH_FETCH] Sende fetch Request zu:', url);
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: AbortSignal.timeout(30000), // 30 Sekunden Timeout pro Versuch
      })
      
      console.log('[AUTH_FETCH] Response erhalten, Status:', response.status);
      
      // Bei Erfolg (2xx) oder Client-Fehler (4xx) nicht wiederholen
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response
      }
      
      // Bei Server-Fehler (5xx) wiederholen, falls Retries konfiguriert
      if (attempt < retries) {
        console.log(`[AUTH_FETCH] Server Error ${response.status}, Retry ${attempt + 1}/${retries} in ${retryDelay}ms`);
        if (onRetry) onRetry(attempt + 1, retries)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }
      
      return response
    } catch (error) {
      lastError = error as Error
      console.error(`[AUTH_FETCH] Fetch Fehler (Versuch ${attempt + 1}/${retries + 1}):`, error);
      
      // Bei Netzwerkfehler oder Timeout wiederholen
      if (attempt < retries) {
        console.log(`[AUTH_FETCH] Retry ${attempt + 1}/${retries} in ${retryDelay}ms`);
        if (onRetry) onRetry(attempt + 1, retries)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }
      
      throw error
    }
  }
  
  // Falls wir hier ankommen, werfen wir den letzten Fehler
  throw lastError || new Error('Request failed after retries')
}
