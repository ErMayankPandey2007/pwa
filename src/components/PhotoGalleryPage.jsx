import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent, downloadMedia } from '../utils/shareAndDownload';

export default function PhotoGalleryPage() {
  const navigate = useNavigate();
  const { primaryColor } = useTenant();
  const [activeTab, setActiveTab] = useState('All');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        const res = await api.getGallery({ limit: 100 }).catch(() => []);
        const list = Array.isArray(res?.data?.data) 
          ? res.data.data 
          : (Array.isArray(res?.data) 
            ? res.data 
            : (Array.isArray(res?.items) 
              ? res.items 
              : (Array.isArray(res) ? res : [])));

        const validItems = list.filter(item => Boolean(item && (item.imageUrl || item.url || item.image || item.mediaUrl)));

        if (validItems.length > 0) {
          const formatted = validItems.map((item, idx) => ({
            id: item._id || item.id || idx + 1,
            category: item.category || 'General',
            title: item.title || 'Photo',
            description: item.description || '',
            date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            url: getMediaUrl(item.imageUrl || item.url || item.image || item.mediaUrl),
            rawUrl: item.imageUrl || item.url || item.image || item.mediaUrl || '',
            allowDownload: item.allowDownload !== false,
          }));
          setPhotos(formatted);

          // Extract dynamic unique categories from backend items
          const uniqueCats = ['All', ...new Set(formatted.map(p => p.category).filter(Boolean))];
          setCategories(uniqueCats);
        } else {
          setPhotos([]);
          setCategories(['All']);
        }
      } catch (err) {
        console.warn('Gallery fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  const filteredPhotos = activeTab === 'All' 
    ? photos 
    : photos.filter(p => p.category === activeTab);

  const handleShare = (photo) => {
    shareContent({
      title: photo.title,
      text: `${photo.title}${photo.description ? ` - ${photo.description}` : ''}`,
      url: window.location.href,
    });
  };

  const handleDownloadPhoto = (photo) => {
    if (!photo?.url) return;
    const ext = photo.url.includes('.png') ? 'png' : 'jpg';
    downloadMedia(photo.url, `gallery-photo-${photo.id || Date.now()}.${ext}`);
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">Photo Gallery</h1>
            <p className="text-[10px] font-semibold text-gray-500 truncate">Memories, events and community drives</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {categories.length > 1 && (
        <div className="bg-white px-4 py-3 border-b border-gray-100 shrink-0 shadow-sm z-10 overflow-x-auto scrollbar-hide flex gap-2">
          {categories.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === tab ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={activeTab === tab ? { backgroundColor: primaryColor } : {}}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        {isLoading ? (
          <LoadingSpinner message="फोटो गैलरी लोड हो रही है..." />
        ) : filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3.5 pb-6">
            {filteredPhotos.map((photo) => (
              <div 
                key={photo.id} 
                onClick={() => setSelectedPhoto(photo)}
                className="w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-all cursor-pointer shadow-sm border border-gray-100 bg-white flex flex-col group hover:shadow-md"
              >
                {/* Image Container: Clean image with no badge on top */}
                <div className="w-full h-36 bg-gray-50 flex items-center justify-center p-2 overflow-hidden">
                  <img 
                    src={photo.url} 
                    alt={photo.title} 
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Card Footer Details with Category, Title & Date */}
                <div className="p-3 bg-white border-t border-gray-100 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <span 
                      className="text-[9px] font-extrabold uppercase tracking-wider truncate block"
                      style={{ color: primaryColor }}
                    >
                      {photo.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                      {photo.date}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {photo.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <p className="text-gray-500 font-bold text-sm">No photos found in this category.</p>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md animate-fade-in">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white pt-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>{selectedPhoto.category}</span>
              <span className="text-xs text-gray-300">{selectedPhoto.date}</span>
            </div>
            <button 
              onClick={() => setSelectedPhoto(null)} 
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Center Image */}
          <div className="flex-1 flex items-center justify-center py-4">
            <img 
              src={selectedPhoto.url} 
              alt={selectedPhoto.title} 
              className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl" 
            />
          </div>

          {/* Bottom Bar Details & Actions */}
          <div className="flex flex-col gap-3 pb-4">
            <h3 className="text-white font-bold text-sm text-center">{selectedPhoto.title}</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => handleShare(selectedPhoto)}
                className="flex-1 py-3 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Photo
              </button>
              <button 
                onClick={() => handleDownloadPhoto(selectedPhoto)}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

