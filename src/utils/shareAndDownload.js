import { toast } from 'react-toastify';

/**
 * Pure Direct Native Device Share
 * Triggers the exact Android / iOS device share drawer (which shows all user's installed apps, contacts, quick share etc.)
 */
export async function shareContent({ title, text, url }) {
  const shareUrl = url || window.location.href;
  const shareTitle = title || '';
  const shareText = text || '';

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

  // If on desktop browser without web share support, notify user
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
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
