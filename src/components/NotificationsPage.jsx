import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { useTenant } from '../context/TenantContext';
import { api } from '../services/api';
import { 
  getNotificationPermissionStatus, 
  requestFcmToken, 
  getStoredFcmToken 
} from '../services/firebase';
import { 
  HiArrowLeft, 
  HiBell, 
  HiInformationCircle, 
  HiExclamationTriangle, 
  HiCalendarDays, 
  HiSparkles,
  HiCheckCircle,
  HiPaperAirplane
} from 'react-icons/hi2';
import { toast } from 'react-toastify';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const [activeFilter, setActiveFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState(getNotificationPermissionStatus());
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    setPushPermission(getNotificationPermissionStatus());
  }, []);

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    try {
      localStorage.removeItem('vidyak_fcm_token');
      const res = await requestFcmToken({ showToasts: true });
      if (res.success) {
        setPushPermission('granted');
      } else {
        setPushPermission(getNotificationPermissionStatus());
      }
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleSendTestPush = async () => {
    setIsSendingTest(true);

    try {
      let token = getStoredFcmToken();
      if (!token) {
        const fresh = await requestFcmToken({ showToasts: false });
        token = fresh?.token;
      }

      let res = await api.testFcmPush(token || undefined);

      // If token was stale / unregistered from previous Firebase config, auto regenerate fresh token and retry once
      const isUnregistered = 
        res?.error?.toLowerCase()?.includes('unregistered') || 
        res?.message?.toLowerCase()?.includes('unregistered') ||
        res?.error?.toLowerCase()?.includes('not found') ||
        res?.error?.toLowerCase()?.includes('not-registered');

      if (isUnregistered) {
        localStorage.removeItem('vidyak_fcm_token');
        const fresh = await requestFcmToken({ showToasts: false });
        if (fresh?.token) {
          res = await api.testFcmPush(fresh.token);
        }
      }

      if (res?.success) {
        toast.success('Test push notification delivered via FCM!');
      } else {
        toast.info(res?.message || res?.error || 'Test push sent.');
      }
    } catch (err) {
      toast.error(err.message || 'Could not send test push.');
    } finally {
      setIsSendingTest(false);
    }
  };


  useEffect(() => {
    const fetchNotifications = async () => {
      const token = api.getToken();
      if (!token) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setIsUnauthorized(false);
        const res = await api.getMyNotifications();
        const list = Array.isArray(res) ? res : (res?.data || []);
        
        if (list.length > 0) {
          const formatted = list.map(item => {
            const noteObj = item.notificationId || item;
            return {
              id: item._id || noteObj._id,
              rawId: item._id,
              notificationId: noteObj._id,
              title: noteObj.title || 'Official Update',
              message: noteObj.body || noteObj.message || '',
              time: noteObj.createdAt ? new Date(noteObj.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent',
              type: (noteObj.category || noteObj.type || 'announcement').toLowerCase(),
              read: item.isRead ?? false,
              link: noteObj.actionUrl || noteObj.link || (noteObj.category === 'complaint' ? '/my-complaints' : noteObj.category === 'event' ? '/events' : '/latest-updates')
            };
          });
          setNotifications(formatted);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('unauthorized')) {
          setIsUnauthorized(true);
        }
        console.warn('Error fetching notifications:', err);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const filterTabs = ['All', 'Complaints', 'Events', 'Announcements'];

  const getIconForType = (type) => {
    switch(type) {
      case 'complaint': return (
        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
          <HiExclamationTriangle className="w-5 h-5" />
        </div>
      );
      case 'event': return (
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
          <HiCalendarDays className="w-5 h-5" />
        </div>
      );
      case 'announcement': return (
        <div 
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          <HiBell className="w-5 h-5" />
        </div>
      );
      default: return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
          <HiInformationCircle className="w-5 h-5" />
        </div>
      );
    }
  };

  const handleNotificationClick = async (note) => {
    if (!note.read && note.rawId) {
      try {
        await api.markNotificationRead(note.rawId).catch(() => {});
        setNotifications(prev => prev.map(n => n.id === note.id ? { ...n, read: true } : n));
      } catch (err) {
        console.warn('Error marking notification read:', err);
      }
    }
    if (note.link) {
      navigate(note.link);
    }
  };

  const markAllRead = async () => {
    const unreadList = notifications.filter(n => !n.read && n.rawId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');

    for (const note of unreadList) {
      api.markNotificationRead(note.rawId).catch(() => {});
    }
  };

  const clearAll = () => {
    setNotifications([]);
    toast.info('Notifications cleared');
  };

  const filtered = activeFilter === 'All' 
    ? notifications 
    : notifications.filter(n => {
        if (activeFilter === 'Complaints') return n.type === 'complaint';
        if (activeFilter === 'Events') return n.type === 'event';
        if (activeFilter === 'Announcements') return n.type === 'announcement';
        return true;
      });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Clean White Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3.5 pb-3 shadow-xs shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            >
              <HiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-[#0f172a] leading-tight flex items-center gap-2">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span 
                    className="text-[0.65rem] font-black text-white px-2 py-0.2 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {unreadCount} New
                  </span>
                )}
              </h1>
              <p className="text-[0.7rem] font-semibold text-gray-400">Updates, alerts & events</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-bold border px-3 py-1 rounded-full active:scale-95 transition-all"
                style={{ color: primaryColor, backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}
              >
                Mark Read
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-3.5 overflow-x-auto no-scrollbar scrollbar-hide">
          {filterTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
                activeFilter === tab
                  ? 'text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200/80'
              }`}
              style={activeFilter === tab ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        <div className="flex flex-col gap-3 pb-6">

          {/* FCM Push Notification Banner */}
          {pushPermission === 'granted' ? (
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <HiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h4 className="text-xs font-bold text-gray-900">Push Notifications Active</h4>
                  </div>
                  <p className="text-[0.68rem] text-gray-500 font-medium">You'll receive real-time updates & alerts on this device</p>
                </div>
              </div>

              <button
                onClick={handleSendTestPush}
                disabled={isSendingTest}
                className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-extrabold hover:bg-gray-50 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                title="Send a live test notification to verify FCM"
              >
                <HiPaperAirplane className="w-3.5 h-3.5 text-blue-500" />
                <span>{isSendingTest ? 'Sending...' : 'Test Push'}</span>
              </button>
            </div>
          ) : pushPermission === 'denied' ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                <HiExclamationTriangle className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-rose-800">
                Push notifications are blocked in your browser. Allow notifications in site settings to receive live alerts.
              </p>
            </div>
          ) : (
            <div 
              className="rounded-2xl p-3.5 flex items-center justify-between shadow-xs border transition-all"
              style={{ backgroundColor: `${primaryColor}0d`, borderColor: `${primaryColor}30` }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  <HiBell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#0f172a]">Enable Live Push Notifications</h4>
                  <p className="text-[0.68rem] text-gray-500 font-medium">Get instant updates about events, news & complaints</p>
                </div>
              </div>

              <button
                onClick={handleEnablePush}
                disabled={isEnablingPush}
                className="px-3 py-1.5 rounded-xl text-white text-xs font-extrabold active:scale-95 transition-all shadow-xs flex items-center gap-1 shrink-0 disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                <HiSparkles className="w-3.5 h-3.5" />
                <span>{isEnablingPush ? 'Enabling...' : 'Enable'}</span>
              </button>
            </div>
          )}

          {isLoading ? (
            <LoadingSpinner message="सूचनाएं लोड हो रही हैं..." />
          ) : filtered.length > 0 ? (
            filtered.map((note) => (
              <div
                key={note.id}
                onClick={() => handleNotificationClick(note)}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex gap-3.5 items-start active:scale-[0.99] ${
                  note.read ? 'border-gray-100' : 'shadow-sm'
                }`}
                style={!note.read ? { borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}08` } : {}}
              >
                {getIconForType(note.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h3 className={`text-sm font-extrabold truncate ${note.read ? 'text-gray-900' : 'text-[#0f172a]'}`}>
                      {note.title}
                    </h3>
                    {!note.read && (
                      <span 
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      ></span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-relaxed mb-2">
                    {note.message}
                  </p>
                  <span className="text-[0.65rem] font-bold text-gray-400">
                    {note.time}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-center p-6 bg-white rounded-2xl border border-gray-100 my-4">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                <HiBell className="w-7 h-7" />
              </div>
              <p className="text-gray-800 font-extrabold text-sm">
                {isUnauthorized ? 'Login to View Notifications' : 'No Notifications Found'}
              </p>
              <p className="text-gray-400 font-semibold text-xs mt-0.5 max-w-xs mb-3">
                {isUnauthorized 
                  ? 'Please login with your mobile number to get personalized updates, event reminders & complaint statuses.' 
                  : "You're all caught up with latest updates!"}
              </p>
              {isUnauthorized && (
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Login Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
