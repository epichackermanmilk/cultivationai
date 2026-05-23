/** Shared input sanitization utilities */

/** Strip HTML tags, trim, and enforce max length */
export function sanitizeText(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, '')   // strip HTML
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength)
}

/** Validate email format */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254
}

/** Validate password: 7+ chars */
export function isValidPassword(pw: unknown): boolean {
  return typeof pw === 'string' && pw.length >= 7 && pw.length <= 128
}

/** Reject obviously malformed JSON bodies */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request,
  maxBytes = 16_384,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const cl = Number(req.headers.get('content-length') ?? 0)
  if (cl > maxBytes) return { ok: false, error: 'Payload too large' }

  try {
    const data = await req.json()
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { ok: false, error: 'Invalid JSON body' }
    }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }
}
