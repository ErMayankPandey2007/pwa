import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { 
  HiArrowLeft, 
  HiUser, 
  HiMapPin, 
  HiSparkles, 
  HiArrowRight, 
  HiCheck 
} from 'react-icons/hi2';

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
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const user = storage.getUser() || {};
    const currentSlug = api.getTenantSlug();
    
    // If no slug in .env, use standard default registration fields
    if (!currentSlug) {
      setFormFields([
        { key: 'name', label: 'Full Name / पूरा नाम', type: 'text', required: true },
        { key: 'mobile', label: 'Mobile Number / मोबाइल नंबर', type: 'phone', required: true },
        { key: 'areaId', label: 'Area / क्षेत्र', type: 'area_selector', required: true },
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
          const rawLevels = areaRes.value.levels || [];
          const filteredLevels = rawLevels.filter(lvl => {
            const name = String(lvl?.name || lvl?.type || '').toLowerCase();
            return !name.includes('ward') && !name.includes('वार्ड');
          });
          setAreaTreeData({
            ...areaRes.value,
            levels: filteredLevels
          });
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

  const handleAreaSelect = (levelId, levelIndex, selectedId) => {
    const levelKey = String(levelId);
    const updated = { ...selectedAreas };
    
    if (selectedId && String(selectedId).trim() !== '') {
      updated[levelKey] = String(selectedId);
    } else {
      delete updated[levelKey];
    }

    // Clear any deeper child level selections
    const levels = areaTreeData.levels || [];
    for (let i = levelIndex + 1; i < levels.length; i++) {
      const childLevelId = String(levels[i]?._id || levels[i]?.id || '');
      if (childLevelId) {
        delete updated[childLevelId];
      }
    }
    setSelectedAreas(updated);

    const validIds = Object.values(updated).filter(v => v && String(v).trim() !== '');
    const activeSelectedId = validIds.length > 0 ? validIds[validIds.length - 1] : '';

    // Update areaId in form with deepest selected area
    setForm(prev => ({
      ...prev,
      areaId: activeSelectedId,
      area: activeSelectedId
    }));
  };

  // Helper to categorize fields into distinct Step Tabs
  const getTabSteps = () => {
    const personalKeys = ['name', 'mobile', 'email', 'gender', 'dob', 'age', 'fatherName', 'husbandName', 'voterId', 'aadhaar'];
    const areaKeys = ['areaId', 'area', 'address', 'pincode', 'city', 'state', 'district', 'block', 'panchayat', 'ward', 'village'];

    const personalFields = [];
    const areaFields = [];
    const otherFields = [];

    formFields.forEach(field => {
      const key = field.key?.toLowerCase() || '';
      const isArea = field.type === 'area_selector' || 
                     areaKeys.includes(key) || 
                     (field.label && (field.label.toLowerCase().includes('area') || field.label.toLowerCase().includes('क्षेत्र') || field.label.toLowerCase().includes('वार्ड') || field.label.toLowerCase().includes('पता')));

      if (isArea) {
        areaFields.push(field);
      } else if (personalKeys.includes(key) || field.type === 'phone' || key.includes('name') || key.includes('mobile')) {
        personalFields.push(field);
      } else {
        otherFields.push(field);
      }
    });

    const steps = [
      { id: 'personal', title: 'व्यक्तिगत जानकारी', subtitle: 'Personal Details', icon: HiUser, fields: personalFields },
      { id: 'area', title: 'क्षेत्र का विवरण', subtitle: 'Area & Location', icon: HiMapPin, fields: areaFields }
    ];

    if (otherFields.length > 0) {
      steps.push({
        id: 'additional',
        title: 'अन्य विवरण',
        subtitle: 'Additional Info',
        icon: HiSparkles,
        fields: otherFields
      });
    }

    return steps;
  };

  const steps = getTabSteps();
  const currentStepData = steps[currentStep] || steps[0];

  // Validate only the fields of current step before going Next
  const validateStep = (stepIdx) => {
    const targetStep = steps[stepIdx];
    if (!targetStep) return true;

    const validAreaIds = Object.values(selectedAreas || {}).filter(val => val && String(val).trim() !== '');
    const resolvedAreaId = validAreaIds.length > 0 ? validAreaIds[validAreaIds.length - 1] : (form.areaId || form.area || '');

    for (const field of targetStep.fields) {
      const isFieldRequired = Boolean(field.required || field.isRequired);
      if (isFieldRequired) {
        const isAreaField = field.type === 'area_selector' || 
                            field.key === 'areaId' || 
                            field.key === 'area' || 
                            (field.label && String(field.label).toLowerCase().includes('area'));

        if (isAreaField) {
          const hasSelectedArea = Boolean(resolvedAreaId || form[field.key] || form.areaId || form.area);
          if (!hasSelectedArea && (areaTreeData.levels || []).length > 0) {
            toast.error(`कृपया अपना ${field.label || 'क्षेत्र'} चुनें`);
            return false;
          }
        } else if (field.type === 'select' || field.type === 'radio') {
          const val = form[field.key];
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
          const val = form[field.key];
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
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Determine resolved area id
    const validAreaIds = Object.values(selectedAreas || {}).filter(val => val && String(val).trim() !== '');
    const resolvedAreaId = validAreaIds.length > 0 ? validAreaIds[validAreaIds.length - 1] : (form.areaId || form.area || '');

    // Validate entire form across all steps
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    setLoading(true);
    const currentUser = storage.getUser() || {};
    const isEditing = Boolean(location.state?.isEditing || currentUser?.isProfileComplete);

    try {
      // Structure payload: core fields + nested customFields
      const coreKeys = ['name', 'gender', 'dob', 'address', 'areaId', 'email', 'mobile', 'area'];
      const customFieldsObj = {};
      const payload = {
        userId: currentUser?._id || currentUser?.id,
        mobile: form.mobile?.trim() || currentUser?.mobile,
        name: form.name?.trim() || currentUser?.name,
        gender: form.gender || currentUser?.gender,
        dob: form.dob || currentUser?.dob || undefined,
        address: form.address?.trim() || currentUser?.address || undefined,
        areaId: resolvedAreaId || form.areaId || form.area || currentUser?.areaId || undefined,
        area: resolvedAreaId || form.areaId || form.area || currentUser?.areaId || undefined,
        email: form.email?.trim() || currentUser?.email || undefined,
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
      if (res?.token) {
        storage.setToken(res.token);
        api.setToken(res.token);
      }

      const returnedProfile = res?.profile || res?.user || {};
      const returnedArea = res?.area || {};

      let b = '', p = '', v = '';
      if (Array.isArray(returnedArea.breadcrumbs)) {
        returnedArea.breadcrumbs.forEach(item => {
          const lvl = String(item.levelName || item.type || '').toLowerCase();
          if (lvl.includes('block') || item.levelOrder === 1) b = item.name;
          else if (lvl.includes('panchayat') || item.levelOrder === 2) p = item.name;
          else if (lvl.includes('village') || lvl.includes('gram') || item.levelOrder === 3) v = item.name;
        });
      }

      const userToSave = {
        ...currentUser,
        ...form,
        ...returnedProfile,
        isRegistered: true,
        isProfileComplete: true,
        assembly: returnedArea.breadcrumbText && returnedArea.breadcrumbText !== 'No area registered yet' 
          ? returnedArea.breadcrumbText 
          : (currentUser?.assembly || returnedProfile?.assembly || ''),
        areaDetails: (b || p || v) ? { block: b, panchayat: p, village: v } : (currentUser?.areaDetails || undefined)
      };
      
      storage.setUser(userToSave);
      window.dispatchEvent(new CustomEvent('pwa_profile_updated', { detail: userToSave }));
      toast.success(res?.message || (isEditing ? 'Profile updated successfully!' : 'Registration completed successfully!'));
      
      const returnTo = location.state?.from || '/home';
      setTimeout(() => {
        if (isEditing) {
          navigate('/my-profile', { replace: true });
        } else {
          navigate(returnTo, { replace: true });
        }
      }, 600);
    } catch (err) {
      console.error('API profile save error:', err);
      // Fallback local save
      const userToSave = {
        ...currentUser,
        ...form,
        isRegistered: true,
        isProfileComplete: true
      };
      storage.setUser(userToSave);
      toast.success(isEditing ? 'Profile updated successfully!' : 'Profile saved successfully!');
      const returnTo = location.state?.from || '/home';
      setTimeout(() => {
        if (isEditing) {
          navigate('/my-profile', { replace: true });
        } else {
          navigate(returnTo, { replace: true });
        }
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  // Render individual dynamic field based on field.type
  const renderDynamicField = (field) => {
    const isRequired = Boolean(field.required || field.isRequired);
    const value = form[field.key] ?? '';

    // Area Hierarchy Selector (Cascading levels)
    if (field.type === 'area_selector') {
      const levels = areaTreeData.levels || [];
      return (
        <div key={field.key} className="space-y-3 pt-1">
          <label className="block text-xs font-black uppercase tracking-wider text-[#f37920]">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          {field.helpText && (
            <p className="text-[11px] text-gray-500 -mt-1">{field.helpText}</p>
          )}

          {levels.length > 0 ? (
            levels.map((lvl, idx) => {
              const lvlId = String(lvl._id || lvl.id);
              const options = getAreaOptionsForLevel(idx);
              const prevLvlId = idx > 0 ? String(levels[idx - 1]?._id || levels[idx - 1]?.id) : null;
              const isParentSelected = idx === 0 || Boolean(selectedAreas[prevLvlId]);
              if (!isParentSelected || !options || options.length === 0) return null;

              return (
                <div key={lvlId} className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    {lvl.name} {lvl.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={selectedAreas[lvlId] || ''}
                    onChange={(e) => handleAreaSelect(lvlId, idx, e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920] bg-white transition-all shadow-xs"
                  >
                    <option value="">-- {lvl.name} चुनें / Select {lvl.name} --</option>
                    {options && options.map((area) => (
                      <option key={area._id || area.id} value={area._id || area.id}>
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
        <div key={field.key} className="space-y-1">
          <label className="block text-xs font-bold text-gray-700" htmlFor={field.key}>
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <select
            id={field.key}
            name={field.key}
            value={value}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920] bg-white transition-all shadow-xs"
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
        <div key={field.key} className="space-y-1">
          <label className="block text-xs font-bold text-gray-700" htmlFor={field.key}>
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id={field.key}
            name={field.key}
            rows="3"
            placeholder={field.placeholder || `${field.label} दर्ज करें`}
            value={value}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920] transition-all shadow-xs"
            required={isRequired}
          />
          {field.helpText && <p className="text-[10px] text-gray-400 mt-1">{field.helpText}</p>}
        </div>
      );
    }

    // Radio
    if (field.type === 'radio') {
      return (
        <div key={field.key} className="space-y-1">
          <label className="block text-xs font-bold text-gray-700 mb-2">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl cursor-pointer text-xs font-semibold hover:border-[#f37920] bg-white transition-all shadow-xs">
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
      <div key={field.key} className="space-y-1">
        <label className="block text-xs font-bold text-gray-700" htmlFor={field.key}>
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
          className={`w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37920] transition-all shadow-xs ${
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
    if (currentStep > 0) {
      handlePrev();
      return;
    }
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
      </div>

      {/* Step Tabs Indicator */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === idx;
            const isCompleted = currentStep > idx;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (idx < currentStep || validateStep(currentStep)) {
                    setCurrentStep(idx);
                  }
                }}
                className="flex-1 flex flex-col items-center gap-1 relative z-10 group"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                    isActive
                      ? 'text-white shadow-md scale-105 ring-4 ring-orange-100'
                      : isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  style={isActive ? { backgroundColor: primaryColor || '#f37920' } : {}}
                >
                  {isCompleted ? <HiCheck className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[11px] font-bold transition-colors ${
                    isActive
                      ? 'text-gray-900'
                      : isCompleted
                      ? 'text-emerald-700'
                      : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="w-full max-w-md mx-auto space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                {currentStepData.title}
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">{currentStepData.subtitle} (Step {currentStep + 1} of {steps.length})</p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-orange-50 text-[#f37920]">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {fetchingSchema ? (
            <LoadingSpinner message="पंजीकरण फॉर्म लोड हो रहा है..." />
          ) : currentStepData.fields.length > 0 ? (
            // Render only the active tab's fields
            currentStepData.fields.map(field => renderDynamicField(field))
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              इस चरण में कोई फ़ील्ड नहीं है। अगले चरण पर जाएँ।
            </div>
          )}

        </div>
      </div>

      {/* Fixed bottom multi-step navigation button */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              disabled={loading || fetchingSchema}
              onClick={handlePrev}
              className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl active:scale-95 transition-all text-center text-sm"
            >
              Previous / पीछे
            </button>
          )}

          <button 
            type="button" 
            disabled={loading || fetchingSchema}
            onClick={handleNext} 
            className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-60 text-sm"
            style={{ backgroundColor: primaryColor || '#f37920' }}
          >
            {loading ? (
              <span>Saving...</span>
            ) : currentStep < steps.length - 1 ? (
              <>
                <span>Next / आगे बढ़ें</span>
                <HiArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <HiCheck className="w-4 h-4" />
                <span>Submit & Complete / सबमिट करें</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
