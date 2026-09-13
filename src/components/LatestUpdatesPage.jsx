import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiNewspaper, HiShare, HiCalendarDays } from 'react-icons/hi2';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent } from '../utils/shareAndDownload';
import { toast } from 'react-toastify';

const ITEMS_PER_PAGE = 8;

export default function LatestUpdatesPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const [activeTab, setActiveTab] = useState('All');
  const [categories, setCategories] = useState(['All', 'News', 'Press Release', 'Announcement', 'Article']);
  const [page, setPage] = useState(1);
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dynamic categories
  useEffect(() => {
    const fetchCategories = async () => {
      const slug = api.getTenantSlug();
      if (!slug) return;
      try {
        const catRes = await api.getNewsCategories().catch(() => []);
        if (Array.isArray(catRes) && catRes.length > 0) {
          const list = catRes.map(c => c.category || c).filter(Boolean);
          setCategories(['All', ...new Set(list)]);
        }
      } catch (err) {
        console.warn('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      const slug = api.getTenantSlug();
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const params = { limit: 50 };
        if (activeTab !== 'All') {
          params.category = activeTab;
        }
        const res = await api.getNews(params).catch(() => []);
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) {
          const formatted = list.map(item => ({
            id: item._id || item.id,
            title: item.title,
            category: item.category || 'News',
            date: item.publishDate || item.publishedAt ? new Date(item.publishDate || item.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            thumbnail: getMediaUrl(item.coverImageUrl || item.coverImage || item.imageUrl) || 'https://images.unsplash.com/photo-1532375810565-c0ba94c93ebc?auto=format&fit=crop&q=80&w=400',
            description: item.shortDescription || item.content || '',
            views: item.viewsCount || 0
          }));
          setNews(formatted);
        } else {
          setNews([]);
        }
      } catch (err) {
        console.warn('Error fetching news:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [activeTab]);

  const handleShare = (e, item) => {
    e.stopPropagation();
    shareContent({
      title: item.title,
      text: item.description,
      url: window.location.href,
    });
  };

  const filtered = activeTab === 'All' ? news : news.filter(u => u.category === activeTab);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
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
          <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
            Latest Updates
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 shrink-0 shadow-sm z-10 flex gap-2 overflow-x-auto scrollbar-hide">
        {categories.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === tab 
                ? 'text-white shadow-xs' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={activeTab === tab ? { backgroundColor: primaryColor } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        {isLoading ? (
          <LoadingSpinner message="समाचार एवं अपडेट्स लोड हो रहे हैं..." />
        ) : paginated.length > 0 ? (
          <div className="flex flex-col gap-4 pb-4">
            {paginated.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex gap-4 p-4 items-center active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span 
                    className="text-[0.62rem] font-black uppercase tracking-widest mb-1"
                    style={{ color: secondaryColor }}
                  >
                    {item.category}
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 leading-snug line-clamp-2 mb-1.5">{item.title}</h3>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[0.65rem] font-bold text-gray-400">{item.date}</span>
                    <button
                      onClick={(e) => handleShare(e, item)}
                      className="p-1 text-gray-400 hover:text-gray-700 active:scale-90"
                      title="Share"
                    >
                      <HiShare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-white rounded-2xl border border-gray-100 my-4">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              <HiNewspaper className="w-7 h-7" />
            </div>
            <p className="text-gray-800 font-extrabold text-sm">No Updates Found</p>
            <p className="text-gray-400 font-semibold text-xs mt-0.5">Stay tuned for news and announcements.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-40 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${page === p ? 'bg-[#f37920] text-white shadow-md shadow-orange-500/20' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-40 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
