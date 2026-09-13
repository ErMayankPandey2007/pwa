import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { storage } from '../services/storage';
import { useTenant } from '../context/TenantContext';
import { HiArrowLeft } from 'react-icons/hi2';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { primaryColor } = useTenant();
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    dob: '',
    gender: '',
    area: '',
    role: '',
    photo: null
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    const user = storage.getUser();
    if (user) {
      setFormData({
        fullName: user.name || user.fullName || '',
        mobile: user.mobile || '',
        dob: user.dob || '',
        gender: user.gender || '',
        area: user.district ? `${user.district}, ${user.vidhanSabha || user.assembly || ''}` : '',
        role: user.role || 'Supporter',
        photo: user.photo || null
      });
      if (user.photo) {
        setPhotoPreview(user.photo);
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setFormData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e?.preventDefault();
    const currentUser = storage.getUser() || {};
    const updatedUser = {
      ...currentUser,
      name: formData.fullName,
      fullName: formData.fullName,
      mobile: formData.mobile,
      dob: formData.dob,
      gender: formData.gender,
      role: formData.role,
      photo: formData.photo || photoPreview,
      isProfileComplete: true
    };
    storage.setUser(updatedUser);
    toast.success('Profile updated successfully!');
    navigate(-1);
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-white overflow-hidden">
      
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
            Edit Profile
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col">
        
        {/* Photo Upload Section */}
        <div className="flex flex-col items-center mb-6">
          <label className="relative cursor-pointer flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <span className="text-xs font-bold" style={{ color: primaryColor }}>Change Photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>

        {/* Form Fields */}
        <form className="flex-1 flex flex-col gap-5">
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter your name"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white outline-none text-sm font-semibold text-gray-800 placeholder:text-gray-400 transition-all focus:ring-1"
              style={{ focusBorderColor: primaryColor, focusRingColor: primaryColor }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">
                +91
              </span>
              <input
                type="tel"
                name="mobile"
                placeholder="10-digit mobile number"
                value={formData.mobile}
                onChange={handleChange}
                maxLength="10"
                className="w-full h-12 px-4 border border-gray-200 rounded-r-xl bg-white outline-none text-sm font-semibold text-gray-800 placeholder:text-gray-400 transition-all focus:ring-1"
                style={{ focusBorderColor: primaryColor, focusRingColor: primaryColor }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white outline-none text-sm font-semibold text-gray-800 transition-all appearance-none focus:ring-1"
              style={{ color: formData.dob ? '#1f2937' : '#9ca3af', focusBorderColor: primaryColor, focusRingColor: primaryColor }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Gender</label>
            <div className="flex items-center gap-6">
              {['Male', 'Female', 'Other'].map(g => (
                <label key={g} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={formData.gender === g}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-sm font-semibold text-gray-800">{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Your Area</label>
            <select
              name="area"
              value={formData.area}
              onChange={handleChange}
              className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white outline-none text-sm font-semibold text-gray-800 transition-all appearance-none focus:ring-1"
              style={{ color: formData.area ? '#1f2937' : '#9ca3af', focusBorderColor: primaryColor, focusRingColor: primaryColor }}
            >
              <option value="" disabled hidden>Select State/Area</option>
              <option value="Delhi">Delhi</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Gujarat">Gujarat</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Your Role / Designation</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white outline-none text-sm font-semibold text-gray-800 transition-all appearance-none focus:ring-1"
              style={{ color: formData.role ? '#1f2937' : '#9ca3af', focusBorderColor: primaryColor, focusRingColor: primaryColor }}
            >
              <option value="" disabled hidden>Select your role</option>
              <option value="Supporter">Supporter</option>
              <option value="Volunteer">Volunteer</option>
              <option value="Party Worker">Party Worker</option>
              <option value="Leader">Local Leader</option>
            </select>
          </div>

        </form>
        
        {/* Save Button */}
        <div className="mt-8 shrink-0 pb-4">
          <button
            onClick={handleSave}
            className="w-full h-14 text-white font-bold text-lg rounded-xl shadow-md transition-all flex items-center justify-center active:scale-[0.98]"
            style={{ backgroundColor: primaryColor }}
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
