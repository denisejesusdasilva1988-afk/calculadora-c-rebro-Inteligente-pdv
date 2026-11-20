/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verificação segura de privilégios administrativos sem exposição de dados pessoais no cliente.
 */

export const OFFICIAL_SUPPORT_EMAIL = "calculadoracerebrointeligente@gmail.com";

function digestEmail(input: string): string {
  const str = input.toLowerCase().trim();
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x9e3779b9 >>> 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (c + i) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

const PRIVILEGED_EMAIL_DIGESTS = new Set<string>([
  "52c20913ed6a0798",
  "67710b70b2521fde",
  "9f1d2756f3b8621a",
  "9f0a9ba49998e90b",
]);

export function isOfficialAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (!normalized) return false;
  if (normalized === OFFICIAL_SUPPORT_EMAIL) return true;
  return PRIVILEGED_EMAIL_DIGESTS.has(digestEmail(normalized));
}
