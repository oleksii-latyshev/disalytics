const baseUrl = process.argv[2];

if (baseUrl === undefined) {
  throw new Error('Usage: bun run admin:smoke <admin-url>');
}

// The admin sits behind Cloudflare Access, so an anonymous request must never be answered with
// data: Access redirects it to the login (3xx) once enabled, and the Worker itself refuses it
// (401, or 403 while TEAM_DOMAIN and POLICY_AUD are unset). A 200 here would mean the write API is open.
const REFUSED = new Set([301, 302, 303, 307, 308, 401, 403]);
const READY_ATTEMPTS = 36;
const READY_INTERVAL_MS = 5_000;
const url = new URL('/api/whoami', baseUrl);

let status = 0;
let refused = false;
for (let attempt = 0; attempt < READY_ATTEMPTS && !refused; attempt += 1) {
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    status = response.status;
    refused = REFUSED.has(status);
    if (status === 200) throw new Error('The admin API answered an anonymous request');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('The admin API')) throw error;
    status = 0;
  }
  if (!refused && attempt + 1 < READY_ATTEMPTS) await Bun.sleep(READY_INTERVAL_MS);
}

if (!refused) throw new Error(`Admin did not refuse an anonymous request (last status ${status})`);

console.log(`Admin smoke passed: ${new URL(baseUrl).origin} (${status})`);
