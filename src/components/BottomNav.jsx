import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { HiHome, HiOutlineHome } from 'react-icons/hi2';
import { HiUser, HiOutlineUser } from 'react-icons/hi2';
import { HiBriefcase, HiOutlineBriefcase } from 'react-icons/hi2';
import { HiCalendarDays, HiOutlineCalendarDays } from 'react-icons/hi2';
import { HiSquares2X2, HiOutlineSquares2X2 } from 'react-icons/hi2';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { primaryColor } = useTenant();
  const { t } = useLanguage();
  const currentPath = location.pathname;

  // Bottom navbar sirf home page pe show hoga, baki sabhi pages me hide
  if (currentPath !== '/home' && currentPath !== '/') {
    return null;
  }

  const navItems = [
    {
      id: 'home',
      label: t('home'),
      path: '/home',
      ActiveIcon: HiHome,
      InactiveIcon: HiOutlineHome
    },
    {
      id: 'about',
      label: t('about'),
      path: '/about',
      ActiveIcon: HiUser,
      InactiveIcon: HiOutlineUser
    },
    {
      id: 'works',
      label: t('works'),
      path: '/works',
      ActiveIcon: HiBriefcase,
      InactiveIcon: HiOutlineBriefcase
    },
    {
      id: 'events',
      label: t('events'),
      path: '/events',
      ActiveIcon: HiCalendarDays,
      InactiveIcon: HiOutlineCalendarDays
    },
    {
      id: 'menu',
      label: t('menu'),
      path: '/menu',
      ActiveIcon: HiSquares2X2,
      InactiveIcon: HiOutlineSquares2X2
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex items-center justify-around h-[72px] pb-safe z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.06)]">
      {navItems.map(item => {
        const isActive = currentPath === item.path || (currentPath === '/' && item.path === '/home');
        const IconComponent = isActive ? item.ActiveIcon : item.InactiveIcon;

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors"
            style={{ color: isActive ? primaryColor : undefined }}
          >
            <IconComponent 
              className="w-6 h-6 transition-transform" 
              style={{ color: isActive ? primaryColor : '#9ca3af' }} 
            />
            <span 
              className={`text-[0.65rem] ${isActive ? 'font-extrabold' : 'font-semibold text-gray-400'}`}
              style={{ color: isActive ? primaryColor : undefined }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

