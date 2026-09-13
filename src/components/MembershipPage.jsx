import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import UserAvatar from './UserAvatar';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent } from '../utils/shareAndDownload';
import {
  HiShare,
  HiArrowDownTray,
  HiCheckBadge,
  HiSparkles,
  HiArrowLeft,
  HiCheck,
  HiStar,
  HiClock,
  HiXCircle,
  HiArrowPath,
} from 'react-icons/hi2';

// ─── Status badge helper ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    approved: { label: 'APPROVED', bg: '#dcfce7', color: '#166534', dot: '#16a34a' },
    pending: { label: 'PENDING REVIEW', bg: '#fef9c3', color: '#854d0e', dot: '#ca8a04' },
    rejected: { label: 'REJECTED', bg: '#fee2e2', color: '#991b1b', dot: '#dc2626' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

export default function MembershipPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { primaryColor, secondaryColor, leaderName } = useTenant();
  const cardRef = useRef(null);

  const [view, setView] = useState('loading'); // 'loading' | 'no-app' | 'form' | 'pending' | 'rejected' | 'card'
  const [userProfile, setUserProfile] = useState(null);
  const [membershipData, setMembershipData] = useState(null); // approved card data
  const [membershipStatus, setMembershipStatus] = useState(null); // raw membership doc
  const [tenantConfig, setTenantConfig] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    voterId: '',
    address: '',
    designation: '',
  });

  const toDataUrl = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  const loadData = useCallback(async () => {
    setView('loading');
    let user = storage.getUser() || {};
    try {
      const liveProfile = await api.getCitizenProfile().catch(() => null);
      if (liveProfile?.profile) {
        user = { ...user, ...liveProfile.profile };
        storage.setUser(user);
      }
    } catch { }

    setUserProfile(user);
    setFormData({
      name: user.name || '',
      phone: user.mobile || '',
      voterId: user.customFields?.voter_id || user.voter_id || '',
      address: user.district ? [user.village, user.ward, user.district].filter(Boolean).join(', ') : '',
      designation: '',
    });

    try {
      // Fetch config
      const configRes = await api.getConfig().catch(() => null);
      if (configRes) {
        if (configRes.branding?.logoUrl) {
          const resolvedLogo = getMediaUrl(configRes.branding.logoUrl);
          const base64Logo = await toDataUrl(resolvedLogo);
          configRes.branding.logoDataUrl = base64Logo;
        }
        setTenantConfig(configRes);
      }

      // First check if a membership application exists
      const memRes = await api.getMyMembership().catch(() => null);

      if (!memRes) {
        // No application at all — check token
        if (!api.getToken()) {
          navigate('/login', { state: { from: '/membership' } });
          return;
        }
        setView('no-app');
        return;
      }

      setMembershipStatus(memRes);
      const status = memRes.status;

      if (status === 'pending') {
        setView('pending');
        return;
      }
      if (status === 'rejected') {
        setView('rejected');
        return;
      }
      if (status === 'approved') {
        // Try to get the card details
        const cardRes = await api.getMyMembershipCard().catch(() => null);
        if (cardRes && cardRes.hasCard) {
          const user_ = memRes?.userId || cardRes?.member || user;
          const rawPhoto = (typeof user_ === 'object' ? (user_?.profilePhoto || user_?.photo) : null) || user?.profilePhoto || user?.photo || null;
          const resolvedPhoto = rawPhoto ? getMediaUrl(rawPhoto) : null;
          const photo = resolvedPhoto ? await toDataUrl(resolvedPhoto) : null;

          const mNum = cardRes.membershipNumber || `MEM-${Date.now()}`;
          const vUrl = cardRes.verificationUrl || `${window.location.origin}/membership/verify/${mNum}`;

          // Generate scannable QR Code
          try {
            const qrUrl = await QRCode.toDataURL(vUrl, {
              width: 250,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
            setQrCodeDataUrl(qrUrl);
          } catch (e) {
            console.error('QR generation failed:', e);
          }

          setMembershipData({
            membershipNumber: mNum,
            name: (typeof user_ === 'object' ? user_?.name : null) || user.name || 'Member',
            phone: (typeof user_ === 'object' ? user_?.mobile : null) || user.mobile || '',
            photo,
            designation: cardRes.designation || memRes.designation || 'Active Member',
            approvedAt: cardRes.approvedAt ? new Date(cardRes.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
            validThru: cardRes.expiresAt ? new Date(cardRes.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Lifetime',
            cardUrl: cardRes.cardUrl ? getMediaUrl(cardRes.cardUrl) : null,
            downloadUrl: cardRes.downloadUrl,
            verificationUrl: vUrl,
          });
          setView('card');
        } else {
          // Approved but card not yet generated
          setView('pending');
        }
        return;
      }
      setView('no-app');
    } catch {
      setView('no-app');
    }
  }, [navigate]);

  useEffect(() => {
    if (!api.getToken()) {
      navigate('/login', { state: { from: '/membership' } });
      return;
    }
    loadData();

    const handleProfileUpdate = async (e) => {
      const updatedUser = e?.detail || storage.getUser();
      if (updatedUser) {
        setUserProfile(updatedUser);
        const rawPhoto = updatedUser.profilePhoto || updatedUser.photo || null;
        const resolvedPhoto = rawPhoto ? getMediaUrl(rawPhoto) : null;
        const photo = resolvedPhoto ? await toDataUrl(resolvedPhoto) : null;
        setMembershipData(prev => prev ? { ...prev, photo } : prev);
      }
    };

    window.addEventListener('pwa_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('pwa_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [loadData, navigate]);

  // ── Submit form ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and Phone are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.applyMembership({
        designation: formData.designation || 'Active Member',
        customData: {
          name: formData.name,
          phone: formData.phone,
          voterId: formData.voterId,
          address: formData.address,
        },
      });
      toast.success('✅ Application submitted! Awaiting approval.');
      await loadData();
    } catch (err) {
      if (err?.message?.includes('already exists')) {
        toast.info('Application already submitted — refreshing status...');
        await loadData();
      } else {
        toast.error(err?.message || 'Submission failed, please try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Download card as crisp PDF directly ─────────────────────────────────
  const handleDownload = async () => {
    try {
      setDownloading(true);

      const width = 1000;
      const height = 540;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const bgColor = secondaryColor || '#140D36';
      const pColor = primaryColor || '#FF7802';

      // Rounded rectangle clip
      const r = 28;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(width - r, 0);
      ctx.quadraticCurveTo(width, 0, width, r);
      ctx.lineTo(width, height - r);
      ctx.quadraticCurveTo(width, height, width - r, height);
      ctx.lineTo(r, height);
      ctx.quadraticCurveTo(0, height, 0, height - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.clip();

      // 1. Solid Deep Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Top Primary Header Strip
      ctx.fillStyle = pColor;
      ctx.fillRect(0, 0, width, 14);

      // 2. Header: Logo + Leader/Party Name
      let startTextX = 50;
      const logoSrc = tenantConfig?.branding?.logoDataUrl || tenantConfig?.branding?.logoUrl;
      if (logoSrc) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoSrc;
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
          if (img.width) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(50, 34, 66, 66, 16);
            ctx.fill();
            ctx.drawImage(img, 55, 39, 56, 56);
            startTextX = 132;
          }
        } catch { }
      }

      // Leader / Party Name
      const lName = tenantConfig?.branding?.leaderName || leaderName || 'JAN SAMPARK';
      ctx.fillStyle = pColor;
      ctx.font = 'bold 28px "Noto Sans Devanagari", Poppins, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(lName, startTextX, 36);

      // Card Subtitle
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 13px Poppins, sans-serif';
      ctx.fillText('OFFICIAL DIGITAL MEMBERSHIP CARD', startTextX, 74);

      // Active Badge (Top Right)
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.roundRect(830, 36, 120, 36, 18);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓ ACTIVE', 890, 54);

      // Subtle Divider below header
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 114);
      ctx.lineTo(950, 114);
      ctx.stroke();

      // 3. Middle Section: Member Photo (Left)
      const photoX = 50;
      const photoY = 132;
      const photoW = 165;
      const photoH = 195;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, 18);
      ctx.strokeStyle = pColor;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.clip();

      let photoLoaded = false;
      const memberPhotoSrc = membershipData?.photo || userProfile?.profilePhoto || userProfile?.photo;
      if (memberPhotoSrc) {
        try {
          const pImg = new Image();
          pImg.crossOrigin = 'anonymous';
          pImg.src = memberPhotoSrc;
          await new Promise((res) => {
            pImg.onload = res;
            pImg.onerror = res;
          });
          if (pImg.width) {
            ctx.drawImage(pImg, photoX, photoY, photoW, photoH);
            photoLoaded = true;
          }
        } catch { }
      }

      if (!photoLoaded) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 56px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const nameInitials = (membershipData?.name || userProfile?.name || 'M')
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        ctx.fillText(nameInitials, photoX + photoW / 2, photoY + photoH / 2);
      }
      ctx.restore();

      // 4. Middle Section: Member Details
      const detailsX = 245;
      ctx.textAlign = 'left';

      // Full Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px "Noto Sans Devanagari", Poppins, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(membershipData?.name || userProfile?.name || 'Member', detailsX, 134);

      // Designation Tag
      const desText = membershipData?.designation || 'Active Member';
      ctx.font = 'bold 15px Poppins, sans-serif';
      const textWidth = ctx.measureText(desText).width;
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.roundRect(detailsX, 188, textWidth + 24, 30, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(desText, detailsX + 12, 203);

      // Phone Box
      if (membershipData?.phone || userProfile?.mobile) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(detailsX, 235, 240, 36, 10);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Poppins, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(`📞 +91 ${membershipData?.phone || userProfile?.mobile}`, detailsX + 14, 253);
      }

      // 5. Bottom Section: Info Card Container
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.roundRect(50, 348, 900, 160, 20);
      ctx.fill();
      ctx.strokeStyle = `${pColor}40`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Membership ID Left Container
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px Poppins, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('OFFICIAL MEMBERSHIP NUMBER', 75, 368);

      ctx.fillStyle = pColor;
      ctx.font = 'bold 36px monospace';
      ctx.fillText(membershipData?.membershipNumber || 'DEMO-000000', 75, 396);

      // Meta details pills
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(75, 452, 250, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px Poppins, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🗓 Member since: ${membershipData?.approvedAt || '11 Sept 2026'}`, 88, 468);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.beginPath();
      ctx.roundRect(338, 452, 160, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 13px Poppins, sans-serif';
      ctx.fillText(`✓ Valid: Lifetime`, 355, 468);

      // 6. Bottom Right: QR Code Visual
      const qrBoxX = 795;
      const qrBoxY = 360;
      const qrBoxSize = 135;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
      ctx.fill();

      let qrDrawn = false;
      if (qrCodeDataUrl) {
        try {
          const qrImg = new Image();
          qrImg.src = qrCodeDataUrl;
          await new Promise((res) => {
            qrImg.onload = res;
            qrImg.onerror = res;
          });
          if (qrImg.width) {
            ctx.drawImage(qrImg, qrBoxX + 8, qrBoxY + 8, qrBoxSize - 16, qrBoxSize - 16);
            qrDrawn = true;
          }
        } catch { }
      }

      if (!qrDrawn) {
        const grid = 5;
        const pad = 12;
        const cell = (qrBoxSize - pad * 2) / grid;
        ctx.fillStyle = '#0f172a';
        for (let r = 0; r < grid; r++) {
          for (let c = 0; c < grid; c++) {
            if ((r === 0 || r === 4 || c === 0 || c === 4) || (r === 2 && c === 2)) {
              ctx.beginPath();
              ctx.roundRect(qrBoxX + pad + c * cell + 2, qrBoxY + pad + r * cell + 2, cell - 4, cell - 4, 3);
              ctx.fill();
            }
          }
        }
      }

      // 7. Output Crisp PDF in standard ID Card ratio
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [160, 86.4],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 160, 86.4);
      pdf.save(`membership-card-${membershipData?.membershipNumber || 'card'}.pdf`);
      toast.success('✅ Membership Card PDF Downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('PDF download failed, please try again');
    } finally {
      setDownloading(false);
    }
  };

  // ── Share card ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    const text = `I am a verified member! ID: ${membershipData?.membershipNumber || ''}`;
    const url = membershipData?.verificationUrl || window.location.href;
    shareContent({
      title: `${leaderName || 'Vidyak'} Membership Card`,
      text: text,
      url: url,
    });
  };

  // ── Card UI component ───────────────────────────────────────────────────
  const MemberCard = () => (
    <div
      ref={cardRef}
      className="relative w-full rounded-3xl overflow-hidden shadow-xl text-white p-6 flex flex-col justify-between border"
      style={{
        backgroundColor: secondaryColor || '#140D36',
        borderColor: `${primaryColor}50`,
        minHeight: 260
      }}
    >
      {/* Top Header Strip */}
      <div
        className="absolute top-0 left-0 right-0 h-2.5"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Top row: logo + org/leader name + verified badge */}
      <div className="flex items-center justify-between relative z-10 pt-1 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          {(tenantConfig?.branding?.logoDataUrl || tenantConfig?.branding?.logoUrl) ? (
            <img
              src={tenantConfig.branding.logoDataUrl || tenantConfig.branding.logoUrl}
              alt="Logo"
              className="w-10 h-10 object-contain rounded-xl bg-white p-1 shadow-sm"
              onError={e => e.target.style.display = 'none'}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              VIP
            </div>
          )}
          <div>
            <p className="text-sm font-black tracking-wider uppercase leading-none" style={{ color: primaryColor }}>
              {tenantConfig?.branding?.leaderName || leaderName || 'JAN SAMPARK'}
            </p>
            <p className="text-[0.65rem] font-bold text-gray-300 tracking-wider mt-1 uppercase">
              {t('membershipCardTitle')}
            </p>
          </div>
        </div>
        <span
          className="px-3 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs"
          style={{ backgroundColor: primaryColor, color: '#ffffff' }}
        >
          ✓ {t('activeStatus')}
        </span>
      </div>

      {/* Middle: photo + member details */}
      <div className="flex items-center gap-4 my-3.5 relative z-10">
        <div
          className="rounded-2xl border-2 overflow-hidden shrink-0 shadow-md bg-slate-800 flex items-center justify-center p-0.5"
          style={{ borderColor: primaryColor, width: '4.8rem', height: '4.8rem' }}
        >
          <UserAvatar
            src={membershipData?.photo || userProfile?.profilePhoto || userProfile?.photo}
            name={membershipData?.name || userProfile?.name}
            className="w-full h-full"
            iconClassName="w-8 h-8"
            roundedClassName="rounded-xl"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-white leading-tight truncate">
            {membershipData?.name || userProfile?.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span
              className="text-[0.7rem] font-extrabold px-2.5 py-0.5 rounded-md text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              {membershipData?.designation || 'Active Member'}
            </span>
            {membershipData?.phone && (
              <span className="text-xs text-gray-200 font-bold bg-white/10 px-2.5 py-0.5 rounded-md">
                +91 {membershipData.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: ID number + QR Code + dates in filled contrast container */}
      <div
        className="flex items-center justify-between p-3.5 rounded-2xl relative z-10 border bg-black/20"
        style={{ borderColor: `${primaryColor}40` }}
      >
        <div className="flex-1 min-w-0 pr-2">
          <span className="text-[0.6rem] font-extrabold text-gray-400 uppercase tracking-wider block">
            {t('membershipNumber')}
          </span>
          <span className="text-base font-mono font-black tracking-wider block mt-0.5" style={{ color: primaryColor }}>
            {membershipData?.membershipNumber}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[0.65rem] font-semibold text-gray-300">
            <span>{membershipData?.approvedAt}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">Lifetime Valid</span>
          </div>
        </div>

        {/* Real Scannable QR Code */}
        <div className="w-14 h-14 bg-white rounded-xl p-1 flex items-center justify-center shadow-md shrink-0">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full grid grid-cols-3 gap-0.5 bg-black p-0.5 rounded-lg">
              {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((v, i) => (
                <div key={i} className={`rounded-sm ${v ? 'bg-white' : 'bg-black'}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 active:scale-95 shrink-0">
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate">{t('membershipCardTitle')}</h1>
        </div>
        {view !== 'loading' && view !== 'form' && (
          <button onClick={loadData} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 active:scale-95">
            <HiArrowPath className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto w-full p-4">

        {/* LOADING */}
        {view === 'loading' && (
          <div className="py-16 flex items-center justify-center">
            <LoadingSpinner message="सदस्यता लोड हो रही है..." />
          </div>
        )}

        {/* NO APPLICATION — Show Join Banner + CTA */}
        {view === 'no-app' && (
          <div className="max-w-md mx-auto flex flex-col gap-5">
            <div
              className="rounded-3xl shadow-lg text-white p-8 text-center relative"
              style={{ backgroundColor: secondaryColor || '#0f172a' }}
            >
              <HiCheckBadge className="w-14 h-14 mx-auto mb-3" style={{ color: primaryColor }} />
              <h2 className="text-xl font-black mb-2">Join the Movement</h2>
              <p className="text-gray-300 text-sm font-medium">Become an official member and get your digital membership card instantly.</p>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
              {[
                'Official digital membership card with QR code',
                'Priority appointment with representative',
                'Invitations to state & central rallies',
                'Access to volunteer & leadership drives',
              ].map((b, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm font-semibold text-gray-700">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                    <HiCheck className="w-3 h-3" />
                  </span>
                  {b}
                </div>
              ))}
            </div>
            <button
              onClick={() => setView('form')}
              className="w-full h-14 text-white font-extrabold text-sm rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <HiSparkles className="w-5 h-5" />
              Apply for Membership
            </button>
          </div>
        )}

        {/* FORM */}
        {view === 'form' && (
          <div className="max-w-md mx-auto flex flex-col gap-4">
            <div
              className="rounded-3xl text-white p-5 text-center shadow-sm"
              style={{ backgroundColor: secondaryColor || '#0f172a' }}
            >
              <h2 className="text-lg font-black" style={{ color: primaryColor }}>Membership Application</h2>
              <p className="text-gray-300 text-xs mt-1">Fill the form below to apply for your official membership</p>
            </div>
            <form onSubmit={handleSubmit} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Enter your full name', required: true },
                { label: 'Mobile Number', key: 'phone', type: 'tel', placeholder: '10-digit mobile number', required: true },
                { label: 'Voter ID / EPIC No. (Optional)', key: 'voterId', type: 'text', placeholder: 'e.g. ABC1234567', required: false },
                { label: 'Designation (Optional)', key: 'designation', type: 'text', placeholder: 'e.g. Ward Secretary, Block President', required: false },
              ].map(f => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-800">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                  <input
                    type={f.type}
                    value={formData[f.key]}
                    onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-800">Address / Village / Ward</label>
                <textarea rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none" placeholder="Village / Ward, District" />
              </div>
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => setView('no-app')} className="flex-1 h-12 rounded-xl font-bold text-sm text-gray-600 bg-gray-100 active:scale-95 transition-all">Back</button>
                <button type="submit" disabled={submitting} className="flex-1 h-12 text-white font-extrabold text-sm rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-70" style={{ backgroundColor: primaryColor }}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PENDING */}
        {view === 'pending' && (
          <div className="max-w-md mx-auto flex flex-col gap-4 items-center text-center pt-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#fef9c3' }}>
              <HiClock className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Application Under Review</h2>
            <p className="text-gray-500 text-sm font-medium">आपका आवेदन जमा हो गया है। अनुमोदन होने के बाद आपका Digital Membership Card यहाँ दिखेगा।</p>
            <StatusBadge status="pending" />
            <div className="w-full bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-left space-y-2">
              <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Application Details</p>
              <div className="space-y-1.5">
                {membershipStatus?.createdAt && (
                  <div className="flex justify-between text-xs font-medium text-gray-600">
                    <span>Applied On</span>
                    <span className="font-bold">{new Date(membershipStatus.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-medium text-gray-600">
                  <span>Status</span>
                  <span className="font-bold text-yellow-600">Pending Approval</span>
                </div>
              </div>
            </div>
            <button onClick={loadData} className="w-full h-12 rounded-xl font-bold text-sm text-white shadow-md active:scale-95 transition-all" style={{ backgroundColor: primaryColor }}>
              Refresh Status
            </button>
          </div>
        )}

        {/* REJECTED */}
        {view === 'rejected' && (
          <div className="max-w-md mx-auto flex flex-col gap-4 items-center text-center pt-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
              <HiXCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Application Rejected</h2>
            {membershipStatus?.rejectionReason && (
              <p className="text-sm text-red-600 font-medium bg-red-50 px-4 py-2 rounded-xl">Reason: {membershipStatus.rejectionReason}</p>
            )}
            <p className="text-gray-500 text-sm">Please contact your area coordinator or re-apply.</p>
          </div>
        )}

        {/* APPROVED CARD - ONLY 1 SINGLE CLEAN CARD */}
        {view === 'card' && membershipData && (
          <div className="flex flex-col gap-5 max-w-md mx-auto">

            {/* Single Digital Card */}
            <MemberCard />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShare}
                className="py-3.5 text-white font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <HiShare className="w-4 h-4" />
                {t('shareCard')}
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="py-3.5 bg-white border border-gray-200 text-gray-800 font-extrabold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70"
              >
                <HiArrowDownTray className="w-4 h-4 text-gray-600" />
                {downloading ? 'Saving...' : t('downloadCard')}
              </button>
            </div>

            {/* Member Privileges */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                <HiStar className="w-4 h-4" style={{ color: primaryColor }} />
                Member Privileges & Rights
              </h3>
              <div className="space-y-2.5">
                {[
                  'Official participation in party general meetings',
                  'Direct priority appointment channel with representative',
                  'Invites to state & central public rallies',
                  'Access to exclusive volunteer & leadership drives',
                ].map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs font-semibold text-gray-600">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-black shrink-0 mt-0.5" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                      <HiCheck className="w-3 h-3" />
                    </span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}