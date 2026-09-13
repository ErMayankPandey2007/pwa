import { toast } from 'react-toastify';

export function getLiveBaseUrl() {
  const envAppUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_FRONTEND_URL;
  if (envAppUrl) {
    return envAppUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase && !apiBase.includes('localhost') && !apiBase.includes('127.0.0.1')) {
    return apiBase.replace(/\/+$/, '');
  }
  return 'https://election.digicoders.in';
}

export function sanitizeShareUrl(url) {
  const liveBase = getLiveBaseUrl();
  if (!url) {
    const path = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '';
    return `${liveBase}${path}`;
  }
  let cleanUrl = String(url).trim();

  // If URL has localhost or 127.0.0.1, replace origin with liveBase
  if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
    try {
      const parsed = new URL(cleanUrl);
      return `${liveBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return cleanUrl.replace(/^https?:\/\/[^\/]+/, liveBase);
    }
  }

  // If it's a relative path starting with /
  if (cleanUrl.startsWith('/')) {
    return `${liveBase}${cleanUrl}`;
  }

  return cleanUrl;
}

export function sanitizeShareText(text) {
  if (!text) return '';
  let cleanText = String(text);
  const liveBase = getLiveBaseUrl();
  // Replace any http://localhost:port or http://127.0.0.1:port in text with liveBase
  cleanText = cleanText.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi, liveBase);
  cleanText = cleanText.replace(/(localhost|127\.0\.0\.1):\d+/gi, liveBase.replace(/^https?:\/\//, ''));
  return cleanText;
}

/**
 * Pure Direct Native Device Share
 * Triggers the exact Android / iOS device share drawer (which shows all user's installed apps, contacts, quick share etc.)
 */
export async function shareContent({ title, text, url }) {
  const shareUrl = sanitizeShareUrl(url);
  const shareTitle = title || '';
  const shareText = sanitizeShareText(text);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        // User closed or dismissed the device sheet
        return true;
      }
      console.warn('Navigator share error:', err);
    }
  }

  // If on desktop browser without web share support, notify user & copy
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const fullText = shareText ? `${shareText}\n${shareUrl}` : shareUrl;
      await navigator.clipboard.writeText(fullText);
      toast.info('🔗 लिंक कॉपी हो गया!');
    }
  } catch (e) {
    console.warn('Clipboard fallback error:', e);
  }
  return true;
}

/**
 * Universal file/image downloader utility
 * Handles blobs, cross-origin URLs, base64 data URLs, and triggers immediate download
 */
export async function downloadMedia(url, filename = 'download') {
  if (!url) {
    toast.info('डाउनलोड करने के लिए फ़ाइल उपलब्ध नहीं है');
    return;
  }

  try {
    toast.info('डाउनलोड शुरू हो रहा है...');

    // If it's a data URL or blob URL
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('✅ डाउनलोड पूरा हुआ!');
      return;
    }

    // Fetch as blob to force browser download across domains
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);

    toast.success('✅ डाउनलोड पूरा हुआ!');
  } catch (err) {
    console.warn('Blob download fallback:', err);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
