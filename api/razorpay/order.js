/**
 * Vercel Serverless Function: /api/razorpay/order
 *
 * Acts as a same-origin proxy to the mobile backend's Razorpay order endpoint.
 * Browser requests hit this function on the same domain (edu-orbit-desktop.vercel.app),
 * and this function forwards them server-side — bypassing browser CORS restrictions.
 */

const BACKEND_URL = 'https://lms-mobile-bckend.vercel.app/api/razorpay/order';

/**
 * Manually reads and parses the raw request body from the IncomingMessage stream.
 * Vercel does NOT auto-parse the body for API functions, so we need this.
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Read raw body since Vercel doesn't auto-parse it
    const rawBody = await getRawBody(req);

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsedBody),
    });

    const data = await response.json();

    // Forward the status code and response from the backend
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy] Error forwarding to razorpay/order:', error);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
}
