import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Book, GraduationCap, User, LogOut, Menu, ChevronLeft,
  Bell, TrendingUp, Award, CreditCard, Ticket, Headset, Moon
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard',     route: '/dashboard',    label: 'Dashboard',     icon: Home },
      { name: 'Courses',       route: '/courses',      label: 'Courses',       icon: Book },
      { name: 'MyCourses',     route: '/mycourses',    label: 'My Learning',   icon: GraduationCap },
    ],
  },
  {
    label: 'Activity',
    items: [
      { name: 'Notifications', route: '/notifications',label: 'Notifications', icon: Bell },
      { name: 'MyAnalytics',   route: '/myanalytics',  label: 'Analytics',     icon: TrendingUp },
      { name: 'Certificates',  route: '/certificates', label: 'Certificates',  icon: Award },
      { name: 'MyPayments',    route: '/mypayments',   label: 'Payments',      icon: CreditCard },
      { name: 'Coupons',       route: '/coupons',      label: 'Coupons',       icon: Ticket },
      { name: 'SupportTickets', route: '/supporttickets', label: 'Support', icon: Headset },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Profile',       route: '/profile',      label: 'Profile',       icon: User },
    ],
  },
];

export const Sidebar = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthStore();
  const { sidebarWidth, setSidebarWidth } = useUIStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to avoid selection if it's a mouse event, but don't prevent default on touch start immediately if it breaks scrolling, though here we're dragging.
    if ('clientX' in e) {
      e.preventDefault();
    }
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      // Constrain sidebar width between 200px and 450px
      const newWidth = Math.max(200, Math.min(450, startWidth + (currentX - startX)));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove as EventListener);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove as EventListener);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove as EventListener);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
  };

  return (
    <div
      style={{ width: `${sidebarWidth}px` }}
      className={`h-screen flex flex-col fixed left-0 top-0 border-r z-50 transition-none
        ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
    >
      {/* Logo / Header */}
      <div className={`flex items-center justify-between px-5 h-[70px] border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} flex-shrink-0`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src="/logo.png"
            alt="EduOrbit"
            className="w-9 h-9 object-contain flex-shrink-0 rounded-lg"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span className="text-lg font-bold text-text whitespace-nowrap tracking-tight">EduOrbit</span>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-3' : ''}>
            {/* Section label */}
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 px-3
              ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              {section.label}
            </p>

            {section.items.map((item) => {
              const isFocused = location.pathname === item.route ||
                (item.route !== '/dashboard' && location.pathname.startsWith(item.route));
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.route)}
                  className={`w-full flex items-center justify-start px-3 gap-3 py-2.5 rounded-xl border-none cursor-pointer transition-all duration-150
                    ${isFocused
                      ? 'bg-primary/10 text-primary'
                      : `bg-transparent text-textLight hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text`
                    }`}
                >
                  <item.icon
                    size={20}
                    strokeWidth={isFocused ? 2.5 : 2}
                    className="flex-shrink-0"
                  />
                  <span className={`text-sm whitespace-nowrap ${isFocused ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {isFocused && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Settings & Sign Out */}
      <div className={`p-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} flex-shrink-0 space-y-1`}>
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-textLight hover:text-text">
          <div className="flex items-center gap-3">
            <Moon size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Dark Mode</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme} />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`} />
          </label>
        </div>

        {/* Log Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-start px-3 gap-3 py-2.5 rounded-xl border-none cursor-pointer transition-colors bg-transparent text-textLight hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
        >
          <LogOut size={20} className="flex-shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">Log Out</span>
        </button>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors duration-150 hover:bg-primary/30 active:bg-primary/60 group flex items-center justify-center"
      >
        <div className="w-[2px] h-8 bg-gray-400/30 group-hover:bg-primary/60 rounded-full transition-colors duration-150" />
      </div>
    </div>
  );
};
