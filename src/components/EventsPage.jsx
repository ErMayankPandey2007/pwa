import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { eventsStorage } from '../services/eventsData';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent } from '../utils/shareAndDownload';
import {
  HiCalendarDays,
  HiClock,
  HiBuildingLibrary,
  HiHandThumbUp,
  HiShare,
  HiArrowLeft,
  HiXMark,
  HiCheck,
} from 'react-icons/hi2';

function formatEvent(e, defaultFallback = '') {
  const hasPassed =
    e.status === 'past' ||
    (e.endDate ? new Date(e.endDate) < new Date() : e.startDate ? new Date(e.startDate) < new Date() : false);
  const firstImg = e.bannerUrl || (Array.isArray(e.images) && e.images.length > 0 ? e.images[0] : null) || e.image || e.img;
  return {
    id: e._id || e.id,
    title: e.title,
    eventType: e.eventType || e.category || 'Event',
    category: hasPassed ? 'Past' : 'Upcoming',
    date: e.startDate ? new Date(e.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD',
    time: e.startTime ? e.startTime : e.startDate ? new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    location: e.location || 'Local Constituency',
    image: firstImg ? getMediaUrl(firstImg) : defaultFallback,
    hasImage: !!firstImg,
    description: e.description || '',
    goingCount: e.goingCount || 0,
    tags: e.tags || [],
  };
}

function extractList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

export default function EventsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { primaryColor, logoUrl } = useTenant();
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [registeringEvent, setRegisteringEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [goingIds, setGoingIds] = useState(new Set());
  const [myGoingEvents, setMyGoingEvents] = useState([]);
  const [myGoingLoading, setMyGoingLoading] = useState(false);
  const filterRefs = useRef({});
  const tabs = [
    { id: 'Upcoming', label: t('upcomingTab') },
    { id: 'Past', label: t('pastTab') },
    { id: 'My Events', label: t('myEventsTab') }
  ];
  const eventTypes = ['All', 'Jan Sabha', 'Rally', 'Meeting', 'Blood Donation', 'Membership Drive', 'Social Program'];

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.getEvents().catch(() => []);
        setEvents(extractList(res).map(formatEvent));
      } catch { setEvents([]); } finally { setIsLoading(false); }
    };
    load();
  }, []);

  const loadMyGoingEvents = useCallback(async () => {
    if (!api.getToken()) {
      setMyGoingEvents([]);
      setGoingIds(new Set());
      return;
    }
    setMyGoingLoading(true);
    try {
      const res = await api.getMyGoingEvents().catch(() => []);
      const list = extractList(res).filter(Boolean).map(formatEvent);
      setMyGoingEvents(list);
      setGoingIds(new Set(list.map(e => e.id)));
    } catch { 
      setMyGoingEvents([]); 
    } finally { 
      setMyGoingLoading(false); 
    }
  }, []);

  useEffect(() => { 
    loadMyGoingEvents(); 
  }, [loadMyGoingEvents, activeTab]);

  useEffect(() => {
    filterRefs.current[activeFilter]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeFilter]);

  const getList = (tabName) => {
    let base = tabName === 'My Events'
      ? myGoingEvents
      : events.filter(e => tabName === 'Upcoming' ? e.category === 'Upcoming' : e.category === 'Past');
    if (activeFilter === 'All') return base;
    return base.filter(e => {
      const t = activeFilter.toLowerCase();
      return String(e.eventType || '').toLowerCase() === t ||
        (Array.isArray(e.tags) && e.tags.some(tag => String(tag).toLowerCase() === t));
    });
  };

  const handleGoing = async (eventId, domEvent, eventObj) => {
    domEvent.stopPropagation();
    if (!api.getToken()) {
      toast.warn('पहले लॉगिन करें');
      navigate('/login', { state: { from: '/events' } });
      return;
    }
    const isGoing = goingIds.has(eventId);
    
    // Optimistic UI state
    setGoingIds(prev => { 
      const n = new Set(prev); 
      isGoing ? n.delete(eventId) : n.add(eventId); 
      return n; 
    });
    setMyGoingEvents(prev => {
      if (isGoing) {
        return prev.filter(e => e.id !== eventId);
      } else {
        const item = eventObj || events.find(e => e.id === eventId);
        return item && !prev.some(e => e.id === eventId) ? [...prev, item] : prev;
      }
    });
    eventsStorage.setRsvp(eventId, isGoing ? null : 'Going');

    try {
      if (isGoing) {
        await api.removeRsvpEvent(eventId);
        toast.info('Cancel Going ho gaya');
      } else {
        await api.rsvpEvent(eventId, 'going');
        toast.success('✅ I Going recorded!');
      }
      // Re-fetch live to make sure DB is 100% in sync
      const res = await api.getMyGoingEvents().catch(() => null);
      if (res) {
        const list = extractList(res).filter(Boolean).map(formatEvent);
        setMyGoingEvents(list);
        setGoingIds(new Set(list.map(e => e.id)));
      }
    } catch (err) {
      // Rollback on error
      setGoingIds(prev => { 
        const n = new Set(prev); 
        isGoing ? n.add(eventId) : n.delete(eventId); 
        return n; 
      });
      loadMyGoingEvents();
      eventsStorage.setRsvp(eventId, isGoing ? 'Going' : null);
      toast.error(err?.message || 'कुछ गड़बड़ हुई, दोबारा कोशिश करें');
    }
  };

  const handleShare = async (event, domEvent) => {
    domEvent.stopPropagation();
    domEvent.preventDefault();
    const url = `${window.location.origin}/events/${event.id}`;
    shareContent({
      title: event.title,
      text: `${event.title} (${event.eventType || 'Event'}) — ${event.date}`,
      url: url,
    });
  };

  const activeTabIndex = tabs.findIndex(t => t.id === activeTab);

  const EventCard = ({ event }) => {
    const isGoing = goingIds.has(event.id);
    return (
      <div
        onClick={() => navigate(`/events/${event.id}`)}
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-md cursor-pointer active:scale-[0.99] transition-all"
      >
        {/* Dynamic banner - clean image without hardcoded overlays */}
        <div className="relative w-full h-44 bg-slate-100 overflow-hidden flex items-center justify-center">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                if (logoUrl) {
                  e.target.src = logoUrl;
                  e.target.className = 'w-16 h-16 object-contain opacity-60';
                } else {
                  e.target.style.display = 'none';
                }
              }}
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center"
              style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}30)` }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain opacity-80" />
              ) : (
                <HiCalendarDays className="w-12 h-12" style={{ color: primaryColor }} />
              )}
            </div>
          )}
          {isGoing && (
            <span className="absolute top-3 right-3 bg-green-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 z-10">
              <HiCheck className="w-3 h-3" /> I Going
            </span>
          )}
        </div>

        <div className="p-3.5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-black text-gray-900 leading-snug flex-1">{event.title}</h3>
            <span className="text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0" style={{ backgroundColor: primaryColor }}>
              {event.eventType}
            </span>
          </div>

          {event.description && (
            <p className="text-xs text-gray-600 font-semibold leading-relaxed line-clamp-2">{event.description}</p>
          )}

          <div className="bg-[#f8fafc] border border-gray-100 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-gray-700">
            <div className="flex items-center gap-1.5">
              <HiCalendarDays className="w-4 h-4" style={{ color: primaryColor }} />
              <span>{event.date}</span>
            </div>
            {event.time && (
              <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                <HiClock className="w-3.5 h-3.5" />
                <span>{event.time}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
            <HiBuildingLibrary className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
            <span className="font-bold text-gray-800 truncate">{event.location}</span>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={(domEv) => handleGoing(event.id, domEv, event)}
              className={`w-full py-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                isGoing ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-green-600 border-green-600 text-white hover:bg-green-700 shadow-sm'
              }`}
            >
              {isGoing ? (
                <>
                  <HiXMark className="w-4 h-4 text-red-600" />
                  <span>Cancel Going</span>
                </>
              ) : (
                <>
                  <HiHandThumbUp className="w-4 h-4 text-white" />
                  <span>I Going</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="font-bold" style={{ color: primaryColor }}>{t('viewAll')}</span>
            <button onClick={(domEv) => handleShare(event, domEv)} className="text-gray-500 hover:text-gray-800 font-bold flex items-center gap-1.5">
              <HiShare className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">

      {/* Entry Pass Modal */}
      {registeringEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-5 py-4 text-white flex justify-between items-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
              <div>
                <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full uppercase">{registeringEvent.eventType}</span>
                <h3 className="font-extrabold text-base mt-1">Get Entry Pass</h3>
              </div>
              <button onClick={() => setRegisteringEvent(null)} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setRegisteringEvent(null); toast.success('Entry pass confirmed!'); }} className="p-5 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('fullName')}</label>
                <input required type="text" placeholder="Your name" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('mobile')}</label>
                <input required type="tel" placeholder="10-digit number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none" />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setRegisteringEvent(null)} className="flex-1 py-2.5 rounded-xl font-bold text-xs text-gray-600 bg-gray-100">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-md" style={{ backgroundColor: primaryColor }}>{t('submit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 active:scale-95 shrink-0">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-extrabold text-[#1e293b] truncate">{t('eventsTitle')}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white px-4 border-b border-gray-100 shrink-0 shadow-sm z-10">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${isActive ? '' : 'border-transparent text-gray-500'}`}
              style={{ borderColor: isActive ? primaryColor : 'transparent', color: isActive ? primaryColor : undefined }}
            >
              <span>{tab.label}</span>
              {tab.id === 'My Events' && myGoingEvents.length > 0 && (
                <span className="px-1.5 rounded-full text-[9px] font-black" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                  {myGoingEvents.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="bg-white/80 backdrop-blur-sm px-4 py-2.5 border-b border-gray-100 shrink-0 overflow-x-auto hide-scrollbar flex gap-2">
        {eventTypes.map(type => (
          <button
            key={type}
            ref={el => (filterRefs.current[type] = el)}
            onClick={() => setActiveFilter(type)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${activeFilter === type ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}
            style={{ backgroundColor: activeFilter === type ? primaryColor : undefined }}
          >
            {type === 'All' ? t('allFilter') : type}
          </button>
        ))}
      </div>

      {/* Sliding panels */}
      <div className="flex-1 w-full overflow-hidden relative">
        <div
          className="flex h-full w-[300%] transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${(activeTabIndex >= 0 ? activeTabIndex : 0) * (100 / 3)}%)` }}
        >
          {tabs.map(tab => {
            const list = getList(tab.id);
            const isMyTab = tab.id === 'My Events';
            const loading = isMyTab ? myGoingLoading : isLoading;
            return (
              <div key={tab.id} className="w-1/3 h-full overflow-y-auto p-4">
                <div className="flex flex-col gap-4 pb-6">
                  {loading ? (
                    <LoadingSpinner message={t('loading')} />
                  ) : list.length > 0 ? (
                    list.map(event => <EventCard key={event.id} event={event} />)
                  ) : isMyTab ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 flex flex-col items-center gap-3 shadow-xs">
                      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                        <HiCalendarDays className="w-7 h-7 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-extrabold text-sm mb-1">
                          {!api.getToken() ? 'अपने कार्यक्रम देखने के लिए लॉगिन करें' : t('noMyEvents')}
                        </p>
                        <p className="text-gray-500 font-medium text-xs">
                          {!api.getToken() ? 'लॉगिन करने के बाद आपके द्वारा RSVP किए गए कार्यक्रम यहाँ दिखेंगे।' : 'जिन कार्यक्रमों में आप शामिल होंगे, वे यहाँ दिखाई देंगे।'}
                        </p>
                      </div>
                      {!api.getToken() ? (
                        <button
                          onClick={() => navigate('/login', { state: { from: '/events' } })}
                          className="mt-2 px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-sm active:scale-95 transition-transform"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {t('login')}
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveTab('Upcoming')}
                          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          {t('upcomingTab')} कार्यक्रम देखें →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                      <p className="text-gray-500 font-bold text-sm">{t('noEventsFound')}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}