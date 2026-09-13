import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { HiArrowLeft } from 'react-icons/hi2';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { primaryColor, secondaryColor, leaderName: contextLeader, tagline: contextTagline } = useTenant();
  const [loading, setLoading] = useState(false);
  const [fetchingSchema, setFetchingSchema] = useState(true);
  const [formFields, setFormFields] = useState([]);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [areaTreeData, setAreaTreeData] = useState({ levels: [], tree: [] });
  
  // Selected area hierarchy map { [levelId]: selectedAreaId }
  const [selectedAreas, setSelectedAreas] = useState({});
  const [form, setForm] = useState({});

  useEffect(() => {
    const user = storage.getUser() || {};
    const currentSlug = api.getTenantSlug();
    
    // If no slug in .env, use standard default registration fields
    if (!currentSlug) {
      setFormFields([
        { key: 'name', label: 'Full Name / पूरा नाम', type: 'text', required: true },
        { key: 'mobile', label: 'Mobile Number / मोबाइल नंबर', type: 'phone', required: true },
        { key: 'email', label: 'Email ID (Optional)', type: 'email', required: false },
        { key: 'address', label: 'Address / पूरा पता', type: 'textarea', required: false },
      ]);
      setForm({ ...user });
      setFetchingSchema(false);
      return;
    }

    // Fetch dynamic registration form schema and active area hierarchy from backend
    const loadData = async () => {
      try {
        setFetchingSchema(true);
        
        // Parallel fetch for schema, area tree and tenant config
        const [formRes, areaRes, configRes] = await Promise.allSettled([
          api.getPublicRegistrationForm(),
          api.getAreaTree(),
          api.getConfig()
        ]);

        const initialFormState = { ...user };

        if (configRes.status === 'fulfilled' && configRes.value) {
          const cfg = configRes.value;
          setTenantInfo(prev => ({
            ...prev,
            ...cfg.tenant,
            branding: cfg.branding || cfg.tenant?.branding
          }));
        }

        if (formRes.status === 'fulfilled' && formRes.value) {
          const res = formRes.value;
          if (res.tenant) {
            setTenantInfo(prev => {
              const effectiveBranding = prev?.branding?.leaderName && prev.branding.leaderName !== 'Demo Leader' 
                ? prev.branding 
                : (res.tenant.branding || prev?.branding);
              return {
                ...prev,
                ...res.tenant,
                branding: effectiveBranding
              };
            });
          }
          if (Array.isArray(res.fields)) {
            // Sort by sortOrder and filter active fields
            const active = res.fields
              .filter(f => f.isActive !== false)
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setFormFields(active);

            // Initialize default values for dynamic fields
            active.forEach(field => {
              if (initialFormState[field.key] === undefined) {
                if (field.type === 'checkbox') {
                  initialFormState[field.key] = false;
                } else if (field.type === 'select') {
                  initialFormState[field.key] = field.options?.[0] || '';
                } else {
                  initialFormState[field.key] = '';
                }
              }
            });
          }
        }

        if (areaRes.status === 'fulfilled' && areaRes.value) {
          setAreaTreeData(areaRes.value);
        }

        setForm(initialFormState);
      } catch (err) {
        console.error('Error loading registration schema:', err);
      } finally {
        setFetchingSchema(false);
      }
    };

    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Helper to get available area options at each cascading level
  const getAreaOptionsForLevel = (levelIndex) => {
    if (!areaTreeData.tree || areaTreeData.tree.length === 0) return [];
    if (levelIndex === 0) return areaTreeData.tree;

    // Traverse down the tree matching previous selected level
    let currentNodes = areaTreeData.tree;
    for (let i = 0; i < levelIndex; i++) {
      const prevLevel = areaTreeData.levels[i];
      const selectedId = selectedAreas[prevLevel?._id];
      if (!selectedId) return [];
      const matchedNode = currentNodes.find(node => String(node._id) === String(selectedId));
      if (!matchedNode || !Array.isArray(matchedNode.children)) return [];
      currentNodes = matchedNode.children;
    }
    return currentNodes;
  };

  const handleAreaSelect = (levelId, levelIndex, selectedId) => {
    setSelectedAreas(prev => {
      const updated = { ...prev, [levelId]: selectedId };
      // Clear any deeper child level selections
      for (let i = levelIndex + 1; i < areaTreeData.levels.length; i++) {
        const childLevelId = areaTreeData.levels[i]._id;
        delete updated[childLevelId];
      }
      return updated;
    });

    // Update areaId in form with deepest selected area
    setForm(prev => ({
      ...prev,
      areaId: selectedId || ''
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Dynamically validate all required fields from backend schema
    for (const field of formFields) {
      if (field.required) {
        const val = form[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          toast.error(`कृपया '${field.label}' भरें / Please enter ${field.label}`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Structure payload: core fields + nested customFields
      const coreKeys = ['name', 'gender', 'dob', 'address', 'areaId', 'email', 'mobile'];
      const customFieldsObj = {};
      const payload = {
        name: form.name?.trim(),
        gender: form.gender,
        dob: form.dob || undefined,
        address: form.address?.trim() || undefined,
        areaId: form.areaId || undefined,
        email: form.email?.trim() || undefined,
      };

      Object.keys(form).forEach(k => {
        if (!coreKeys.includes(k) && form[k] !== undefined && form[k] !== null && form[k] !== '') {
          customFieldsObj[k] = form[k];
          payload[k] = form[k]; // also pass directly for compatibility
        }
      });

      if (Object.keys(customFieldsObj).length > 0) {
        payload.customFields = customFieldsObj;
      }

      // Call profile complete/update API (POST /registration-form/complete-profile)
      const res = await api.completeProfile(payload);

      const returnedProfile = res?.profile || res?.user || {};
      const returnedArea = res?.area || {};

      const userToSave = {
        ...user,
        ...form,
        ...returnedProfile,
        isRegistered: true,
        isProfileComplete: true,
        assembly: returnedArea.breadcrumbText && returnedArea.breadcrumbText !== 'No area registered yet' 
          ? returnedArea.breadcrumbText 
          : (user?.assembly || '')
      };
      
      storage.setUser(userToSave);
      toast.success(res?.message || (isEditing ? 'Profile updated successfully!' : 'Registration completed successfully!'));
      
      setTimeout(() => {
        if (isEditing) {
          navigate('/my-profile', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }
      }, 600);
    } catch (err) {
      console.error('API profile save error:', err);
      // Fallback local save
      const userToSave = {
        ...user,
        ...form,
        isRegistered: true,
        isProfileComplete: true
      };
      storage.setUser(userToSave);
      toast.success(isEditing ? 'Profile updated successfully!' : 'Profile saved successfully!');
      setTimeout(() => {
        if (isEditing) {
          navigate('/my-profile', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  // Render individual dynamic field based on field.type
  const renderDynamicField = (field) => {
    const isRequired = Boolean(field.required);
    const value = form[field.key] ?? '';

    // Area Hierarchy Selector (Cascading levels)
    if (field.type === 'area_selector') {
      const levels = areaTreeData.levels || [];
      return (
        <div key={field.key} className="pt-2 border-t border-gray-100 space-y-3">
          <label className="block text-xs font-black uppercase tracking-wider text-[#f37920]">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          {field.helpText && (
            <p className="text-[11px] text-gray-500 -mt-1">{field.helpText}</p>
          )}

          {levels.length > 0 ? (
            levels.map((lvl, idx) => {
              const options = getAreaOptionsForLevel(idx);
              const isParentSelected = idx === 0 || selectedAreas[levels[idx - 1]._id];
              if (!isParentSelected && (!options || options.length === 0)) return null;

              return (
                <div key={lvl._id}>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {lvl.name} {lvl.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={selectedAreas[lvl._id] || ''}
                    onChange={(e) => handleAreaSelect(lvl._id, idx, e.target.value)}
                    disabled={!isParentSelected}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    required={lvl.isRequired}
                  >
                    <option value="">-- {lvl.name} चुनें / Select {lvl.name} --</option>
                    {options && options.map((area) => (
                      <option key={area._id} value={area._id}>
                        {area.name} {area.code ? `(${area.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })
          ) : (
            <div>
              <input
                type="text"
                name="areaId"
                placeholder="क्षेत्र / वार्ड दर्ज करें"
                value={form.areaId || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920]"
              />
            </div>
          )}
        </div>
      );
    }

    // Select Dropdown
    if (field.type === 'select') {
      return (
        <div key={field.key}>
          <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor={field.key}>
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <select
            id={field.key}
            name={field.key}
            value={value}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920] bg-white"
            required={isRequired}
          >
            <option value="">{field.placeholder || `-- ${field.label} चुनें --`}</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
          {field.helpText && <p className="text-[10px] text-gray-400 mt-1">{field.helpText}</p>}
        </div>
      );
    }

    // Textarea
    if (field.type === 'textarea') {
      return (
        <div key={field.key}>
          <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor={field.key}>
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id={field.key}
            name={field.key}
            rows="3"
            placeholder={field.placeholder || `${field.label} दर्ज करें`}
            value={value}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920]"
            required={isRequired}
          />
          {field.helpText && <p className="text-[10px] text-gray-400 mt-1">{field.helpText}</p>}
        </div>
      );
    }

    // Radio
    if (field.type === 'radio') {
      return (
        <div key={field.key}>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl cursor-pointer text-xs font-semibold hover:border-[#f37920]">
                <input
                  type="radio"
                  name={field.key}
                  value={opt}
                  checked={value === opt}
                  onChange={handleChange}
                  className="accent-[#f37920]"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {field.helpText && <p className="text-[10px] text-gray-400 mt-1">{field.helpText}</p>}
        </div>
      );
    }

    // Checkbox
    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="flex items-center gap-2 pt-1">
          <input
            id={field.key}
            name={field.key}
            type="checkbox"
            checked={Boolean(value)}
            onChange={handleChange}
            className="w-4 h-4 text-[#f37920] rounded border-gray-300 focus:ring-[#f37920]"
          />
          <label className="text-xs font-bold text-gray-700" htmlFor={field.key}>
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          {field.helpText && <p className="text-[10px] text-gray-400">{field.helpText}</p>}
        </div>
      );
    }

    // Standard inputs: text, phone, email, date, number
    const inputType = 
      field.type === 'phone' ? 'tel' :
      field.type === 'date' ? 'date' :
      field.type === 'number' ? 'number' :
      field.type === 'email' ? 'email' : 'text';

    return (
      <div key={field.key}>
        <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor={field.key}>
          {field.label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <input
          id={field.key}
          name={field.key}
          type={inputType}
          placeholder={field.placeholder || `${field.label} दर्ज करें`}
          value={value}
          onChange={handleChange}
          readOnly={field.key === 'mobile' && Boolean(value && user?.mobile)}
          className={`w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920] ${
            field.key === 'mobile' && user?.mobile ? 'bg-gray-50 text-gray-600' : 'bg-white'
          }`}
          required={isRequired}
        />
        {field.helpText && <p className="text-[10px] text-gray-400 mt-1">{field.helpText}</p>}
      </div>
    );
  };

  const user = storage.getUser();
  const isEditing = Boolean(user && user.isProfileComplete);

  const handleBack = () => {
    if (isEditing) {
      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/my-profile');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={handleBack} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
              {tenantInfo?.branding?.leaderName || contextLeader || 'जनसेवा'} - {isEditing ? 'Profile Details' : 'Citizen Registration'}
            </h1>
            {(tenantInfo?.branding?.tagline || contextTagline) && (
              <p 
                className="text-[11px] font-bold truncate mt-0.5"
                style={{ color: secondaryColor }}
              >
                {tenantInfo?.branding?.tagline || contextTagline}
              </p>
            )}
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => navigate('/home', { replace: true })}
            className="text-xs font-extrabold text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            Skip →
          </button>
        )}
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="w-full max-w-md mx-auto space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          
          {fetchingSchema ? (
            <LoadingSpinner message="पंजीकरण फॉर्म लोड हो रहा है..." />
          ) : formFields.length > 0 ? (
            // 100% Dynamic fields mapping directly from backend schema response
            formFields.map(field => renderDynamicField(field))
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              No registration fields configured for this tenant.
            </div>
          )}

        </div>
      </div>

      {/* Fixed bottom submit button */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-200">
        <button 
          type="button" 
          disabled={loading || fetchingSchema}
          onClick={handleSubmit} 
          className="w-full max-w-md mx-auto block text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-60"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? 'Saving Profile Details...' : 'Complete & Submit Registration'}
        </button>
      </div>
    </div>
  );
}
