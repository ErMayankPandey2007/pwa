import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent } from '../utils/shareAndDownload';
import { 
  HiFolderOpen, 
  HiXMark, 
  HiCheck, 
  HiStar, 
  HiArrowLeft, 
  HiPlus, 
  HiArrowRight,
  HiShieldCheck
} from 'react-icons/hi2';
import { FaWhatsapp } from 'react-icons/fa6';

export default function MyComplaintsPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor, leaderName } = useTenant();
  const { language } = useLanguage();

  // Top Main Tabs: 'my' (My Complaints) | 'public' (Public Complaints)
  const [activeMainTab, setActiveMainTab] = useState('my');

  // Sub-status tabs
  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [activePublicStatusTab, setActivePublicStatusTab] = useState('All');

  const myStatusTabs = ['All', 'Pending', 'In Progress', 'Resolved'];
  const publicStatusTabs = ['All', 'In Progress', 'Resolved', 'Pending'];

  // Complaints Data
  const [myComplaints, setMyComplaints] = useState([]);
  const [publicComplaints, setPublicComplaints] = useState([]);
  const [isLoadingMy, setIsLoadingMy] = useState(true);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Selected Detail Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const tabRefs = useRef({});

  const stages = [
    { key: 'Submitted', label: language === 'en' ? 'Submitted' : 'शिकायत दर्ज', desc: language === 'en' ? 'Complaint registered by citizen' : 'नागरिक द्वारा शिकायत दर्ज' },
    { key: 'Under Review', label: language === 'en' ? 'Under Review' : 'समीक्षाधीन', desc: language === 'en' ? 'Checking priority & area' : 'प्राथमिकता व क्षेत्र सत्यापन' },
    { key: 'Assigned', label: language === 'en' ? 'Assigned' : 'कार्य आबंटित', desc: language === 'en' ? 'Assigned to Ward Officer' : 'वार्ड अधिकारी/कार्यकर्ता को सौंपा' },
    { key: 'In Progress', label: language === 'en' ? 'In Progress' : 'प्रगति पर', desc: language === 'en' ? 'Work execution on site' : 'धरातल पर कार्य जारी' },
    { key: 'Resolved', label: language === 'en' ? 'Resolved' : 'निस्तारित', desc: language === 'en' ? 'Resolution verified & completed' : 'समाधान सत्यापित एवं पूर्ण' }
  ];

  useEffect(() => {
    fetchMyComplaints();
    fetchPublicComplaints();
  }, [language]);

  const fetchMyComplaints = async () => {
    const token = api.getToken() || storage.getToken();
    if (!token) {
      setIsUnauthorized(true);
      setIsLoadingMy(false);
      const localComplaints = storage.getUser()?.pwa_complaints || storage.getComplaints() || [];
      if (localComplaints.length > 0) {
        setMyComplaints(localComplaints);
      }
      return;
    }

    try {
      setIsLoadingMy(true);
      setIsUnauthorized(false);
      const res = await api.getMyComplaints();
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map(c => {
          const rawImages = (Array.isArray(c.attachments) && c.attachments.length > 0)
            ? c.attachments
            : ((Array.isArray(c.mediaUrls) && c.mediaUrls.length > 0) ? c.mediaUrls : (c.images || []));
          
          const resolvedImages = rawImages.map(img => getMediaUrl(img)).filter(Boolean);
          const rawStatus = String(c.status || '').toLowerCase();
          
          let displayStatus = 'Pending';
          if (rawStatus === 'resolved' || rawStatus === 'closed') displayStatus = 'Resolved';
          else if (rawStatus === 'in_progress' || rawStatus === 'assigned') displayStatus = 'In Progress';

          return {
            id: c.complaintNumber || c._id || `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
            complaintNumber: c.complaintNumber || c.id,
            _id: c._id,
            title: c.title,
            category: c.category,
            area: c.areaId?.name || c.area?.name || c.landmark || 'Constituency',
            landmark: c.landmark || '',
            urgency: c.priority || 'Normal',
            description: c.description,
            status: displayStatus,
            rawStatus: c.status,
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            images: resolvedImages,
            resolutionDetails: c.resolutionDetails || null,
            resolutionProof: (Array.isArray(c.resolutionProof) ? c.resolutionProof : []).map(img => getMediaUrl(img)).filter(Boolean),
            timeline: c.timeline || []
          };
        });
        setMyComplaints(formatted);
      } else {
        setMyComplaints([]);
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('unauthorized')) {
        setIsUnauthorized(true);
      }
      console.warn('Error fetching my complaints:', err);
      setMyComplaints([]);
    } finally {
      setIsLoadingMy(false);
    }
  };

  const fetchPublicComplaints = async () => {
    try {
      setIsLoadingPublic(true);
      const res = await api.getPublicComplaints().catch(() => null);
      const list = res?.items || (Array.isArray(res) ? res : (res?.data || []));

      if (Array.isArray(list)) {
        const formatted = list.map(c => {
          const rawImages = (Array.isArray(c.attachments) && c.attachments.length > 0)
            ? c.attachments
            : ((Array.isArray(c.mediaUrls) && c.mediaUrls.length > 0) ? c.mediaUrls : []);
          
          const resolvedImages = rawImages.map(img => getMediaUrl(img)).filter(Boolean);
          const resolutionProof = (Array.isArray(c.resolutionProof) ? c.resolutionProof : []).map(img => getMediaUrl(img)).filter(Boolean);
          const rawStatus = String(c.status || '').toLowerCase();
          
          let displayStatus = 'Pending';
          if (rawStatus === 'resolved' || rawStatus === 'closed') displayStatus = 'Resolved';
          else if (rawStatus === 'in_progress' || rawStatus === 'assigned') displayStatus = 'In Progress';

          return {
            id: c.complaintNumber || c._id,
            complaintNumber: c.complaintNumber || c.id,
            _id: c._id,
            title: c.title,
            category: c.category || 'General',
            area: c.area?.name || c.areaId?.name || 'Constituency',
            description: c.description,
            status: displayStatus,
            rawStatus: c.status,
            date: c.publishedAt || c.createdAt ? new Date(c.publishedAt || c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            images: resolvedImages,
            resolutionDetails: c.resolutionDetails || null,
            resolutionProof: resolutionProof,
            citizenInitial: c.citizenInitial || 'Verified Citizen',
            publicRemarks: c.publicRemarks || [],
            timeline: c.timeline || []
          };
        });
        setPublicComplaints(formatted);
      }
    } catch (err) {
      console.warn('Error fetching public complaints:', err);
    } finally {
      setIsLoadingPublic(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStageIndex = (status) => {
    if (status === 'Resolved') return 4;
    if (status === 'In Progress') return 3;
    if (status === 'Assigned') return 2;
    if (status === 'Under Review') return 1;
    return 0;
  };

  const handleReopen = (complaintId) => {
    const updated = myComplaints.map(c => {
      if (c.id === complaintId) {
        return { ...c, status: 'In Progress' };
      }
      return c;
    });
    setMyComplaints(updated);
    storage.setUser({ ...storage.getUser(), pwa_complaints: updated });
    toast.info(language === 'en' ? 'Complaint has been reopened for review!' : 'शिकायत पुनः समीक्षा हेतु खोल दी गई है!');
    setSelectedComplaint(prev => prev ? { ...prev, status: 'In Progress' } : null);
  };

  const handleRatingSubmit = () => {
    toast.success(language === 'en' ? `Thank you for rating ${rating} stars!` : `समीक्षा देने के लिए धन्यवाद (${rating} ⭐)!`);
    setShowFeedbackModal(false);
    setFeedback('');
  };

  const handleShare = (c) => {
    const shareText = `📢 ${c.complaintNumber || c.id} - ${c.title}\n📍 क्षेत्र: ${c.area}\n📌 स्थिति: ${c.status}\n✅ माननीय ${leaderName || 'जनप्रतिनिधि'} जी के नेतृत्व में त्वरित समाधान।`;
    shareContent({
      title: c.title,
      text: shareText,
      url: window.location.href
    });
  };

  // Active list filtering
  const currentMyList = activeStatusTab === 'All' 
    ? myComplaints 
    : myComplaints.filter(c => c.status === activeStatusTab);

  const currentPublicList = activePublicStatusTab === 'All'
    ? publicComplaints
    : publicComplaints.filter(c => c.status === activePublicStatusTab);

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* 🌟 Top Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
            {language === 'en' ? 'Jan Samasya / Complaints' : 'जन समस्या / शिकायतें'}
          </h1>
        </div>

        <button 
          onClick={() => navigate('/complaint')} 
          className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <HiPlus className="w-4 h-4 stroke-[2.5]" />
          <span>{language === 'en' ? 'New' : 'नई शिकायत'}</span>
        </button>
      </div>

      {/* 🌟 2 Main Tabs: My Complaints vs Public Complaints */}
      <div className="bg-white px-4 pt-2.5 pb-2 border-b border-gray-100 shrink-0 z-10">
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveMainTab('my')}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeMainTab === 'my'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>{language === 'en' ? 'My Complaints' : 'मेरी शिकायतें'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeMainTab === 'my' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {myComplaints.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('public')}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeMainTab === 'public'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>{language === 'en' ? 'Public Complaints' : 'सार्वजनिक शिकायतें'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeMainTab === 'public' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {publicComplaints.length}
            </span>
          </button>
        </div>
      </div>

      {/* 🌟 Sub Status Filter Pills */}
      <div className="bg-white px-4 py-2 border-b border-gray-100 shrink-0 z-10">
        <div 
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide py-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {(activeMainTab === 'my' ? myStatusTabs : publicStatusTabs).map(tab => {
            const list = activeMainTab === 'my' ? myComplaints : publicComplaints;
            const count = tab === 'All' ? list.length : list.filter(c => c.status === tab).length;
            const currentTab = activeMainTab === 'my' ? activeStatusTab : activePublicStatusTab;
            const isActive = currentTab === tab;

            return (
              <button 
                key={tab}
                ref={el => (tabRefs.current[tab] = el)}
                onClick={() => {
                  if (activeMainTab === 'my') setActiveStatusTab(tab);
                  else setActivePublicStatusTab(tab);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isActive 
                    ? 'text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200/80'
                }`}
                style={isActive ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌟 Main Content Container (Original UI Cards) */}
      <div className="flex-1 w-full overflow-y-auto p-4">
        
        {/* 1. MY COMPLAINTS LIST */}
        {activeMainTab === 'my' && (
          <div className="flex flex-col gap-3 pb-4">
            {isLoadingMy ? (
              <LoadingSpinner message={language === 'en' ? 'Loading complaints...' : 'शिकायतें लोड हो रही हैं...'} />
            ) : currentMyList.length > 0 ? (
              currentMyList.map(complaint => (
                <div 
                  key={complaint.id} 
                  onClick={() => setSelectedComplaint(complaint)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3.5 items-center relative active:scale-[0.98] transition-transform cursor-pointer hover:border-gray-300"
                >
                  <div 
                    className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border flex items-center justify-center relative shadow-xs"
                    style={{ 
                      backgroundColor: `${primaryColor}12`, 
                      borderColor: `${primaryColor}25` 
                    }}
                  >
                    {Array.isArray(complaint.images) && complaint.images.length > 0 && complaint.images[0] ? (
                      <img 
                        src={complaint.images[0]} 
                        alt={complaint.title} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <HiFolderOpen 
                        className="w-7 h-7" 
                        style={{ color: primaryColor }} 
                      />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[0.65rem] font-extrabold text-gray-400">{complaint.id}</span>
                      <span className="text-[0.65rem] font-semibold text-gray-400">{complaint.date}</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-gray-900 leading-tight truncate mb-1">{complaint.title}</h3>
                    <p className="text-[0.7rem] text-gray-500 line-clamp-1 mb-2">{complaint.description || complaint.category}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[0.65rem] font-extrabold uppercase tracking-wider border ${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </span>
                      <span className="text-[0.7rem] font-bold ml-auto flex items-center gap-1" style={{ color: primaryColor }}>
                        <span>View Timeline</span>
                        <HiArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-56 text-center p-6 bg-white rounded-2xl border border-gray-100 my-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <HiFolderOpen className="w-7 h-7" />
                </div>
                <p className="text-gray-800 font-extrabold text-sm">
                  {isUnauthorized 
                    ? (language === 'en' ? 'Login to View Your Complaints' : 'शिकायतें देखने के लिए लॉगिन करें') 
                    : (language === 'en' ? `No ${activeStatusTab !== 'All' ? activeStatusTab : ''} Complaints Found` : 'कोई शिकायत नहीं मिली')}
                </p>
                <p className="text-gray-400 font-semibold text-xs mt-0.5 max-w-xs mb-3">
                  {isUnauthorized 
                    ? (language === 'en' ? 'Please login with your mobile number to track registered complaints and status updates in real-time.' : 'रियल-टाइम स्थिति देखने हेतु कृपया मोबाइल नंबर से लॉगिन करें।')
                    : (language === 'en' ? 'Submit your issues or queries anytime' : 'अपनी समस्या कभी भी दर्ज करें')}
                </p>
                {isUnauthorized ? (
                  <button
                    onClick={() => navigate('/login')}
                    className="px-5 py-2 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {language === 'en' ? 'Login Now' : 'लॉगिन करें'}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/complaint')}
                    className="px-4 py-2 bg-gray-100 text-gray-800 font-extrabold text-xs rounded-xl active:scale-95 transition-all"
                  >
                    {language === 'en' ? 'File New Complaint' : 'नई शिकायत दर्ज करें'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. PUBLIC COMPLAINTS LIST */}
        {activeMainTab === 'public' && (
          <div className="flex flex-col gap-3 pb-4">
            {isLoadingPublic ? (
              <LoadingSpinner message={language === 'en' ? 'Loading public complaints...' : 'सार्वजनिक शिकायतें लोड हो रही हैं...'} />
            ) : currentPublicList.length > 0 ? (
              currentPublicList.map(complaint => (
                <div 
                  key={complaint.id} 
                  onClick={() => setSelectedComplaint(complaint)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2.5 relative active:scale-[0.99] transition-transform cursor-pointer hover:border-gray-300"
                >
                  <div className="flex gap-3.5 items-center">
                    <div 
                      className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border flex items-center justify-center relative shadow-xs"
                      style={{ 
                        backgroundColor: `${primaryColor}12`, 
                        borderColor: `${primaryColor}25` 
                      }}
                    >
                      {Array.isArray(complaint.images) && complaint.images.length > 0 && complaint.images[0] ? (
                        <img 
                          src={complaint.images[0]} 
                          alt={complaint.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <HiFolderOpen 
                          className="w-7 h-7" 
                          style={{ color: primaryColor }} 
                        />
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[0.65rem] font-extrabold text-gray-500">{complaint.citizenInitial}</span>
                        <span className="text-[0.65rem] font-semibold text-gray-400">{complaint.date}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-gray-900 leading-tight truncate mb-1">{complaint.title}</h3>
                      <p className="text-[0.7rem] text-gray-500 line-clamp-1 mb-1.5">{complaint.description}</p>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[0.62rem] font-extrabold uppercase tracking-wider border ${getStatusColor(complaint.status)}`}>
                          {complaint.status}
                        </span>
                        <span className="text-[0.65rem] text-gray-400 font-semibold truncate max-w-[120px]">
                          📍 {complaint.area}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Public Complaint Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleShare(complaint); }}
                      className="flex items-center gap-1 text-[0.7rem] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                    >
                      <FaWhatsapp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === 'en' ? 'Share Story' : 'शेयर करें'}</span>
                    </button>

                    <span className="text-[0.7rem] font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                      <span>View Details</span>
                      <HiArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-56 text-center p-6 bg-white rounded-2xl border border-gray-100 my-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <HiFolderOpen className="w-7 h-7" />
                </div>
                <p className="text-gray-800 font-extrabold text-sm">
                  {language === 'en' ? 'No Public Complaints in this Status' : 'इस श्रेणी में कोई सार्वजनिक शिकायत नहीं मिली'}
                </p>
                <p className="text-gray-400 font-semibold text-xs mt-0.5 max-w-xs">
                  {language === 'en' ? 'Select another status tab above.' : 'कृपया ऊपर दिए गए किसी अन्य टैब पर क्लिक करें।'}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 🌟 Floating Action Button */}
      <button
        onClick={() => navigate('/complaint')}
        className="fixed bottom-24 right-5 z-40 text-white px-4 py-3.5 rounded-full shadow-lg flex items-center gap-2 font-extrabold text-xs active:scale-95 transition-all"
        style={{ backgroundColor: primaryColor }}
      >
        <HiPlus className="w-4 h-4 stroke-[2.5]" />
        <span>{language === 'en' ? 'File Complaint' : 'शिकायत दर्ज करें'}</span>
      </button>

      {/* 🌟 Complaint Detail & Status Timeline Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[0.7rem] font-extrabold text-gray-400">{selectedComplaint.complaintNumber || selectedComplaint.id}</span>
                <h3 className="text-base font-extrabold text-gray-900 leading-snug truncate">{selectedComplaint.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)} 
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-5">
              
              {/* Image & Details */}
              <div 
                className="flex flex-col gap-3 border p-3.5 rounded-2xl"
                style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}
              >
                <div className="flex gap-3 items-center">
                  <div 
                    className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border bg-white flex items-center justify-center shadow-xs"
                    style={{ borderColor: `${primaryColor}30` }}
                  >
                    {Array.isArray(selectedComplaint.images) && selectedComplaint.images.length > 0 && selectedComplaint.images[0] ? (
                      <img 
                        src={selectedComplaint.images[0]} 
                        alt="Complaint" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <HiFolderOpen className="w-8 h-8" style={{ color: primaryColor }} />
                    )}
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="text-[0.7rem] font-bold" style={{ color: primaryColor }}>
                      Category: {selectedComplaint.category || 'General'}
                    </span>
                    <p className="text-xs font-semibold text-gray-700 mt-1 line-clamp-2">{selectedComplaint.description}</p>
                    <span className="text-[0.65rem] text-gray-400 mt-1">Area: {selectedComplaint.area || 'Constituency'}</span>
                  </div>
                </div>

                {/* Additional Attached Photos Carousel */}
                {Array.isArray(selectedComplaint.images) && selectedComplaint.images.length > 1 && (
                  <div className="pt-2 border-t border-gray-200/50">
                    <span className="text-[0.65rem] font-extrabold text-gray-500 mb-1.5 block">
                      Attached Evidence ({selectedComplaint.images.length})
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {selectedComplaint.images.map((imgUrl, i) => (
                        <a key={i} href={imgUrl} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-white block">
                          <img 
                            src={imgUrl} 
                            alt={`Proof ${i+1}`} 
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Timeline Stepper */}
              <div>
                <h4 className="text-sm font-extrabold text-gray-900 mb-4">
                  {language === 'en' ? 'Resolution Progress Timeline' : 'निस्तारण प्रगति विवरण'}
                </h4>
                <div className="flex flex-col gap-4 relative pl-3">
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200" />

                  {stages.map((stg, idx) => {
                    const currentStageIdx = getStageIndex(selectedComplaint.status);
                    const isPassed = idx <= currentStageIdx;
                    const isCurrent = idx === currentStageIdx;

                    return (
                      <div key={stg.key} className="flex items-start gap-3.5 relative z-10">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${isPassed ? 'text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}
                          style={isPassed ? { backgroundColor: primaryColor } : {}}
                        >
                          {isPassed ? <HiCheck className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className="flex flex-col pt-0.5">
                          <span 
                            className={`text-xs font-extrabold ${isPassed && !isCurrent ? 'text-gray-900' : !isPassed ? 'text-gray-400' : ''}`}
                            style={isCurrent ? { color: primaryColor } : {}}
                          >
                            {stg.label}
                          </span>
                          <span className="text-[0.7rem] font-semibold text-gray-500 leading-tight mt-0.5">
                            {stg.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resolution Proof Section if Resolved */}
              {selectedComplaint.status === 'Resolved' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-black">
                    <HiShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>{language === 'en' ? 'Resolution Verified' : 'समाधान सत्यापित'}</span>
                  </div>
                  {selectedComplaint.resolutionDetails && (
                    <p className="text-xs font-semibold text-emerald-950">{selectedComplaint.resolutionDetails}</p>
                  )}
                  {Array.isArray(selectedComplaint.resolutionProof) && selectedComplaint.resolutionProof.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {selectedComplaint.resolutionProof.map((proofImg, pIdx) => (
                        <img 
                          key={pIdx} 
                          src={proofImg} 
                          alt="Proof" 
                          className="w-16 h-16 rounded-xl object-cover border border-emerald-300"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Resolved vs Active */}
              <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                {selectedComplaint.status === 'Resolved' ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowFeedbackModal(true)}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <HiStar className="w-4 h-4" />
                      <span>Rate & Review</span>
                    </button>
                    <button 
                      onClick={() => handleReopen(selectedComplaint.id)}
                      className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 active:scale-95 transition-all"
                    >
                      Reopen Issue
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setSelectedComplaint(null)}
                    className="w-full py-3 bg-gray-100 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    Close
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🌟 Feedback & Rating Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-black text-gray-900 text-center">
              Rate Resolution Quality
            </h3>
            <p className="text-xs text-gray-500 text-center">
              How satisfied are you with the resolution of your complaint?
            </p>

            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                >
                  <HiStar className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>

            <textarea 
              rows="3" 
              placeholder="Write brief feedback (optional)..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 outline-none resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                className="flex-1 py-2.5 text-white rounded-xl text-xs font-black shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Nav */}
      <BottomNav />

    </div>
  );
}
