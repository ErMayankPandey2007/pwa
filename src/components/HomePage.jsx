import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import UserAvatar from './UserAvatar';
import CompleteProfileModal from './CompleteProfileModal';
import { FaXTwitter, FaFacebookF, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { HiLanguage } from 'react-icons/hi2';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent } from '../utils/shareAndDownload';

export default function HomePage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor, leaderName, tagline, logoUrl } = useTenant();
  const { language, openLanguageModal, t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activePoll, setActivePoll] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showIncompleteProfileModal, setShowIncompleteProfileModal] = useState(false);
  const [tenantConfig, setTenantConfig] = useState(null);
  const [banners, setBanners] = useState([]);
  const [latestUpdates, setLatestUpdates] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [devProjects, setDevProjects] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [aboutLeader, setAboutLeader] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBannerModal, setSelectedBannerModal] = useState(null);

  const handleShareBanner = async (e, slide) => {
    e.stopPropagation();
    shareContent({
      title: slide.title || 'Vidyak Banner',
      text: slide.desc || slide.title || 'Check out this update',
      url: slide.linkUrl || window.location.href,
    });
  };

  const handleOpenBanner = (e, slide) => {
    e.stopPropagation();
    setSelectedBannerModal(slide);
  };

  useEffect(() => {
    const fetchUnread = async () => {
      const slug = api.getTenantSlug();
      if (!slug) return;
      try {
        const count = await api.getNotificationUnreadCount().catch(() => 0);
        setUnreadCount(typeof count === 'number' ? count : (count?.count || 0));
      } catch (err) {
        console.warn('Error fetching unread count:', err);
      }
    };
    fetchUnread();
  }, []);

  useEffect(() => {
    const user = storage.getUser();
    if (user) setCurrentUser(user);

    const currentSlug = api.getTenantSlug();
    const token = storage.getToken();

    const loadAllHomeData = async () => {
      // Sync fresh user profile in background if logged in
      if (token) {
        api.getCitizenProfile().then((res) => {
          if (res?.profile) {
            const updated = {
              ...(user || {}),
              ...res.profile,
              photo: res.profile.profilePhoto || res.profile.photo || user?.photo,
              profilePhoto: res.profile.profilePhoto || res.profile.photo || user?.profilePhoto,
            };
            setCurrentUser(updated);
            storage.setUser(updated);

            // If profile is incomplete, check if dismissed recently, otherwise show popup
            const hasSkippedPopup = sessionStorage.getItem('pwa_skipped_profile_popup');
            if (updated.isProfileComplete === false && !hasSkippedPopup) {
              setShowIncompleteProfileModal(true);
            }
          }
        }).catch(() => null);
      } else {
        // Local check
        if (user && user.isProfileComplete === false) {
          const hasSkippedPopup = sessionStorage.getItem('pwa_skipped_profile_popup');
          if (!hasSkippedPopup) {
            setShowIncompleteProfileModal(true);
          }
        }
      }

      // If no tenant slug is configured in .env, do not fetch tenant data from backend.
      if (!currentSlug) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // 1. Fetch Tenant Configuration & White-label Branding
        const configRes = await api.getConfig().catch(() => null);
        if (configRes) {
          setTenantConfig(configRes);
        }

        // 2. Fetch Active Banners via GET /banners API
        const bannersRes = await api.getBanners().catch((err) => {
          console.warn('Error fetching banners:', err);
          return [];
        });
        const bannersList = Array.isArray(bannersRes)
          ? bannersRes
          : (Array.isArray(bannersRes?.data)
            ? bannersRes.data
            : (Array.isArray(bannersRes?.items)
              ? bannersRes.items
              : (Array.isArray(bannersRes?.data?.items) ? bannersRes.data.items : [])));
        if (Array.isArray(bannersList) && bannersList.length > 0) {
          setBanners(bannersList);
        }

        // 3. Fetch Active Polls
        const pollsRes = await api.getActivePolls().catch(() => []);
        const polls = Array.isArray(pollsRes)
          ? pollsRes
          : (Array.isArray(pollsRes?.items)
            ? pollsRes.items
            : (Array.isArray(pollsRes?.data?.items)
              ? pollsRes.data.items
              : (Array.isArray(pollsRes?.data) ? pollsRes.data : [])));
        if (Array.isArray(polls) && polls.length > 0) {
          setActivePoll(polls[0]);
        }

        // 4. Fetch Latest News & Updates
        const newsRes = await api.getNews({ limit: 100 }).catch(() => []);
        const newsList = Array.isArray(newsRes) ? newsRes : (newsRes?.data || []);
        if (newsList.length > 0) {
          setLatestUpdates(newsList);
        }

        // 5. Fetch Upcoming Events
        const eventsRes = await api.getEvents({ limit: 100 }).catch(() => []);
        const rawEvents = Array.isArray(eventsRes?.items)
          ? eventsRes.items
          : (Array.isArray(eventsRes?.data?.items)
            ? eventsRes.data.items
            : (Array.isArray(eventsRes?.data)
              ? eventsRes.data
              : (Array.isArray(eventsRes) ? eventsRes : [])));

        const now = new Date();
        const upcomingList = rawEvents.filter(e => !e.startDate || new Date(e.startDate) >= now);
        const finalEvents = upcomingList.length > 0 ? upcomingList : rawEvents;
        
        if (finalEvents.length > 0) {
          setUpcomingEvents(finalEvents);
        }

        // 6. Fetch Development Works (All works visible in slider)
        const worksRes = await api.getWorks({ limit: 100 }).catch(() => []);
        const worksList = Array.isArray(worksRes) ? worksRes : (worksRes?.data || []);
        if (worksList.length > 0) {
          setDevProjects(worksList);
        }

        // 7. Fetch Photo Gallery Only (Strictly photos only, no videos)
        const galleryRes = await api.getGallery({ type: 'photo', limit: 100 }).catch(() => []);
        const galleryList = Array.isArray(galleryRes?.data?.data)
          ? galleryRes.data.data
          : (Array.isArray(galleryRes?.data)
            ? galleryRes.data
            : (Array.isArray(galleryRes?.items)
              ? galleryRes.items
              : (Array.isArray(galleryRes) ? galleryRes : [])));
        const validGalleryPhotos = galleryList.filter(item => {
          if (!item) return false;
          // Strictly exclude video types and video URLs
          if (item.type === 'video') return false;
          const urlStr = String(item.imageUrl || item.url || item.image || item.mediaUrl || (typeof item === 'string' ? item : '')).toLowerCase();
          if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be') || urlStr.includes('vimeo.com') || urlStr.endsWith('.mp4') || urlStr.endsWith('.mov')) {
            return false;
          }
          return Boolean(item.imageUrl || item.url || item.image || item.mediaUrl || (typeof item === 'string' && item.trim()));
        });
        setGalleryPhotos(validGalleryPhotos);

        // 8. Fetch About Leader
        const leaderRes = await api.getAboutLeader().catch(() => null);
        if (leaderRes) {
          setAboutLeader(leaderRes);
        }
      } catch (err) {
        console.warn('Error loading home data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllHomeData();

    const handleProfileUpdate = (e) => {
      const updatedUser = e?.detail || storage.getUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    };

    window.addEventListener('pwa_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('pwa_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const appName = leaderName || tenantConfig?.branding?.leaderName || tenantConfig?.tenant?.name || 'जनसंपर्क';
  const appTagline = tagline || tenantConfig?.branding?.tagline || '';
  const currentLogo = logoUrl || tenantConfig?.branding?.logoUrl || tenantConfig?.branding?.logo || '';

  // Display slides from backend GET /banners API; if no promotional banners exist, show Party Logo card
  const displaySlides = banners.length > 0
    ? banners.map((b) => ({
      img: getMediaUrl(b.imageUrl || b.image || b.bannerUrl || b.url),
      title: b.title || 'जनसंपर्क अभियान',
      badge: b.badge || b.category || leaderName || 'Jan Sabha',
      desc: b.description || b.desc || b.subtitle || '',
      linkUrl: b.linkUrl || b.link || null,
      isLogoFallback: false,
    }))
    : [
      {
        img: currentLogo,
        title: tagline || tenantConfig?.branding?.tagline || 'सेवा, संकल्प और विकास',
        badge: leaderName || 'Official Portal',
        desc: tenantConfig?.tenant?.constituency ? `Constituency: ${tenantConfig.tenant.constituency}` : 'Direct Citizen Engagement & Public Welfare',
        linkUrl: null,
        isLogoFallback: true,
      }
    ];

  const getRouteButtonLabel = (url) => {
    if (!url) return null;
    const clean = url.trim().toLowerCase();
    if (clean.includes('event')) return { text: 'View Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' };
    if (clean.includes('work') || clean.includes('dev')) return { text: 'Explore Works', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' };
    if (clean.includes('poll')) return { text: 'Vote in Poll', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' };
    if (clean.includes('complaint')) return { text: 'Register Grievance', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
    if (clean.includes('membership')) return { text: 'Join Membership', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' };
    if (clean.includes('volunteer')) return { text: 'Join as Volunteer', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' };
    if (clean.includes('gallery') || clean.includes('photo')) return { text: 'View Gallery', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' };
    if (clean.includes('news') || clean.includes('update')) return { text: 'Read Updates', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' };
    if (clean.includes('about')) return { text: 'Know More', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
    return { text: 'Explore Now', icon: 'M13 7l5 5m0 0l-5 5m5-5H6' };
  };

  const handleBannerClick = (slide) => {
    if (!slide.linkUrl) return;
    const target = slide.linkUrl.trim();
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      navigate(target.startsWith('/') ? target : `/${target}`);
    }
  };

  // Touch / Swipe support for manual sliding
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 40;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Next slide
      setCurrentSlide((prev) => (prev + 1) % displaySlides.length);
    } else if (isRightSwipe) {
      // Previous slide
      setCurrentSlide((prev) => (prev - 1 + displaySlides.length) % displaySlides.length);
    }
  };

  const updatesSliderRef = useRef(null);
  const eventsSliderRef = useRef(null);
  const worksSliderRef = useRef(null);
  const gallerySliderRef = useRef(null);

  // Auto scroll effect for horizontal sliders
  useEffect(() => {
    if (isLoading) return;

    const setupAutoScroll = (ref, step = 180, interval = 3000) => {
      if (!ref.current) return null;
      const el = ref.current;
      const timer = setInterval(() => {
        if (!el) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 5) return; // No scroll needed if content fits
        
        if (el.scrollLeft + step >= maxScroll - 15) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: step, behavior: 'smooth' });
        }
      }, interval);
      return timer;
    };

    const t1 = setupAutoScroll(updatesSliderRef, 220, 3000);
    const t2 = setupAutoScroll(eventsSliderRef, 190, 3200);
    const t3 = setupAutoScroll(worksSliderRef, 180, 3400);
    const t4 = setupAutoScroll(gallerySliderRef, 190, 3100);

    return () => {
      if (t1) clearInterval(t1);
      if (t2) clearInterval(t2);
      if (t3) clearInterval(t3);
      if (t4) clearInterval(t4);
    };
  }, [isLoading, latestUpdates.length, upcomingEvents.length, devProjects.length, galleryPhotos.length]);

  useEffect(() => {
    if (displaySlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % displaySlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [displaySlides.length]);

  // Categories / Quick Actions Grid
  const categories = [
    { name: t('development'), icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', bgColor: 'bg-[#e8f5e9]', color: 'text-[#2e7d32]', path: '/works' },
    { name: t('events'), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', bgColor: 'bg-[#fff3e0]', color: 'text-[#ef6c00]', path: '/events' },
    { name: t('polls'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', bgColor: 'bg-[#e3f2fd]', color: 'text-[#1565c0]', path: '/polls' },
    { name: t('complaint'), icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bgColor: 'bg-[#fff3e0]', color: 'text-[#d84315]', path: '/my-complaints' },
    { name: t('membership'), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', bgColor: 'bg-[#ffebee]', color: 'text-[#c62828]', path: '/membership' },
    { name: t('gallery'), icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', bgColor: 'bg-[#e8f5e9]', color: 'text-[#2e7d32]', path: '/photo-gallery' },
    { name: t('about'), icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bgColor: 'bg-[#f3e5f5]', color: 'text-[#8e24aa]', path: '/about' },
    { name: t('news'), icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z', bgColor: 'bg-[#e0f7fa]', color: 'text-[#00838f]', path: '/latest-updates' },
  ];

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      {/* Top App Bar with Dynamic White-Label Branding */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-white z-20 shadow-xs relative border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 bg-white shadow-xs flex items-center justify-center p-0.5"
            style={{ borderColor: `${primaryColor}30` }}
          >
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="Logo"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : null}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-base font-black text-gray-900 leading-tight tracking-tight truncate max-w-[150px] sm:max-w-xs">{appName}</h1>
            {appTagline && (
              <p
                className="text-[0.62rem] font-bold tracking-wider mt-0.5 uppercase truncate max-w-[150px]"
                style={{ color: primaryColor }}
              >
                {appTagline}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector Pill Button */}
          <button
            onClick={openLanguageModal}
            className="flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-black transition-all active:scale-95 shadow-2xs"
            style={{ 
              borderColor: `${primaryColor}40`,
              backgroundColor: `${primaryColor}0c`,
              color: primaryColor
            }}
            title="Change Language / भाषा बदलें"
          >
            <HiLanguage className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'हिंदी' : 'ENG'}</span>
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="relative text-gray-800 hover:opacity-80 active:scale-95 transition-all p-1"
            style={{ color: primaryColor }}
            title="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[0.58rem] font-black text-white flex items-center justify-center rounded-full ring-2 ring-white"
                style={{ backgroundColor: primaryColor }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/search')}
            className="text-gray-800 hover:opacity-80 active:scale-95 transition-all p-1"
            style={{ color: primaryColor }}
            title="Search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <div
            onClick={() => navigate('/my-profile')}
            className="w-9 h-9 rounded-full overflow-hidden border shadow-xs flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <UserAvatar
              src={currentUser?.profilePhoto || currentUser?.photo}
              name={currentUser?.name}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="मुख्य पृष्ठ लोड हो रहा है..." />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto w-full relative">
          {/* Slider Banner (Strictly from GET /banners API) */}
          {displaySlides.length > 0 && (
            <div
              className="relative w-full aspect-[16/8] sm:aspect-[16/7] bg-slate-900 shrink-0 overflow-hidden shadow-inner select-none cursor-grab active:cursor-grabbing"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onTouchStart}
              onMouseMove={onTouchMove}
              onMouseUp={onTouchEnd}
            >
              <div
                className="flex w-full h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {displaySlides.map((slide, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleBannerClick(slide)}
                    className={`min-w-full h-full relative overflow-hidden flex flex-col justify-end p-4 ${slide.linkUrl ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
                  >
                    {/* Banner Image or Party Logo Fallback */}
                    {slide.isLogoFallback ? (
                      <div className="absolute inset-0 w-full h-full bg-white flex items-center justify-center p-2">
                        <img
                          src={slide.img}
                          alt={slide.title}
                          className="w-full h-full object-contain pointer-events-none"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-white flex items-center justify-center">
                        <img
                          src={slide.img}
                          alt={slide.title}
                          className="w-full h-full object-cover object-top pointer-events-none"
                          onError={(e) => {
                            if (currentLogo) {
                              e.target.src = currentLogo;
                              e.target.className = 'w-full h-full object-contain p-4 pointer-events-none';
                            } else {
                              e.target.style.display = 'none';
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Floating Action Buttons: Share & View Banner */}
                    <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleShareBanner(e, slide)}
                        title="Share Banner"
                        className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenBanner(e, slide)}
                        title="View Full Banner"
                        className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Slide Indicators */}
              {displaySlides.length > 1 && (
                <div className="absolute bottom-2.5 right-4 flex justify-end gap-1.5 z-30">
                  {displaySlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-1.5 rounded-full transition-all ${currentSlide === idx ? 'w-5 shadow' : 'bg-white/60 w-1.5'}`}
                      style={{ backgroundColor: currentSlide === idx ? primaryColor : undefined }}
                    ></button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content Body */}
          <div className="relative z-20 w-full bg-white flex flex-col pb-8">

            {/* Categories Grid */}
            <div className="px-5 pt-6 pb-2">
              <div className="grid grid-cols-4 gap-y-5 gap-x-2">
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => { if (cat.path) navigate(cat.path); }}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${cat.bgColor} flex items-center justify-center shadow-sm group-hover:shadow-md group-active:scale-95 transition-all`}>
                      <svg className={`w-5 h-5 ${cat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                      </svg>
                    </div>
                    <span className="text-[0.6rem] font-bold text-gray-700 text-center leading-tight">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-2 bg-[#f8fafc] my-5"></div>

            {/* Latest Updates / News Section */}
            <div className="px-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-[#1e293b]">{t('latestUpdates')}</h2>
                <button
                  onClick={() => navigate('/latest-updates')}
                  className="text-xs font-bold transition-opacity hover:opacity-80"
                  style={{ color: secondaryColor }}
                >
                  {t('viewAll')}
                </button>
              </div>
              {latestUpdates.length > 0 ? (
                <div 
                  ref={updatesSliderRef}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
                >
                  {latestUpdates.map(item => (
                    <div 
                      key={item._id || item.id} 
                      onClick={() => navigate('/latest-updates')} 
                      className="shrink-0 w-60 flex gap-3 items-center bg-[#f8fafc] rounded-2xl p-3 cursor-pointer active:scale-[0.98] transition-transform border border-gray-100 hover:border-gray-200"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                        <img
                          src={getMediaUrl(item.coverImage || item.imageUrl || item.img, '/event_jan_sabha.jpg')}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/event_jan_sabha.jpg'; }}
                        />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span
                          className="text-[0.6rem] font-bold uppercase tracking-widest mb-0.5"
                          style={{ color: secondaryColor }}
                        >
                          {item.category || t('news')}
                        </span>
                        <p className="text-xs font-extrabold text-gray-900 leading-snug line-clamp-2">{item.title}</p>
                        <span className="text-[0.65rem] font-semibold text-gray-400 mt-1">
                          {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (item.date || 'Recent')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 font-semibold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  {t('noAnnouncementsInfo')}
                </div>
              )}
            </div>

            <div className="h-2 bg-[#f8fafc] my-5"></div>

            {/* Upcoming Events Section */}
            <div className="px-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-[#1e293b]">{t('upcomingEvents')}</h2>
                <button
                  onClick={() => navigate('/events')}
                  className="text-xs font-bold transition-opacity hover:opacity-80"
                  style={{ color: secondaryColor }}
                >
                  {t('viewAll')}
                </button>
              </div>
              {upcomingEvents.length > 0 ? (
                <div 
                  ref={eventsSliderRef}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
                >
                  {upcomingEvents.map(event => (
                    <div key={event._id || event.id} onClick={() => navigate(`/events/${event._id || event.id}`)} className="shrink-0 w-44 rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer active:scale-[0.97] transition-transform hover:border-orange-200">
                      <div className="w-full h-28 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                        {(event.bannerUrl || (Array.isArray(event.images) && event.images.length > 0 ? event.images[0] : null) || event.image || event.img) ? (
                          <img
                            src={getMediaUrl(event.bannerUrl || (Array.isArray(event.images) && event.images.length > 0 ? event.images[0] : null) || event.image || event.img)}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              if (currentLogo) {
                                e.target.src = currentLogo;
                                e.target.className = 'w-12 h-12 object-contain opacity-60';
                              } else {
                                e.target.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center p-3"
                            style={{ backgroundColor: `${primaryColor}20` }}
                          >
                            {currentLogo ? (
                              <img src={currentLogo} alt="Logo" className="w-10 h-10 object-contain opacity-70" />
                            ) : (
                              <svg className="w-8 h-8 opacity-60" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bg-white px-3 py-2.5 flex flex-col gap-1">
                        <p className="text-gray-900 text-xs font-extrabold leading-tight line-clamp-1">{event.title}</p>
                        <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-gray-500 truncate">
                          <svg className="w-3 h-3 shrink-0" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{event.location || 'Local Constituency'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-gray-500">
                          <svg className="w-3 h-3 shrink-0" style={{ color: secondaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{event.startDate ? new Date(event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Upcoming'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 font-semibold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  {t('noEventsInfo')}
                </div>
              )}
            </div>

            <div className="h-2 bg-[#f8fafc] my-5"></div>

            {/* Development Projects */}
            <div className="px-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-[#1e293b]">{t('developmentWorks')}</h2>
                <button
                  onClick={() => navigate('/works')}
                  className="text-xs font-bold transition-opacity hover:opacity-80"
                  style={{ color: secondaryColor }}
                >
                  {t('viewAll')}
                </button>
              </div>
              {devProjects.length > 0 ? (
                <div 
                  ref={worksSliderRef}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
                >
                  {devProjects.map(proj => (
                    <div key={proj._id || proj.id} onClick={() => navigate(`/works/${proj._id || proj.id}`)} className="shrink-0 w-40 rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer active:scale-[0.97] transition-transform">
                      <div className="w-full h-24 relative overflow-hidden bg-gray-100">
                        <img
                          src={getMediaUrl(proj.coverImageUrl || proj.img, '/highway_project.jpg')}
                          alt={proj.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/highway_project.jpg'; }}
                        />
                        <div className="absolute inset-0 bg-black/25"></div>
                      </div>
                      <div className="bg-white px-3 py-2.5 flex flex-col gap-1">
                        <p className="text-xs font-extrabold text-gray-900 leading-tight line-clamp-1">{proj.title}</p>
                        <span
                          className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-md self-start"
                          style={{
                            backgroundColor: `${secondaryColor}15`,
                            color: secondaryColor
                          }}
                        >
                          {proj.status || 'In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 font-semibold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  {t('ongoingWorksInfo')}
                </div>
              )}
            </div>

            <div className="h-2 bg-[#f8fafc] my-5"></div>

            {/* Active Poll Preview */}
            {activePoll && (
              <div className="px-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-[#1e293b]">{t('activePoll')}</h2>
                    {activePoll.allowMultipleChoices && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                        {t('multiChoiceBadge')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/polls')}
                    className="text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ color: secondaryColor }}
                  >
                    {activePoll.userVoted || activePoll.hasVoted ? t('viewPoll') : t('voteNow')}
                  </button>
                </div>
                <div onClick={() => navigate('/polls')} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform">
                  <p className="text-sm font-extrabold text-gray-900 mb-3 leading-snug">{activePoll.question}</p>
                  
                  <div className="flex flex-col gap-2">
                    {(activePoll.options || []).map((opt, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div 
                          className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0"
                          style={activePoll.userVoted || activePoll.hasVoted ? { borderColor: primaryColor } : {}}
                        >
                          {(activePoll.userVoted || activePoll.hasVoted) && (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate">{opt.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-400">
                    <span>{`${(activePoll.totalVotes || 0).toLocaleString()} ${t('totalVotes')}`}</span>
                    <span style={{ color: primaryColor }}>{activePoll.userVoted || activePoll.hasVoted ? t('voted') : t('tapToVote')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Photo Gallery Preview */}
            {galleryPhotos && galleryPhotos.length > 0 && (
              <>
                <div className="h-2 bg-[#f8fafc] my-5"></div>
                <div className="px-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-extrabold text-[#1e293b]">{t('photoGallery')}</h2>
                    <button
                      onClick={() => navigate('/photo-gallery')}
                      className="text-xs font-bold transition-opacity hover:opacity-80"
                      style={{ color: secondaryColor }}
                    >
                      {t('viewAll')}
                    </button>
                  </div>
                  <div 
                    ref={gallerySliderRef}
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
                  >
                    {galleryPhotos.map((item, i) => {
                      const imgSrc = getMediaUrl(item.imageUrl || item.url || item.image || item.mediaUrl || item);
                      return (
                        <div
                          key={item._id || item.id || i}
                          onClick={() => navigate('/photo-gallery')}
                          className="shrink-0 w-44 h-36 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all bg-slate-100 border border-gray-100 shadow-xs relative flex flex-col"
                        >
                          <div className="w-full h-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
                            <img
                              src={imgSrc}
                              alt={item.title || "Gallery Photo"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                          {item.title && (
                            <div className="bg-white/95 px-3 py-1.5 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-800 truncate">{item.title}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="h-2 bg-[#f8fafc] my-5"></div>

            {/* Leader Message Card */}
            <div className="px-5 mt-2">
              <div
                className="border rounded-2xl p-4 relative overflow-hidden shadow-sm"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: `${primaryColor}30`
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-full border-2 overflow-hidden shrink-0 shadow-sm bg-gray-100 flex items-center justify-center"
                    style={{ borderColor: primaryColor }}
                  >
                    {(aboutLeader?.profileImageUrl || aboutLeader?.coverImageUrl || aboutLeader?.photoUrl || tenantConfig?.branding?.leaderPhotoUrl) ? (
                      <img
                        src={getMediaUrl(aboutLeader?.profileImageUrl || aboutLeader?.coverImageUrl || aboutLeader?.photoUrl || tenantConfig?.branding?.leaderPhotoUrl)}
                        alt="Leader"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <svg className="w-7 h-7 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-gray-900">{aboutLeader?.fullName || aboutLeader?.name || leaderName || 'माननीय जन प्रतिनिधि'}</h3>
                      <span
                        className="text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        {aboutLeader?.designation || 'Leader'}
                      </span>
                    </div>
                    <p className="text-[0.7rem] text-gray-500 font-semibold">{aboutLeader?.constituency || 'Janseva Portal'}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-700 italic leading-relaxed">
                  "{aboutLeader?.vision || aboutLeader?.shortBio || tagline || 'जन सेवा ही हमारा संकल्प है। अपनी समस्याओं और सुझावों के लिए हमसे जुड़े रहें।'}"
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center justify-between">
                  <button
                    onClick={() => navigate('/about')}
                    className="text-xs font-bold hover:underline flex items-center gap-1"
                    style={{ color: primaryColor }}
                  >
                    {t('readFullBio')}
                  </button>
                  <span className="text-[0.65rem] font-bold text-gray-400">{t('publicRepresentative')}</span>
                </div>
              </div>
            </div>

            {/* Social Media & Contact Helpline Bar (Render dynamically only if present in database) */}
            {(() => {
              const leaderPhone = (aboutLeader?.contactInfo?.phone || aboutLeader?.contactInfo?.mobile || tenantConfig?.tenant?.mobileNumber || tenantConfig?.branding?.contactNumber || '').trim();
              const rawWhatsapp = (aboutLeader?.socialLinks?.whatsapp || aboutLeader?.contactInfo?.whatsapp || tenantConfig?.branding?.socialLinks?.whatsapp || '').trim();
              const whatsappNumber = rawWhatsapp || (leaderPhone ? leaderPhone : '');
              const whatsappUrl = whatsappNumber ? (whatsappNumber.startsWith('http') ? whatsappNumber : `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`) : null;

              const twitterUrl = (aboutLeader?.socialLinks?.twitter || aboutLeader?.socialLinks?.x || tenantConfig?.branding?.socialLinks?.twitter || '').trim();
              const facebookUrl = (aboutLeader?.socialLinks?.facebook || tenantConfig?.branding?.socialLinks?.facebook || '').trim();
              const instagramUrl = (aboutLeader?.socialLinks?.instagram || tenantConfig?.branding?.socialLinks?.instagram || '').trim();
              const youtubeUrl = (aboutLeader?.socialLinks?.youtube || tenantConfig?.branding?.socialLinks?.youtube || '').trim();

              const activeSocialLinks = [
                twitterUrl ? { name: 'X', url: twitterUrl, color: 'bg-black text-white hover:bg-neutral-800', icon: <FaXTwitter className="w-3.5 h-3.5" /> } : null,
                facebookUrl ? { name: 'FB', url: facebookUrl, color: 'bg-[#1877F2] text-white hover:bg-[#166fe5]', icon: <FaFacebookF className="w-3.5 h-3.5" /> } : null,
                instagramUrl ? { name: 'IG', url: instagramUrl, color: 'bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white hover:opacity-90', icon: <FaInstagram className="w-3.5 h-3.5" /> } : null,
                youtubeUrl ? { name: 'YT', url: youtubeUrl, color: 'bg-[#FF0000] text-white hover:bg-[#cc0000]', icon: <FaYoutube className="w-3.5 h-3.5" /> } : null,
              ].filter(Boolean);

              const hasHelpline = Boolean(leaderPhone || whatsappUrl);
              const hasSocials = activeSocialLinks.length > 0;
              const showConnectSection = hasHelpline || hasSocials;

              if (!showConnectSection) return null;

              return (
                <>
                  <div className="h-2 bg-[#f8fafc] my-5"></div>

                  <div className="px-5">
                    <h2 className="text-base font-extrabold text-[#1e293b] mb-3">{t('connectHelpline')}</h2>
                    
                    {hasHelpline && (
                      <div className={`grid ${leaderPhone && whatsappUrl ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-3`}>
                        {leaderPhone && (
                          <a 
                            href={`tel:${leaderPhone}`} 
                            className="flex items-center gap-2.5 bg-green-50 border border-green-200/70 p-3 rounded-xl active:scale-[0.98] transition-transform cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[0.65rem] font-bold text-gray-500 uppercase">{t('tollFree') || 'Helpline'}</p>
                              <p className="text-xs font-extrabold text-gray-900 truncate">{leaderPhone}</p>
                            </div>
                          </a>
                        )}

                        {whatsappUrl && (
                          <a 
                            href={whatsappUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/70 p-3 rounded-xl active:scale-[0.98] transition-transform cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                              WA
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[0.65rem] font-bold text-gray-500 uppercase">{t('whatsappHelpdesk') || 'WhatsApp'}</p>
                              <p className="text-xs font-extrabold text-gray-900 truncate">{whatsappNumber}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Social Channels Row */}
                    {hasSocials && (
                      <div className="flex items-center justify-between bg-[#f8fafc] border border-gray-200/80 rounded-xl p-3">
                        <span className="text-xs font-bold text-gray-700">{t('followLeader')}</span>
                        <div className="flex items-center gap-2">
                          {activeSocialLinks.map((s, i) => (
                            <a 
                              key={i} 
                              href={s.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className={`w-7 h-7 rounded-lg ${s.color} flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer`}
                              title={s.name}
                            >
                              {s.icon}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="h-2 bg-[#f8fafc] my-5"></div>

            {/* Jan Samasya CTA */}
            <div className="px-5">
              <div
                onClick={() => navigate('/complaint')}
                className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})`
                }}
              >
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="text-white font-extrabold text-base leading-tight">{t('janSamasyaPortal')}</h3>
                  <p className="text-white/80 text-xs font-semibold mt-0.5">{t('submitComplaintDesc')}</p>
                </div>
                <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen Banner Preview & Share Modal */}
      {selectedBannerModal && (
        <div 
          className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 pb-12 animate-fade-in"
          onClick={() => setSelectedBannerModal(null)}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between z-10 pt-2 px-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col text-white">
              <h3 className="font-bold text-base line-clamp-1">{selectedBannerModal.title}</h3>
              {selectedBannerModal.badge && (
                <span className="text-xs text-white/70">{selectedBannerModal.badge}</span>
              )}
            </div>
            <button
              onClick={() => setSelectedBannerModal(null)}
              className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Center Content (Full Image View) */}
          <div className="flex-1 flex items-center justify-center p-2 my-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedBannerModal.img}
              alt={selectedBannerModal.title}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center gap-3 pb-4 px-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleShareBanner(e, selectedBannerModal)}
              className="flex-1 py-3 px-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Banner
            </button>
            {selectedBannerModal.linkUrl && (
              <button
                onClick={() => {
                  const url = selectedBannerModal.linkUrl;
                  setSelectedBannerModal(null);
                  handleBannerClick({ linkUrl: url });
                }}
                className="py-3 px-5 rounded-xl bg-white/20 text-white font-bold hover:bg-white/30 active:scale-95 transition-all"
              >
                Open Link
              </button>
            )}
          </div>
        </div>
      )}

      {/* Complete Incomplete Profile Modal Popup */}
      <CompleteProfileModal
        isOpen={showIncompleteProfileModal}
        onClose={() => {
          sessionStorage.setItem('pwa_skipped_profile_popup', '1');
          setShowIncompleteProfileModal(false);
        }}
        onComplete={(updatedUser) => {
          setCurrentUser(updatedUser);
          setShowIncompleteProfileModal(false);
        }}
      />

      <BottomNav />
    </div>
  );
}
