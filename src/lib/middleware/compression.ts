import { NextRequest, NextResponse } from 'next/server';

export function withCompression(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const response = await handler(request, ...args);
    
    // Only compress JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return response;
    }

    // Check if client accepts compression
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    const supportsGzip = acceptEncoding.includes('gzip');
    const supportsBrotli = acceptEncoding.includes('br');

    if (!supportsGzip && !supportsBrotli) {
      return response;
    }

    // Get response body
    const body = await response.text();
    
    // Only compress if body is large enough to benefit
    if (body.length < 1024) {
      return response;
    }

    try {
      let compressedBody: ArrayBuffer;
      let encoding: string;

      if (supportsBrotli) {
        // Use Brotli compression if available (better compression ratio)
        const { compress } = await import('brotli');
        compressedBody = compress(Buffer.from(body));
        encoding = 'br';
      } else {
        // Fallback to gzip
        const { gzipSync } = await import('zlib');
        compressedBody = gzipSync(body);
        encoding = 'gzip';
      }

      // Create new response with compressed body
      const compressedResponse = new NextResponse(compressedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'content-encoding': encoding,
          'content-length': compressedBody.byteLength.toString(),
          'vary': 'Accept-Encoding',
        },
      });

      return compressedResponse;
    } catch (error) {
      console.warn('Compression failed, returning uncompressed response:', error);
      return response;
    }
  };
}

export function addCacheHeaders(response: NextResponse, maxAge: number = 300) {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
  response.headers.set('ETag', `"${Date.now()}"`);
  return response;
}

export function addPerformanceHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}