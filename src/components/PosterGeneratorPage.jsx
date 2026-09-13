import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { getMediaUrl } from '../utils/mediaUrl';
import { shareContent, downloadMedia } from '../utils/shareAndDownload';
import { toast } from 'react-toastify';
import { 
  HiArrowLeft, 
  HiArrowDownTray, 
  HiShare, 
  HiPhoto, 
  HiPlus, 
  HiMinus,
  HiTrash, 
  HiArrowsPointingOut, 
  HiCheck, 
  HiArrowPath,
  HiDocumentArrowDown,
  HiAdjustmentsHorizontal,
  HiXMark,
  HiPencilSquare,
  HiDocumentDuplicate,
  HiSquare2Stack,
  HiSwatch,
  HiSparkles,
  HiEye,
  HiFolderArrowDown,
  HiBookmark,
  HiBookmarkSquare,
  HiCloudArrowUp,
  HiArrowUpTray,
  HiEllipsisVertical
} from 'react-icons/hi2';
import { FaBold, FaPalette, FaShapes } from 'react-icons/fa6';

export const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', subHi: 'इंस्टा / FB पोस्ट', subEn: 'Instagram / FB Post', width: 1080, height: 1080, aspectClass: 'aspect-square' },
  { id: '4:5', label: '4:5 Portrait', subHi: 'पोर्ट्रेट फ़ीड', subEn: 'Portrait Feed Post', width: 1080, height: 1350, aspectClass: 'aspect-[4/5]' },
  { id: '9:16', label: '9:16 Story', subHi: 'WhatsApp स्टेटस / स्टोरी', subEn: 'WhatsApp Status / Reel', width: 1080, height: 1920, aspectClass: 'aspect-[9/16]' },
  { id: '16:9', label: '16:9 Landscape', subHi: 'बैनर / चौड़ा पोस्टर', subEn: 'Banner / Screen', width: 1920, height: 1080, aspectClass: 'aspect-video' },
  { id: '3:4', label: '3:4 Classic', subHi: 'मानक पोस्टर', subEn: 'Standard Poster', width: 1080, height: 1440, aspectClass: 'aspect-[3/4]' },
];

const COLOR_SWATCHES = [
  '#ffffff',
  '#fbbf24', // Gold
  '#f97316', // Orange
  '#38bdf8', // Sky Blue
  '#4ade80', // Green
  '#f43f5e', // Rose / Red
  '#a855f7', // Purple
  '#0f172a', // Dark Navy
];

export default function PosterGeneratorPage() {
  const navigate = useNavigate();
  const { primaryColor = '#ea580c', secondaryColor = '#0f172a', leaderName, logoUrl, appTitle } = useTenant();
  const { t, language } = useLanguage();

  // Selected Aspect Ratio & Scale
  const [selectedRatio, setSelectedRatio] = useState('4:5');
  const [canvasScale, setCanvasScale] = useState(330); // Max width in pixels (270 to 400)

  // Categories & Templates
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Canvas Refs & State
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const customBgInputRef = useRef(null);
  const inlineInputRef = useRef(null);

  // Background Image
  const [bgImage, setBgImage] = useState(null);

  // Canvas Elements
  const [photos, setPhotos] = useState([]);
  const [textElements, setTextElements] = useState([]);
  
  // Canva Selection & Editing State
  const [activeElement, setActiveElement] = useState(null); // { type: 'text' | 'photo', id }
  const [editingTextId, setEditingTextId] = useState(null); // When user is actively typing directly into canvas text
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Dragging Refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const elementStartPosRef = useRef({ x: 0, y: 0 });

  // Quick Inputs (synced with default template texts)
  const [userName, setUserName] = useState('');
  const [userDesignation, setUserDesignation] = useState('');

  // Active Bottom Drawer Tab: 'templates' | 'text' | 'photo' | 'uploads' | 'my-posters' | 'size' | 'custom-bg'
  const [activeTab, setActiveTab] = useState('templates');

  // Canva Saved Posters & Uploads Library
  const [savedPosters, setSavedPosters] = useState([]);
  const [savedUploads, setSavedUploads] = useState([]);
  const [currentPosterId, setCurrentPosterId] = useState(null);
  const [isSavingPoster, setIsSavingPoster] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportedImageUrl, setExportedImageUrl] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const currentRatioObj = ASPECT_RATIOS.find(r => r.id === selectedRatio) || ASPECT_RATIOS[1];

  // Initial Setup
  useEffect(() => {
    // Load Saved Posters & Uploads from storage
    setSavedPosters(storage.getSavedPosters());
    setSavedUploads(storage.getSavedUploads());

    const user = storage.getUser() || {};
    const name = user.name || '';
    const phone = user.mobile || user.phone || '';
    const initialPhoto = user.photo ? getMediaUrl(user.photo) : null;

    setUserName(name);
    setUserDesignation(language === 'en' ? 'Supporter / Citizen' : 'शुभचिंतक / नागरिक');

    // Default Text Overlays with professional typography
    const initialTexts = [
      {
        id: 'name-txt',
        text: name || (language === 'en' ? 'Your Name' : 'आपका नाम'),
        x: 50,
        y: 86,
        fontSize: 17,
        color: '#ffffff',
        fontWeight: '800',
        textAlign: 'center',
        bg: primaryColor,
        isBadge: true,
        padding: '5px 16px',
        borderRadius: '10px'
      },
      {
        id: 'desig-txt',
        text: language === 'en' ? 'Supporter / Citizen' : 'शुभचिंतक / नागरिक',
        x: 50,
        y: 93,
        fontSize: 11,
        color: '#1e293b',
        fontWeight: '700',
        textAlign: 'center',
        bg: '#ffffff',
        isBadge: true,
        padding: '3px 12px',
        borderRadius: '8px'
      }
    ];
    setTextElements(initialTexts);

    if (initialPhoto) {
      setPhotos([
        {
          id: 'user-main-photo',
          src: initialPhoto,
          x: 20,
          y: 78,
          size: 78,
          shape: 'circle',
          border: true,
          borderColor: '#ffffff'
        }
      ]);
    }

    loadCategoriesAndTemplates();
  }, [language]);

  useEffect(() => {
    loadCategoriesAndTemplates(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    if (editingTextId && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [editingTextId]);

  const loadCategoriesAndTemplates = async (cat = 'All') => {
    try {
      setIsLoading(true);
      const [catRes, tempRes] = await Promise.all([
        api.getPosterCategories().catch(() => []),
        api.getPosterTemplates(cat).catch(() => [])
      ]);

      if (Array.isArray(catRes) && catRes.length > 0) {
        setCategories(['All', ...new Set(catRes.filter(Boolean))]);
      }

      const list = Array.isArray(tempRes) ? tempRes : (tempRes?.data || tempRes?.items || []);
      if (list.length > 0) {
        setTemplates(list);
        if (!selectedTemplate) {
          applyTemplate(list[0]);
        }
      } else {
        const fallbackList = [
          { 
            _id: 'fb1', 
            title: language === 'en' ? 'Festival Greetings Poster' : 'होली महापर्व की शुभकामनाएं', 
            category: 'Festival', 
            dimensionPreset: '1080x1080',
            templateImageUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&q=80&w=700' 
          },
          { 
            _id: 'fb2', 
            title: language === 'en' ? 'Diwali Mahotsav Greetings' : 'दीपावली महोत्सव बधाई', 
            category: 'Festival', 
            dimensionPreset: '1080x1350',
            templateImageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=700' 
          },
          { 
            _id: 'fb3', 
            title: language === 'en' ? 'Birthday Wishes Greeting' : 'जन्मदिन की हार्दिक बधाई', 
            category: 'Greetings', 
            dimensionPreset: '1080x1920',
            templateImageUrl: 'https://images.unsplash.com/photo-1525013066836-c6090f0ad9d8?auto=format&fit=crop&q=80&w=700' 
          }
        ];
        setTemplates(fallbackList);
        if (!selectedTemplate) {
          applyTemplate(fallbackList[0]);
        }
      }
    } catch (err) {
      console.warn('Error loading poster templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = (template) => {
    if (!template) return;
    setSelectedTemplate(template);
    const imgUrl = getMediaUrl(template.templateImageUrl || template.imageUrl) || template.templateImageUrl;
    setBgImage(imgUrl);
    setExportedImageUrl(null);

    // Auto-detect aspect ratio from preset
    if (template.dimensionPreset) {
      if (template.dimensionPreset === '1080x1080' || template.dimensionPreset === '1:1') setSelectedRatio('1:1');
      else if (template.dimensionPreset === '1080x1350' || template.dimensionPreset === '4:5') setSelectedRatio('4:5');
      else if (template.dimensionPreset === '1080x1920' || template.dimensionPreset === '9:16') setSelectedRatio('9:16');
      else if (template.dimensionPreset === '1920x1080' || template.dimensionPreset === '16:9') setSelectedRatio('16:9');
      else if (template.dimensionPreset === '1080x1440' || template.dimensionPreset === '3:4') setSelectedRatio('3:4');
    }

    // Sync template fields
    if (Array.isArray(template.fields) && template.fields.length > 0) {
      const photoField = template.fields.find(f => f.type === 'photo');
      if (photoField && photoField.position) {
        setPhotos(prev => prev.map(p => ({
          ...p,
          x: photoField.position.x !== undefined ? photoField.position.x : p.x,
          y: photoField.position.y !== undefined ? photoField.position.y : p.y,
          shape: photoField.style?.maskShape === 'square' ? 'square' : (photoField.style?.maskShape === 'circle' ? 'circle' : 'rounded'),
        })));
      }

      const nameField = template.fields.find(f => f.key === 'name');
      if (nameField && nameField.position) {
        setTextElements(prev => prev.map(tEl => {
          if (tEl.id === 'name-txt') {
            return {
              ...tEl,
              x: nameField.position.x !== undefined ? nameField.position.x : tEl.x,
              y: nameField.position.y !== undefined ? nameField.position.y : tEl.y,
              color: nameField.style?.fontColor || tEl.color,
            };
          }
          return tEl;
        }));
      }

      const desigField = template.fields.find(f => f.key === 'designation');
      if (desigField && desigField.position) {
        setTextElements(prev => prev.map(tEl => {
          if (tEl.id === 'desig-txt') {
            return {
              ...tEl,
              x: desigField.position.x !== undefined ? desigField.position.x : tEl.x,
              y: desigField.position.y !== undefined ? desigField.position.y : tEl.y,
              color: desigField.style?.fontColor || tEl.color,
            };
          }
          return tEl;
        }));
      }
    }
  };

  const updateUserNameText = (newName) => {
    setUserName(newName);
    setTextElements(prev => prev.map(tEl => tEl.id === 'name-txt' ? { ...tEl, text: newName || (language === 'en' ? 'Your Name' : 'आपका नाम') } : tEl));
  };

  const updateUserDesignationText = (newDesig) => {
    setUserDesignation(newDesig);
    setTextElements(prev => prev.map(tEl => tEl.id === 'desig-txt' ? { ...tEl, text: newDesig || (language === 'en' ? 'Supporter' : 'शुभचिंतक') } : tEl));
  };

  // ----------------------------------------------------
  // Canva Text Actions
  // ----------------------------------------------------
  const handleAddTextPreset = (presetType) => {
    let newElement = {
      id: `text-${Date.now()}`,
      x: 50,
      y: 45,
      textAlign: 'center',
      borderRadius: '8px'
    };

    if (presetType === 'heading') {
      newElement = {
        ...newElement,
        text: language === 'en' ? 'Add a Heading' : 'मुख्य शीर्षक लिखें',
        fontSize: 22,
        color: '#ffffff',
        fontWeight: '800',
        bg: 'rgba(15, 23, 42, 0.75)',
        isBadge: true,
        padding: '6px 16px',
      };
    } else if (presetType === 'subheading') {
      newElement = {
        ...newElement,
        text: language === 'en' ? 'Add a Subheading' : 'उप-शीर्षक लिखें',
        fontSize: 16,
        color: '#fbbf24',
        fontWeight: '700',
        bg: 'rgba(15, 23, 42, 0.65)',
        isBadge: true,
        padding: '4px 12px',
      };
    } else if (presetType === 'slogan') {
      newElement = {
        ...newElement,
        text: language === 'en' ? '★ Official Slogan Banner ★' : '★ जन-जन की आवाज • सबका विकास ★',
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '800',
        bg: primaryColor,
        isBadge: true,
        padding: '5px 14px',
      };
    } else {
      newElement = {
        ...newElement,
        text: language === 'en' ? 'Type your message...' : 'यहाँ अपना संदेश लिखें...',
        fontSize: 13,
        color: '#ffffff',
        fontWeight: '600',
        bg: 'transparent',
        isBadge: false,
        padding: '2px 8px',
      };
    }

    setTextElements(prev => [...prev, newElement]);
    setActiveElement({ type: 'text', id: newElement.id });
    setEditingTextId(newElement.id);
    toast.success(language === 'en' ? 'Text added! Type directly on banner.' : 'टेक्स्ट जोड़ा गया! सीधे बैनर पर टाइप करें।');
  };

  const handleDuplicateActive = () => {
    if (!activeElement) return;

    if (activeElement.type === 'text') {
      const original = textElements.find(tEl => tEl.id === activeElement.id);
      if (!original) return;
      const dup = {
        ...original,
        id: `text-${Date.now()}`,
        x: Math.min(original.x + 5, 90),
        y: Math.min(original.y + 5, 90)
      };
      setTextElements(prev => [...prev, dup]);
      setActiveElement({ type: 'text', id: dup.id });
      toast.success(language === 'en' ? 'Text duplicated!' : 'टेक्स्ट कॉपी हो गया!');
    } else if (activeElement.type === 'photo') {
      const original = photos.find(p => p.id === activeElement.id);
      if (!original) return;
      const dup = {
        ...original,
        id: `photo-${Date.now()}`,
        x: Math.min(original.x + 5, 90),
        y: Math.min(original.y + 5, 90)
      };
      setPhotos(prev => [...prev, dup]);
      setActiveElement({ type: 'photo', id: dup.id });
      toast.success(language === 'en' ? 'Photo duplicated!' : 'फोटो कॉपी हो गई!');
    }
  };

  const handleDeleteActive = () => {
    if (!activeElement) return;
    if (activeElement.type === 'photo') {
      setPhotos(prev => prev.filter(p => p.id !== activeElement.id));
      toast.info(language === 'en' ? 'Photo deleted' : 'फोटो हटाई गई');
    } else if (activeElement.type === 'text') {
      setTextElements(prev => prev.filter(tEl => tEl.id !== activeElement.id));
      toast.info(language === 'en' ? 'Text deleted' : 'टेक्स्ट हटाया गया');
    }
    setActiveElement(null);
    setEditingTextId(null);
  };

  const handleUpdateActiveTextColor = (color) => {
    if (!activeElement || activeElement.type !== 'text') return;
    setTextElements(prev => prev.map(tEl => tEl.id === activeElement.id ? { ...tEl, color } : tEl));
    setShowColorPicker(false);
  };

  const handleToggleBadge = () => {
    if (!activeElement || activeElement.type !== 'text') return;
    setTextElements(prev => prev.map(tEl => {
      if (tEl.id === activeElement.id) {
        const nextState = !tEl.isBadge;
        return {
          ...tEl,
          isBadge: nextState,
          bg: nextState ? (tEl.bg && tEl.bg !== 'transparent' ? tEl.bg : primaryColor) : 'transparent',
          padding: nextState ? '4px 14px' : '0px'
        };
      }
      return tEl;
    }));
  };

  // 🌟 Canva-Style "Save Template" Handler (Always saves as a NEW entry, never replaces)
  const handleSavePoster = async () => {
    try {
      setIsSavingPoster(true);
      
      // 1. Generate a fast, lightweight thumbnail for storage (300px width max)
      let thumb = null;
      try {
        thumb = await renderCanvasToImage(300);
      } catch (e) {
        console.warn('Could not generate canvas thumbnail:', e);
      }

      // 🌟 Always generate a new unique ID so it never replaces/overrides existing templates
      const newPosterId = `poster-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const posterRecord = {
        id: newPosterId,
        title: userName ? `${userName} Poster` : (selectedTemplate?.title || 'Custom Template'),
        thumbnail: thumb || bgImage || null,
        bgImage,
        selectedRatio,
        canvasScale,
        selectedTemplateId: selectedTemplate?._id || selectedTemplate?.id || null,
        photos,
        textElements,
        userName,
        userDesignation,
        savedAt: new Date().toISOString()
      };

      const updatedList = storage.savePoster(posterRecord);
      setSavedPosters(updatedList);
      setCurrentPosterId(newPosterId);
      
      // Auto-switch to My Templates tab so user sees the new entry right away!
      setActiveTab('my-templates');
      toast.success(language === 'en' ? 'New template saved to My Templates!' : 'नया टेम्पलेट माई टेम्पलेट्स में सेव हो गया!');
    } catch (err) {
      console.error('Error saving poster template:', err);
      toast.error(language === 'en' ? 'Failed to save template' : 'टेम्पलेट सेव करने में त्रुटि हुई');
    } finally {
      setIsSavingPoster(false);
    }
  };

  // 🌟 Load Saved Poster into Editor
  const handleLoadSavedPoster = (poster) => {
    if (!poster) return;
    setCurrentPosterId(poster.id);
    if (poster.selectedRatio) setSelectedRatio(poster.selectedRatio);
    if (poster.canvasScale) setCanvasScale(poster.canvasScale);
    if (poster.bgImage) setBgImage(poster.bgImage);
    if (poster.photos) setPhotos(poster.photos);
    if (poster.textElements) setTextElements(poster.textElements);
    if (poster.userName !== undefined) setUserName(poster.userName);
    if (poster.userDesignation !== undefined) setUserDesignation(poster.userDesignation);
    
    if (poster.selectedTemplateId) {
      const match = templates.find(t => (t._id || t.id) === poster.selectedTemplateId);
      if (match) setSelectedTemplate(match);
    } else {
      setSelectedTemplate(null);
    }

    setExportedImageUrl(null);
    setActiveElement(null);
    setEditingTextId(null);
    toast.success(language === 'en' ? 'Poster loaded successfully!' : 'पोस्टर लोड हो गया!');
  };

  // 🌟 Delete Saved Poster
  const handleDeleteSavedPoster = (e, id) => {
    e.stopPropagation();
    const updated = storage.deleteSavedPoster(id);
    setSavedPosters(updated);
    if (currentPosterId === id) {
      setCurrentPosterId(null);
    }
    toast.info(language === 'en' ? 'Saved poster deleted' : 'सेव किया गया पोस्टर हटा दिया गया');
  };

  // 🌟 Add Reusable Uploaded Photo directly to Canvas
  const handleAddUploadToCanvas = (uploadItem) => {
    const newPhoto = {
      id: `photo-${Date.now()}`,
      src: uploadItem.src,
      x: 50,
      y: 65,
      size: 92,
      shape: 'circle',
      border: true,
      borderColor: '#ffffff'
    };
    setPhotos(prev => [...prev, newPhoto]);
    setActiveElement({ type: 'photo', id: newPhoto.id });
    toast.success(language === 'en' ? 'Photo added to canvas!' : 'फोटो जोड़ी गई!');
  };

  // 🌟 Delete Reusable Upload from Library
  const handleDeleteSavedUpload = (e, id) => {
    e.stopPropagation();
    const updated = storage.deleteSavedUpload(id);
    setSavedUploads(updated);
    toast.info(language === 'en' ? 'Photo removed from library' : 'फोटो गैलरी से हटा दी गई');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const newPhoto = {
        id: `photo-${Date.now()}`,
        src,
        x: 50,
        y: 65,
        size: 92,
        shape: 'circle',
        border: true,
        borderColor: '#ffffff'
      };
      setPhotos(prev => [...prev, newPhoto]);
      setActiveElement({ type: 'photo', id: newPhoto.id });
      
      // Also persist to Reusable Uploads Library
      const updatedUploads = storage.addSavedUpload({
        id: `upload-${Date.now()}`,
        name: file.name || 'Photo',
        src
      });
      setSavedUploads(updatedUploads);

      toast.success(language === 'en' ? 'Photo added & saved to Uploads!' : 'फोटो जोड़ी गई और अपलोड्स में सेव हो गई!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCustomBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      setBgImage(src);
      setSelectedTemplate(null);
      setExportedImageUrl(null);

      // Also persist to Reusable Uploads Library
      const updatedUploads = storage.addSavedUpload({
        id: `upload-${Date.now()}`,
        name: file.name || 'Background Image',
        src
      });
      setSavedUploads(updatedUploads);

      toast.success(language === 'en' ? 'Custom background set & saved to Uploads!' : 'कस्टम बैकग्राउंड सेट और अपलोड्स में सेव हुआ!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Dragging logic
  const handlePointerDown = (e, type, id) => {
    e.stopPropagation();
    setActiveElement({ type, id });
    if (type === 'text') {
      setEditingTextId(id);
    } else {
      setEditingTextId(null);
    }
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (type === 'photo') {
      const item = photos.find(p => p.id === id);
      if (item) elementStartPosRef.current = { x: item.x, y: item.y };
    } else {
      const item = textElements.find(tEl => tEl.id === id);
      if (item) elementStartPosRef.current = { x: item.x, y: item.y };
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !activeElement || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

    const newX = Math.min(Math.max(elementStartPosRef.current.x + deltaX, 5), 95);
    const newY = Math.min(Math.max(elementStartPosRef.current.y + deltaY, 5), 95);

    if (activeElement.type === 'photo') {
      setPhotos(prev => prev.map(p => p.id === activeElement.id ? { ...p, x: newX, y: newY } : p));
    } else {
      setTextElements(prev => prev.map(tEl => tEl.id === activeElement.id ? { ...tEl, x: newX, y: newY } : tEl));
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleRatioChange = (ratioId) => {
    setSelectedRatio(ratioId);
    setExportedImageUrl(null);
  };

  // High-Resolution Canvas Rendering Engine (Exact Selected Aspect Ratio & Cover Fit)
  const renderCanvasToImage = async (customWidth = null) => {
    if (!canvasRef.current) return null;
    if (!customWidth) setIsExporting(true);

    try {
      setActiveElement(null);
      setEditingTextId(null);
      await new Promise(r => setTimeout(r, 60));

      const ratioConfig = currentRatioObj;
      const targetWidth = customWidth ? customWidth : ratioConfig.width;
      const targetHeight = customWidth ? Math.round(customWidth * (ratioConfig.height / ratioConfig.width)) : ratioConfig.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      // 1. Background Layer (Exact cover fitting proportional to selected aspect ratio)
      if (bgImage) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          bgImg.onload = resolve;
          bgImg.onerror = resolve;
          bgImg.src = bgImage;
        });

        if (bgImg.width && bgImg.height) {
          const imgRatio = bgImg.width / bgImg.height;
          const canvasRatio = targetWidth / targetHeight;
          let srcX = 0, srcY = 0, srcW = bgImg.width, srcH = bgImg.height;

          if (imgRatio > canvasRatio) {
            // Image is wider than canvas -> crop sides
            srcW = bgImg.height * canvasRatio;
            srcX = (bgImg.width - srcW) / 2;
          } else {
            // Image is taller than canvas -> crop top/bottom
            srcH = bgImg.width / canvasRatio;
            srcY = (bgImg.height - srcH) / 2;
          }
          ctx.drawImage(bgImg, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);
        } else {
          ctx.fillStyle = primaryColor;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
      } else {
        ctx.fillStyle = primaryColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // 2. Photos Layer
      for (const photo of photos) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = photo.src;
        });

        const px = (photo.x / 100) * targetWidth;
        const py = (photo.y / 100) * targetHeight;
        const previewCanvasWidth = canvasRef.current.offsetWidth || 340;
        const scaleFactor = targetWidth / previewCanvasWidth;
        const pSize = photo.size * scaleFactor;

        ctx.save();
        if (photo.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(px, py, pSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, px - pSize / 2, py - pSize / 2, pSize, pSize);
          ctx.restore();

          if (photo.border) {
            ctx.beginPath();
            ctx.arc(px, py, pSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = photo.borderColor || '#ffffff';
            ctx.lineWidth = Math.max(4, 3 * scaleFactor);
            ctx.stroke();
          }
        } else if (photo.shape === 'rounded') {
          const radius = Math.round(16 * scaleFactor);
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(px - pSize / 2, py - pSize / 2, pSize, pSize, radius);
          } else {
            ctx.rect(px - pSize / 2, py - pSize / 2, pSize, pSize);
          }
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, px - pSize / 2, py - pSize / 2, pSize, pSize);
          ctx.restore();

          if (photo.border) {
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(px - pSize / 2, py - pSize / 2, pSize, pSize, radius);
            } else {
              ctx.rect(px - pSize / 2, py - pSize / 2, pSize, pSize);
            }
            ctx.strokeStyle = photo.borderColor || '#ffffff';
            ctx.lineWidth = Math.max(4, 3 * scaleFactor);
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.rect(px - pSize / 2, py - pSize / 2, pSize, pSize);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, px - pSize / 2, py - pSize / 2, pSize, pSize);
          ctx.restore();

          if (photo.border) {
            ctx.beginPath();
            ctx.rect(px - pSize / 2, py - pSize / 2, pSize, pSize);
            ctx.strokeStyle = photo.borderColor || '#ffffff';
            ctx.lineWidth = Math.max(4, 3 * scaleFactor);
            ctx.stroke();
          }
        }
      }

      // 3. Texts Layer
      for (const el of textElements) {
        const tx = (el.x / 100) * targetWidth;
        const ty = (el.y / 100) * targetHeight;
        const previewCanvasWidth = canvasRef.current.offsetWidth || 340;
        const scaleFactor = targetWidth / previewCanvasWidth;
        const scaledFontSize = Math.round((el.fontSize || 16) * scaleFactor);

        ctx.font = `${el.fontWeight || 'bold'} ${scaledFontSize}px sans-serif`;
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'middle';

        if (el.isBadge && el.bg && el.bg !== 'transparent') {
          const metrics = ctx.measureText(el.text);
          const padX = Math.round(16 * scaleFactor);
          const padY = Math.round(8 * scaleFactor);
          const textW = metrics.width + padX * 2;
          const textH = scaledFontSize + padY * 2;
          
          ctx.fillStyle = el.bg;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(tx - textW / 2, ty - textH / 2, textW, textH, 10 * scaleFactor);
          } else {
            ctx.rect(tx - textW / 2, ty - textH / 2, textW, textH);
          }
          ctx.fill();
        }

        ctx.fillStyle = el.color || '#ffffff';
        ctx.fillText(el.text, tx, ty);
      }

      const dataUrl = customWidth ? canvas.toDataURL('image/jpeg', 0.75) : canvas.toDataURL('image/png', 1.0);
      if (!customWidth) {
        setExportedImageUrl(dataUrl);
      }
      return dataUrl;
    } catch (err) {
      console.error('Canvas export error:', err);
      toast.error(t('renderError'));
      return null;
    } finally {
      if (!customWidth) setIsExporting(false);
    }
  };

  // 1. Download as Image (PNG)
  const handleDownloadImage = async () => {
    setShowDownloadMenu(false);
    let url = exportedImageUrl;
    if (!url) {
      url = await renderCanvasToImage();
    }
    if (url) {
      downloadMedia(url, `poster-${selectedRatio.replace(':', 'x')}-${Date.now()}.png`);
      toast.success(t('posterDownloadedSuccess'));
    }
  };

  // 2. Download as PDF in matching aspect ratio (jsPDF)
  const handleDownloadPdf = async () => {
    setShowDownloadMenu(false);
    setIsExporting(true);
    try {
      let dataUrl = exportedImageUrl;
      if (!dataUrl) {
        dataUrl = await renderCanvasToImage();
      }
      if (!dataUrl) return;

      const ratioConfig = currentRatioObj;
      const isLandscape = ratioConfig.width > ratioConfig.height;

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [ratioConfig.width, ratioConfig.height]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, ratioConfig.width, ratioConfig.height, undefined, 'FAST');
      pdf.save(`poster-${selectedRatio.replace(':', 'x')}-${Date.now()}.pdf`);
      toast.success(t('pdfDownloadedSuccess'));
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error(language === 'en' ? 'Failed to generate PDF' : 'PDF तैयार करने में त्रुटि हुई');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    let url = exportedImageUrl;
    if (!url) {
      url = await renderCanvasToImage();
    }
    if (url) {
      shareContent({
        title: `${leaderName || appTitle} Poster`,
        text: `${userName ? `${userName} - ${userDesignation}` : (leaderName || 'Poster')}\n${window.location.origin}`,
        url: window.location.href
      });
    }
  };

  const activeSelectedText = activeElement?.type === 'text' ? textElements.find(tEl => tEl.id === activeElement.id) : null;
  const activeSelectedPhoto = activeElement?.type === 'photo' ? photos.find(p => p.id === activeElement.id) : null;

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 pb-20 select-none">
      
      {/* 🌟 Clean App Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight">{t('posterStudioTitle')}</h1>
              <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[0.6rem] font-black uppercase">
                {selectedRatio}
              </span>
            </div>
            <p className="text-[0.68rem] font-medium text-slate-500">{t('posterStudioTagline')}</p>
          </div>
        </div>

        {/* 🌟 3-Dot Actions Menu (Save Template, Download in PDF, Save as Image, Share) */}
        <div className="flex items-center gap-2 relative">
          
          {/* Quick Direct Save Button */}
          <button
            onClick={() => handleSavePoster()}
            disabled={isSavingPoster || isExporting}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
            title={language === 'en' ? 'Save Template' : 'टेम्पलेट सेव करें'}
          >
            {isSavingPoster ? <HiArrowPath className="w-3.5 h-3.5 animate-spin" /> : <HiBookmarkSquare className="w-3.5 h-3.5" />}
            <span>{language === 'en' ? 'Save' : 'सेव'}</span>
          </button>

          {/* 3-Dot Trigger Button */}
          <button 
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center justify-center active:scale-95 transition-all"
            title={language === 'en' ? 'Options' : 'विकल्प'}
          >
            <HiEllipsisVertical className="w-5 h-5 text-slate-800" />
          </button>

          {/* 3-Dot Dropdown Options Menu */}
          {showDownloadMenu && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-scale-up space-y-1">
              
              {/* Option 1: Save Template */}
              <button
                onClick={() => {
                  setShowDownloadMenu(false);
                  handleSavePoster();
                }}
                disabled={isSavingPoster}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-orange-50 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <HiBookmarkSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{language === 'en' ? 'Save Template' : 'Save Template (टेम्पलेट सेव करें)'}</p>
                  <p className="text-[0.6rem] text-slate-500">{language === 'en' ? 'Save to My Templates' : 'माई टेम्पलेट्स में सेव करें'}</p>
                </div>
              </button>

              {/* Option 2: Download in PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <HiDocumentArrowDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{language === 'en' ? 'Download in PDF' : 'Download in PDF (पीडीएफ डाउनलोड)'}</p>
                  <p className="text-[0.6rem] text-slate-500">Vector Print Ready ({selectedRatio})</p>
                </div>
              </button>

              {/* Option 3: Save as Image */}
              <button
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-50 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <HiPhoto className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{language === 'en' ? 'Save as Image' : 'Save as Image (फोटो डाउनलोड)'}</p>
                  <p className="text-[0.6rem] text-slate-500">HD PNG ({currentRatioObj.width}×{currentRatioObj.height})</p>
                </div>
              </button>

              {/* Option 4: Share Poster */}
              <button
                onClick={() => {
                  setShowDownloadMenu(false);
                  handleShare();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-colors border-t border-slate-100 pt-2"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <HiShare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{language === 'en' ? 'Share Poster' : 'Share Poster (शेयर करें)'}</p>
                  <p className="text-[0.6rem] text-slate-500">WhatsApp, Facebook & more</p>
                </div>
              </button>

            </div>
          )}
        </div>
      </header>

      {/* 🌟 Aspect Ratio Quick Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[0.68rem] font-bold text-slate-500 mr-1">Ratio:</span>
          {ASPECT_RATIOS.map((r) => {
            const isSelected = selectedRatio === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRatio(r.id)}
                className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-black transition-all shrink-0 ${
                  isSelected 
                    ? 'bg-slate-900 text-white shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.id}
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => setActiveTab('size')}
          className="text-[0.7rem] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-1 rounded-lg"
        >
          <HiAdjustmentsHorizontal className="w-3.5 h-3.5 text-orange-600" />
          <span>{language === 'en' ? 'Resize' : 'साइज'}</span>
        </button>
      </div>

      {/* 🌟 Main Canvas Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center p-3.5 overflow-y-auto">
        
        {/* Canvas Card Container */}
        <div 
          style={{ maxWidth: `${canvasScale}px` }}
          className="w-full bg-white rounded-3xl p-3 shadow-md border border-slate-200/80 flex flex-col items-center transition-all duration-300 relative"
        >
          
          <div 
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {
              setActiveElement(null);
              setEditingTextId(null);
              setShowColorPicker(false);
            }}
            className={`relative w-full ${currentRatioObj.aspectClass} rounded-2xl overflow-hidden shadow-inner bg-slate-900 border border-slate-200 flex items-center justify-center select-none touch-none`}
          >
            {/* Background Layer */}
            {bgImage ? (
              <img 
                src={bgImage} 
                alt="Poster Background" 
                className="w-full h-full object-cover pointer-events-none"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="text-center p-6 text-slate-400">
                <HiPhoto className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">{t('canvasSelectTemplateHint')}</p>
              </div>
            )}

            {/* Photos Layer with Canva-style bounding box */}
            {photos.map((photo) => {
              const isSelected = activeElement?.type === 'photo' && activeElement?.id === photo.id;
              return (
                <div
                  key={photo.id}
                  onPointerDown={(e) => handlePointerDown(e, 'photo', photo.id)}
                  style={{
                    left: `${photo.x}%`,
                    top: `${photo.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${photo.size}px`,
                    height: `${photo.size}px`,
                    borderColor: photo.borderColor || '#ffffff',
                  }}
                  className={`absolute cursor-move select-none z-10 transition-transform active:scale-105 ${
                    photo.shape === 'circle' ? 'rounded-full' : (photo.shape === 'square' ? 'rounded-none' : 'rounded-2xl')
                  } overflow-hidden ${photo.border ? 'border-2' : ''} ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-xl' : 'shadow-md'
                  }`}
                >
                  <img 
                    src={photo.src} 
                    alt="User Upload" 
                    className="w-full h-full object-cover pointer-events-none"
                    crossOrigin="anonymous"
                  />

                  {/* Canva selection indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-dashed border-blue-400 pointer-events-none rounded-inherit" />
                  )}
                </div>
              );
            })}

            {/* Text Elements Layer with Canva-style inline typing & bounding box */}
            {textElements.map((txt) => {
              const isSelected = activeElement?.type === 'text' && activeElement?.id === txt.id;
              const isEditingThis = editingTextId === txt.id;

              return (
                <div
                  key={txt.id}
                  onPointerDown={(e) => handlePointerDown(e, 'text', txt.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setActiveElement({ type: 'text', id: txt.id });
                    setEditingTextId(txt.id);
                  }}
                  style={{
                    left: `${txt.x}%`,
                    top: `${txt.y}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${txt.fontSize}px`,
                    color: txt.color,
                    fontWeight: txt.fontWeight,
                    textAlign: txt.textAlign,
                    backgroundColor: txt.bg || 'transparent',
                    padding: txt.padding || '0px',
                    borderRadius: txt.borderRadius || '0px',
                  }}
                  className={`absolute cursor-move select-none whitespace-nowrap z-20 transition-transform active:scale-105 shadow-md group ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white' : ''
                  }`}
                >
                  {isEditingThis ? (
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={txt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTextElements(prev => prev.map(tEl => tEl.id === txt.id ? { ...tEl, text: val } : tEl));
                      }}
                      onBlur={() => setEditingTextId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingTextId(null);
                      }}
                      style={{
                        fontSize: `${txt.fontSize}px`,
                        color: txt.color,
                        fontWeight: txt.fontWeight,
                        textAlign: txt.textAlign,
                        backgroundColor: 'transparent',
                      }}
                      className="outline-none border-b border-blue-400 px-1 min-w-[60px]"
                      autoFocus
                    />
                  ) : (
                    <span>{txt.text}</span>
                  )}

                  {/* Canva-style corner resize points on selection */}
                  {isSelected && (
                    <>
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-xs pointer-events-none" />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-xs pointer-events-none" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-xs pointer-events-none" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-xs pointer-events-none" />
                    </>
                  )}
                </div>
              );
            })}

            {/* Drag / Double Click Hint Indicator */}
            {activeElement && (
              <div className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[0.62rem] font-bold text-orange-400 border border-orange-500/30 flex items-center gap-1 shadow-sm">
                <HiArrowsPointingOut className="w-3 h-3" />
                <span>{language === 'en' ? 'Drag to position • Double-click text to type' : 'खिसकाने के लिए ड्रैग करें • टाइप करने हेतु डबल-क्लिक करें'}</span>
              </div>
            )}
          </div>

          {/* 🌟 Canva-Style Floating Action Bar when an element is selected */}
          {activeElement && (
            <div className="mt-3 w-full bg-slate-900 text-white rounded-2xl p-2 shadow-lg border border-slate-700 flex items-center justify-between gap-1 flex-wrap animate-fade-in">
              
              {/* Left Actions: Edit, Size, Color, Badge */}
              <div className="flex items-center gap-1 flex-wrap">
                {activeElement.type === 'text' && (
                  <>
                    <button
                      onClick={() => setEditingTextId(activeElement.id)}
                      title="Type Text"
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 text-sky-400"
                    >
                      <HiPencilSquare className="w-3.5 h-3.5" />
                      <span className="text-[0.65rem]">{language === 'en' ? 'Type' : 'टाइप करें'}</span>
                    </button>

                    {/* Font Size +/- */}
                    <div className="flex items-center bg-slate-800 rounded-lg px-1 py-0.5 text-xs">
                      <button
                        onClick={() => setTextElements(prev => prev.map(tEl => tEl.id === activeElement.id ? { ...tEl, fontSize: Math.max(10, tEl.fontSize - 2) } : tEl))}
                        className="p-1 hover:text-orange-400"
                      >
                        <HiMinus className="w-3 h-3" />
                      </button>
                      <span className="text-[0.65rem] font-bold px-1 text-slate-300">
                        {activeSelectedText?.fontSize || 16}
                      </span>
                      <button
                        onClick={() => setTextElements(prev => prev.map(tEl => tEl.id === activeElement.id ? { ...tEl, fontSize: Math.min(54, tEl.fontSize + 2) } : tEl))}
                        className="p-1 hover:text-orange-400"
                      >
                        <HiPlus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Color Swatch Trigger */}
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      title="Text Color"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1"
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white"
                        style={{ backgroundColor: activeSelectedText?.color || '#ffffff' }}
                      />
                    </button>

                    {/* Badge Background Toggle */}
                    <button
                      onClick={handleToggleBadge}
                      title="Toggle Background"
                      className={`p-1.5 rounded-lg text-xs font-bold ${
                        activeSelectedText?.isBadge ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-[0.65rem]">BG</span>
                    </button>
                  </>
                )}

                {activeElement.type === 'photo' && (
                  <>
                    {/* Photo Size +/- */}
                    <div className="flex items-center bg-slate-800 rounded-lg px-1 py-0.5 text-xs">
                      <button
                        onClick={() => setPhotos(prev => prev.map(p => p.id === activeElement.id ? { ...p, size: Math.max(30, p.size - 8) } : p))}
                        className="p-1 hover:text-orange-400"
                      >
                        <HiMinus className="w-3 h-3" />
                      </button>
                      <span className="text-[0.65rem] font-bold px-1 text-slate-300">
                        {activeSelectedPhoto?.size || 78}px
                      </span>
                      <button
                        onClick={() => setPhotos(prev => prev.map(p => p.id === activeElement.id ? { ...p, size: Math.min(240, p.size + 8) } : p))}
                        className="p-1 hover:text-orange-400"
                      >
                        <HiPlus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Shape Toggle */}
                    <button
                      onClick={() => setPhotos(prev => prev.map(p => p.id === activeElement.id ? { ...p, shape: p.shape === 'circle' ? 'rounded' : (p.shape === 'rounded' ? 'square' : 'circle') } : p))}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[0.65rem] font-bold flex items-center gap-1"
                    >
                      <FaShapes className="w-3 h-3 text-sky-400" />
                      <span>{activeSelectedPhoto?.shape}</span>
                    </button>

                    {/* Border Toggle */}
                    <button
                      onClick={() => setPhotos(prev => prev.map(p => p.id === activeElement.id ? { ...p, border: !p.border } : p))}
                      className={`px-2 py-1 rounded-lg text-[0.65rem] font-bold ${activeSelectedPhoto?.border ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Border
                    </button>
                  </>
                )}
              </div>

              {/* Right Common Actions: Duplicate, Delete, Done */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDuplicateActive}
                  title="Duplicate"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  <HiDocumentDuplicate className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleDeleteActive}
                  title="Delete"
                  className="p-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-300 hover:text-white"
                >
                  <HiTrash className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => { setActiveElement(null); setEditingTextId(null); }}
                  className="px-2 py-1 rounded-lg bg-slate-700 text-white text-[0.68rem] font-bold hover:bg-slate-600"
                >
                  <HiCheck className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Color Swatches Popover */}
              {showColorPicker && activeElement.type === 'text' && (
                <div className="w-full pt-2 mt-1 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[0.65rem] font-bold text-slate-400">Color:</span>
                  {COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => handleUpdateActiveTextColor(hex)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform active:scale-125 ${
                        activeSelectedText?.color === hex ? 'scale-110 border-white ring-2 ring-orange-500' : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      </main>

      {/* 🌟 Canva-Grade Bottom Toolkit (Clean SVG Icons, No Emojis) */}
      <section className="bg-white border-t border-slate-200 rounded-t-3xl p-4 shadow-xl space-y-3 shrink-0">
        
        {/* Navigation Tabs with SVG Icons */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'templates', label: language === 'en' ? 'Templates' : 'टेम्पलेट्स', icon: <HiSquare2Stack className="w-4 h-4" />, count: templates.length },
            { id: 'my-templates', label: language === 'en' ? 'My Templates' : 'माई टेम्पलेट्स', icon: <HiBookmarkSquare className="w-4 h-4" />, count: savedPosters.length },
            { id: 'photo', label: language === 'en' ? 'Photos' : 'फ़ोटो', icon: <HiPhoto className="w-4 h-4" />, count: photos.length },
            { id: 'text', label: language === 'en' ? 'Text' : 'टेक्स्ट', icon: <HiPencilSquare className="w-4 h-4" /> },
            { id: 'size', label: language === 'en' ? 'Size & Ratio' : 'साइज व अनुपात', icon: <HiAdjustmentsHorizontal className="w-4 h-4" /> },
            { id: 'custom-bg', label: language === 'en' ? 'Background' : 'बैकग्राउंड', icon: <HiFolderArrowDown className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[0.62rem] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Templates Gallery */}
        {activeTab === 'templates' && (
          <div className="space-y-2.5">
            {/* Category Filter Chips & Refresh Action */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => loadCategoriesAndTemplates(activeCategory)}
                title="Refresh Templates"
                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 shrink-0 active:scale-95 transition-all"
              >
                <HiArrowPath className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
              </button>
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[0.7rem] font-bold shrink-0 transition-all ${
                    activeCategory === cat
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={activeCategory === cat ? { backgroundColor: primaryColor } : {}}
                >
                  {cat === 'All' ? (language === 'en' ? 'All' : 'सभी') : cat}
                </button>
              ))}
            </div>

            {/* Template Thumbnails Grid */}
            <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
              {templates.map((tpl, i) => {
                const isCurrent = selectedTemplate?._id === tpl._id || selectedTemplate?.id === tpl.id;
                const previewImg = getMediaUrl(tpl.templateImageUrl || tpl.imageUrl) || tpl.templateImageUrl;
                return (
                  <div
                    key={tpl._id || tpl.id || i}
                    onClick={() => applyTemplate(tpl)}
                    className={`relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer border-2 transition-all active:scale-95 bg-slate-100 ${
                      isCurrent ? 'ring-2 ring-offset-1' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={isCurrent ? { borderColor: primaryColor, ringColor: primaryColor } : {}}
                  >
                    <img 
                      src={previewImg} 
                      alt={tpl.title} 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous"
                    />
                    {isCurrent && (
                      <div 
                        className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[0.6rem] shadow-xs"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <HiCheck className="w-3 h-3 stroke-2" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: My Saved Templates (Canva Style) */}
        {activeTab === 'my-templates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  {language === 'en' ? 'My Saved Templates' : 'माई टेम्पलेट्स'}
                </span>
                <span className="text-[0.62rem] text-slate-500 font-semibold">
                  {savedPosters.length} {language === 'en' ? 'template(s) saved' : 'टेम्पलेट सेव हैं'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSavePoster(true)}
                  disabled={isSavingPoster}
                  className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[0.7rem] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                  title={language === 'en' ? 'Save as new template' : 'नया टेम्पलेट सेव करें'}
                >
                  {isSavingPoster ? <HiArrowPath className="w-3.5 h-3.5 animate-spin" /> : <HiPlus className="w-3.5 h-3.5" />}
                  <span>{language === 'en' ? '+ Save Template' : '+ नया टेम्पलेट'}</span>
                </button>
              </div>
            </div>

            {savedPosters.length === 0 ? (
              <div className="py-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <HiBookmarkSquare className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">
                  {language === 'en' ? 'No saved templates yet' : 'अभी कोई सेव किया गया टेम्पलेट नहीं है'}
                </p>
                <p className="text-[0.68rem] text-slate-400 mt-0.5">
                  {language === 'en' ? 'Design your poster and click "Save Template" from 3-dot menu or here.' : 'पोस्टर डिजाइन करें और 3-डॉट मेनू या यहाँ से "Save Template" दबाएं।'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-44 overflow-y-auto pr-1">
                {savedPosters.map((p) => {
                  const isCur = currentPosterId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleLoadSavedPoster(p)}
                      className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all active:scale-95 bg-slate-100 ${
                        isCur ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="aspect-[4/5] w-full bg-slate-200 overflow-hidden relative">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-[0.65rem] font-bold">
                            {p.selectedRatio || 'Template'}
                          </div>
                        )}
                        <span className="absolute top-1 left-1 px-1.5 py-0.2 bg-black/60 backdrop-blur-xs text-white text-[0.55rem] font-bold rounded-md">
                          {p.selectedRatio || '4:5'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSavedPoster(e, p.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all shadow-xs"
                          title={language === 'en' ? 'Delete' : 'हटाएं'}
                        >
                          <HiTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-1.5 bg-white">
                        <p className="text-[0.68rem] font-black text-slate-800 truncate">{p.title || 'Saved Template'}</p>
                        <p className="text-[0.55rem] text-slate-400">
                          {p.savedAt ? new Date(p.savedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Photos Manager & Uploads Gallery */}
        {activeTab === 'photo' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  {language === 'en' ? 'Photos & Profile Pictures' : 'फ़ोटो व प्रोफाइल पिक्चर्स'}
                </span>
                <span className="text-[0.62rem] text-slate-500">
                  {photos.length} {language === 'en' ? 'on canvas' : 'कैनवास पर'} • {savedUploads.length} {language === 'en' ? 'in library' : 'गैलरी में'}
                </span>
              </div>
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="px-3 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <HiArrowUpTray className="w-3.5 h-3.5" />
                <span>{language === 'en' ? '+ Upload Photo' : '+ फ़ोटो अपलोड'}</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Photos Currently on Canvas */}
            {photos.length > 0 && (
              <div className="space-y-1">
                <span className="text-[0.65rem] font-bold text-slate-500 block">
                  {language === 'en' ? 'Active on Canvas (Tap to select & adjust):' : 'कैनवास पर सक्रिय फ़ोटो:'}
                </span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {photos.map((p, pIdx) => {
                    const isCur = activeElement?.type === 'photo' && activeElement?.id === p.id;
                    return (
                      <div 
                        key={p.id || pIdx}
                        onClick={() => setActiveElement({ type: 'photo', id: p.id })}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${
                          isCur ? 'border-orange-500 ring-2 ring-orange-200 scale-105' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img src={p.src} alt="Canvas Photo" className="w-full h-full object-cover" />
                        {isCur && (
                          <div className="absolute inset-0 bg-orange-500/20 border-2 border-orange-500 rounded-xl" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🌟 Reusable Uploaded Photos Library Grid */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[0.65rem] font-bold text-slate-500 block">
                {language === 'en' ? 'Uploaded Photos Library (Tap to add to poster):' : 'अपलोड की गई फ़ोटो लाइब्रेरी (पोस्टर पर जोड़ने के लिए टैप करें):'}
              </span>

              {savedUploads.length === 0 ? (
                <div className="py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-[0.68rem] text-slate-400">
                    {language === 'en' ? 'No photos in library yet. Upload above.' : 'गैलरी में कोई फ़ोटो नहीं है। ऊपर से अपलोड करें।'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {savedUploads.map((up) => (
                    <div
                      key={up.id}
                      onClick={() => handleAddUploadToCanvas(up)}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-orange-500 cursor-pointer bg-slate-100 active:scale-95 transition-all shadow-2xs"
                    >
                      <img src={up.src} alt={up.name || 'Upload'} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => handleDeleteSavedUpload(e, up.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                        title={language === 'en' ? 'Delete' : 'हटाएं'}
                      >
                        <HiTrash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🌟 Selected Photo Full Adjustments Panel */}
            {activeSelectedPhoto && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5 animate-scale-up mt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[0.7rem] font-black text-slate-800">
                    {language === 'en' ? 'Adjust Selected Photo' : 'चुनी गई फोटो को एडजस्ट करें'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDuplicateActive}
                      className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                      title={language === 'en' ? 'Duplicate' : 'कॉपी करें'}
                    >
                      <HiDocumentDuplicate className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDeleteActive}
                      className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                      title={language === 'en' ? 'Delete' : 'हटाएं'}
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. Size Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[0.68rem] font-bold text-slate-600">
                    <span>{language === 'en' ? 'Photo Size (Scale)' : 'फोटो का साइज'}</span>
                    <span className="text-orange-600 font-black">{activeSelectedPhoto.size || 78}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, size: Math.max(30, p.size - 6) } : p))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                    >
                      <HiMinus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="range" 
                      min="30" 
                      max="240" 
                      value={activeSelectedPhoto.size || 78}
                      onChange={(e) => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, size: Number(e.target.value) } : p))}
                      className="flex-1 accent-orange-500"
                    />
                    <button
                      onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, size: Math.min(240, p.size + 6) } : p))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                    >
                      <HiPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Shape & Border Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  {/* Shape Selector */}
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-600 block mb-1">
                      {language === 'en' ? 'Mask Shape' : 'फोटो का शेप'}
                    </label>
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'circle', label: language === 'en' ? 'Circle' : 'गोल' },
                        { id: 'rounded', label: language === 'en' ? 'Rounded' : 'कर्व' },
                        { id: 'square', label: language === 'en' ? 'Square' : 'चौकोर' },
                      ].map((sh) => (
                        <button
                          key={sh.id}
                          onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, shape: sh.id } : p))}
                          className={`flex-1 py-1 rounded-lg text-[0.62rem] font-bold transition-all ${
                            activeSelectedPhoto.shape === sh.id
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Toggle & Color */}
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-600 block mb-1">
                      {language === 'en' ? 'Border Outline' : 'आउटलाइन बॉर्डर'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, border: !p.border } : p))}
                        className={`flex-1 py-1 rounded-lg text-[0.62rem] font-bold transition-all ${
                          activeSelectedPhoto.border
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {activeSelectedPhoto.border ? (language === 'en' ? 'Border ON' : 'बॉर्डर चालू') : (language === 'en' ? 'Border OFF' : 'बॉर्डर बंद')}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* Tab 2: Canva-Style Text Studio */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            
            {/* Canva Text Presets */}
            <div className="space-y-1.5">
              <span className="text-[0.68rem] font-bold text-slate-500 block">
                {language === 'en' ? 'Add Text Preset to Banner:' : 'बैनर पर नया टेक्स्ट जोड़ें:'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddTextPreset('heading')}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-95 flex flex-col justify-between"
                >
                  <span className="text-xs font-black text-slate-900">{language === 'en' ? 'Heading' : 'शीर्षक'}</span>
                  <span className="text-[0.6rem] text-slate-500 font-semibold">Bold 22px</span>
                </button>

                <button
                  onClick={() => handleAddTextPreset('subheading')}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-95 flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-amber-600">{language === 'en' ? 'Subheading' : 'उप-शीर्षक'}</span>
                  <span className="text-[0.6rem] text-slate-500 font-semibold">Medium 16px</span>
                </button>

                <button
                  onClick={() => handleAddTextPreset('slogan')}
                  className="p-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-left transition-all active:scale-95 flex flex-col justify-between"
                >
                  <span className="text-xs font-black text-orange-700">{language === 'en' ? 'Badge' : 'स्लोगन पट्टी'}</span>
                  <span className="text-[0.6rem] text-orange-600 font-semibold">With Badge</span>
                </button>
              </div>
            </div>

            {/* Default Name & Designation Quick Fields */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.68rem] font-bold text-slate-600 block mb-1">
                  {language === 'en' ? 'Your Name' : 'आपका नाम'}
                </label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => updateUserNameText(e.target.value)}
                  placeholder={language === 'en' ? 'Enter name' : 'अपना नाम दर्ज करें'}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold text-slate-600 block mb-1">
                  {language === 'en' ? 'Designation / Title' : 'पद / विवरण'}
                </label>
                <input 
                  type="text" 
                  value={userDesignation}
                  onChange={(e) => updateUserDesignationText(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Supporter' : 'उदा. शुभचिंतक'}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Photo Manager & Adjustment Studio */}
        {activeTab === 'photo' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <HiPhoto className="w-4 h-4" />
                <span>{language === 'en' ? 'Upload New Photo' : 'नई फ़ोटो अपलोड करें'}</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <span className="text-[0.68rem] font-semibold text-slate-500">
                {photos.length} {language === 'en' ? 'photo(s) on canvas' : 'फोटो कैनवास पर हैं'}
              </span>
            </div>

            {/* Photos thumbnail strip */}
            {photos.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {photos.map((p, pIdx) => {
                  const isCur = activeElement?.type === 'photo' && activeElement?.id === p.id;
                  return (
                    <div 
                      key={p.id || pIdx}
                      onClick={() => setActiveElement({ type: 'photo', id: p.id })}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${
                        isCur ? 'border-orange-500 ring-2 ring-orange-200 scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={p.src} alt="Uploaded" className="w-full h-full object-cover" />
                      {isCur && (
                        <div className="absolute inset-0 bg-orange-500/20 border-2 border-orange-500 rounded-xl" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 🌟 Selected Photo Full Adjustments Panel */}
            {activeSelectedPhoto ? (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5 animate-scale-up">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[0.7rem] font-black text-slate-800">
                    {language === 'en' ? 'Adjust Selected Photo' : 'चुनी गई फोटो को एडजस्ट करें'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDuplicateActive}
                      className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                      title={language === 'en' ? 'Duplicate' : 'कॉपी करें'}
                    >
                      <HiDocumentDuplicate className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDeleteActive}
                      className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                      title={language === 'en' ? 'Delete' : 'हटाएं'}
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. Size Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[0.68rem] font-bold text-slate-600">
                    <span>{language === 'en' ? 'Photo Size (Scale)' : 'फोटो का साइज'}</span>
                    <span className="text-orange-600 font-black">{activeSelectedPhoto.size || 78}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, size: Math.max(30, p.size - 6) } : p))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                    >
                      <HiMinus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="range" 
                      min="30" 
                      max="240" 
                      value={activeSelectedPhoto.size || 78}
                      onChange={(e) => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, size: Number(e.target.value) } : p))}
                      className="flex-1 accent-orange-500"
                    />
                    <button
                      onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, size: Math.min(240, p.size + 6) } : p))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                    >
                      <HiPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Shape & Border Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  {/* Shape Selector */}
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-600 block mb-1">
                      {language === 'en' ? 'Mask Shape' : 'फोटो का शेप'}
                    </label>
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'circle', label: language === 'en' ? 'Circle' : 'गोल' },
                        { id: 'rounded', label: language === 'en' ? 'Rounded' : 'कर्व' },
                        { id: 'square', label: language === 'en' ? 'Square' : 'चौकोर' },
                      ].map((sh) => (
                        <button
                          key={sh.id}
                          onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, shape: sh.id } : p))}
                          className={`flex-1 py-1 rounded-lg text-[0.62rem] font-bold transition-all ${
                            activeSelectedPhoto.shape === sh.id
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Toggle & Color */}
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-600 block mb-1">
                      {language === 'en' ? 'Border Outline' : 'आउटलाइन बॉर्डर'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPhotos(prev => prev.map(p => p.id === activeSelectedPhoto.id ? { ...p, border: !p.border } : p))}
                        className={`flex-1 py-1 rounded-lg text-[0.62rem] font-bold transition-all ${
                          activeSelectedPhoto.border
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {activeSelectedPhoto.border ? (language === 'en' ? 'Border ON' : 'बॉर्डर चालू') : (language === 'en' ? 'Border OFF' : 'बॉर्डर बंद')}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              photos.length > 0 && (
                <p className="text-[0.68rem] text-slate-500 text-center italic bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {language === 'en' ? '💡 Tap any photo on canvas or list to resize and adjust shape' : '💡 कैनवास या लिस्ट पर फोटो पर टैप करके साइज व शेप एडजस्ट करें'}
                </p>
              )
            )}

          </div>
        )}

        {/* Tab 4: Size & Aspect Ratio Manager */}
        {activeTab === 'size' && (
          <div className="space-y-3">
            <div>
              <label className="text-[0.7rem] font-black text-slate-700 block mb-1.5">
                {language === 'en' ? 'Poster Aspect Ratio' : 'पोस्टर अनुपात व साइज'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((r) => {
                  const isSelected = selectedRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRatioChange(r.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 shadow-xs' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">{r.id}</p>
                      <p className="text-[0.62rem] font-bold text-slate-500 truncate">
                        {language === 'en' ? r.subEn : r.subHi}
                      </p>
                      <span className="text-[0.58rem] font-semibold text-slate-400 mt-0.5 block">
                        {r.width}×{r.height}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas Zoom / Scale Slider */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{language === 'en' ? 'Canvas Scale & Preview Zoom' : 'कैनवास साइज व ज़ूम'}</span>
                <span className="text-[0.68rem] text-slate-500">{canvasScale}px</span>
              </div>
              <input 
                type="range"
                min="270"
                max="400"
                step="10"
                value={canvasScale}
                onChange={(e) => setCanvasScale(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>
        )}

        {/* Tab 5: Custom Poster Background */}
        {activeTab === 'custom-bg' && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-600">
              {language === 'en' ? 'Upload custom background or full poster from gallery:' : 'गैलरी से अपना बैकग्राउंड या पूरा पोस्टर इमेज सेट करें:'}
            </p>
            <button
              onClick={() => customBgInputRef.current && customBgInputRef.current.click()}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 active:scale-95 transition-all"
            >
              <HiPhoto className="w-5 h-5 text-slate-500" />
              <span>{language === 'en' ? 'Choose Image from Device' : 'डिवाइस से इमेज चुनें'}</span>
            </button>
            <input 
              type="file" 
              ref={customBgInputRef} 
              onChange={handleCustomBgUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        )}

      </section>

      {/* Persistent Bottom Nav */}
      <BottomNav />

    </div>
  );
}
