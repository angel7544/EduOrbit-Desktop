/**
 * Vercel Serverless Function: /api/razorpay/verify
 *
 * Acts as a same-origin proxy to the mobile backend's Razorpay verify endpoint.
 * Browser requests hit this function on the same domain (edu-orbit-desktop.vercel.app),
 * and this function forwards them server-side — bypassing browser CORS restrictions.
 */

const BACKEND_URL = 'https://lms-mobile-bckend.vercel.app/api/razorpay/verify';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Forward the status code and response from the backend
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy] Error forwarding to razorpay/verify:', error);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
}
