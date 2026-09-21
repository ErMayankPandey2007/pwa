import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useTenant } from '../context/TenantContext';
import { 
  HiMapPin, 
  HiXMark, 
  HiCheck, 
  HiArrowRight, 
  HiArrowLeft, 
  HiMagnifyingGlass 
} from 'react-icons/hi2';

export default function GuestAreaModal({ isOpen, onClose, onSelectArea }) {
  const { primaryColor } = useTenant();
  const [areaTreeData, setAreaTreeData] = useState({ levels: [], tree: [] });
  const [selectedAreas, setSelectedAreas] = useState({});
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAreaTree = async () => {
      setLoading(true);
      try {
        const areaRes = await api.getAreaTree();
        if (areaRes) {
          // Filter out any level that represents Ward
          const rawLevels = areaRes.levels || [];
          const filteredLevels = rawLevels.filter(lvl => {
            const name = String(lvl?.name || lvl?.type || '').toLowerCase();
            return !name.includes('ward') && !name.includes('वार्ड');
          });
          setAreaTreeData({
            ...areaRes,
            levels: filteredLevels
          });
        }
      } catch (err) {
        console.warn('Error fetching area tree for guest modal:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAreaTree();
  }, [isOpen]);

  if (!isOpen) return null;

  const levels = areaTreeData.levels || [];

  // Helper to get options for a specific level
  const getAreaOptionsForLevel = (levelIndex) => {
    if (!areaTreeData.tree || areaTreeData.tree.length === 0) return [];
    if (levelIndex === 0) return areaTreeData.tree;

    let currentNodes = areaTreeData.tree;
    for (let i = 0; i < levelIndex; i++) {
      const prevLevel = levels[i];
      const prevLevelId = String(prevLevel?._id || prevLevel?.id || '');
      const selectedId = selectedAreas[prevLevelId];
      if (!selectedId) return [];
      const matchedNode = currentNodes.find(
        (node) => String(node._id || node.id) === String(selectedId)
      );
      if (!matchedNode || !Array.isArray(matchedNode.children)) return [];
      currentNodes = matchedNode.children;
    }
    return currentNodes;
  };

  const currentLevel = levels[currentLevelIndex];
  const currentLevelId = currentLevel ? String(currentLevel._id || currentLevel.id) : '';
  const currentLevelOptions = getAreaOptionsForLevel(currentLevelIndex) || [];

  // Filter options by search query
  const filteredOptions = currentLevelOptions.filter(opt => {
    if (!searchQuery.trim()) return true;
    const name = (opt.name || '').toLowerCase();
    const code = (opt.code || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const handleSelectOption = (opt) => {
    const optId = String(opt._id || opt.id);
    const updated = { ...selectedAreas, [currentLevelId]: optId };

    // Clear deeper levels if re-selecting
    for (let i = currentLevelIndex + 1; i < levels.length; i++) {
      const childLvlId = String(levels[i]?._id || levels[i]?.id || '');
      if (childLvlId) {
        delete updated[childLvlId];
      }
    }
    setSelectedAreas(updated);
    setSearchQuery('');

    // Check if next level exists and has children options
    if (currentLevelIndex < levels.length - 1 && Array.isArray(opt.children) && opt.children.length > 0) {
      setCurrentLevelIndex(prev => prev + 1);
    }
  };

  const handleStepTabClick = (targetIdx) => {
    if (targetIdx <= currentLevelIndex) {
      setCurrentLevelIndex(targetIdx);
      setSearchQuery('');
    } else {
      // Allow going ahead only if all preceding levels are selected
      let canAdvance = true;
      for (let i = 0; i < targetIdx; i++) {
        const lvlId = String(levels[i]?._id || levels[i]?.id || '');
        if (!selectedAreas[lvlId]) {
          canAdvance = false;
          break;
        }
      }
      if (canAdvance) {
        setCurrentLevelIndex(targetIdx);
        setSearchQuery('');
      } else {
        toast.info('कृपया पहले वर्तमान चरण का चयन करें');
      }
    }
  };

  const handleProceed = () => {
    const validIds = Object.values(selectedAreas).filter(
      (v) => v && String(v).trim() !== ''
    );
    if (validIds.length === 0) {
      toast.error('कृपया आगे बढ़ने के लिए अपना क्षेत्र चुनें');
      return;
    }

    const activeSelectedId = validIds[validIds.length - 1];

    // Find breadcrumbs text and names
    let selectedNames = [];
    let currentNodes = areaTreeData.tree || [];
    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i];
      const lvlId = String(lvl._id || lvl.id || '');
      const sId = selectedAreas[lvlId];
      if (sId) {
        const found = currentNodes.find((n) => String(n._id || n.id) === String(sId));
        if (found) {
          selectedNames.push(found.name);
          currentNodes = found.children || [];
        }
      }
    }

    const breadcrumbText = selectedNames.join(' > ');
    const existingUser = storage.getUser() || {};
    const guestUser = {
      ...existingUser,
      name: existingUser.name || 'Citizen',
      areaId: activeSelectedId,
      area: activeSelectedId,
      selectedAreas: { ...selectedAreas },
      assembly: breadcrumbText || 'Selected Area',
      isGuest: true,
      isRegistered: false,
      isProfileComplete: false,
    };

    storage.setUser(guestUser);
    window.dispatchEvent(new CustomEvent('pwa_profile_updated', { detail: guestUser }));
    toast.success('क्षेत्र चुना गया! Welcome to App');

    if (onSelectArea) {
      onSelectArea(guestUser);
    }
    if (onClose) {
      onClose();
    }
  };

  const isLastStep = currentLevelIndex >= levels.length - 1 || currentLevelOptions.length === 0;
  const isCurrentLevelSelected = Boolean(selectedAreas[currentLevelId]);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: primaryColor || '#ea580c' }}
            >
              <HiMapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                अपना क्षेत्र चुनें
              </h3>
              <p className="text-[11px] font-semibold text-gray-500">
                Step-by-step Area Selection
              </p>
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

        {/* Level Tabs (Step 1, Step 2, etc.) */}
        {levels.length > 0 && (
          <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              {levels.map((lvl, idx) => {
                const lvlId = String(lvl._id || lvl.id);
                const isSelected = Boolean(selectedAreas[lvlId]);
                const isActive = currentLevelIndex === idx;

                return (
                  <button
                    key={lvlId}
                    type="button"
                    onClick={() => handleStepTabClick(idx)}
                    className="flex-1 min-w-[70px] flex flex-col items-center gap-1 group relative"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                        isActive
                          ? 'text-white shadow-md scale-105 ring-2 ring-orange-200'
                          : isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      style={isActive ? { backgroundColor: primaryColor || '#ea580c' } : {}}
                    >
                      {isSelected && !isActive ? <HiCheck className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-bold truncate max-w-[80px] text-center ${
                        isActive ? 'text-gray-900' : isSelected ? 'text-emerald-700' : 'text-gray-400'
                      }`}
                    >
                      {lvl.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content & Options List as Clean Step Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              क्षेत्र डेटा लोड हो रहा है...
            </div>
          ) : currentLevel ? (
            <>
              {/* Level Title & Search */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    {currentLevel.name} चुनें
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Step {currentLevelIndex + 1} of {levels.length}: Select your {currentLevel.name}
                  </p>
                </div>
                <span className="text-[11px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  {currentLevelOptions.length} Options
                </span>
              </div>

              {/* Search Bar for Options */}
              {currentLevelOptions.length > 6 && (
                <div className="relative">
                  <HiMagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`${currentLevel.name} खोजें...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-gray-400 focus:bg-white transition-all shadow-xs"
                  />
                </div>
              )}

              {/* Card List of Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const optId = String(opt._id || opt.id);
                    const isSelected = selectedAreas[currentLevelId] === optId;

                    return (
                      <div
                        key={optId}
                        onClick={() => handleSelectOption(opt)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-1 ring-orange-500'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-orange-950' : 'text-gray-800'}`}>
                            {opt.name}
                          </p>
                          {opt.code && (
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">
                              Code: {opt.code}
                            </span>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'border-transparent text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                          style={isSelected ? { backgroundColor: primaryColor || '#ea580c' } : {}}
                        >
                          {isSelected && <HiCheck className="w-3.5 h-3.5 stroke-2" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-8 text-center text-xs text-gray-400 font-medium">
                    कोई विकल्प नहीं मिला
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-gray-500">
              कोई क्षेत्र सूची उपलब्ध नहीं है।
            </div>
          )}
        </div>

        {/* Footer Navigation (Prev / Next / Enter) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2.5 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          {currentLevelIndex > 0 ? (
            <button
              type="button"
              onClick={() => {
                setCurrentLevelIndex(prev => prev - 1);
                setSearchQuery('');
              }}
              className="flex-1 py-3 bg-gray-200/90 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <HiArrowLeft className="w-3.5 h-3.5" />
              <span>Previous / पीछे</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 active:scale-95 transition-all text-center"
            >
              रद्द करें (Cancel)
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              disabled={!isCurrentLevelSelected}
              onClick={() => {
                if (!isCurrentLevelSelected) {
                  toast.error(`कृपया पहले ${currentLevel?.name || 'क्षेत्र'} चुनें`);
                  return;
                }
                setCurrentLevelIndex(prev => prev + 1);
                setSearchQuery('');
              }}
              className="flex-1 py-3 px-4 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: primaryColor || '#ea580c' }}
            >
              <span>Next / अगला</span>
              <HiArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!isCurrentLevelSelected}
              onClick={handleProceed}
              className="flex-1 py-3 px-4 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: primaryColor || '#ea580c' }}
            >
              <HiCheck className="w-4 h-4" />
              <span>प्रवेश करें (Enter App)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
