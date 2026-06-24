import { NextResponse } from 'next/server';
import crypto from 'crypto';

const BUNNY_AUTH_KEY = process.env.BUNNY_STREAM_AUTH_KEY;
const BUNNY_CDN_HOST = process.env.BUNNY_STREAM_CDN_HOST;

export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: 'VideoId is required' }, { status: 400 });
    }
    
    if (!BUNNY_AUTH_KEY || !BUNNY_CDN_HOST) {
        return NextResponse.json({ error: 'Bunny configuration missing' }, { status: 500 });
    }

    const host = BUNNY_CDN_HOST.replace(/\/$/, '');
    const path = `/${videoId}/playlist.m3u8`;
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    // Token generation
    // SHA256(securityKey + path + expires)
    const stringToSign = BUNNY_AUTH_KEY + path + expires;
    const token = crypto.createHash('sha256').update(stringToSign).digest('hex');
    
    const url = `${host}${path}?token=${token}&expires=${expires}`;

    return NextResponse.json({ url });

  } catch (error) {
    console.error('Error signing URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
