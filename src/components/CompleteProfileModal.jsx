import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { HiXMark, HiSparkles, HiMapPin } from 'react-icons/hi2';

export default function CompleteProfileModal({ isOpen, onClose, onComplete, isMandatory = false }) {
  const { primaryColor } = useTenant();
  const { t } = useLanguage();
  const [formFields, setFormFields] = useState([]);
  const [areaTreeData, setAreaTreeData] = useState({ levels: [], tree: [] });
  const [selectedAreas, setSelectedAreas] = useState({});
  const [formData, setFormData] = useState({});
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
          setAreaTreeData(areaRes.value);
        }
      } catch (err) {
        console.warn('Failed to load dynamic form schema:', err);
      } finally {
        setLoadingSchema(false);
      }
    };

    loadSchema();
  }, [isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = storage.getUser() || {};

    // Determine resolved area id: from selectedAreas, formData, or any area field
    const validAreaIds = Object.values(selectedAreas || {}).filter(val => val && String(val).trim() !== '');
    const resolvedAreaId = validAreaIds.length > 0 
      ? validAreaIds[validAreaIds.length - 1] 
      : (formData.areaId || formData.area || '');

    // Dynamically validate required fields from admin schema
    for (const field of formFields) {
      const isFieldRequired = Boolean(field.required === true || field.isRequired === true);
      
      if (isFieldRequired) {
        if (field.key === 'mobile' && (user?.mobile || formData.mobile)) {
          continue; // verified
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
            return;
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
            return;
          }
        } else {
          const val = formData[field.key];
          const isValEmpty = val === undefined || val === null || String(val).trim() === '';

          if (isValEmpty) {
            toast.error(`कृपया ${field.label} दर्ज करें`);
            return;
          }
        }
      }
    }

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
        // POST /registration-form/complete-profile
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
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up">
        
        {/* Header (Pinned) */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
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
          <button 
            type="button" 
            onClick={handleClose} 
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="registration-form" noValidate className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
          {loadingSchema ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              Loading registration form...
            </div>
          ) : formFields.length > 0 ? (
            formFields.map(field => {
              if (field.key === 'mobile' && currentStoredUser?.mobile) return null; // Mobile is already verified

              if (field.type === 'area_selector') {
                const levels = areaTreeData.levels || [];
                return (
                  <div key={field.key} className="pt-2 border-t border-gray-100 space-y-2">
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
                        <div key={lvlId}>
                          <select
                            value={selectedAreas[lvlId] || ''}
                            onChange={e => handleAreaSelect(field.key, lvlId, idx, e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 bg-gray-50 outline-none focus:border-gray-400"
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
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-gray-50 outline-none focus:border-gray-400"
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
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={field.placeholder || field.label}
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none resize-none focus:border-gray-400"
                    />
                  </div>
                );
              }

              const inputType = field.type === 'phone' ? 'tel' :
                                field.type === 'date' ? 'date' :
                                field.type === 'number' ? 'number' :
                                field.type === 'email' ? 'email' : 'text';

              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={inputType}
                    placeholder={field.placeholder || `${field.label} दर्ज करें`}
                    value={formData[field.key] || ''}
                    onChange={e => handleFieldChange(field.key, field.type === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-gray-400"
                  />
                </div>
              );
            })
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('fullName')} *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-gray-400"
                  placeholder="Your full name"
                />
              </div>
              {!currentStoredUser?.mobile && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.mobile || ''}
                    onChange={e => handleFieldChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-gray-400"
                    placeholder="10-digit mobile number"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('address')}</label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={e => handleFieldChange('address', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none resize-none focus:border-gray-400"
                  placeholder="Residential address"
                />
              </div>
            </div>
          )}
        </form>

        {/* Pinned Footer Action (Always Visible) */}
        <div className="p-4 bg-gray-50/90 backdrop-blur-sm border-t border-gray-100 flex gap-2.5 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 active:scale-95 transition-all text-center"
          >
            बाद में करें (Close)
          </button>
          <button
            type="submit"
            form="registration-form"
            disabled={submitting}
            className="flex-1 py-3 px-4 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? (
              <span>Saving...</span>
            ) : (
              <span>रजिस्टर करें (Save)</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
