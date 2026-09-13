import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent } from '../utils/shareAndDownload';

// Helper to extract YouTube Video ID from any YouTube URL format (Shorts, Watch, youtu.be, Embed)
function getYoutubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e|shorts|embed)\/|.*[?&]v=)|youtu\.be\/)([^?&\/\s]{11})/i);
  return match ? match[1] : null;
}

export default function VideoGalleryPage() {
  const navigate = useNavigate();
  const { primaryColor } = useTenant();
  const [activeTab, setActiveTab] = useState('All');
  const [activeVideo, setActiveVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const params = { type: 'video', limit: 50 };
        const res = await api.getGallery(params).catch(() => []);
        
        // Handle nested paginated response structure { data: { data: [...] } } or flat array
        const list = Array.isArray(res?.data?.data) 
          ? res.data.data 
          : (Array.isArray(res?.data) 
            ? res.data 
            : (Array.isArray(res?.items) 
              ? res.items 
              : (Array.isArray(res) ? res : [])));

        if (list.length > 0) {
          const formatted = list.map((item, idx) => {
            const rawVideoUrl = (item.url || item.videoUrl || '').trim();
            const ytId = getYoutubeId(rawVideoUrl);
            const resolvedVideoUrl = ytId ? rawVideoUrl : getMediaUrl(rawVideoUrl, '');
            const defaultThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
            const rawThumb = item.thumbnailUrl || item.imageUrl || item.thumbnail || null;
            const resolvedThumbnail = rawThumb ? getMediaUrl(rawThumb, defaultThumb) : defaultThumb;

            return {
              id: item._id || item.id || idx + 1,
              title: item.title || 'Constituency Video',
              description: item.description || '',
              category: item.category || 'General',
              date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
              duration: item.duration || (ytId ? 'YouTube' : 'Video'),
              views: item.views ? `${item.views} views` : 'Official',
              thumbnail: resolvedThumbnail,
              videoUrl: resolvedVideoUrl,
              youtubeId: ytId,
            };
          });

          setVideos(formatted);

          // Extract unique categories
          const uniqueCats = ['All', ...new Set(formatted.map(v => v.category).filter(Boolean))];
          setCategories(uniqueCats);
        } else {
          setVideos([]);
          setCategories(['All']);
        }
      } catch (err) {
        console.warn('Video gallery fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const filteredVideos = activeTab === 'All' 
    ? videos 
    : videos.filter(v => v.category === activeTab);

  const handleShare = (video, e) => {
    if (e) e.stopPropagation();
    const shareUrl = video.youtubeId ? `https://youtu.be/${video.youtubeId}` : window.location.href;
    shareContent({
      title: video.title,
      text: `Watch: ${video.title}`,
      url: shareUrl,
    });
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">Video Gallery</h1>
            <p className="text-[10px] font-semibold text-gray-500 truncate">Official speeches, events & updates</p>
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
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${activeTab === tab ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={activeTab === tab ? { backgroundColor: primaryColor } : {}}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingSpinner message="वीडियो गैलरी लोड हो रही है..." />
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="flex flex-col gap-5 pb-6">
            {filteredVideos.map((video) => (
              <div 
                key={video.id} 
                onClick={() => setActiveVideo(video)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group cursor-pointer active:scale-[0.99] transition-all hover:shadow-md"
              >
                <div className="w-full h-48 relative bg-gray-900 overflow-hidden flex items-center justify-center">
                  {video.thumbnail ? (
                    <img 
                      src={video.thumbnail} 
                      alt={video.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Duration / Platform Tag */}
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
                    {video.duration}
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {video.category && (
                    <span 
                      className="text-[10px] font-extrabold uppercase tracking-wider block mb-1"
                      style={{ color: primaryColor }}
                    >
                      {video.category}
                    </span>
                  )}
                  <h3 className="text-sm font-extrabold text-gray-900 leading-snug mb-2 transition-colors">{video.title}</h3>
                  {video.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{video.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>{video.date}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{video.views}</span>
                    </div>
                    <button 
                      onClick={(e) => handleShare(video, e)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
                      title="Share Video"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 mt-6">
            <p className="text-gray-500 font-bold text-sm">अभी कोई वीडियो उपलब्ध नहीं है।</p>
          </div>
        )}
      </div>

      {/* Video Player Modal (Supports YouTube Embeds & Direct Videos) */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg mx-auto bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-gray-950 text-white">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>{activeVideo.category}</span>
              <button 
                onClick={() => setActiveVideo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Player (Responsive aspect-video container) */}
            <div className="w-full aspect-video bg-black flex items-center justify-center">
              {activeVideo.youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video 
                  src={activeVideo.videoUrl} 
                  controls 
                  autoPlay 
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Modal Info */}
            <div className="p-4 bg-gray-900 text-white">
              <h3 className="font-bold text-sm leading-snug mb-2">{activeVideo.title}</h3>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{activeVideo.date} • {activeVideo.views}</span>
                <button 
                  onClick={() => handleShare(activeVideo)}
                  className="px-3 py-1.5 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
