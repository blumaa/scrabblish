/**
 * Web Push sender using native Deno crypto.
 * Implements VAPID authentication and Web Push payload encryption.
 */

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a Web Push notification.
 * Returns true if the push was accepted by the push service (201/202).
 * Returns false if it failed (expired token, etc).
 */
export async function sendWebPush(
  subscriptionJson: string,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    const subscription: PushSubscription = JSON.parse(subscriptionJson);
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

    // Generate VAPID JWT
    const audience = new URL(subscription.endpoint).origin;
    const jwt = await generateVapidJwt(vapidPublicKey, vapidPrivateKey, audience, vapidSubject);

    // Encrypt payload
    const encrypted = await encryptPayload(payloadBytes, subscription.keys.p256dh, subscription.keys.auth);

    // Send to push endpoint
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 202) {
      return true;
    }

    if (response.status === 404 || response.status === 410) {
      // Token expired — caller should delete it
      console.log('Push token expired:', response.status);
      return false;
    }

    console.error('Push failed:', response.status, await response.text());
    return false;
  } catch (err) {
    console.error('sendWebPush error:', err);
    return false;
  }
}

async function generateVapidJwt(
  publicKey: string,
  privateKey: string,
  audience: string,
  subject: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400, // 24 hours
    sub: subject,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  // Import the VAPID private key for signing
  const keyData = base64urlDecode(privateKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const sigBytes = new Uint8Array(signature);
  const rawSig = derToRaw(sigBytes);

  return `${unsigned}.${base64urlEncodeBuffer(rawSig)}`;
}

async function encryptPayload(
  payload: Uint8Array,
  p256dhKey: string,
  authSecret: string
): Promise<Uint8Array> {
  // Decode subscriber's public key and auth secret
  const subscriberPubKey = base64urlDecode(p256dhKey);
  const subscriberAuth = base64urlDecode(authSecret);

  // Generate ephemeral ECDH key pair
  const ephemeralKey = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    'raw',
    subscriberPubKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberKey },
    ephemeralKey.privateKey,
    256
  );

  // Export ephemeral public key
  const ephemeralPubKey = await crypto.subtle.exportKey('raw', ephemeralKey.publicKey);
  const ephemeralPubKeyBytes = new Uint8Array(ephemeralPubKey);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291 key derivation:
  // Step 1: PRK = HMAC-SHA-256(auth_secret, ecdh_secret)
  const prkKey = await crypto.subtle.importKey('raw', subscriberAuth, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, sharedSecret));

  // Step 2: IKM = HKDF-Expand(PRK, "WebPush: info\0" || ua_public || as_public, 32)
  const ikmInfo = concat(
    new TextEncoder().encode('WebPush: info\0'),
    subscriberPubKey,
    ephemeralPubKeyBytes,
  );
  const ikm = await hkdfExpand(prk, ikmInfo, 32);

  // Step 3: salt_PRK = HMAC-SHA-256(salt, IKM)
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const saltPrk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));

  // Step 4: CEK and nonce from salt_PRK
  const contentKey = await hkdfExpand(saltPrk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(saltPrk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', contentKey, { name: 'AES-GCM' }, false, ['encrypt']);

  // Pad payload (add 0x02 delimiter per RFC 8188)
  const paddedPayload = concat(payload, new Uint8Array([2]));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  );

  // Build aes128gcm header: salt(16) + rs(4) + keylen(1) + key(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concat(
    salt,
    rs,
    new Uint8Array([65]),
    ephemeralPubKeyBytes,
    new Uint8Array(ciphertext)
  );
}

// ── Helpers ──

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlEncodeBuffer(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...binary].map(c => c.charCodeAt(0)));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = new Uint8Array(await crypto.subtle.sign('HMAC', key, concat(info, new Uint8Array([1]))));
  return result.slice(0, length);
}

function derToRaw(der: Uint8Array): Uint8Array {
  // ECDSA signature from WebCrypto can be either raw (64 bytes) or DER encoded
  if (der.length === 64) return der;

  // DER: 0x30 len 0x02 rlen r 0x02 slen s
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 and total length

  // Read r
  if (der[offset] !== 0x02) return der; // not DER
  offset++;
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen > 32 ? 0 : 32 - rLen;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // Read s
  if (der[offset] !== 0x02) return der;
  offset++;
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen > 32 ? 32 : 32 + (32 - sLen);
  raw.set(der.slice(sStart, offset + sLen), sDest);

  return raw;
}
