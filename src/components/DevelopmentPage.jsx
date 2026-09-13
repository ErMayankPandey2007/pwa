import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { getMediaUrl } from '../utils/mediaUrl';

export default function DevelopmentPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { primaryColor, secondaryColor } = useTenant();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [works, setWorks] = useState([]);
  const [categories, setCategories] = useState(['All', 'Road', 'Education', 'Health', 'Electricity', 'Water', 'Infrastructure']);
  const [isLoading, setIsLoading] = useState(true);
  const tabsRef = useRef(null);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        setIsLoading(true);
        const params = {};
        if (activeFilter !== 'All') {
          params.category = activeFilter;
        }
        const res = await api.getWorks(params).catch(() => []);
        const list = Array.isArray(res) ? res : (res?.data || []);
        setWorks(list);

        // Dynamically collect categories
        if (list.length > 0 && activeFilter === 'All') {
          const dynamicCats = ['All', ...new Set(list.map(w => w.category).filter(Boolean))];
          if (dynamicCats.length > 1) {
            setCategories(dynamicCats);
          }
        }
      } catch (err) {
        console.warn('Error fetching works:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorks();
  }, [activeFilter]);

  // Auto-scroll horizontal category tabs so next tabs become visible
  useEffect(() => {
    if (!tabsRef.current || categories.length <= 3) return;
    const el = tabsRef.current;
    const step = 110;
    const timer = setInterval(() => {
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 5) return;
      if (el.scrollLeft + step >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 2800);

    return () => clearInterval(timer);
  }, [categories.length]);

  const filteredWorks = works.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (w.title && w.title.toLowerCase().includes(q)) ||
      (w.description && w.description.toLowerCase().includes(q)) ||
      (w.area?.name && w.area.name.toLowerCase().includes(q)) ||
      (w.category && w.category.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('complete')) {
      return { label: t('completed'), color: 'bg-green-100 text-green-700' };
    }
    if (s.includes('progress') || s.includes('ongoing')) {
      return { label: t('inProgress'), color: 'bg-blue-100 text-blue-700' };
    }
    return { label: t('planned'), color: 'bg-purple-100 text-purple-700' };
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
            {t('worksTitle')}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full relative">
        <div className="p-5 flex flex-col gap-5">
          
          {/* Search Bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none sm:text-sm font-medium transition-shadow shadow-sm"
              style={{ outlineColor: primaryColor }}
              placeholder={t('searchWorksPlaceholder')}
            />
          </div>

          {/* Filter Chips with Auto Slide */}
          <div 
            ref={tabsRef}
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1 scroll-smooth"
          >
            {categories.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === filter 
                    ? 'text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                style={activeFilter === filter ? { backgroundColor: primaryColor } : {}}
              >
                {filter === 'All' ? t('allFilter') : filter}
              </button>
            ))}
          </div>

          {/* Works List */}
          {isLoading ? (
            <LoadingSpinner message={t('loading')} />
          ) : filteredWorks.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredWorks.map((work) => {
                const badge = getStatusBadge(work.status);
                const workId = work._id || work.id;
                const rawImg = (Array.isArray(work.images) && work.images.length > 0 ? work.images[0] : null) ||
                  work.coverImageUrl ||
                  work.imageUrl ||
                  work.image ||
                  work.coverImage ||
                  null;
                const workImage = rawImg ? getMediaUrl(rawImg) : null;

                return (
                  <div 
                    key={workId} 
                    onClick={() => navigate(`/works/${workId}`)}
                    className="bg-white rounded-2xl p-3.5 flex gap-4 shadow-sm border border-gray-100 items-center cursor-pointer transition-transform active:scale-[0.98] hover:shadow-md hover:border-gray-300"
                  >
                    {/* Image */}
                    <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative flex items-center justify-center">
                      {workImage ? (
                        <img 
                          src={workImage} 
                          alt={work.title} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full items-center justify-center flex-col text-gray-400 bg-gradient-to-br from-gray-50 to-gray-200 ${workImage ? 'hidden' : 'flex'}`}
                      >
                        <span className="text-2xl">🏗️</span>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="flex flex-col flex-1 py-1 min-w-0">
                      <span 
                        className="text-[0.62rem] font-bold uppercase tracking-wider mb-0.5"
                        style={{ color: primaryColor }}
                      >
                        {work.category || 'Development'}
                      </span>
                      <h3 className="text-sm font-extrabold text-gray-900 leading-tight mb-1 line-clamp-2">{work.title}</h3>
                      <p className="text-xs text-gray-500 font-semibold mb-2 line-clamp-1">{work.location || work.area?.name || 'Local Area'}</p>
                      
                      {/* Badge */}
                      <div className="mt-auto">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-bold tracking-wide ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 p-6">
              <p className="text-sm font-bold text-gray-700 mb-1">{t('noWorksFound')}</p>
              <p className="text-xs text-gray-400">{t('noWorksFoundDesc')}</p>
            </div>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  );
}

