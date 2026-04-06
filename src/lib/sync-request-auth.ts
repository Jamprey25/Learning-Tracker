/**
 * Validates `Authorization: Bearer <SYNC_SECRET>` for cron / CLI scripts calling API routes.
 */
export function isAuthorizedSyncRequest(request: Request): boolean {
  const secret = process.env.SYNC_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  return token.length > 0 && token === secret;
}
