import { supabase } from './supabase';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function callEdgeFunction(name: string, body: Record<string, unknown>): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  let response = await fetchFunction(name, body, session.access_token);

  // On 401, the token may be stale — refresh and retry once
  if (response.status === 401) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (refreshed) {
      response = await fetchFunction(name, body, refreshed.access_token);
    } else {
      await supabase.auth.signOut();
      throw new Error('Session expired — please sign in again');
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }

  return data;
}

async function fetchFunction(name: string, body: Record<string, unknown>, accessToken: string): Promise<Response> {
  return fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}
