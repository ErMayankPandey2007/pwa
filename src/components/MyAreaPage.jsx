import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { getMediaUrl } from '../utils/mediaUrl';
import { 
  HiWrenchScrewdriver, 
  HiArrowLeft, 
  HiMapPin
} from 'react-icons/hi2';

export default function MyAreaPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const { t } = useLanguage();
  const [userArea, setUserArea] = useState({
    district: '',
    assembly: '',
    block: '',
    village: '',
    ward: '',
    booth: ''
  });
  const [areaWorks, setAreaWorks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // 1. Fetch live citizen profile
      let user = storage.getUser() || {};
      const token = storage.getToken();
      if (token) {
        try {
          const profileRes = await api.getCitizenProfile().catch(() => null);
          if (profileRes) {
            const freshUser = profileRes.profile || profileRes.data || profileRes;
            user = { ...user, ...freshUser };
            storage.setUser(user);
          }
        } catch (e) {
          console.warn('Could not fetch live profile:', e);
        }
      }

      const userDistrict = user.district || user.city || '';
      const userAssembly = user.vidhanSabha || user.assembly || user.areaName || user.constituency || user.area?.name || '';
      const userBlock = user.block || user.tehsil || '';
      const userVillage = user.village || user.panchayat || user.area || '';
      const userWard = user.ward || '';
      const userBooth = user.booth || '';
      const userAreaId = user.areaId || user.area?._id || user.area?.id || '';

      setUserArea({
        district: userDistrict,
        assembly: userAssembly,
        block: userBlock,
        village: userVillage,
        ward: userWard,
        booth: userBooth
      });

      const slug = api.getTenantSlug();
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const worksRes = await api.getWorks({ limit: 100 }).catch(() => []);
        const rawWorks = Array.isArray(worksRes) ? worksRes : (worksRes?.data || worksRes?.items || []);

        // Strict Filter: Match citizen's area only from profile
        const matchesUserArea = (item) => {
          if (!item) return false;

          if (userAreaId) {
            const itemAreaId = String(item.areaId || item.area?._id || item.area?.id || item.targetArea?._id || '');
            if (itemAreaId && itemAreaId === String(userAreaId)) {
              return true;
            }
          }

          const filters = [userWard, userVillage, userBooth, userBlock, userAssembly, userDistrict]
            .filter(Boolean)
            .map(s => String(s).toLowerCase().trim())
            .filter(s => s.length > 1);

          if (filters.length === 0) {
            return false;
          }

          const itemFields = [
            item.area?.name,
            item.areaName,
            item.location,
            item.targetArea?.name,
            item.constituency,
            item.ward,
            item.village,
            item.assembly,
            item.block,
            item.district
          ].filter(Boolean).map(s => String(s).toLowerCase().trim());

          const combinedItemText = `${itemFields.join(' ')} ${String(item.title || '').toLowerCase()}`;

          return filters.some(f => combinedItemText.includes(f));
        };

        const filteredWorks = rawWorks.filter(matchesUserArea);
        setAreaWorks(filteredWorks);
      } catch (err) {
        console.warn('Error fetching area data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Top Header */}
      <div 
        className="shrink-0 px-4 pt-4 pb-6 relative overflow-hidden text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center justify-between mb-2 relative z-10 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button 
              onClick={() => navigate(-1)} 
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all shrink-0 text-white"
            >
              <HiArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-black text-white tracking-tight truncate">
              {t('myArea') || 'My Area'}
            </h1>
          </div>
          <button 
            onClick={() => navigate('/complete-profile')} 
            className="text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl backdrop-blur-xs active:scale-95 transition-all shrink-0"
          >
            Change Area
          </button>
        </div>

        <div className="flex items-center gap-1.5 relative z-10 text-white/95 text-xs font-semibold px-1">
          <HiMapPin className="w-4 h-4 text-white shrink-0" />
          <p className="truncate">
            {[userArea.village, userArea.ward, userArea.assembly, userArea.district].filter(Boolean).join(', ') || 'Local Constituency'}
          </p>
        </div>
      </div>

      {/* Main Content: Development Works in My Area Only */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HiWrenchScrewdriver className="w-5 h-5" style={{ color: primaryColor }} />
            <h2 className="text-base font-extrabold text-gray-900">
              {t('developmentWorks')} ({areaWorks.length})
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingSpinner message="क्षेत्रीय कार्य लोड हो रहे हैं..." />
          </div>
        ) : areaWorks.length > 0 ? (
          <div className="flex flex-col gap-3 pb-6">
            {areaWorks.map(work => {
              const statusText = work.status || 'Active';
              const isCompleted = String(statusText).toLowerCase().includes('complete');
              const isInProgress = String(statusText).toLowerCase().includes('progress') || String(statusText).toLowerCase().includes('ongoing');

              return (
                <div 
                  key={work._id || work.id} 
                  onClick={() => navigate(`/works/${work._id || work.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs cursor-pointer active:scale-[0.99] transition-transform flex gap-3.5 hover:border-gray-200"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 relative">
                    <img
                      src={getMediaUrl(work.coverImageUrl || work.img, '/highway_project.jpg')}
                      alt={work.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/highway_project.jpg'; }}
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                        <span 
                          className={`text-[0.65rem] font-black px-2 py-0.5 rounded-md ${
                            isCompleted 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : isInProgress
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {statusText}
                        </span>

                        <span className="text-[0.65rem] font-bold text-gray-400 truncate">
                          {work.area?.name || userArea.assembly || 'Constituency'}
                        </span>
                      </div>

                      <p className="text-xs font-extrabold text-gray-900 line-clamp-2 leading-snug">
                        {work.title}
                      </p>
                    </div>

                    {work.description && (
                      <p className="text-[0.7rem] text-gray-500 font-medium line-clamp-1 mt-1">
                        {work.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-gray-200 shadow-xs mt-2">
            <HiWrenchScrewdriver className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-700">{t('ongoingWorksInfo') || 'आपके क्षेत्र में अभी कोई कार्य दर्ज नहीं है।'}</p>
            <p className="text-xs text-gray-400 mt-1">
              {[userArea.village, userArea.ward, userArea.assembly].filter(Boolean).join(', ') || 'No Area Specified'}
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

