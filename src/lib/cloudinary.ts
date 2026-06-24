import { API_URL } from './utils';

export const uploadToCloudinary = async (
  fileUri: string,
  folder: string = 'lms_thumbnails',
  mimeType: string = 'image/jpeg',
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'image'
): Promise<string> => {
  try {
    const filename = fileUri.split('/').pop() || 'upload.jpg';
    
    // Create FormData
    const data = new FormData();
    data.append('file', {
      uri: fileUri,
      type: mimeType,
      name: filename,
    } as any);
    
    // Add folder context if supported by the backend
    data.append('folder', folder);
    
    // Ensure URL is correctly formatted based on API_URL
    const cleanApiUrl = API_URL.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/, '');
    const uploadUrl = `${cleanApiUrl}/upload`;
    
    console.log(`[Upload API] Uploading ${filename} to ${uploadUrl}...`);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: data,
      headers: {
        'Accept': 'application/json',
      },
    });

    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    } catch(e) {
        throw new Error(`Upload failed. Server returned invalid JSON.`);
    }
    
    if (!response.ok) {
        console.error('[Upload API] Upload failed:', result);
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`);
    }

    const secureUrl = typeof result === 'string' ? result : (result.url || result.secure_url || result);

    console.log('[Upload API] Upload success:', secureUrl);
    return secureUrl;
  } catch (error) {
    console.error('[Upload API] Error:', error);
    throw error;
  }
};
