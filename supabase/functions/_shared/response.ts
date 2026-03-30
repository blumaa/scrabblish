import { corsHeaders } from './cors.ts';

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}
