export const BUNNY_LIBRARY_ID = (import.meta as any).env?.VITE_BUNNY_STREAM_LIBRARY_ID || '';
const BUNNY_CDN_HOST = (import.meta as any).env?.VITE_BUNNY_STREAM_CDN_HOST || '';

export const createVideoEntry = async (title: string): Promise<any> => { return {} as any; };
export const uploadVideoContent = async () => {};
export const uploadToBunny = async (fileUri: string, title: string): Promise<string> => { return ''; };
export const getBunnyStreamUrl = async (videoId: string): Promise<string> => {
    const host = BUNNY_CDN_HOST?.replace(/\/$/, '');
    return `${host}/${videoId}/playlist.m3u8`;
};
export const isBunnyStreamUrl = (url: string): boolean => { return url.includes('b-cdn.net') || (BUNNY_CDN_HOST ? url.includes(BUNNY_CDN_HOST) : false); };
export const isM3U8Url = (url: string): boolean => { return url.toLowerCase().includes('.m3u8'); };
export const getBunnyEmbedUrl = (videoId: string): string => {
  if (!BUNNY_LIBRARY_ID) return '';
  const embedBase = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;
  const params = new URLSearchParams({ autoplay: 'true', loop: 'false', muted: 'false', preload: 'true', responsive: 'true' });
  return `${embedBase}?${params.toString()}`;
};
export const extractBunnyVideoId = (url: string): string | null => {
  const match = url.match(/\/([^\/]+)\/playlist\.m3u8/);
  return match ? match[1] : null;
};
