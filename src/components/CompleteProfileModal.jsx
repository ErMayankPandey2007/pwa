import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { HiXMark, HiSparkles, HiMapPin } from 'react-icons/hi2';

export default function CompleteProfileModal({ isOpen, onClose, onComplete }) {
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
      const prevLevel = areaTreeData.levels[i];
      const selectedId = selectedAreas[prevLevel?._id];
      if (!selectedId) return [];
      const matchedNode = currentNodes.find(node => String(node._id) === String(selectedId));
      if (!matchedNode || !matchedNode.children) return [];
      currentNodes = matchedNode.children;
    }
    return currentNodes;
  };

  const handleAreaSelect = (levelId, levelIndex, selectedId) => {
    setSelectedAreas(prev => {
      const updated = { ...prev, [levelId]: selectedId };
      for (let i = levelIndex + 1; i < (areaTreeData.levels || []).length; i++) {
        delete updated[areaTreeData.levels[i]._id];
      }
      return updated;
    });

    setFormData(prev => ({
      ...prev,
      areaId: selectedId || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    for (const field of formFields) {
      if (field.required && field.key !== 'mobile') {
        const val = formData[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          toast.error(`Please enter ${field.label}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const coreKeys = ['name', 'gender', 'dob', 'address', 'areaId', 'email', 'mobile'];
      const customFieldsObj = {};
      const payload = {
        name: formData.name?.trim(),
        gender: formData.gender,
        dob: formData.dob || undefined,
        address: formData.address?.trim() || undefined,
        areaId: formData.areaId || undefined,
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

      // POST /registration-form/complete-profile
      const res = await api.completeProfile(payload);
      const updatedProfile = res?.profile || res?.user || {};
      const existingUser = storage.getUser() || {};

      const fullUser = {
        ...existingUser,
        ...formData,
        ...updatedProfile,
        isRegistered: true,
        isProfileComplete: true,
      };

      storage.setUser(fullUser);
      toast.success(res?.message || 'Profile completed successfully!');
      
      if (onComplete) onComplete(fullUser);
      if (onClose) onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to complete profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
              <HiSparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-tight">Complete Your Profile</h3>
              <p className="text-[11px] font-semibold text-gray-500">अपनी प्रोफाइल पूरी करें</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {loadingSchema ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              Loading form schema...
            </div>
          ) : formFields.length > 0 ? (
            formFields.map(field => {
              if (field.key === 'mobile') return null; // Mobile is already verified

              if (field.type === 'area_selector') {
                const levels = areaTreeData.levels || [];
                return (
                  <div key={field.key} className="pt-2 border-t border-gray-100 space-y-2.5">
                    <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <HiMapPin className="w-4 h-4" style={{ color: primaryColor }} />
                      <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                    </label>
                    {levels.map((lvl, idx) => {
                      const options = getAreaOptionsForLevel(idx);
                      const isParentSelected = idx === 0 || selectedAreas[levels[idx - 1]?._id];
                      if (!isParentSelected && options.length === 0) return null;

                      return (
                        <div key={lvl._id}>
                          <select
                            value={selectedAreas[lvl._id] || ''}
                            onChange={e => handleAreaSelect(lvl._id, idx, e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 bg-gray-50 outline-none"
                            required={field.required && idx === 0}
                          >
                            <option value="">-- {lvl.name} चुनें --</option>
                            {options.map(opt => (
                              <option key={opt._id} value={opt._id}>{opt.name}</option>
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
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-gray-50 outline-none"
                      required={field.required}
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
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none resize-none"
                      required={field.required}
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
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-gray-400"
                    required={field.required}
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
                  required
                  value={formData.name || ''}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('address')}</label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={e => handleFieldChange('address', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none resize-none"
                  placeholder="Residential address"
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3 border-t border-gray-100 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
