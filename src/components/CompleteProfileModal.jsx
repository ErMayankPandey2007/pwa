import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  HiXMark, 
  HiSparkles, 
  HiMapPin, 
  HiUser, 
  HiArrowRight, 
  HiCheck,
  HiPhone
} from 'react-icons/hi2';

export default function CompleteProfileModal({ isOpen, onClose, onComplete, isMandatory = false }) {
  const { primaryColor } = useTenant();
  const { t } = useLanguage();
  const [formFields, setFormFields] = useState([]);
  const [areaTreeData, setAreaTreeData] = useState({ levels: [], tree: [] });
  const [selectedAreas, setSelectedAreas] = useState({});
  const [formData, setFormData] = useState({});
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // OTP Step state
  const [otpMobile, setOtpMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(30);
  const [otpCanResend, setOtpCanResend] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (!isOpen) return;

    const user = storage.getUser() || {};
    setFormData({
      name: user.name || '',
      mobile: user.mobile || '',
      gender: user.gender || 'male',
      dob: user.dob ? user.dob.split('T')[0] : '',
      address: user.address || '',
      areaId: user.areaId?._id || user.areaId || '',
      ...(user.customFields || {}),
    });

    // Pre-fill mobile for OTP step
    const existingMobile = user.mobile || '';
    setOtpMobile(existingMobile);
    if (existingMobile) {
      // If mobile already set (returning user), mark OTP as verified so step auto-passes
      setOtpVerified(true);
    } else {
      setOtpVerified(false);
      setOtpSent(false);
      setOtpDigits(['', '', '', '', '', '']);
    }

    const loadSchema = async () => {
      setLoadingSchema(true);
      try {
        const [formRes, areaRes] = await Promise.allSettled([
          api.getPublicRegistrationForm(),
          api.getAreaTree(),
        ]);

        if (formRes.status === 'fulfilled' && formRes.value) {
          const res = formRes.value;
          if (Array.isArray(res.fields)) {
            const active = res.fields
              .filter(f => f.isActive !== false)
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setFormFields(active);
          }
        }

        if (areaRes.status === 'fulfilled' && areaRes.value) {
          const rawLevels = areaRes.value.levels || [];
          const filteredLevels = rawLevels.filter(lvl => {
            const name = String(lvl?.name || lvl?.type || '').toLowerCase();
            return !name.includes('ward') && !name.includes('वार्ड');
          });
          setAreaTreeData({
            ...areaRes.value,
            levels: filteredLevels
          });

          // Auto-fill existing area selections from user profile or guest selection
          if (user.selectedAreas && Object.keys(user.selectedAreas).length > 0) {
            setSelectedAreas(user.selectedAreas);
          } else if (user.areaId || user.area) {
            const targetAreaId = String(user.areaId?._id || user.areaId || user.area || '');
            if (targetAreaId && areaRes.value.tree) {
              const findPath = (nodes, currentPath = {}) => {
                for (const node of nodes) {
                  const nodeId = String(node._id || node.id);
                  const lvlId = String(node.levelId || node.level?._id || node.level || '');
                  const newPath = { ...currentPath };
                  if (lvlId) newPath[lvlId] = nodeId;
                  if (nodeId === targetAreaId) return newPath;
                  if (node.children && node.children.length > 0) {
                    const found = findPath(node.children, newPath);
                    if (found) return found;
                  }
                }
                return null;
              };
              const matchedPath = findPath(areaRes.value.tree);
              if (matchedPath) {
                setSelectedAreas(matchedPath);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic form schema:', err);
      } finally {
        setLoadingSchema(false);
      }
    };

    loadSchema();
  }, [isOpen]);

  // OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (otpSent && !otpVerified && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
    } else if (otpTimer === 0) {
      setOtpCanResend(true);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpVerified, otpTimer]);

  const handleSendOtp = async () => {
    if (otpMobile.length !== 10) {
      toast.error('कृपया 10 अंकों का मोबाइल नंबर दर्ज करें');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.sendOtp(otpMobile);
      setOtpSent(true);
      setOtpTimer(30);
      setOtpCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      const devMsg = res?.devOtp ? ` (Dev OTP: ${res.devOtp})` : '';
      toast.success((res?.message || `OTP sent to +91 ${otpMobile}`) + devMsg);
      setTimeout(() => otpRefs[0]?.current?.focus(), 200);
    } catch (err) {
      toast.error(err?.message || 'OTP भेजने में विफल');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('').trim();
    if (code.length < 6) {
      toast.error('कृपया 6 अंकों का OTP दर्ज करें');
      return;
    }
    setOtpLoading(true);
    try {
      const data = await api.verifyOtp(otpMobile, code);
      if (data?.token) {
        api.setToken(data.token);
        storage.setToken(data.token);
      }
      // Merge server user data into local storage
      const serverUser = data?.user || {};
      const existingUser = storage.getUser() || {};
      storage.setUser({ ...existingUser, ...serverUser, mobile: otpMobile });
      setOtpVerified(true);
      // Update formData mobile
      setFormData(prev => ({ ...prev, mobile: otpMobile }));
      toast.success('मोबाइल नंबर सत्यापित हुआ! ✓');
    } catch (err) {
      toast.error(err?.message || 'OTP सत्यापन विफल');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpDigitChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[idx] = val.slice(-1);
    setOtpDigits(newDigits);
    if (val && idx < 5) otpRefs[idx + 1]?.current?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs[idx - 1]?.current?.focus();
    }
  };

  if (!isOpen) return null;

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getAreaOptionsForLevel = (levelIndex) => {
    if (!areaTreeData.tree || areaTreeData.tree.length === 0) return [];
    if (levelIndex === 0) return areaTreeData.tree;

    let currentNodes = areaTreeData.tree;
    for (let i = 0; i < levelIndex; i++) {
      const prevLevel = areaTreeData.levels?.[i];
      const prevLevelId = String(prevLevel?._id || prevLevel?.id || '');
      const selectedId = selectedAreas[prevLevelId];
      if (!selectedId) return [];
      const matchedNode = currentNodes.find(node => String(node._id || node.id) === String(selectedId));
      if (!matchedNode || !Array.isArray(matchedNode.children)) return [];
      currentNodes = matchedNode.children;
    }
    return currentNodes;
  };

  const handleAreaSelect = (fieldKey, levelId, levelIndex, selectedId) => {
    const levelKey = String(levelId);
    const updatedAreas = { ...selectedAreas };
    
    if (selectedId && String(selectedId).trim() !== '') {
      updatedAreas[levelKey] = String(selectedId);
    } else {
      delete updatedAreas[levelKey];
    }

    const levels = areaTreeData.levels || [];
    for (let i = levelIndex + 1; i < levels.length; i++) {
      const childLvlId = String(levels[i]?._id || levels[i]?.id || '');
      if (childLvlId) {
        delete updatedAreas[childLvlId];
      }
    }
    setSelectedAreas(updatedAreas);

    const validIds = Object.values(updatedAreas).filter(v => v && String(v).trim() !== '');
    const activeSelectedId = validIds.length > 0 ? validIds[validIds.length - 1] : '';

    setFormData(prev => ({
      ...prev,
      areaId: activeSelectedId,
      area: activeSelectedId,
      [fieldKey]: activeSelectedId,
    }));
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  // Split into Tab Steps: Area → Personal → Other → OTP
  const getTabSteps = () => {
    // Mobile is handled in OTP step — exclude from personal fields
    const personalKeys = ['name', 'email', 'gender', 'dob', 'age', 'fatherName', 'husbandName', 'voterId', 'aadhaar'];
    const areaKeys = ['areaId', 'area', 'address', 'pincode', 'city', 'state', 'district', 'block', 'panchayat', 'ward', 'village'];
    const mobileKeys = ['mobile', 'phone'];

    const personalFields = [];
    const areaFields = [];
    const otherFields = [];

    formFields.forEach(field => {
      const key = field.key?.toLowerCase() || '';
      // Skip mobile — handled separately in OTP step
      if (mobileKeys.includes(key) || field.type === 'phone' || key.includes('mobile')) return;

      const isArea = field.type === 'area_selector' || 
                     areaKeys.includes(key) || 
                     (field.label && (field.label.toLowerCase().includes('area') || field.label.toLowerCase().includes('क्षेत्र') || field.label.toLowerCase().includes('वार्ड') || field.label.toLowerCase().includes('पता')));

      if (isArea) {
        areaFields.push(field);
      } else if (personalKeys.includes(key) || key.includes('name')) {
        personalFields.push(field);
      } else {
        otherFields.push(field);
      }
    });

    // Step order: Area first (pre-filled) → Personal → Other → OTP last
    const steps = [
      { id: 'area', title: 'क्षेत्र चुनें', subtitle: 'Area & Location', icon: HiMapPin, fields: areaFields },
      { id: 'personal', title: 'व्यक्तिगत', subtitle: 'Personal Details', icon: HiUser, fields: personalFields },
    ];

    if (otherFields.length > 0) {
      steps.push({
        id: 'additional',
        title: 'अन्य जानकारी',
        subtitle: 'Additional Info',
        icon: HiSparkles,
        fields: otherFields
      });
    }

    // Always add OTP step as final step
    steps.push({
      id: 'otp',
      title: 'मोबाइल सत्यापन',
      subtitle: 'Mobile & OTP',
      icon: HiPhone,
      fields: [] // rendered separately
    });

    return steps;
  };

  const steps = getTabSteps();
  const isOtpStep = currentStep === steps.length - 1 && steps[steps.length - 1]?.id === 'otp';
  const currentStepData = steps[currentStep] || steps[0];
  const user = storage.getUser() || {};

  const validateStep = (stepIdx) => {
    const targetStep = steps[stepIdx];
    if (!targetStep) return true;

    const validAreaIds = Object.values(selectedAreas || {}).filter(val => val && String(val).trim() !== '');
    const resolvedAreaId = validAreaIds.length > 0 
      ? validAreaIds[validAreaIds.length - 1] 
      : (formData.areaId || formData.area || '');

    for (const field of targetStep.fields) {
      const isFieldRequired = Boolean(field.required === true || field.isRequired === true);
      
      if (isFieldRequired) {
        if (field.key === 'mobile' && (user?.mobile || formData.mobile)) {
          continue;
        }

        const isAreaField = field.type === 'area_selector' || 
                            field.key === 'areaId' || 
                            field.key === 'area' || 
                            (field.label && String(field.label).toLowerCase().includes('area'));

        if (isAreaField) {
          const hasSelectedArea = Boolean(
            resolvedAreaId || 
            formData[field.key] || 
            formData.areaId || 
            formData.area || 
            validAreaIds.length > 0 ||
            Object.keys(selectedAreas || {}).some(k => Boolean(selectedAreas[k]))
          );
          
          if (!hasSelectedArea && (areaTreeData.levels || []).length > 0) {
            toast.error(`कृपया अपना ${field.label || 'क्षेत्र (Area)'} चुनें`);
            return false;
          }
        } else if (field.type === 'select' || field.type === 'radio') {
          const val = formData[field.key];
          const isValEmpty = val === undefined || 
                             val === null || 
                             String(val).trim() === '' || 
                             String(val).trim().startsWith('-- Select') || 
                             String(val).trim().startsWith('-- चुनें');

          if (isValEmpty) {
            toast.error(`कृपया ${field.label} का चयन करें`);
            return false;
          }
        } else {
          const val = formData[field.key];
          const isValEmpty = val === undefined || val === null || String(val).trim() === '';

          if (isValEmpty) {
            toast.error(`कृपया ${field.label} दर्ज करें`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (isOtpStep) {
      // On OTP step, require verification before submitting
      if (!otpVerified) {
        toast.error('कृपया पहले अपना मोबाइल नंबर सत्यापित करें');
        return;
      }
      handleSubmit();
      return;
    }
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    for (let i = 0; i < steps.length; i++) {
      if (steps[i]?.id === 'otp') continue; // OTP step validated separately
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    const validAreaIds = Object.values(selectedAreas || {}).filter(val => val && String(val).trim() !== '');
    const resolvedAreaId = validAreaIds.length > 0 
      ? validAreaIds[validAreaIds.length - 1] 
      : (formData.areaId || formData.area || '');

    setSubmitting(true);
    try {
      const coreKeys = ['name', 'gender', 'dob', 'address', 'areaId', 'email', 'mobile', 'area'];
      const customFieldsObj = {};
      const payload = {
        name: formData.name?.trim() || undefined,
        mobile: formData.mobile || user?.mobile || undefined,
        gender: formData.gender || undefined,
        dob: formData.dob || undefined,
        address: formData.address?.trim() || undefined,
        areaId: resolvedAreaId || undefined,
        email: formData.email?.trim() || undefined,
      };

      Object.keys(formData).forEach(k => {
        if (!coreKeys.includes(k) && formData[k] !== undefined && formData[k] !== null && formData[k] !== '') {
          customFieldsObj[k] = formData[k];
          payload[k] = formData[k];
        }
      });

      if (Object.keys(customFieldsObj).length > 0) {
        payload.customFields = customFieldsObj;
      }

      let updatedProfile = {};
      try {
        const res = await api.completeProfile(payload);
        if (res?.token) {
          storage.setToken(res.token);
          api.setToken(res.token);
        }
        updatedProfile = res?.profile || res?.user || {};
      } catch (err) {
        console.warn('API profile save fallback to local storage:', err);
      }

      const existingUser = storage.getUser() || {};
      const returnedArea = updatedProfile?.area || {};
      const fullUser = {
        ...existingUser,
        ...formData,
        ...updatedProfile,
        isRegistered: true,
        isProfileComplete: true,
        assembly: returnedArea.breadcrumbText && returnedArea.breadcrumbText !== 'No area registered yet'
          ? returnedArea.breadcrumbText
          : (existingUser?.assembly || '')
      };

      storage.setUser(fullUser);
      window.dispatchEvent(new CustomEvent('pwa_profile_updated', { detail: fullUser }));
      toast.success('पंजीकरण सफलतापूर्वक पूरा हुआ! / Registration completed!');
      
      if (onComplete) onComplete(fullUser);
      if (onClose) onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStoredUser = storage.getUser() || {};

  return (
    <div 
      onClick={isMandatory ? undefined : handleClose}
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
      >
        
        {/* Header (Pinned) */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: primaryColor || '#f37920' }}>
              <HiSparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                {isMandatory ? 'Citizen Registration' : 'Complete Your Profile'}
              </h3>
              <p className="text-[11px] font-semibold text-gray-500">
                {isMandatory ? 'नागरिक पंजीकरण (अनिवार्य)' : 'अपनी प्रोफाइल पूरी करें'}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button 
              type="button" 
              onClick={handleClose} 
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Indicator Tabs */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === idx;
              const isCompleted = currentStep > idx;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    // Prevent jumping to OTP step directly via tab click
                    if (step.id === 'otp') return;
                    if (idx < currentStep || validateStep(currentStep)) {
                      setCurrentStep(idx);
                    }
                  }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'text-white shadow-md scale-105'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor || '#f37920' } : {}}
                  >
                    {isCompleted ? <HiCheck className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">{currentStepData.title}</span>
            <span className="text-[11px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          {loadingSchema ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              Loading registration form...
            </div>
          ) : isOtpStep ? (
            /* === OTP Verification Step === */
            <div className="flex flex-col gap-4 pt-1">
              {otpVerified ? (
                /* Verified State */
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <HiCheck className="w-9 h-9" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-extrabold text-gray-900">मोबाइल सत्यापित! ✓</p>
                    <p className="text-xs font-semibold text-gray-500 mt-1">+91 {otpMobile}</p>
                    <p className="text-[11px] text-emerald-600 font-bold mt-2 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                      अब पंजीकरण पूरा करें →
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <HiPhone className="w-4 h-4" style={{ color: primaryColor }} />
                      <span>मोबाइल नंबर <span className="text-red-500">*</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 shrink-0">
                        <div className="w-5 h-3.5 rounded-sm overflow-hidden flex flex-col border border-gray-200 shadow-xs">
                          <div className="h-1/3 bg-[#FF9933]"></div>
                          <div className="h-1/3 bg-white flex items-center justify-center">
                            <div className="w-0.5 h-0.5 rounded-full bg-[#000080]"></div>
                          </div>
                          <div className="h-1/3 bg-[#128807]"></div>
                        </div>
                        <span className="text-xs font-bold text-gray-800">+91</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="98765 43210"
                        value={otpMobile}
                        disabled={otpSent}
                        onChange={e => setOtpMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 bg-white outline-none focus:border-gray-400 shadow-xs disabled:bg-gray-50 disabled:text-gray-500"
                      />
                      {otpSent ? (
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtpDigits(['','','','','','']); }}
                          className="text-[11px] font-bold shrink-0 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                        >Edit</button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading || otpMobile.length !== 10}
                          className="text-[11px] font-extrabold shrink-0 px-3 py-2 rounded-xl text-white shadow-sm disabled:opacity-50 active:scale-95 transition-all"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {otpLoading ? '...' : 'OTP भेजें'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* OTP Inputs */}
                  {otpSent && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-600">
                        +91 {otpMobile} पर भेजा गया 6-अंकीय OTP दर्ज करें
                      </p>
                      <div className="flex justify-between gap-1.5">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={otpRefs[idx]}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpDigitChange(idx, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                            className="w-10 h-12 text-center text-lg font-bold text-gray-800 bg-white border rounded-xl outline-none transition-all shadow-xs"
                            style={{ borderColor: digit ? primaryColor : '#e5e7eb' }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otpDigits.join('').length < 6}
                        className="w-full py-3 rounded-xl text-white font-extrabold text-sm shadow-md disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {otpLoading ? 'सत्यापन...' : <><HiCheck className="w-4 h-4" /> OTP सत्यापित करें</>}
                      </button>
                      <div className="text-center text-xs">
                        {otpCanResend ? (
                          <button type="button" onClick={handleSendOtp} className="font-bold" style={{ color: primaryColor }}>
                            OTP फिर भेजें
                          </button>
                        ) : (
                          <span className="text-gray-500 font-medium">{otpTimer}s में दोबारा भेजें</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : currentStepData.fields.length > 0 ? (
            currentStepData.fields.map(field => {
              if (field.key === 'mobile' && currentStoredUser?.mobile) return null;

              if (field.type === 'area_selector') {
                const levels = areaTreeData.levels || [];
                return (
                  <div key={field.key} className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <HiMapPin className="w-4 h-4" style={{ color: primaryColor }} />
                      <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                    </label>
                    {levels.map((lvl, idx) => {
                      const lvlId = String(lvl._id || lvl.id);
                      const options = getAreaOptionsForLevel(idx);
                      const prevLvlId = idx > 0 ? String(levels[idx - 1]?._id || levels[idx - 1]?.id) : null;
                      const isParentSelected = idx === 0 || Boolean(selectedAreas[prevLvlId]);
                      if (!isParentSelected || !options || options.length === 0) return null;

                      return (
                        <div key={lvlId} className="space-y-1">
                          <label className="block text-[11px] font-bold text-gray-600">{lvl.name}</label>
                          <select
                            value={selectedAreas[lvlId] || ''}
                            onChange={e => handleAreaSelect(field.key, lvlId, idx, e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 bg-gray-50 outline-none focus:border-gray-400 shadow-xs"
                          >
                            <option value="">-- {lvl.name} चुनें --</option>
                            {options.map(opt => (
                              <option key={opt._id || opt.id} value={opt._id || opt.id}>{opt.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-gray-50 outline-none focus:border-gray-400 shadow-xs"
                    >
                      <option value="">-- Select {field.label} --</option>
                      {(field.options || []).map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={field.placeholder || field.label}
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none resize-none focus:border-gray-400 shadow-xs"
                    />
                  </div>
                );
              }

              const inputType = field.type === 'phone' ? 'tel' :
                                field.type === 'date' ? 'date' :
                                field.type === 'number' ? 'number' :
                                field.type === 'email' ? 'email' : 'text';

              return (
                <div key={field.key} className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={inputType}
                    placeholder={field.placeholder || `${field.label} दर्ज करें`}
                    value={formData[field.key] || ''}
                    onChange={e => handleFieldChange(field.key, field.type === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-gray-400 shadow-xs"
                  />
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              इस चरण में कोई फ़ील्ड नहीं है।
            </div>
          )}
        </div>

        {/* Pinned Footer Actions */}
        <div className="p-4 bg-gray-50/90 backdrop-blur-sm border-t border-gray-100 flex gap-2.5 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="flex-1 py-3 bg-gray-200/80 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300 active:scale-95 transition-all text-center"
            >
              Previous / पीछे
            </button>
          ) : !isMandatory ? (
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 active:scale-95 transition-all text-center"
            >
              बाद में करें (Close)
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting || (isOtpStep && !otpVerified)}
            className="flex-1 py-3 px-4 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: primaryColor || '#f37920' }}
          >
            {submitting ? (
              <span>Saving...</span>
            ) : isOtpStep ? (
              <>
                <HiCheck className="w-4 h-4" />
                <span>पंजीकरण पूर्ण करें</span>
              </>
            ) : currentStep < steps.length - 1 ? (
              <>
                <span>Next / आगे</span>
                <HiArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <HiCheck className="w-4 h-4" />
                <span>Save & Complete</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
