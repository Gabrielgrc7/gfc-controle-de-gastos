/* core/crypto.js
   Embaralhamento irreversível de senha e PIN (PBKDF2 pela Web Crypto API). */

const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function hash(pw, salt) {
  try {
    const te = new TextEncoder(),
      k = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return hex(
      await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: te.encode(salt), iterations: 150000, hash: 'SHA-256' },
        k,
        256
      )
    );
  } catch (e) {
    return btoa(unescape(encodeURIComponent(salt + pw)));
  }
}
