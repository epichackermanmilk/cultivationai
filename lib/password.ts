// Shared client-side password-strength check. Mirrors the rules shown at signup
// so reset / change-password feel consistent. The server's hard floor is 7–128
// chars (see lib/sanitize isValidPassword); this adds friendly complexity hints.

export function passwordError(pw: string): string | null {
  if (pw.length < 7)             return 'At least 7 characters required'
  if (!/\d/.test(pw))            return 'Must include a number'
  if (!/[^A-Za-z0-9]/.test(pw))  return 'Must include a special character'
  return null
}
