import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/**
 * Extract and VERIFY user ID from the request's Authorization header.
 * Uses the service role client's auth.getUser() which validates the JWT
 * signature against Supabase's public keys.
 */
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}
