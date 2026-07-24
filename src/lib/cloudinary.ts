import { API_URL } from './utils';
import { supabase } from './supabase';

const CLOUD_NAME =
  (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME ||
  (import.meta as any).env?.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  'doalguvvw';

const UPLOAD_PRESET =
  (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET ||
  (import.meta as any).env?.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  'eduorbit';

export const uploadToCloudinary = async (
  fileInput: string | File | Blob,
  folder: string = 'lms_thumbnails',
  mimeType: string = 'image/jpeg',
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'image'
): Promise<string> => {
  try {
    // Return immediately if it's already an HTTP/HTTPS URL
    if (typeof fileInput === 'string' && (fileInput.startsWith('http://') || fileInput.startsWith('https://'))) {
      return fileInput;
    }

    console.log(`[Upload] Starting upload for folder: ${folder}...`);

    // 1. Primary Method: Direct Cloudinary Unsigned Upload API
    try {
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
      const formData = new FormData();

      if (fileInput instanceof File || fileInput instanceof Blob) {
        formData.append('file', fileInput);
      } else if (typeof fileInput === 'string') {
        formData.append('file', fileInput);
      } else {
        throw new Error('Unsupported file input type');
      }

      formData.append('upload_preset', UPLOAD_PRESET);
      if (folder) {
        formData.append('folder', folder);
      }

      console.log(`[Cloudinary API] Direct upload to ${cloudinaryUrl} (preset: ${UPLOAD_PRESET})...`);

      const res = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const secureUrl = data.secure_url || data.url;
        if (secureUrl) {
          console.log('[Cloudinary API] Success:', secureUrl);
          return secureUrl;
        }
      } else {
        const errorText = await res.text();
        console.warn('[Cloudinary API] Direct upload returned non-OK status:', res.status, errorText);
      }
    } catch (directErr) {
      console.warn('[Cloudinary API] Direct upload failed, trying backend API:', directErr);
    }

    // 2. Secondary Method: Backend API Upload Endpoint
    try {
      const cleanApiUrl = API_URL.replace(/([^:]\/)\/+/g, '$1').replace(/\/+$/, '');
      const backendUploadUrl = `${cleanApiUrl}/upload`;

      const backendData = new FormData();
      if (fileInput instanceof File || fileInput instanceof Blob) {
        backendData.append('file', fileInput);
      } else if (typeof fileInput === 'string' && fileInput.startsWith('data:')) {
        const parts = fileInput.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : mimeType;
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        backendData.append('file', blob, `upload_${Date.now()}.${mime.split('/')[1] || 'jpg'}`);
      } else {
        backendData.append('file', fileInput as any);
      }
      backendData.append('folder', folder);

      console.log(`[Backend Upload] Uploading to ${backendUploadUrl}...`);

      const backendRes = await fetch(backendUploadUrl, {
        method: 'POST',
        body: backendData,
        headers: { Accept: 'application/json' },
      });

      if (backendRes.ok) {
        const text = await backendRes.text();
        const json = text ? JSON.parse(text) : {};
        const url = typeof json === 'string' ? json : (json.url || json.secure_url || json.file_url);
        if (url && typeof url === 'string') {
          console.log('[Backend Upload] Success:', url);
          return url;
        }
      }
    } catch (backendErr) {
      console.warn('[Backend Upload] Backend upload failed:', backendErr);
    }

    // 3. Tertiary Method: Supabase Storage Fallback
    try {
      let fileBlob: Blob;
      let ext = 'jpg';

      if (fileInput instanceof File || fileInput instanceof Blob) {
        fileBlob = fileInput;
        ext = fileInput.type ? fileInput.type.split('/')[1] || 'jpg' : 'jpg';
      } else if (typeof fileInput === 'string' && fileInput.startsWith('data:')) {
        const parts = fileInput.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : mimeType;
        ext = mime.split('/')[1] || 'jpg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        fileBlob = new Blob([u8arr], { type: mime });
      } else {
        throw new Error('Cannot convert file input for Supabase fallback');
      }

      const storagePath = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      console.log(`[Supabase Storage] Uploading fallback to path: ${storagePath}...`);

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(storagePath, fileBlob, { contentType: fileBlob.type || mimeType, upsert: true });

      if (!storageErr && storageData) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) {
          console.log('[Supabase Storage] Success:', publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }
      }
    } catch (supabaseErr) {
      console.warn('[Supabase Storage] Fallback upload failed:', supabaseErr);
    }

    // 4. Final Fallback: Return data URI string if provided
    if (typeof fileInput === 'string' && fileInput.startsWith('data:')) {
      console.warn('[Upload] Returning base64 data URI as final fallback');
      return fileInput;
    }

    throw new Error('All image upload methods failed. Please check your network connection.');
  } catch (error) {
    console.error('[Upload Error]:', error);
    throw error;
  }
};
