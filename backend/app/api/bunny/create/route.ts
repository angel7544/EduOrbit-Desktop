import { NextResponse } from 'next/server';
import crypto from 'crypto';

const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const BASE_URL = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;

export async function POST(req: Request) {
  try {
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
         return NextResponse.json({ error: 'Bunny configuration missing' }, { status: 500 });
    }

    // 1. Create Video Entry
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        AccessKey: BUNNY_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bunny API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const videoId = data.guid;
    
    // 2. Generate Presigned Upload Signature
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    // Signature = SHA256(LibraryId + APIKey + ExpirationTime + VideoId)
    const signature = crypto.createHash('sha256')
        .update(BUNNY_LIBRARY_ID + BUNNY_API_KEY + expirationTime + videoId)
        .digest('hex');

    return NextResponse.json({
      guid: videoId,
      uploadSignature: signature,
      expirationTime: expirationTime,
      libraryId: BUNNY_LIBRARY_ID
    });

  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
