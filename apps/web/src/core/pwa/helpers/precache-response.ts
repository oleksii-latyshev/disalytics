interface FetchDidSucceedOptions {
  request: Request;
  response: Response;
}

interface CachedResponseWillBeUsedOptions {
  request: Request;
  cachedResponse?: Response | undefined;
}

const JAVASCRIPT_MIME_TYPES = new Set([
  'application/ecmascript',
  'application/javascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
]);

const isExpectedPrecacheMimeType = (request: Request, response: Response): boolean => {
  const pathname = new URL(request.url).pathname;
  const isJavaScript = pathname.endsWith('.js');
  const isStylesheet = pathname.endsWith('.css');

  if (!isJavaScript && !isStylesheet) return true;

  const mimeType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (isJavaScript) return mimeType !== undefined && JAVASCRIPT_MIME_TYPES.has(mimeType);
  return mimeType === 'text/css';
};

export const precacheResponseMimePlugin = {
  async fetchDidSucceed({ request, response }: FetchDidSucceedOptions): Promise<Response> {
    if (!isExpectedPrecacheMimeType(request, response)) {
      throw new Error(`Unexpected precache MIME type for ${new URL(request.url).pathname}`);
    }

    return response;
  },

  async cachedResponseWillBeUsed({
    request,
    cachedResponse,
  }: CachedResponseWillBeUsedOptions): Promise<Response | undefined> {
    if (!cachedResponse || !isExpectedPrecacheMimeType(request, cachedResponse)) return undefined;
    return cachedResponse;
  },
};
