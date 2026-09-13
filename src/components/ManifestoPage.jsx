import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { 
  HiArrowLeft, 
  HiCheckCircle, 
  HiArrowDownTray, 
  HiShare, 
  HiDocumentText, 
  HiSparkles,
  HiMagnifyingGlass,
  HiChevronDown,
  HiChevronUp,
  HiPhoto
} from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent, downloadMedia } from '../utils/shareAndDownload';

export default function ManifestoPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor, leaderName } = useTenant();
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const tabsRef = useRef(null);

  // 1. Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      const slug = api.getTenantSlug();
      if (!slug) return;
      try {
        const catRes = await api.getManifestoCategories().catch(() => []);
        if (Array.isArray(catRes) && catRes.length > 0) {
          const list = catRes.map(c => typeof c === 'string' ? c : (c.category || c.name)).filter(Boolean);
          setCategories(['All', ...new Set(list)]);
        }
      } catch (err) {
        console.warn('Error fetching manifesto categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // 2. Fetch Manifesto items according to selected category
  useEffect(() => {
    const fetchManifesto = async () => {
      const slug = api.getTenantSlug();
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const categoryParam = activeCategory !== 'All' ? activeCategory : undefined;
        const res = await api.getManifesto(categoryParam).catch(() => []);
        const list = Array.isArray(res) ? res : (res?.data || []);

        if (list.length > 0) {
          const formatted = list.map((m, idx) => {
            const rawPdf = m.pdfUrl || (m.fileType === 'pdf' ? m.fileUrl : null);
            const pdfUrl = rawPdf ? getMediaUrl(rawPdf) : null;
            const coverImg = m.coverImageUrl || (m.fileType === 'image' ? m.fileUrl : null) || (Array.isArray(m.images) && m.images.length > 0 ? m.images[0] : null);

            return {
              id: m._id || m.id || idx + 1,
              title: m.title || 'Manifesto Commitment',
              category: m.category || 'General',
              description: m.description || '',
              points: Array.isArray(m.points) && m.points.length > 0 ? m.points : [],
              images: Array.isArray(m.images) ? m.images.map(img => getMediaUrl(img)).filter(Boolean) : [],
              coverImageUrl: coverImg ? getMediaUrl(coverImg) : null,
              pdfUrl: pdfUrl,
              fileUrl: m.fileUrl ? getMediaUrl(m.fileUrl) : null,
              fileType: m.fileType || 'pdf',
              createdAt: m.createdAt,
            };
          });

          setItems(formatted);

          // If categories was just ['All'], also collect from items
          if (activeCategory === 'All') {
            const dynamicCats = ['All', ...new Set(formatted.map(item => item.category).filter(Boolean))];
            if (dynamicCats.length > 1) {
              setCategories(dynamicCats);
            }
          }
        } else {
          setItems([]);
        }
      } catch (err) {
        console.warn('Manifesto fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifesto();
  }, [activeCategory]);

  // Auto-slide category tabs
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

  // Search filter
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesTitle = item.title && item.title.toLowerCase().includes(q);
    const matchesDesc = item.description && item.description.toLowerCase().includes(q);
    const matchesPoints = Array.isArray(item.points) && item.points.some(p => p.toLowerCase().includes(q));
    const matchesCat = item.category && item.category.toLowerCase().includes(q);
    return matchesTitle || matchesDesc || matchesPoints || matchesCat;
  });

  const handleDownload = (item = null) => {
    const targetUrl = item?.pdfUrl || item?.fileUrl || (items.find(i => i.pdfUrl)?.pdfUrl);
    if (targetUrl) {
      downloadMedia(targetUrl, `${item?.title || 'manifesto-document'}.pdf`);
    } else {
      toast.info('घोषणा पत्र पीडीएफ जल्द उपलब्ध होगी।');
    }
  };

  const handleShare = (item = null) => {
    const text = item 
      ? `${item.title} - ${item.description || 'Sankalp Patra by ' + (leaderName || 'our Leader')}` 
      : `Check out the Sankalp Patra (Manifesto) of ${leaderName || 'our Leader'}.`;

    shareContent({
      title: item?.title || 'Sankalp Patra - Manifesto',
      text: text,
      url: window.location.href
    });
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3.5 pb-3 shadow-xs shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
              onClick={() => navigate(-1)} 
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
            >
              <HiArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-extrabold text-[#0f172a] leading-tight truncate">
                {t('manifesto') || 'Sankalp Patra (Manifesto)'}
              </h1>
              <p className="text-[0.7rem] font-semibold text-gray-400 truncate">
                {leaderName ? `Vision & Commitments of ${leaderName}` : 'Vision & Commitments'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => handleDownload()}
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
              title="Download PDF"
            >
              <HiArrowDownTray className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleShare()}
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
              title="Share"
            >
              <HiShare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        
        {/* Search Input */}
        <div className="relative w-full mb-3">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <HiMagnifyingGlass className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none text-xs font-medium shadow-2xs"
            placeholder="घोषणा पत्र में खोजें (Search commitments...)"
          />
        </div>

        {/* Category Auto-Sliding Chips */}
        {categories.length > 1 && (
          <div 
            ref={tabsRef}
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 pt-0.5 scroll-smooth"
          >
            {categories.map((cat, idx) => {
              const catName = typeof cat === 'string' ? cat : (cat.name || cat.id);
              const isActive = activeCategory === catName;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(catName)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
                    isActive
                      ? 'text-white shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  style={isActive ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                >
                  {catName}
                </button>
              );
            })}
          </div>
        )}

        {/* Manifesto Cards List */}
        <div className="flex flex-col gap-3.5 pb-6">
          {isLoading ? (
            <LoadingSpinner message="घोषणा पत्र लोड हो रहा है..." />
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const hasPdf = Boolean(item.pdfUrl || item.fileUrl);

              return (
                <div 
                  key={item.id} 
                  className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-100 flex flex-col gap-3 hover:border-gray-200 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                      >
                        <HiSparkles className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span 
                          className="text-[0.65rem] font-black uppercase tracking-wider block truncate"
                          style={{ color: primaryColor }}
                        >
                          {item.category}
                        </span>
                        <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {hasPdf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[0.65rem] font-bold bg-orange-50 text-[#f37920] border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                      >
                        <HiArrowDownTray className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    )}
                  </div>

                  {/* Cover Image if available */}
                  {item.coverImageUrl && (
                    <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100 border border-gray-100">
                      <img
                        src={item.coverImageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Description / Summary */}
                  {item.description && (
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Key Bullet Points */}
                  {item.points && item.points.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      {item.points.map((pt, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <HiCheckCircle 
                            className="w-4 h-4 shrink-0 mt-0.5" 
                            style={{ color: primaryColor }}
                          />
                          <p className="text-xs font-semibold text-gray-800 leading-snug">{pt}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Multiple Gallery Images attached to commitment */}
                  {item.images && item.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pt-1">
                      {item.images.map((img, i) => (
                        <div key={i} className="w-24 h-20 rounded-lg overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                          <img
                            src={img}
                            alt="Commitment attachment"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(img, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Footer */}
                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Official Promise'}
                    </span>
                    <button
                      onClick={() => handleShare(item)}
                      className="text-[11px] font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"
                    >
                      <HiShare className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-white rounded-2xl border border-gray-100 my-4">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                <HiDocumentText className="w-7 h-7" />
              </div>
              <p className="text-gray-800 font-extrabold text-sm">No Manifesto Promises Found</p>
              <p className="text-gray-400 font-semibold text-xs mt-0.5">Please select another category or check back later.</p>
            </div>
          )}
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
