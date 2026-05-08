// Maps userId → ms timestamp of their last password reset.
// JWTs whose iat (seconds) predates this timestamp are rejected.
// Cleared on server restart; 90-day JWT expiry is the long-term backstop.
const resetTimestamps = new Map<string, number>();

export function recordPasswordReset(userId: string): void {
  resetTimestamps.set(userId, Date.now());
}

export function isSessionInvalidated(userId: string, jwtIssuedAt: number): boolean {
  const resetAt = resetTimestamps.get(userId);
  if (!resetAt) return false;
  return jwtIssuedAt * 1000 < resetAt; // iat is seconds; resetAt is ms
}
