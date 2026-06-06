const DEFAULT_SECRET = 'fitai-trainer-secret-key-998127';

/**
 * Generate a SHA-256 hash of an email and secret key.
 * @param {string} email
 * @returns {Promise<string>}
 */
export async function generateInviteToken(email) {
  const secret = import.meta.env.VITE_INVITE_SECRET || DEFAULT_SECRET;
  const msg = `${email.trim().toLowerCase()}:${secret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify if the provided token matches the computed hash for the email.
 * @param {string} email
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function verifyInviteToken(email, token) {
  if (!email || !token) return false;
  const expectedToken = await generateInviteToken(email);
  return expectedToken === token;
}
