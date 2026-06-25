import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTheme } from '../hooks/useTheme';
import { Bell, ChevronLeft, Flame, Sun, Moon } from 'lucide-react';
import { Avatar } from './Avatar';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showProfile?: boolean;
  showNotification?: boolean;
  showStreak?: boolean;
  showLogo?: boolean;
  rightComponent?: React.ReactNode;
  titleImage?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showProfile = true,
  showNotification = true,
  showStreak = true,
  showLogo = false,
  rightComponent,
  titleImage
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { unreadCount } = useNotificationStore();
  const { isDarkMode, toggleTheme } = useTheme();

  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showNotifPopup && user) {
      const fetchNotifs = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order('created_at', { ascending: false })
          .limit(3);
        if (data) {
          setRecentNotifs(data);
        }
      };
      fetchNotifs();
    }
  }, [showNotifPopup, user]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="flex flex-row items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-border shadow-sm">
      <div className="flex items-center flex-1 overflow-hidden gap-3">
        {showBack && (
          <button onClick={handleBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors bg-transparent border-none cursor-pointer flex-shrink-0">
            <ChevronLeft size={24} className="text-text" />
          </button>
        )}

        {showLogo && (
          <img
            src="/logo.png"
            alt="EduOrbit"
            className="w-8 h-8 object-contain rounded-lg flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        {titleImage && (
          <img
            src={titleImage}
            alt="Title"
            className="w-9 h-9 rounded-full mr-1 object-cover flex-shrink-0"
          />
        )}

        {title && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <h1 className="text-xl font-bold text-text truncate m-0">{title}</h1>
            {subtitle && <p className="text-sm text-textLight mt-0.5 truncate m-0">{subtitle}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-row items-center gap-3">
        {rightComponent}

        {showStreak && (
          <div className="flex flex-row items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800/50 mr-1 shadow-sm">
            <Flame size={16} className="text-orange-500 dark:text-orange-400" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400 m-0">
              {user?.streak_count || 1}
            </span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors bg-transparent border-none cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun size={24} className="text-text" /> : <Moon size={24} className="text-text" />}
        </button>

        {showNotification && (
          <div className="relative" ref={notifRef}>
            <button
              className="relative p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors bg-transparent border-none cursor-pointer"
              onClick={() => setShowNotifPopup(!showNotifPopup)}
            >
              <Bell size={24} className="text-text" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-error border-2 border-white flex items-center justify-center px-0.5">
                  <span className="text-white text-[10px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </div>
              )}
            </button>
            
            {showNotifPopup && (
              <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-900 border border-border rounded-xl shadow-lg overflow-hidden z-50">
                <div className="p-3 border-b border-border flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="font-bold text-text m-0 text-sm">Recent Notifications</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {recentNotifs.length > 0 ? (
                    recentNotifs.map(n => (
                      <div key={n.id} className="p-3 border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <p className="text-sm font-semibold text-text m-0">{n.title}</p>
                        <p className="text-xs text-textLight mt-1 mb-0 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-textLight">No recent notifications</div>
                  )}
                </div>
                <button
                  className="w-full p-2 text-primary font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-none bg-transparent cursor-pointer"
                  onClick={() => {
                    setShowNotifPopup(false);
                    navigate('/notifications');
                  }}
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        )}

        {showProfile && (
          <button onClick={() => navigate('/profile')} className="rounded-full border border-border p-0 cursor-pointer bg-transparent">
            <Avatar
              uri={user?.profileImage}
              name={user?.name}
              size={36}
            />
          </button>
        )}
      </div>
    </header>
  );
};
