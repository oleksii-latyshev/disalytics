const baseUrl = process.argv[2];

if (baseUrl === undefined) {
  throw new Error('Usage: bun run api:smoke <api-url>');
}

const healthUrl = new URL('/health', baseUrl);
const missingUrl = new URL('/missing', baseUrl);
const READY_ATTEMPTS = 36;
const READY_INTERVAL_MS = 5_000;

async function request(url: URL, method = 'GET'): Promise<Response> {
  return fetch(url, { method, signal: AbortSignal.timeout(10_000) });
}

let isReady = false;
let lastFailure = 'No response';

for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
  try {
    const response = await request(healthUrl);
    const body = await response.text();
    if (
      response.status === 200 &&
      response.headers.get('content-type')?.includes('application/json') === true &&
      response.headers.get('cache-control') === 'no-store' &&
      body === '{"status":"ok"}'
    ) {
      isReady = true;
      break;
    }
    lastFailure = `${response.status} ${body}`;
  } catch (error) {
    lastFailure = String(error);
  }

  if (attempt + 1 < READY_ATTEMPTS) await Bun.sleep(READY_INTERVAL_MS);
}

if (!isReady) throw new Error(`API health did not become ready: ${lastFailure}`);

const methodResponse = await request(healthUrl, 'POST');
if (methodResponse.status !== 404 || (await methodResponse.text()) !== '{"error":"not_found"}') {
  throw new Error('API method contract failed');
}

const missingResponse = await request(missingUrl);
if (missingResponse.status !== 404 || (await missingResponse.text()) !== '{"error":"not_found"}') {
  throw new Error('API missing-route contract failed');
}

console.log(`API smoke passed: ${new URL(baseUrl).origin}`);
