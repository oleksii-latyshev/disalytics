export function jsonResponse(
  body: Record<string, string>,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
