import { supabase } from './supabase';

export async function callEdgeFunction(name: string, body: Record<string, unknown>): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data;
}
