import { createClient } from '@/lib/supabase/client'

// Global loading callbacks - will be set by ApiLoadingContext
let globalStartLoading: (() => void) | null = null
let globalStopLoading: (() => void) | null = null

export function setLoadingCallbacks(start: () => void, stop: () => void) {
  globalStartLoading = start
  globalStopLoading = stop
}

interface AuthenticatedFetchOptions extends RequestInit {
  retries?: number
  retryDelay?: number
  useExponentialBackoff?: boolean
  onRetry?: (attempt: number, maxRetries: number) => void
  skipLoadingIndicator?: boolean
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
  const { retries = 0, retryDelay = 5000, useExponentialBackoff = false, onRetry, skipLoadingIndicator = false, ...fetchOptions } = options
  
  // Track loading state
  if (!skipLoadingIndicator && globalStartLoading) {
    globalStartLoading()
  }
  
  try {
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
      ...fetchOptions.headers,
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
          signal: AbortSignal.timeout(20000), // 20 Sekunden Timeout pro Versuch
        })
        
        console.log('[AUTH_FETCH] Response erhalten, Status:', response.status);
        
        // Bei Erfolg (2xx) oder Client-Fehler (4xx) sofort zurückgeben
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          console.log('[AUTH_FETCH] ✓ Request erfolgreich, beende Retries');
          return response
        }
        
        // Bei Server-Fehler (5xx) wiederholen, falls Retries konfiguriert
        if (attempt < retries) {
          const currentDelay = useExponentialBackoff 
            ? retryDelay * Math.pow(1.5, attempt) // Exponentieller Backoff: 2s, 3s, 4.5s, 6.75s...
            : retryDelay
          console.log(`[AUTH_FETCH] Server Error ${response.status}, Retry ${attempt + 1}/${retries} in ${Math.round(currentDelay)}ms`);
          if (onRetry) onRetry(attempt + 1, retries)
          await new Promise(resolve => setTimeout(resolve, currentDelay))
          continue
        }
        
        return response
      } catch (error) {
        lastError = error as Error
        console.error(`[AUTH_FETCH] Fetch Fehler (Versuch ${attempt + 1}/${retries + 1}):`, error);
        
        // Bei Netzwerkfehler oder Timeout wiederholen
        if (attempt < retries) {
          const currentDelay = useExponentialBackoff 
            ? retryDelay * Math.pow(1.5, attempt)
            : retryDelay
          console.log(`[AUTH_FETCH] Retry ${attempt + 1}/${retries} in ${Math.round(currentDelay)}ms`);
          if (onRetry) onRetry(attempt + 1, retries)
          await new Promise(resolve => setTimeout(resolve, currentDelay))
          continue
        }
        
        throw error
      }
    }
    
    // Falls wir hier ankommen, werfen wir den letzten Fehler
    throw lastError || new Error('Request failed after retries')
  } finally {
    // Stop loading indicator
    if (!skipLoadingIndicator && globalStopLoading) {
      globalStopLoading()
    }
  }
}
