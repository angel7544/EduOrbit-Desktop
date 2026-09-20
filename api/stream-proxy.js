import http from 'http';
import https from 'https';
import { URL } from 'url';

export default function handler(req, res) {
  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const targetUrl = parsedUrl.searchParams.get('url');

  if (!targetUrl) {
    res.statusCode = 400;
    res.end('Missing url parameter');
    return;
  }

  let client;
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
    client = parsedTarget.protocol === 'https:' ? https : http;
  } catch (err) {
    res.statusCode = 400;
    res.end(`Invalid URL: ${err.message}`);
    return;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Origin': parsedTarget.origin,
    'Referer': `${parsedTarget.origin}/`,
  };

  if (req.headers.range) {
    headers['Range'] = req.headers.range;
  }

  const proxyReq = client.request(targetUrl, {
    method: 'GET',
    headers,
  }, (proxyRes) => {
    // Handle redirects (301, 302, 303, 307, 308)
    if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      const redirectUrl = proxyRes.headers.location.startsWith('http')
        ? proxyRes.headers.location
        : new URL(proxyRes.headers.location, targetUrl).href;
      res.writeHead(302, {
        'Location': `/api/stream-proxy?url=${encodeURIComponent(redirectUrl)}`,
        'Access-Control-Allow-Origin': '*',
      });
      res.end();
      return;
    }

    const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
    const isM3U8 = targetUrl.toLowerCase().includes('.m3u8') || 
                  contentType.includes('mpegurl') || 
                  contentType.includes('m3u8') ||
                  contentType.includes('application/x-mpegurl');

    if (isM3U8) {
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', (chunk) => {
        body += chunk;
      });
      proxyRes.on('end', () => {
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        const lines = body.split('\n');
        const rewritten = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Handle URI="..." in EXT-X-KEY or EXT-X-MAP
          if (trimmed.startsWith('#')) {
            if (trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/g, (_, uriMatch) => {
                const resolved = uriMatch.startsWith('http') ? uriMatch : new URL(uriMatch, baseUrl).href;
                return `URI="/api/stream-proxy?url=${encodeURIComponent(resolved)}"`;
              });
            }
            return line;
          }

          // Regular segment (.ts, .m4s) or child sub-playlist (.m3u8) URL
          const resolved = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).href;
          return `/api/stream-proxy?url=${encodeURIComponent(resolved)}`;
        }).join('\n');

        res.writeHead(200, {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.end(rewritten);
      });
    } else {
      // Forward binary media segments (ts, m4s, mp4)
      const responseHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      };
      if (proxyRes.headers['content-type']) responseHeaders['Content-Type'] = proxyRes.headers['content-type'];
      if (proxyRes.headers['content-length']) responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
      if (proxyRes.headers['accept-ranges']) responseHeaders['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
      if (proxyRes.headers['content-range']) responseHeaders['Content-Range'] = proxyRes.headers['content-range'];

      res.writeHead(proxyRes.statusCode || 200, responseHeaders);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Stream proxy error:', err.message);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end(`Stream proxy failed: ${err.message}`);
    }
  });

  proxyReq.end();
}
