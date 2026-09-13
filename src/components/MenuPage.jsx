import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import UserAvatar from './UserAvatar';
import {
  HiArrowLeft,
  HiUser,
  HiBell,
  HiChartBar,
  HiFolderOpen,
  HiNewspaper,
  HiPhoto,
  HiVideoCamera,
  HiShieldCheck,
  HiDocumentText,
  HiIdentification,
  HiDocumentDuplicate,
  HiPaintBrush,
  HiMapPin,
  HiLanguage,
  HiChevronRight,
  HiCheckBadge,
  HiSparkles,
  HiArrowRightOnRectangle
} from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';

export default function MenuPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const { language, toggleLanguage, openLanguageModal, t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({
    name: 'Guest User',
    mobile: '',
    district: '',
    assembly: '',
  });

  useEffect(() => {
    const token = storage.getToken();
    const localUser = storage.getUser();
    if (token && localUser) {
      setIsLoggedIn(true);
      setUser(localUser);

      // Sync fresh profile in background
      api.getCitizenProfile().then((res) => {
        if (res?.profile) {
          const updated = {
            ...localUser,
            ...res.profile,
            photo: res.profile.profilePhoto || res.profile.photo || localUser?.photo,
            profilePhoto: res.profile.profilePhoto || res.profile.photo || localUser?.profilePhoto,
          };
          setUser(updated);
          storage.setUser(updated);
        }
      }).catch(() => null);
    } else {
      setIsLoggedIn(false);
      setUser({ name: 'Guest User', mobile: '', district: '', assembly: '' });
    }

    const handleProfileUpdate = (e) => {
      const updatedUser = e?.detail || storage.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    };

    window.addEventListener('pwa_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('pwa_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const handleLogout = () => {
    storage.clear();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  const menuSections = [
    {
      title: t('profileAndIdentity'),
      items: [
        {
          id: 'profile',
          title: t('myProfile'),
          subtitle: t('viewMemberIdDesc'),
          path: '/my-profile',
          bgColor: 'bg-orange-50',
          icon: <HiUser className="w-5 h-5 text-[#f37920]" />
        },
        {
          id: 'membership',
          title: t('partyMembership'),
          subtitle: t('digitalCardDesc'),
          path: '/membership',
          bgColor: 'bg-blue-50',
          icon: <HiIdentification className="w-5 h-5 text-blue-600" />
        }
      ]
    },
    {
      title: t('citizenServices'),
      items: [
        {
          id: 'area',
          title: t('myAreaAndDev'),
          subtitle: t('trackAreaDesc'),
          path: '/my-area',
          bgColor: 'bg-emerald-50',
          icon: <HiMapPin className="w-5 h-5 text-emerald-600" />
        },
        {
          id: 'my-complaints',
          title: t('janSamasyaComplaints'),
          subtitle: t('trackComplaintsDesc'),
          path: '/my-complaints',
          bgColor: 'bg-amber-50',
          icon: <HiFolderOpen className="w-5 h-5 text-amber-600" />
        },
        {
          id: 'polls',
          title: t('publicPolls'),
          subtitle: t('votePollsDesc'),
          path: '/polls',
          bgColor: 'bg-purple-50',
          icon: <HiChartBar className="w-5 h-5 text-purple-600" />
        },
        {
          id: 'manifesto',
          title: t('manifesto'),
          subtitle: t('manifestoDesc'),
          path: '/manifesto',
          bgColor: 'bg-rose-50',
          icon: <HiDocumentDuplicate className="w-5 h-5 text-rose-600" />
        }
      ]
    },
    {
      title: t('mediaAndUpdates'),
      items: [
        {
          id: 'latest',
          title: t('latestUpdates'),
          subtitle: t('latestUpdatesDesc'),
          path: '/latest-updates',
          bgColor: 'bg-teal-50',
          icon: <HiNewspaper className="w-5 h-5 text-teal-600" />
        },
        {
          id: 'photo',
          title: t('photoGallery'),
          subtitle: t('photoGalleryDesc'),
          path: '/photo-gallery',
          bgColor: 'bg-pink-50',
          icon: <HiPhoto className="w-5 h-5 text-pink-600" />
        },
        {
          id: 'poster',
          title: t('posterStudio'),
          subtitle: t('posterStudioDesc'),
          path: '/poster-generator',
          bgColor: 'bg-amber-50',
          icon: <HiPaintBrush className="w-5 h-5 text-amber-600" />
        },
        {
          id: 'video',
          title: t('videoGallery'),
          subtitle: t('videoGalleryDesc'),
          path: '/video-gallery',
          bgColor: 'bg-violet-50',
          icon: <HiVideoCamera className="w-5 h-5 text-violet-600" />
        }
      ]
    },
    {
      title: t('preferencesAndLegal'),
      items: [
        {
          id: 'notifications',
          title: t('notificationsAndAlerts'),
          subtitle: t('manageAlertsDesc'),
          path: '/notifications',
          bgColor: 'bg-slate-100',
          icon: <HiBell className="w-5 h-5 text-slate-700" />
        },
        {
          id: 'privacy',
          title: t('privacyPolicy'),
          subtitle: t('privacyDesc'),
          path: '/privacy-policy',
          bgColor: 'bg-slate-100',
          icon: <HiShieldCheck className="w-5 h-5 text-slate-700" />
        },
        {
          id: 'terms',
          title: t('termsConditions'),
          subtitle: t('termsDesc'),
          path: '/terms-conditions',
          bgColor: 'bg-slate-100',
          icon: <HiDocumentText className="w-5 h-5 text-slate-700" />
        }
      ]
    }
  ];

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">

      {/* Top Header - Tenant Themed Sticky (Matches Profile Header) */}
      <div
        className="shrink-0 px-4 py-3 relative overflow-hidden z-30 shadow-xs"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})` }}
      >
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white shrink-0"
              title="Back"
            >
              <HiArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-base font-black text-white tracking-tight truncate">
              {t('menuAndServices')}
            </h1>
          </div>

          <button
            onClick={openLanguageModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-black backdrop-blur-xs active:scale-95 transition-all shrink-0"
          >
            <HiLanguage className="w-4 h-4" />
            <span>{language === 'hi' ? 'हिंदी' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full p-4">

        {/* User Card (Matches Profile Card) */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-2xl border-2 p-0.5 shrink-0 overflow-hidden bg-transparent shadow-xs"
              style={{ borderColor: primaryColor }}
            >
              <UserAvatar
                src={user?.profilePhoto || user?.photo}
                name={user?.name}
                className="w-full h-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm text-gray-900 truncate">
                  {user.name}
                </h3>
                {isLoggedIn && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                    <HiCheckBadge className="w-3 h-3 text-green-600" />
                    <span>Citizen</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-semibold truncate mt-0.5">
                {user.mobile ? `+91 ${user.mobile}` : (isLoggedIn ? 'Verified Profile' : t('guestUser'))}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-gray-500 truncate">
                <HiMapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>
                  {user.assembly || user.district || 'Constituency Resident'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Access CTAs */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-gray-400">
                {isLoggedIn ? '360° Citizen Profile' : 'Access Services'}
              </div>
              <div>
                {isLoggedIn ? (
                  <button
                    onClick={() => navigate('/my-profile')}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1 active:scale-95 transition-transform"
                    style={{
                      borderColor: `${primaryColor}40`,
                      color: primaryColor,
                      backgroundColor: `${primaryColor}08`
                    }}
                  >
                    <span>{t('myProfile')}</span>
                    <HiChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/login')}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl text-white shadow-xs active:scale-95 transition-transform flex items-center gap-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>{t('loginNow')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Menu Sections List */}
        <div className="flex flex-col gap-5 pb-6">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 px-1">
                {section.title}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={item.id}
                    onClick={() => item.path && navigate(item.path)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer active:bg-gray-50 transition-colors ${itemIdx !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center shrink-0`}>
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-900">{item.title}</h4>
                        {item.subtitle && (
                          <p className="text-[0.65rem] font-semibold text-gray-400 mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <HiChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Logout Action if Logged In */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-black shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <HiArrowRightOnRectangle className="w-4 h-4 stroke-[2.5]" />
              <span>{t('signOut')}</span>
            </button>
          )}

          {/* App Version Info */}
          <div className="text-center pt-2">
            <p className="text-xs font-extrabold text-gray-400">Jansampark Portal PWA</p>
            <p className="text-[0.65rem] font-semibold text-gray-400 mt-0.5">Version 2.4.0 • Official Public Portal</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

