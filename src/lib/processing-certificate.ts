export const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;
export function certificateExtension(bytes: Uint8Array): 'png' | 'jpg' | 'webp' | null {
  if ([137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n)) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return 'webp';
  return null;
}
export function isCertificateLink(value: unknown): value is string {
  return typeof value === 'string' && /^\/api\/processing\/gmp\/certificates\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(value);
}
