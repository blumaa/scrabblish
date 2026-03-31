/**
 * APNs push sender for iOS devices.
 * Sends notifications directly to Apple Push Notification service via HTTP/2.
 */

interface ApnsPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to an iOS device via APNs.
 * Returns true on success (200), false on gone (410 — token expired).
 * Throws on other errors.
 */
export async function sendApnsPush(
  deviceToken: string,
  payload: ApnsPayload,
  teamId: string,
  keyId: string,
  privateKeyBase64: string,
  bundleId: string,
  sandbox = false,
): Promise<boolean> {
  const host = sandbox
    ? 'api.sandbox.push.apple.com'
    : 'api.push.apple.com';

  const jwt = await generateApnsJwt(teamId, keyId, privateKeyBase64);

  const apnsPayload = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
      badge: 1,
    },
    url: payload.url,
  });

  const response = await fetch(
    `https://${host}/3/device/${deviceToken}`,
    {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
      },
      body: apnsPayload,
    },
  );

  if (response.status === 200) return true;

  // 410 = token no longer valid, caller should delete it
  if (response.status === 410) return false;

  const errorBody = await response.text();
  console.error(`APNs error ${response.status}: ${errorBody}`);
  return false;
}

/**
 * Generate a JWT for APNs authentication (ES256).
 * The token is valid for up to 1 hour per Apple's spec.
 */
async function generateApnsJwt(
  teamId: string,
  keyId: string,
  privateKeyBase64: string,
): Promise<string> {
  const header = { alg: 'ES256', kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: teamId, iat: now };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaims = base64url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  // Import the P-256 private key from the .p8 file contents
  const keyData = Uint8Array.from(atob(privateKeyBase64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  // Convert DER signature to raw r||s format for JWT
  const rawSig = derToRaw(new Uint8Array(signature));
  const encodedSignature = base64url(rawSig);

  return `${signingInput}.${encodedSignature}`;
}

function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : input;

  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert a DER-encoded ECDSA signature to the raw r||s format.
 * WebCrypto may return DER format on some platforms.
 */
function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's already raw r||s
  if (der.length === 64) return der;

  // DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 <len>

  // Read r
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // Read s
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);

  return raw;
}
