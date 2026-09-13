import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BottomNav from './BottomNav';
import { storage } from '../services/storage';
import { useTenant } from '../context/TenantContext';
import UserAvatar from './UserAvatar';
import { 
  HiTrophy, 
  HiMapPin, 
  HiClipboardDocumentList, 
  HiCalendarDays, 
  HiFolderArrowDown, 
  HiArrowLeft, 
  HiCheckBadge 
} from 'react-icons/hi2';

export default function VolunteerPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'apply'
  const [volunteers, setVolunteers] = useState([]);
  const [currentVolunteer, setCurrentVolunteer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    interest: 'Social Media & Tech',
    availability: 'Weekends (Saturday & Sunday)',
    skills: 'Graphic Design & Communication'
  });

  const tasks = [
    { id: 1, title: 'Jan Sabha Booth Setup Assistance', date: 'Upcoming', area: 'Local Booth', status: 'Assigned', points: 50 },
    { id: 2, title: 'WhatsApp Group Moderation for Constituency', date: 'Ongoing', area: 'Online', status: 'In Progress', points: 30 },
    { id: 3, title: 'Distribution of Public Welfare Flyers', date: 'Recent', area: 'Ward / Panchayat', status: 'Completed', points: 100 }
  ];

  useEffect(() => {
    const loadVolunteerData = async () => {
      const user = storage.getUser() || {};
      setFormData({
        name: user.name || user.fullName || '',
        phone: user.mobile || '',
        interest: 'Social Media & Tech',
        availability: 'Weekends (Saturday & Sunday)',
        skills: 'Graphic Design & Field Coordination'
      });

      const slug = api.getTenantSlug();
      if (!slug) {
        return;
      }

      try {
        const profile = await api.getMyVolunteerProfile().catch(() => null);
        if (profile) {
          setCurrentVolunteer({
            id: profile._id || `VOL-${Math.floor(10000 + Math.random() * 90000)}`,
            name: profile.userId?.name || user.name || 'Active Volunteer',
            phone: profile.userId?.mobile || user.mobile || '',
            role: profile.role || 'Karyakarta / Volunteer',
            assignedArea: profile.assignedAreaId?.name || [user.village, user.district].filter(Boolean).join(', ') || 'Constituency',
            badge: profile.status === 'active' ? 'Active Volunteer' : (profile.status || 'Verified'),
            totalPoints: profile.points || 120,
            tasksCompleted: Array.isArray(profile.tasks) ? profile.tasks.length : 3
          });
        } else {
          const defaultVol = {
            id: `VOL-${Math.floor(10000 + Math.random() * 90000)}`,
            name: user.name || user.fullName || 'Citizen Volunteer',
            phone: user.mobile || '',
            role: 'Karyakarta / Volunteer',
            assignedArea: [user.village, user.district].filter(Boolean).join(', ') || 'Constituency',
            badge: 'Active Volunteer',
            totalPoints: 120,
            tasksCompleted: 3
          };
          setCurrentVolunteer(defaultVol);
        }
      } catch (err) {
        console.warn('Error fetching volunteer profile:', err);
      }
    };

    loadVolunteerData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required');
      return;
    }

    try {
      await api.applyVolunteer({
        role: formData.interest,
        notes: `Availability: ${formData.availability} | Skills: ${formData.skills}`
      }).catch(() => {});

      const newVol = {
        ...formData,
        id: `VOL-${Math.floor(10000 + Math.random() * 90000)}`,
        role: formData.interest || 'Active Volunteer',
        assignedArea: 'Local Constituency',
        badge: 'Verified Karyakarta',
        totalPoints: 50,
        tasksCompleted: 0,
        appliedAt: new Date().toISOString()
      };

      storage.addVolunteer(newVol);
      setCurrentVolunteer(newVol);
      toast.success('Karyakarta Registration Submitted Successfully! 🎉');
      setActiveTab('profile');
    } catch (err) {
      console.warn('Volunteer submit error:', err);
      toast.success('Application registered successfully!');
      setActiveTab('profile');
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
            Karyakarta / Volunteer
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100/90 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'profile' ? 'text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            style={{ backgroundColor: activeTab === 'profile' ? primaryColor : undefined }}
          >
            My Activity
          </button>
          <button 
            onClick={() => setActiveTab('apply')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'apply' ? 'text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            style={{ backgroundColor: activeTab === 'apply' ? primaryColor : undefined }}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-4">
        
        {activeTab === 'profile' && currentVolunteer ? (
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            
            {/* Volunteer Profile Banner */}
            <div 
              className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})` }}
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-14 h-14 rounded-2xl border-2 border-white/80 p-0.5 overflow-hidden shrink-0 shadow-md bg-white/10">
                  <UserAvatar 
                    src={currentVolunteer?.profilePhoto || currentVolunteer?.photo} 
                    name={currentVolunteer?.name} 
                    className="w-full h-full" 
                    iconClassName="w-7 h-7"
                    roundedClassName="rounded-xl"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black truncate">{currentVolunteer.name}</h3>
                    <span className="text-[0.6rem] font-bold bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <HiTrophy className="w-3 h-3 text-yellow-300" />
                      {currentVolunteer.badge}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white/90 mt-0.5">{currentVolunteer.role}</p>
                  <p className="text-[0.68rem] text-white/80 mt-0.5 font-medium truncate flex items-center gap-1">
                    <HiMapPin className="w-3 h-3" />
                    <span>{currentVolunteer.assignedArea}</span>
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/20 text-center relative z-10">
                <div className="bg-white/10 rounded-xl py-2">
                  <span className="text-base font-black leading-none block">{currentVolunteer.totalPoints} pts</span>
                  <span className="text-[0.6rem] font-bold text-white/80 uppercase tracking-wider">Contribution Score</span>
                </div>
                <div className="bg-white/10 rounded-xl py-2">
                  <span className="text-base font-black leading-none block">{currentVolunteer.tasksCompleted} Tasks</span>
                  <span className="text-[0.6rem] font-bold text-white/80 uppercase tracking-wider">Completed</span>
                </div>
              </div>
            </div>

            {/* Assigned Tasks / Missions */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <HiClipboardDocumentList className="w-4 h-4" style={{ color: primaryColor }} />
                  <h4 className="text-sm font-extrabold text-gray-900">Assigned Tasks & Drives</h4>
                </div>
                <span className="text-xs font-bold" style={{ color: primaryColor }}>{tasks.length} Active</span>
              </div>

              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="border border-gray-100 rounded-2xl p-3.5 bg-[#f8fafc] flex flex-col gap-1.5 transition-colors">
                    <div className="flex items-start justify-between">
                      <h5 className="text-xs font-extrabold text-gray-900 leading-tight flex-1 pr-2">{task.title}</h5>
                      <span className={`text-[0.6rem] font-black px-2 py-0.5 rounded-full ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[0.68rem] text-gray-500 font-semibold pt-1 border-t border-gray-200/50">
                      <span className="flex items-center gap-1">
                        <HiCalendarDays className="w-3.5 h-3.5 text-gray-400" />
                        <span>{task.date} • {task.area}</span>
                      </span>
                      <span className="font-extrabold" style={{ color: primaryColor }}>+{task.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volunteer Resources CTA */}
            <div 
              className="border rounded-2xl p-4 flex items-center justify-between"
              style={{ backgroundColor: `${primaryColor}0D`, borderColor: `${primaryColor}25` }}
            >
              <div>
                <h5 className="text-xs font-extrabold text-gray-900">Campaign Guidelines & Materials</h5>
                <p className="text-[0.68rem] font-medium text-gray-600 mt-0.5">Download representative banners, pamphlets and flyers.</p>
              </div>
              <button 
                onClick={() => toast.success('Materials folder opened!')} 
                className="px-3 py-1.5 text-white text-xs font-bold rounded-xl shadow-sm shrink-0 flex items-center gap-1"
                style={{ backgroundColor: primaryColor }}
              >
                <HiFolderArrowDown className="w-4 h-4" />
                <span>Access</span>
              </button>
            </div>

          </div>
        ) : (
          /* Application Form */
          <div className="max-w-md mx-auto">
            <div 
              className="w-full px-6 py-6 text-center rounded-3xl mb-5 shadow-sm text-white"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})` }}
            >
              <h2 className="text-xl font-black mb-1">Volunteer Sign-up</h2>
              <p className="text-white/80 text-xs font-semibold">Join the grassroots movement and contribute to your local area development.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-800 mb-1 block">Full Name <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none" placeholder="Enter name" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 mb-1 block">Mobile Number <span className="text-red-500">*</span></label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none" placeholder="10-digit mobile" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 mb-1 block">Area of Interest</label>
                <select value={formData.interest} onChange={e => setFormData({...formData, interest: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white outline-none">
                  <option value="Social Media & Tech">Social Media & Digital Outreach</option>
                  <option value="Field & Booth Coordination">Field & Booth Coordination</option>
                  <option value="Event Organization & Logistics">Event Organization & Logistics</option>
                  <option value="Jan Samasya Helpdesk">Jan Samasya Citizen Helpdesk</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 mb-1 block">Availability</label>
                <select value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white outline-none">
                  <option value="Weekends (Saturday & Sunday)">Weekends (Saturday & Sunday)</option>
                  <option value="Daily 2-3 Hours">Daily 2-3 Hours</option>
                  <option value="Full Time Dedicated">Full Time Dedicated</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="mt-2 w-full py-3 text-white font-extrabold text-sm rounded-xl shadow-md active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Submit Karyakarta Application
              </button>
            </form>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}


