import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiArrowLeft, 
  HiUser, 
  HiPhone, 
  HiEnvelope, 
  HiMapPin, 
  HiCheckCircle,
  HiBriefcase,
  HiGlobeAlt
} from 'react-icons/hi2';
import { 
  FaFacebookF, 
  FaXTwitter, 
  FaInstagram, 
  FaWhatsapp, 
  FaYoutube 
} from 'react-icons/fa6';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { getMediaUrl } from '../utils/mediaUrl';

export default function AboutPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { primaryColor, secondaryColor, tenantConfig: contextTenantConfig } = useTenant();
  const [activeTab, setActiveTab] = useState('Overview');
  const [leader, setLeader] = useState(null);
  const [tenantConfig, setTenantConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const currentSlug = api.getTenantSlug();
    if (!currentSlug) {
      setIsLoading(false);
      return;
    }

    const fetchLeader = async () => {
      try {
        setIsLoading(true);
        const [leaderRes, configRes] = await Promise.all([
          api.getAboutLeader().catch(() => null),
          api.getConfig().catch(() => null)
        ]);

        if (leaderRes) setLeader(leaderRes);
        if (configRes) setTenantConfig(configRes);
      } catch (err) {
        console.warn('Error fetching leader bio:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeader();
  }, []);

  const config = tenantConfig || contextTenantConfig;
  
  // Dynamic fields from GET /about-leader with fallback to Tenant Config branding
  const leaderName = leader?.fullName || leader?.name || config?.branding?.leaderName || 'जन प्रतिनिधि';
  const designation = leader?.designation || config?.branding?.tagline || 'Leader / Public Representative';
  const party = leader?.party || config?.tenant?.name || '';
  const constituency = leader?.constituency || config?.tenant?.constituency || '';
  const bio = leader?.bio || config?.branding?.tagline || 'समर्पित जन सेवा, सर्वांगीण विकास और जन-कल्याण हमारा मुख्य उद्देश्य है।';
  const message = leader?.message || '';
  const achievements = Array.isArray(leader?.achievements) ? leader.achievements : [];
  const timeline = Array.isArray(leader?.timeline) ? leader.timeline : [];
  const rawContactInfo = leader?.contactInfo || {};
  const contactInfo = {
    phone: (rawContactInfo.phone || rawContactInfo.mobile || config?.branding?.contactNumber || config?.tenant?.mobileNumber || '').trim(),
    email: (rawContactInfo.email || config?.branding?.contactEmail || config?.tenant?.email || '').trim(),
    address: (rawContactInfo.address || config?.branding?.officeAddress || config?.tenant?.billingAddress || '').trim(),
    officeAddress: (rawContactInfo.officeAddress || rawContactInfo.address || '').trim(),
  };

  const rawSocialLinks = leader?.socialLinks || {};
  const socialLinks = {
    facebook: (rawSocialLinks.facebook || config?.branding?.socialLinks?.facebook || '').trim(),
    twitter: (rawSocialLinks.twitter || rawSocialLinks.x || config?.branding?.socialLinks?.twitter || '').trim(),
    instagram: (rawSocialLinks.instagram || config?.branding?.socialLinks?.instagram || '').trim(),
    whatsapp: (rawSocialLinks.whatsapp || config?.branding?.socialLinks?.whatsapp || '').trim(),
    youtube: (rawSocialLinks.youtube || config?.branding?.socialLinks?.youtube || '').trim(),
    website: (rawSocialLinks.website || config?.branding?.socialLinks?.website || '').trim(),
  };

  // Dynamic media URL resolution
  const [activeImgUrl, setActiveImgUrl] = useState(null);

  useEffect(() => {
    const raw = leader?.coverImageUrl || leader?.profileImageUrl || config?.branding?.leaderPhotoUrl;
    if (raw) {
      setActiveImgUrl(getMediaUrl(raw));
    } else {
      setActiveImgUrl(null);
    }
  }, [leader, config]);

  const handleImgError = () => {
    if (leader?.profileImageUrl && activeImgUrl !== getMediaUrl(leader.profileImageUrl)) {
      // Try profile image if cover image failed
      setActiveImgUrl(getMediaUrl(leader.profileImageUrl));
    } else if (config?.branding?.leaderPhotoUrl && activeImgUrl !== getMediaUrl(config.branding.leaderPhotoUrl)) {
      // Try branding photo if available
      setActiveImgUrl(getMediaUrl(config.branding.leaderPhotoUrl));
    } else {
      // Fallback to avatar
      setActiveImgUrl(null);
    }
  };

  const hasContactInfo = Boolean(contactInfo.phone || contactInfo.email || contactInfo.officeAddress || contactInfo.address);
  const hasSocialLinks = Boolean(
    socialLinks.facebook ||
    socialLinks.twitter ||
    socialLinks.instagram ||
    socialLinks.whatsapp ||
    socialLinks.youtube ||
    socialLinks.website
  );

  return (
    <div className="relative w-full h-screen flex flex-col bg-white overflow-hidden pb-[72px]">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
            {t('aboutLeader')} {leaderName}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message={t('loading')} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        
          {/* Leader Photo / Banner Section */}
          <div className="bg-white p-4 pb-0 flex flex-col items-center">
            <div className="relative w-full aspect-[16/10] sm:aspect-[2/1] bg-slate-100 rounded-3xl overflow-hidden shadow-xs border border-gray-100 flex items-center justify-center">
              {activeImgUrl ? (
                <img 
                  src={activeImgUrl} 
                  alt={leaderName} 
                  className="w-full h-full object-cover object-top" 
                  onError={handleImgError}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  >
                    <HiUser className="w-14 h-14 opacity-80" />
                  </div>
                </div>
              )}
            </div>

            {/* Clean Leader Identity Details (Below Image, No Text on Top of Picture) */}
            <div className="w-full mt-4 text-center px-2">
              <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                <span 
                  className="text-white text-[0.7rem] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  {designation}
                </span>
                {party && (
                  <span className="bg-slate-100 text-slate-700 text-[0.7rem] font-bold px-3 py-1 rounded-full border border-slate-200">
                    {party}
                  </span>
                )}
                {constituency && (
                  <span className="bg-slate-100 text-slate-700 text-[0.7rem] font-bold px-3 py-1 rounded-full border border-slate-200">
                    {constituency}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-[#0f172a] leading-tight">{leaderName}</h2>
            </div>
          </div>

          <div className="px-5 py-5">
            
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 mb-6 rounded-xl">
              {[
                { id: 'Overview', label: t('overview') },
                { id: 'Journey', label: t('journey') },
                { id: 'Contact', label: 'संपर्क / Social' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 text-xs sm:text-sm font-bold py-2 rounded-lg transition-all ${activeTab === tab.id ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                  style={activeTab === tab.id ? { backgroundColor: primaryColor } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content: Overview */}
            {activeTab === 'Overview' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{leaderName}</h2>
                  {constituency && (
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {constituency}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-gray-500 mb-4">{designation} {party ? `• ${party}` : ''}</p>

                {/* Leader Bio */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
                  <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">परिचय / Bio</h3>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-line">
                    {bio}
                  </p>
                </div>

                {/* Message / Sandesh */}
                {message && (
                  <div 
                    className="rounded-2xl p-5 border mb-6 relative overflow-hidden"
                    style={{ backgroundColor: `${primaryColor}0d`, borderColor: `${primaryColor}25` }}
                  >
                    <span 
                      className="text-[0.65rem] font-black uppercase tracking-widest block mb-2"
                      style={{ color: primaryColor }}
                    >
                      संदेश / Leader's Message
                    </span>
                    <p 
                      className="relative z-10 text-sm font-bold italic leading-relaxed"
                      style={{ color: '#1e293b' }}
                    >
                      "{message}"
                    </p>
                  </div>
                )}

                {/* Dynamic Achievements */}
                {achievements.length > 0 && (
                  <div className="space-y-3 pb-6">
                    <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                      <HiBriefcase className="w-4 h-4" style={{ color: primaryColor }} />
                      {t('keyAchievements')}
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      {achievements.map((item, i) => (
                        <div key={i} className="flex gap-3 items-start bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                          >
                            <HiCheckCircle className="w-4 h-4" />
                          </div>
                          <p className="text-xs text-gray-800 font-semibold leading-relaxed flex-1">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Journey / Timeline */}
            {activeTab === 'Journey' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight mb-1">{t('politicalJourney')}</h2>
                <p className="text-xs text-gray-500 font-semibold mb-6">{t('milestonesSubtitle')}</p>

                {timeline.length > 0 ? (
                  <div className="flex flex-col gap-5 relative pl-3">
                    <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-200"></div>

                    {timeline.map((item, i) => (
                      <div key={item._id || i} className="flex items-start gap-3.5 relative z-10">
                        <div 
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-black shrink-0 shadow-md"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {i + 1}
                        </div>
                        <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-4 flex-1">
                          {item.year && (
                            <span 
                              className="text-[0.65rem] font-extrabold px-2.5 py-0.5 rounded-full inline-block"
                              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                            >
                              {item.year}
                            </span>
                          )}
                          <h4 className="text-sm font-extrabold text-gray-900 mt-1">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs font-semibold text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400 font-semibold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    सफरनामा / Timeline जल्द ही अपडेट किया जाएगा।
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Contact & Social Links */}
            {activeTab === 'Contact' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                
                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-3">संपर्क सूत्र / Contact Information</h3>
                  {hasContactInfo ? (
                    <div className="flex flex-col gap-2.5">
                      {contactInfo.phone && (
                        <a 
                          href={`tel:${contactInfo.phone}`}
                          className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-9 h-9 rounded-xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <HiPhone className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-gray-400 block uppercase">फोन / मोबाइल</span>
                            <span className="text-xs font-extrabold text-gray-900">{contactInfo.phone}</span>
                          </div>
                        </a>
                      )}

                      {contactInfo.email && (
                        <a 
                          href={`mailto:${contactInfo.email}`}
                          className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 active:scale-[0.98] transition-transform"
                        >
                          <div 
                            className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <HiEnvelope className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-gray-400 block uppercase">ईमेल / Email</span>
                            <span className="text-xs font-extrabold text-gray-900 truncate block">{contactInfo.email}</span>
                          </div>
                        </a>
                      )}

                      {(contactInfo.officeAddress || contactInfo.address) && (
                        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                          <div 
                            className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                            style={{ backgroundColor: secondaryColor }}
                          >
                            <HiMapPin className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-gray-400 block uppercase">कार्यालय का पता / Office Address</span>
                            <span className="text-xs font-semibold text-gray-800 leading-relaxed block mt-0.5">
                              {contactInfo.officeAddress || contactInfo.address}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl text-center">संपर्क जानकारी उपलब्ध नहीं है</p>
                  )}
                </div>

                {/* Social Media Links */}
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-3">सोशल मीडिया / Connect Online</h3>
                  {hasSocialLinks ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {socialLinks.whatsapp && (
                        <a 
                          href={socialLinks.whatsapp.startsWith('http') ? socialLinks.whatsapp : `https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50/70 border border-green-200/60 text-green-800 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0">
                            <FaWhatsapp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-green-600 block">WhatsApp</span>
                            <span className="text-xs font-black truncate block">मैसेज करें</span>
                          </div>
                        </a>
                      )}

                      {socialLinks.facebook && (
                        <a 
                          href={socialLinks.facebook} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-blue-900 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                            <FaFacebookF className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-blue-600 block">Facebook</span>
                            <span className="text-xs font-black truncate block">फॉलो करें</span>
                          </div>
                        </a>
                      )}

                      {socialLinks.twitter && (
                        <a 
                          href={socialLinks.twitter} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                            <FaXTwitter className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-slate-500 block">X (Twitter)</span>
                            <span className="text-xs font-black truncate block">फॉलो करें</span>
                          </div>
                        </a>
                      )}

                      {socialLinks.instagram && (
                        <a 
                          href={socialLinks.instagram} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-pink-50/70 border border-pink-200/60 text-pink-900 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shrink-0">
                            <FaInstagram className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-pink-600 block">Instagram</span>
                            <span className="text-xs font-black truncate block">प्रोफाइल देखें</span>
                          </div>
                        </a>
                      )}

                      {socialLinks.youtube && (
                        <a 
                          href={socialLinks.youtube} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50/70 border border-red-200/60 text-red-900 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#FF0000] text-white flex items-center justify-center shrink-0">
                            <FaYoutube className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-red-600 block">YouTube</span>
                            <span className="text-xs font-black truncate block">सब्सक्राइब</span>
                          </div>
                        </a>
                      )}

                      {socialLinks.website && (
                        <a 
                          href={socialLinks.website} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/60 text-indigo-900 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <HiGlobeAlt className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.65rem] font-bold text-indigo-600 block">Website</span>
                            <span className="text-xs font-black truncate block">वेबसाइट देखें</span>
                          </div>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl text-center">सोशल मीडिया लिंक उपलब्ध नहीं हैं</p>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
