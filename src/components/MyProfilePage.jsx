import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import UserAvatar from './UserAvatar';
import {
  HiArrowLeft,
  HiUser,
  HiMapPin,
  HiPencilSquare,
  HiIdentification,
  HiHandRaised,
  HiBell,
  HiShieldCheck,
  HiDocumentText,
  HiArrowRightOnRectangle,
  HiChevronRight,
  HiCheckBadge,
  HiSparkles,
  HiFolderOpen,
  HiCalendarDays,
  HiChartBar,
  HiCamera,
  HiXMark,
  HiCheck,
  HiArrowPath,
  HiEnvelope,
  HiPhone,
  HiLanguage
} from 'react-icons/hi2';
import { toast } from 'react-toastify';

export default function MyProfilePage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const { language, openLanguageModal, t } = useLanguage();
  const [profileData, setProfileData] = useState(null);
  const [areaBreadcrumbs, setAreaBreadcrumbs] = useState('');
  const [user, setUser] = useState({
    name: 'Citizen',
    mobile: '',
    district: '',
    assembly: '',
    profilePhoto: null,
    email: '',
    gender: '',
    dob: '',
    address: '',
    areaId: '',
  });

  const [stats, setStats] = useState({
    complaints: 0,
    events: 0,
    polls: 0
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    gender: 'male',
    dob: '',
    address: '',
  });

  // Photo Adjust / Crop Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedRawImage, setSelectedRawImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    // Initial load from local storage
    const token = storage.getToken();
    const localUser = storage.getUser();
    if (token && localUser) {
      setIsLoggedIn(true);
      setUser(localUser);
    } else {
      setIsLoggedIn(false);
      setUser({ name: 'Guest User', mobile: '', district: '', assembly: '' });
    }

    // Fetch live citizen profile from backend only if token exists
    const loadCitizenProfile = async () => {
      if (!token) return;
      try {
        const liveProfile = await api.getCitizenProfile().catch(() => null);
        if (liveProfile?.profile) {
          const p = liveProfile.profile;
          setProfileData(liveProfile);
          if (liveProfile.area?.breadcrumbText) {
            setAreaBreadcrumbs(liveProfile.area.breadcrumbText);
          }
          const updated = {
            ...(localUser || {}),
            ...p,
            photo: p.profilePhoto || p.photo || localUser?.photo,
            profilePhoto: p.profilePhoto || p.photo || localUser?.profilePhoto,
            assembly: liveProfile.area?.primaryArea?.name || liveProfile.area?.breadcrumbText || localUser?.assembly || '',
          };
          setUser(updated);
          storage.setUser(updated);

          if (liveProfile.activity) {
            setStats({
              complaints: liveProfile.activity.complaints?.total || 0,
              events: liveProfile.activity.eventRegistrations?.total || 0,
              polls: liveProfile.activity.pollParticipation?.total || 0,
            });
          }
        } else if (localUser?._id) {
          const u = await api.getUserById(localUser._id).catch(() => null);
          if (u) {
            const updated = {
              ...localUser,
              ...u,
              photo: u.profilePhoto || u.photo || localUser.photo,
              profilePhoto: u.profilePhoto || u.photo || localUser.profilePhoto,
              assembly: u.areaId?.name || localUser.assembly || ''
            };
            setUser(updated);
            storage.setUser(updated);
          }
        }
      } catch (err) {
        console.warn('Profile load info:', err);
      }
    };

    if (token) {
      loadCitizenProfile();
    }
  }, []);

  const openEditProfileModal = () => {
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      gender: (user.gender || 'male').toLowerCase().includes('female') ? 'female' : 'male',
      dob: user.dob ? user.dob.split('T')[0] : '',
      address: user.address || '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfileDetails = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email ? editForm.email.trim() : undefined,
        gender: editForm.gender,
        dob: editForm.dob || undefined,
        address: editForm.address ? editForm.address.trim() : undefined,
      };

      const res = await api.updateCitizenProfile(payload);
      const updatedProfile = res?.profile || res?.data?.profile || payload;
      const updatedUser = {
        ...user,
        ...updatedProfile,
      };

      setUser(updatedUser);
      storage.setUser(updatedUser);

      window.dispatchEvent(new CustomEvent('pwa_profile_updated', { detail: updatedUser }));
      window.dispatchEvent(new Event('storage'));

      toast.success('Profile updated successfully!');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const menuSections = [
    {
      title: t('engagementAndMembership'),
      items: [
        {
          id: 'membership',
          path: '/membership',
          icon: <HiIdentification className="w-5 h-5" style={{ color: primaryColor }} />,
          bg: 'bg-orange-50',
          title: t('membershipCard'),
          subtitle: user?.membership?.membershipNumber
            ? `ID: ${user.membership.membershipNumber} (${user.membership.status || 'Active'})`
            : t('digitalCardDesc')
        },
        {
          id: 'area',
          path: '/my-area',
          icon: <HiMapPin className="w-5 h-5 text-emerald-600" />,
          bg: 'bg-emerald-50',
          title: t('myAreaAndDev'),
          subtitle: user.assembly || user.district || t('trackAreaDesc')
        }
      ]
    },
    {
      title: t('activityAndServices'),
      items: [
        {
          id: 'complaints',
          path: '/my-complaints',
          icon: <HiFolderOpen className="w-5 h-5 text-amber-600" />,
          bg: 'bg-amber-50',
          title: t('janSamasyaComplaints'),
          subtitle: `${stats.complaints} ${t('grievancesFiled')}`
        },
        {
          id: 'events',
          path: '/events',
          icon: <HiCalendarDays className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50',
          title: t('upcomingEvents'),
          subtitle: `${stats.events} ${t('eventsRegistered')}`
        },
        {
          id: 'polls',
          path: '/polls',
          icon: <HiChartBar className="w-5 h-5 text-purple-600" />,
          bg: 'bg-purple-50',
          title: t('publicOpinionPolls'),
          subtitle: `${stats.polls} ${t('pollsVoted')}`
        }
      ]
    },
    {
      title: t('accountSettings'),
      items: [
        {
          id: 'language',
          action: openLanguageModal,
          icon: <HiLanguage className="w-5 h-5 text-indigo-600" />,
          bg: 'bg-indigo-50',
          title: t('appLanguage'),
          subtitle: t('currentLanguage')
        },
        {
          id: 'edit',
          path: '/register',
          icon: <HiPencilSquare className="w-5 h-5 text-slate-700" />,
          bg: 'bg-slate-100',
          title: t('editAreaAndProfile'),
          subtitle: t('editAreaDesc')
        },
        {
          id: 'notifications',
          path: '/notifications',
          icon: <HiBell className="w-5 h-5 text-slate-700" />,
          bg: 'bg-slate-100',
          title: t('notificationsAndAlerts'),
          subtitle: t('manageAlertsDesc')
        },
        {
          id: 'privacy',
          path: '/privacy-policy',
          icon: <HiShieldCheck className="w-5 h-5 text-slate-700" />,
          bg: 'bg-slate-100',
          title: t('privacyPolicy'),
          subtitle: t('privacyDesc')
        },
        {
          id: 'terms',
          path: '/terms-conditions',
          icon: <HiDocumentText className="w-5 h-5 text-slate-700" />,
          bg: 'bg-slate-100',
          title: t('termsConditions'),
          subtitle: t('termsDesc')
        }
      ]
    }
  ];

  const handleLogout = () => {
    storage.clear();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  // ── Photo Upload & Adjust Logic ──────────────────────────────────────────
  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedRawImage(reader.result);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      setShowAdjustModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Drag handlers for pan/adjust
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panPosition.x,
        y: e.touches[0].clientY - panPosition.y,
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Generate cropped base64 from canvas & save
  const handleSaveAdjustedPhoto = async () => {
    if (!selectedRawImage) return;
    setUploadingPhoto(true);

    try {
      // Create high-res 400x400 avatar canvas
      const canvas = document.createElement('canvas');
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = selectedRawImage;
      });

      // Clear & fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Compute transform
      const scale = zoomLevel;
      const aspect = img.width / img.height;
      let drawW, drawH;
      if (aspect >= 1) {
        drawH = size * scale;
        drawW = size * aspect * scale;
      } else {
        drawW = size * scale;
        drawH = (size / aspect) * scale;
      }

      // Offset
      const drawX = (size - drawW) / 2 + (panPosition.x * (size / 240));
      const drawY = (size - drawH) / 2 + (panPosition.y * (size / 240));

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      const base64Photo = canvas.toDataURL('image/jpeg', 0.88);

      // Save to backend safe citizen profile endpoint
      let uploadedUrl = base64Photo;
      try {
        // Also try multipart upload to save as static file if server accepts it
        const blob = await (await fetch(base64Photo)).blob();
        const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const upRes = await api.uploadFile(file, 'citizens').catch(() => null);
        if (upRes?.urls?.[0]) {
          uploadedUrl = upRes.urls[0];
        }
      } catch { }

      // Update citizen profile in backend
      await api.updateCitizenProfile({ profilePhoto: uploadedUrl });

      // Update local storage and current state
      const updatedUser = {
        ...user,
        photo: uploadedUrl,
        profilePhoto: uploadedUrl,
      };
      setUser(updatedUser);
      storage.setUser(updatedUser);

      // Dispatch global event so HomePage, MenuPage, MembershipPage immediately reflect the new photo
      window.dispatchEvent(new CustomEvent('pwa_profile_updated', { detail: updatedUser }));
      window.dispatchEvent(new Event('storage'));

      toast.success('Profile photo updated successfully!');
      setShowAdjustModal(false);
      setSelectedRawImage(null);
    } catch (err) {
      console.error('Error saving photo:', err);
      toast.error(err?.message || 'Failed to update photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelectFile}
      />

      {/* Top Header - Tenant Themed Sticky */}
      <div
        className="shrink-0 px-4 py-3 relative overflow-hidden z-30 shadow-xs"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})` }}
      >
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white shrink-0"
            >
              <HiArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-base font-black text-white tracking-tight truncate">
              My Profile
            </h1>
          </div>
          <button
            onClick={openEditProfileModal}
            className="text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-xl backdrop-blur-xs active:scale-95 transition-all shrink-0 flex items-center gap-1"
          >
            <HiPencilSquare className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 relative z-10">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-3.5">
            {/* Avatar Circle with Camera Upload Overlay */}
            <div className="relative shrink-0">
              <div
                className="w-16 h-16 rounded-2xl border-2 p-0.5 shrink-0 overflow-hidden bg-transparent shadow-xs"
                style={{ borderColor: primaryColor }}
              >
                <UserAvatar
                  src={user?.profilePhoto || user?.photo}
                  name={user?.name}
                  className="w-full h-full"
                  iconClassName="w-8 h-8"
                  roundedClassName="rounded-xl"
                />
              </div>

              {/* Camera Button */}
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    toast.info('Please log in to update your profile photo');
                    navigate('/login');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer border border-white"
                style={{ backgroundColor: primaryColor }}
                title="Change / Upload Photo"
              >
                <HiCamera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h2 className="text-base font-black text-gray-900 truncate">
                  {isLoggedIn ? (user.name || 'Citizen User') : 'Guest User'}
                </h2>
                {isLoggedIn && user.isProfileComplete && <HiCheckBadge className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />}
              </div>
              {isLoggedIn && user.mobile ? (
                <p className="text-xs text-gray-500 font-semibold mb-1.5">+91 {user.mobile}</p>
              ) : (
                <p className="text-xs text-gray-400 font-medium mb-1.5">Login to access profile services</p>
              )}

              <div className="flex items-center gap-1.5 flex-wrap">
                {isLoggedIn ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.65rem] font-extrabold border"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                      borderColor: `${primaryColor}30`
                    }}
                  >
                    <HiSparkles className="w-3 h-3" />
                    <span>Verified Citizen</span>
                  </span>
                ) : (
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.7rem] font-black text-white shadow-xs active:scale-95 transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>Login / Register</span>
                  </button>
                )}
                {user.assembly && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-gray-100 text-gray-600 truncate max-w-[180px]">
                    {user.assembly}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Activity Counters Row */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
            <div
              onClick={() => navigate('/my-complaints')}
              className="rounded-2xl p-2 cursor-pointer active:scale-95 transition-all border"
              style={{ backgroundColor: `${primaryColor}0D`, borderColor: `${primaryColor}20` }}
            >
              <p className="text-base font-black" style={{ color: primaryColor }}>{stats.complaints}</p>
              <p className="text-[0.65rem] text-gray-600 font-bold">Complaints</p>
            </div>
            <div
              onClick={() => navigate('/events')}
              className="bg-blue-50/50 border border-blue-100 rounded-2xl p-2 cursor-pointer hover:bg-blue-50 active:scale-95 transition-all"
            >
              <p className="text-base font-black text-blue-600">{stats.events}</p>
              <p className="text-[0.65rem] text-gray-600 font-bold">Events RSVP</p>
            </div>
            <div
              onClick={() => navigate('/polls')}
              className="bg-purple-50/50 border border-purple-100 rounded-2xl p-2 cursor-pointer hover:bg-purple-50 active:scale-95 transition-all"
            >
              <p className="text-base font-black text-purple-600">{stats.polls}</p>
              <p className="text-[0.65rem] text-gray-600 font-bold">Polls Voted</p>
            </div>
          </div>
        </div>

        {/* ── Personal Details Section ── */}
        {isLoggedIn && (
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <HiUser className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">{t('personalInfo')}</h3>
                  <p className="text-[0.65rem] text-gray-400 font-medium">{t('personalInfoDesc')}</p>
                </div>
              </div>
              <button
                onClick={openEditProfileModal}
                className="text-xs font-extrabold px-3 py-1 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all flex items-center gap-1"
              >
                <HiPencilSquare className="w-3.5 h-3.5" />
                <span>{t('edit')}</span>
              </button>
            </div>

            <div className="divide-y divide-gray-50 pt-1 text-xs">
              {/* Full Name */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400 font-semibold">{t('fullName')}</span>
                <span className="font-bold text-gray-800">{user.name || t('notProvided')}</span>
              </div>

              {/* Mobile */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400 font-semibold">{t('mobile')}</span>
                <span className="font-bold text-gray-800 font-mono">+91 {user.mobile || '—'}</span>
              </div>

              {/* Email */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400 font-semibold">{t('email')}</span>
                <span className="font-bold text-gray-800 truncate max-w-[200px]">{user.email || t('notAdded')}</span>
              </div>

              {/* Gender */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400 font-semibold">{t('gender')}</span>
                <span className="font-bold text-gray-800 capitalize">
                  {user.gender ? (user.gender.toLowerCase().includes('female') ? t('female') : t('male')) : t('notProvided')}
                </span>
              </div>

              {/* DOB */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-400 font-semibold">{t('dob')}</span>
                <span className="font-bold text-gray-800">
                  {user.dob ? new Date(user.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : t('notAdded')}
                </span>
              </div>

              {/* Area Hierarchy */}
              <div className="py-2.5 flex flex-col gap-1">
                <span className="text-gray-400 font-semibold">{t('areaInfo')}</span>
                <span className="font-bold text-gray-800 text-[0.72rem] leading-snug">
                  {areaBreadcrumbs || user.assembly || 'General Area'}
                </span>
              </div>

              {/* Address */}
              <div className="py-2.5 flex flex-col gap-1">
                <span className="text-gray-400 font-semibold">{t('address')}</span>
                <span className="font-medium text-gray-700 text-[0.72rem] leading-snug">
                  {user.address || t('notAdded')}
                </span>
              </div>
            </div>
          </div>
        )}


        {/* Menu Sections List */}
        <div className="flex flex-col gap-4 pb-4">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 px-1">{section.title}</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (typeof item.action === 'function') {
                        item.action();
                      } else if (item.path) {
                        navigate(item.path);
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 cursor-pointer active:bg-gray-50 transition-colors ${itemIdx !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-900">{item.title}</h4>
                        <p className="text-[0.65rem] font-semibold text-gray-400 mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                    <HiChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Logout Action */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-black shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 mb-6"
            >
              <HiArrowRightOnRectangle className="w-4 h-4 stroke-[2.5]" />
              <span>Sign Out / Log Out</span>
            </button>
          )}
        </div>

      </div>

      {/* ── Photo Adjust / Crop Modal ── */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-100">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">Adjust Photo</h3>
                <p className="text-xs text-gray-400 font-medium">Drag to reposition & zoom</p>
              </div>
              <button
                onClick={() => {
                  setShowAdjustModal(false);
                  setSelectedRawImage(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Circular Crop Viewport */}
            <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden py-8 select-none">
              {/* Target Circular Area Mask */}
              <div
                className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-white shadow-2xl cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {selectedRawImage && (
                  <img
                    src={selectedRawImage}
                    alt="Crop preview"
                    draggable={false}
                    className="max-w-none absolute pointer-events-none origin-center"
                    style={{
                      transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                )}
                {/* Visual grid guide */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div></div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-5 flex flex-col gap-4 bg-white">
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                  <span>Zoom</span>
                  <span>{Math.round(zoomLevel * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-full accent-orange-600 cursor-pointer"
                  style={{ accentColor: primaryColor }}
                />
              </div>

              {/* Reset button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                >
                  <HiArrowPath className="w-3.5 h-3.5" />
                  <span>Reset Position</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedRawImage(null);
                  }}
                  disabled={uploadingPhoto}
                  className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdjustedPhoto}
                  disabled={uploadingPhoto}
                  className="w-full py-3 rounded-2xl text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  {uploadingPhoto ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <HiCheck className="w-4 h-4 stroke-[2.5]" />
                      <span>Set as Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-100 max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">Edit Profile</h3>
                <p className="text-xs text-gray-400 font-medium">Update your personal information</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProfileDetails} className="overflow-y-auto p-5 space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Full Name / पूरा नाम *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Email Address (Optional)</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Gender / लिंग *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['male', 'female', 'other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, gender: g }))}
                      className={`py-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                        editForm.gender === g
                          ? 'text-white shadow-xs'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                      style={editForm.gender === g ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Date of Birth / जन्म तिथि</label>
                <input
                  type="date"
                  value={editForm.dob}
                  onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Residential Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Address / पूरा पता</label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="House no, Ward / Village, Town"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingProfile}
                  className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-3 rounded-2xl text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
                  style={{ backgroundColor: primaryColor }}
                >
                  {savingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <HiCheck className="w-4 h-4 stroke-[2.5]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
