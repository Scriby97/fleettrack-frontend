import { createClient } from '@/lib/supabase/client'

/**
 * Makes an authenticated fetch request to the backend API
 * Automatically adds the Authorization header with the Supabase JWT token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
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
  const response = await fetch(url, {
    ...options,
    headers,
  })
  console.log('[AUTH_FETCH] Response erhalten, Status:', response.status);
  return response
}
