import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  HiArrowLeft, 
  HiPlus, 
  HiXMark, 
  HiSparkles,
  HiPhoto,
  HiMapPin
} from 'react-icons/hi2';
import { 
  FaDroplet, 
  FaRoad, 
  FaBoltLightning, 
  FaBroom, 
  FaGraduationCap, 
  FaHospital, 
  FaClipboardList
} from 'react-icons/fa6';

export default function ComplaintPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const fileInputRef = useRef(null);
  const { primaryColor } = useTenant();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [areasList, setAreasList] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    landmark: '',
    title: '',
    description: ''
  });
  
  const [images, setImages] = useState([]); // [{ file, url }]
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  // Category fallback themes
  const getCategoryTheme = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('road') || n.includes('pothole') || n.includes('sadak')) {
      return { icon: <FaRoad className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50', nameHi: 'सड़क व गड्ढे' };
    }
    if (n.includes('elect') || n.includes('bijli') || n.includes('light') || n.includes('wire')) {
      return { icon: <FaBoltLightning className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-50', nameHi: 'बिजली व लाइट' };
    }
    if (n.includes('water') || n.includes('jal') || n.includes('pipe') || n.includes('supply')) {
      return { icon: <FaDroplet className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50', nameHi: 'जल आपूर्ति' };
    }
    if (n.includes('garbage') || n.includes('kachra') || n.includes('clean') || n.includes('drain') || n.includes('sewer') || n.includes('sanitat')) {
      return { icon: <FaBroom className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', nameHi: 'सफाई व नाली' };
    }
    if (n.includes('health') || n.includes('hospital') || n.includes('doctor') || n.includes('swasthya')) {
      return { icon: <FaHospital className="w-5 h-5 text-rose-500" />, bg: 'bg-rose-50', nameHi: 'स्वास्थ्य केंद्र' };
    }
    if (n.includes('school') || n.includes('edu') || n.includes('shiksha')) {
      return { icon: <FaGraduationCap className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50', nameHi: 'शिक्षा व स्कूल' };
    }
    return { icon: <FaClipboardList className="w-5 h-5 text-slate-600" />, bg: 'bg-slate-100', nameHi: 'सामान्य समस्या' };
  };

  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Fetch Areas
      try {
        const areaRes = await api.getAreaTree().catch(() => null);
        let extractedAreas = [];
        if (areaRes && areaRes.tree && Array.isArray(areaRes.tree)) {
          const flatten = (nodes) => {
            let result = [];
            nodes.forEach(node => {
              result.push({ _id: node._id, name: node.name, code: node.code });
              if (node.children && node.children.length > 0) result = result.concat(flatten(node.children));
            });
            return result;
          };
          extractedAreas = flatten(areaRes.tree);
        } else if (Array.isArray(areaRes)) {
          extractedAreas = areaRes.map(a => ({ _id: a._id, name: a.name, code: a.code }));
        }
        if (extractedAreas.length > 0) {
          setAreasList(extractedAreas);
          setSelectedAreaId(extractedAreas[0]._id);
        }
      } catch (err) {
        console.warn('Could not load areas:', err);
      }

      // 2. Fetch Categories
      try {
        const catRes = await api.getComplaintCategories().catch(() => null);
        const catList = Array.isArray(catRes) ? catRes : (catRes?.data || []);
        if (catList.length > 0) {
          const mapped = catList.map(c => {
            const theme = getCategoryTheme(c.name || '');
            return { id: c.name, name: c.name, nameHi: theme.nameHi };
          });
          setCategories(mapped);
          setSelectedCategory(mapped[0].id);
        } else {
          const defaultList = [
            { id: 'Roads', name: 'Roads & Potholes', nameHi: 'सड़क व गड्ढे' },
            { id: 'Electricity', name: 'Electricity / Light', nameHi: 'बिजली व लाइट' },
            { id: 'Water', name: 'Water Supply', nameHi: 'जल आपूर्ति' },
            { id: 'Sanitation', name: 'Sanitation & Drains', nameHi: 'सफाई व नाली' },
            { id: 'Health', name: 'Health & Clinic', nameHi: 'स्वास्थ्य केंद्र' },
            { id: 'Education', name: 'Schools & Education', nameHi: 'शिक्षा व स्कूल' },
            { id: 'Other', name: 'Other Grievances', nameHi: 'सामान्य समस्या' },
          ];
          setCategories(defaultList);
          setSelectedCategory(defaultList[0].id);
        }
      } catch (catErr) {
        console.warn('Could not load categories:', catErr);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleImagePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.warning(language === 'en' ? 'You can attach a maximum of 5 images' : 'अधिकतम 5 फोटो जोड़ सकते हैं');
      return;
    }
    const newImgs = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setImages(prev => [...prev, ...newImgs]);
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = storage.getToken() || api.getToken();
    if (!token) {
      toast.info(language === 'en' ? 'Please log in to submit a complaint' : 'शिकायत दर्ज करने के लिए कृपया लॉगिन करें');
      navigate('/login');
      return;
    }
    if (!selectedCategory || !formData.title.trim() || !formData.description.trim()) {
      toast.error(language === 'en' ? 'Please fill all required fields' : 'कृपया सभी आवश्यक फ़ील्ड भरें');
      return;
    }

    try {
      setIsSubmitting(true);
      const uploadedImageUrls = [];
      const filesToUpload = images.filter(img => img.file).map(img => img.file);
      
      if (filesToUpload.length > 0) {
        try {
          const uploadRes = await api.uploadFiles('complaints', filesToUpload);
          if (uploadRes && Array.isArray(uploadRes.urls)) uploadedImageUrls.push(...uploadRes.urls);
        } catch (upErr) {
          console.warn('Failed to upload image:', upErr);
        }
      }

      const complaintData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: selectedCategory,
        priority: 'medium',
        areaId: selectedAreaId || undefined,
        landmark: formData.landmark.trim() || undefined,
        attachments: uploadedImageUrls,
        mediaUrls: uploadedImageUrls
      };

      const result = await api.createComplaint(complaintData);
      toast.success(language === 'en' ? 'Complaint registered successfully!' : 'शिकायत सफलतापूर्वक दर्ज की गई!');
      const localRecord = {
        _id: result?.data?._id || result?._id || `LOCAL_${Date.now()}`,
        id: result?.complaintNumber || `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
        title: formData.title,
        category: selectedCategory,
        priority: 'Medium',
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      storage.addComplaint(localRecord);
      navigate('/my-complaints');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || (language === 'en' ? 'Submission failed' : 'शिकायत दर्ज नहीं हो सकी'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-all"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate">
            {language === 'en' ? 'Submit Complaint' : 'शिकायत दर्ज करें'}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message={t('loading')} />
        </div>
      ) : (
        <div className="flex-1 w-full overflow-y-auto">
          <div className="p-4 pb-28 flex flex-col gap-5 max-w-lg mx-auto">
            
            {/* Step 1: Category Selection */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center" 
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    1
                  </span>
                  <h2 className="text-sm font-black text-gray-900">{t('selectCategory')}</h2>
                </div>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-xs font-bold text-gray-800 outline-none appearance-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.nameHi ? `(${cat.nameHi})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Area & Landmark */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span 
                  className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center" 
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  2
                </span>
                <h2 className="text-sm font-black text-gray-900">{t('areaDetails')}</h2>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <HiMapPin className="w-4 h-4" /> {t('constituency')} / Ward *
                </label>
                <select 
                  value={selectedAreaId} 
                  onChange={(e) => setSelectedAreaId(e.target.value)} 
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs font-bold"
                >
                  {areasList.map(a => (
                    <option key={a._id} value={a._id}>{a.name} {a.code ? `(${a.code})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('landmark')}</label>
                <input 
                  type="text" 
                  placeholder={language === 'en' ? 'e.g. Near Shiv Mandir, Main Road...' : 'उदा. शिव मंदिर के पास, मुख्य मार्ग...'}
                  value={formData.landmark} 
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })} 
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs" 
                />
              </div>
            </div>

            {/* Step 3: Complaint Details & Photos */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span 
                  className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center" 
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  3
                </span>
                <h2 className="text-sm font-black text-gray-900">{t('complaintDetails')}</h2>
              </div>
              <input 
                type="text" 
                placeholder={t('complaintTitlePlaceholder')} 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs" 
              />
              <textarea 
                rows="4" 
                placeholder={t('complaintDescPlaceholder')} 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
              />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <HiPhoto className="w-4 h-4" /> {t('attachPhotos')} ({images.length}/5)
                  </label>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImagePick} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {images.length < 5 && (
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current && fileInputRef.current.click()} 
                      className="w-20 h-20 shrink-0 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 border-gray-300 hover:border-gray-400 bg-gray-50"
                    >
                      <HiPlus className="w-5 h-5" />
                      <span className="text-[0.65rem] font-bold">{t('addPhoto')}</span>
                    </button>
                  )}
                  {images.map((item, idx) => (
                    <div key={idx} className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden relative border border-gray-200 bg-gray-100">
                      <img src={item.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm"
                      >
                        <HiXMark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 text-white font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              <HiSparkles className="w-5 h-5" />
              <span>{isSubmitting ? (language === 'en' ? 'Submitting Complaint...' : 'शिकायत दर्ज हो रही है...') : (language === 'en' ? 'Submit Complaint' : 'शिकायत दर्ज करें')}</span>
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
