import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTheme } from '../hooks/useTheme';
import { Bell, ChevronLeft, Flame } from 'lucide-react';
import { Avatar } from './Avatar';

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
  const { isDarkMode } = useTheme();

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
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400 m-0">12</span>
          </div>
        )}

        {showNotification && (
          <button
            className="relative p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors bg-transparent border-none cursor-pointer"
            onClick={() => navigate('/notifications')}
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
