import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent } from '../utils/shareAndDownload';

export default function WorkDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const [work, setWork] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'gallery' | 'updates'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWork = async () => {
      try {
        setIsLoading(true);
        const res = await api.getWorkById(id).catch(() => null);
        if (res) {
          setWork(res);
        } else {
          // Fallback search in all works
          const allRes = await api.getWorks().catch(() => []);
          const list = Array.isArray(allRes) ? allRes : (allRes?.data || []);
          const found = list.find((w) => String(w._id || w.id) === String(id));
          setWork(found || null);
        }
      } catch (err) {
        console.warn('Error fetching work details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchWork();
  }, [id]);

  const handleShare = () => {
    shareContent({
      title: work?.title || 'Development Work',
      text: `${work?.title || 'Development Work'} - ${work?.description || 'Project details'}`,
      url: window.location.href,
    });
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#f8fafc]">
        <LoadingSpinner message="कार्य का विवरण लोड हो रहा है..." />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Work record not found</h2>
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 text-white rounded-xl text-xs font-bold cursor-pointer"
          style={{ backgroundColor: primaryColor }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const isCompleted = String(work.status || '').toLowerCase().includes('complete');
  const statusColor = isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

  // Dynamic Image Extraction from API
  const rawMainImage = (Array.isArray(work.images) && work.images.length > 0 ? work.images[0] : null) ||
    work.coverImageUrl ||
    work.imageUrl ||
    work.image ||
    work.coverImage ||
    null;
  const mainImage = rawMainImage ? getMediaUrl(rawMainImage) : null;

  // Dynamic Gallery Images from API
  const rawGallery = [
    ...(Array.isArray(work.images) ? work.images : []),
    ...(Array.isArray(work.gallery) ? work.gallery : []),
    ...(Array.isArray(work.galleryImages) ? work.galleryImages : []),
    ...(work.coverImageUrl ? [work.coverImageUrl] : []),
    ...(work.imageUrl ? [work.imageUrl] : []),
    ...(work.image ? [work.image] : [])
  ];
  const galleryImages = Array.from(new Set(rawGallery.map(img => getMediaUrl(img)).filter(Boolean)));

  // Dynamic Before / After from API
  const rawBefore = work.beforeAfter?.before || work.beforeImages || work.beforeImageUrl || work.beforeImage || [];
  const rawAfter = work.beforeAfter?.after || work.afterImages || work.afterImageUrl || work.afterImage || [];

  const beforeList = (Array.isArray(rawBefore) ? rawBefore : [rawBefore])
    .map(img => getMediaUrl(img))
    .filter(Boolean);

  const afterList = (Array.isArray(rawAfter) ? rawAfter : [rawAfter])
    .map(img => getMediaUrl(img))
    .filter(Boolean);

  return (
    <div className="relative w-full h-screen flex flex-col bg-white overflow-hidden pb-24">
      
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
            {work.title}
          </h1>
        </div>
        <button onClick={handleShare} className="text-gray-500 p-2 hover:opacity-80 active:scale-95 transition-all cursor-pointer" style={{ color: primaryColor }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-5">
        
        {/* Main Image */}
        <div className="relative w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden mb-5 shadow-sm">
          {mainImage ? (
            <img 
              src={mainImage} 
              alt={work.title} 
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-full h-full items-center justify-center flex-col gap-2 text-gray-400 bg-gradient-to-br from-gray-50 to-gray-200 ${mainImage ? 'hidden' : 'flex'}`}
          >
            <span className="text-3xl">🏗️</span>
            <span className="text-xs font-bold text-gray-500">{work.category || 'विकास कार्य'}</span>
          </div>
        </div>

        {/* Title, Category and Status Badge */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span 
              className="text-[0.68rem] font-bold uppercase tracking-wider block"
              style={{ color: primaryColor }}
            >
              {work.category || 'Development Work'}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold tracking-wide ${statusColor}`}>
              {work.status || 'In Progress'}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
            {work.title}
          </h2>
        </div>

        {/* Location & Dates */}
        <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <svg className="w-4 h-4 shrink-0" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{work.location || work.area?.name || 'Local Area'}</span>
          </div>
          {work.startDate && (
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <svg className="w-4 h-4 shrink-0" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Started: {new Date(work.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          {['Details', 'Gallery', 'Before/After'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-[0.8rem] sm:text-sm font-bold py-2 px-1 rounded-lg transition-all cursor-pointer ${activeTab === tab ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
              style={activeTab === tab ? { color: primaryColor } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content: Details */}
        {activeTab === 'Details' && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900">Project Overview</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              {work.description || work.shortDescription || 'Development work is being actively monitored for high quality completion.'}
            </p>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-500">Category</span>
                <span className="font-bold text-gray-800">{work.category || 'Infrastructure'}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-500">Beneficiary Area</span>
                <span className="font-bold text-gray-800">{work.location || work.area?.name || 'Constituency'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Gallery */}
        {activeTab === 'Gallery' && (
          <div className="grid grid-cols-2 gap-2.5">
            {galleryImages.length > 0 ? (
              galleryImages.map((imgUrl, i) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img 
                    src={imgUrl} 
                    alt={`Photo ${i+1}`} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-xs text-gray-400 font-semibold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                Gallery photos will be updated soon.
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Before / After */}
        {activeTab === 'Before/After' && (
          <div className="flex flex-col gap-4">
            {/* Before Images from API */}
            {beforeList.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  कार्य से पहले (Before Work)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {beforeList.map((imgUrl, idx) => (
                    <div key={idx} className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                      <img 
                        src={imgUrl} 
                        alt={`Before ${idx + 1}`} 
                        className="w-full aspect-video object-cover" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* After Images from API */}
            {afterList.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs font-bold text-green-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  कार्य के बाद (After Completion)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {afterList.map((imgUrl, idx) => (
                    <div key={idx} className="rounded-2xl overflow-hidden border border-green-200 bg-green-50/50">
                      <img 
                        src={imgUrl} 
                        alt={`After ${idx + 1}`} 
                        className="w-full aspect-video object-cover" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {beforeList.length === 0 && afterList.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400 font-semibold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                Before / After photo verification will be posted soon.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom Share Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-safe z-30 shadow-md flex gap-3">
        <button 
          onClick={handleShare} 
          className="flex-1 text-white rounded-2xl font-bold text-sm py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg cursor-pointer"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})` }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share Progress</span>
        </button>
      </div>

    </div>
  );
}
