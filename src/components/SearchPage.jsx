import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import { 
  HiArrowLeft, 
  HiMagnifyingGlass, 
  HiXMark, 
  HiClock, 
  HiCalendarDays, 
  HiBuildingLibrary, 
  HiNewspaper, 
  HiChartBar, 
  HiPhoto, 
  HiArrowRight 
} from 'react-icons/hi2';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filterTabs = ['All', 'Works', 'Events', 'News', 'Polls', 'Gallery'];

  const recentSearches = [
    'Viksit Bharat Sankalp',
    'Road Construction Cantt',
    'BJP Jan Sabha',
    'Youth Employment Scheme',
    'Clean Kashi Mission'
  ];

  // Mock comprehensive database for instant search
  const searchableData = [
    { id: 1, title: 'Four Lane Highway Widening Project', type: 'Works', link: '/works/1', subtitle: 'Infrastructure • Varanasi Cantt', badge: 'Completed' },
    { id: 2, title: 'BJP Jan Sabha with Leader', type: 'Events', link: '/events/1', subtitle: 'Rally • 20 Oct 2026', badge: 'Upcoming' },
    { id: 3, title: 'Smart Classrooms in 50 Govt Schools', type: 'Works', link: '/works/2', subtitle: 'Education • Completed', badge: 'Completed' },
    { id: 4, title: 'PM Modi addresses youth at Varanasi', type: 'News', link: '/latest-updates', subtitle: 'Announcements • 09 Sep 2026', badge: 'Latest' },
    { id: 5, title: 'Varanasi Electric Bus Route Extension Poll', type: 'Polls', link: '/polls', subtitle: 'Public Opinion • 2,840 Votes', badge: 'Active' },
    { id: 6, title: 'Ghat Cleanliness Drive & Photo Exhibition', type: 'Gallery', link: '/photo-gallery', subtitle: 'Photo Album • 24 Photos', badge: 'Gallery' },
    { id: 7, title: 'Youth Startup Incubation Center', type: 'Works', link: '/works/3', subtitle: 'Employment • In Progress', badge: 'In Progress' },
    { id: 8, title: 'Blood Donation & Health Mega Camp', type: 'Events', link: '/events/2', subtitle: 'Social Service • 28 Oct 2026', badge: 'Upcoming' },
  ];

  const filteredResults = searchableData.filter(item => {
    const matchesQuery = !query || item.title.toLowerCase().includes(query.toLowerCase()) || item.subtitle.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.type === activeCategory;
    return matchesQuery && matchesCategory;
  });

  const getIconForType = (type) => {
    switch(type) {
      case 'Works': return <HiBuildingLibrary className="w-5 h-5 text-emerald-600" />;
      case 'Events': return <HiCalendarDays className="w-5 h-5 text-blue-600" />;
      case 'News': return <HiNewspaper className="w-5 h-5 text-orange-600" />;
      case 'Polls': return <HiChartBar className="w-5 h-5 text-purple-600" />;
      default: return <HiPhoto className="w-5 h-5 text-pink-600" />;
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Search Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3.5 pb-3 shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative flex items-center">
            <HiMagnifyingGlass className="w-5 h-5 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input 
              type="text" 
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search works, events, news, polls..." 
              className="w-full bg-gray-100 border border-transparent rounded-full py-2 pl-10 pr-9 text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#f37920] focus:ring-1 focus:ring-[#f37920] transition-all"
            />
            {query && (
              <button 
                type="button" 
                onClick={() => setQuery('')} 
                className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center absolute right-2.5 hover:bg-gray-300 transition-colors"
              >
                <HiXMark className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar scrollbar-hide py-0.5">
          {filterTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveCategory(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
                activeCategory === tab
                  ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Search Content */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        
        {!query ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Trending Searches</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {recentSearches.map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => setQuery(item)}
                  className="bg-white border border-gray-200 rounded-full px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#f37920] hover:text-[#f37920] shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <HiClock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{item}</span>
                </button>
              ))}
            </div>

            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Popular Content</h3>
            <div className="flex flex-col gap-2.5">
              {searchableData.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.link)}
                  className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-orange-200 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      {getIconForType(item.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 leading-snug">{item.title}</h4>
                      <p className="text-[0.65rem] text-gray-400 font-medium mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  <HiArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-gray-500 mb-3">
              Found <span className="text-[#f37920]">{filteredResults.length} results</span> for "{query}"
            </p>

            <div className="flex flex-col gap-2.5">
              {filteredResults.length > 0 ? (
                filteredResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.link)}
                    className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-orange-200 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                        {getIconForType(item.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.6rem] font-black uppercase text-[#f37920]">{item.type}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[0.6rem] font-bold text-gray-400">{item.badge}</span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 leading-snug mt-0.5">{item.title}</h4>
                        <p className="text-[0.65rem] text-gray-400 font-medium mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                    <HiArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-white rounded-2xl border border-gray-100 my-4">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[#f37920] mb-2">
                    <HiMagnifyingGlass className="w-6 h-6" />
                  </div>
                  <p className="text-gray-800 font-extrabold text-sm">No Results Found</p>
                  <p className="text-gray-400 font-semibold text-xs mt-0.5">Try searching with different keywords</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
