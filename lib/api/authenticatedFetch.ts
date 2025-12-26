import { createClient } from '@/lib/supabase/client'

/**
 * Makes an authenticated fetch request to the backend API
 * Automatically adds the Authorization header with the Supabase JWT token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const supabase = createClient()
  
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No active session. Please login first.')
  }

  // Merge headers with authorization
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
