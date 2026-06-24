import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Book, GraduationCap, User, Settings, LogOut, Menu, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

import { useUIStore } from '../store/uiStore';

const NAV_ITEMS = [
  { name: 'Dashboard', route: '/dashboard', label: 'Home', icon: Home },
  { name: 'Courses', route: '/courses', label: 'Courses', icon: Book },
  { name: 'MyCourses', route: '/mycourses', label: 'My Learning', icon: GraduationCap },
  { name: 'Profile', route: '/profile', label: 'Profile', icon: User },
];

export const Sidebar = () => {
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div 
      className={`h-screen ${isSidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col fixed left-0 top-0 border-r z-50 transition-all duration-300
        ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
    >
      <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} h-20`}>
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-primary flex-shrink-0`}>
              <GraduationCap size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-text m-0 whitespace-nowrap">EduOrbit</h1>
          </div>
        )}
        <button 
          onClick={toggleSidebar} 
          className="p-1 rounded-md bg-transparent border-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 text-textLight"
        >
          {isSidebarCollapsed ? <Menu size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isFocused = location.pathname.startsWith(item.route);
          
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.route)}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} gap-3 py-3 rounded-xl border-none cursor-pointer transition-colors duration-200
                ${isFocused 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-transparent text-textLight hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text'}`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon 
                size={22} 
                strokeWidth={isFocused ? 2.5 : 2} 
                className={`flex-shrink-0 ${isFocused ? 'text-primary' : ''}`} 
              />
              {!isSidebarCollapsed && (
                <span className={`text-sm font-medium whitespace-nowrap ${isFocused ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} gap-3 py-3 rounded-xl border-none cursor-pointer transition-colors duration-200 bg-transparent text-textLight hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500`}
          title={isSidebarCollapsed ? 'Log Out' : undefined}
        >
          <LogOut size={22} className="flex-shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap">Log Out</span>}
        </button>
      </div>
    </div>
  );
};
