import React from 'react';
import { X, Video, Info, RefreshCcw, MessageCircle, CheckCircle2, Gift, Mail, BookOpen, User, Megaphone, Tag } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onPress: () => void;
  data: {
    title: string;
    message: string;
    image_url?: string;
    offer_code?: string;
    type?: 'general' | 'offer' | 'course_update' | 'live_class' | 'chat_reply' | 'success' | 'system' | 'user';
    course_id?: string;
    chapter_id?: string;
    offer_id?: string;
    chat_id?: string;
    is_live?: boolean;
  } | null;
}

const getConfig = (data: NotificationModalProps['data']) => {
  const type = data?.type || 'general';
  const isLive = type === 'live_class' || data?.is_live;

  let config = {
    icon: Mail, iconColor: 'bg-amber-500', badgeCount: 1, btnText: 'Mark as Read', btnColor: 'bg-lime-500', title: 'New Notification'
  };

  switch (type) {
    case 'general':
      config = { icon: Megaphone, iconColor: 'bg-blue-500', badgeCount: 1, btnText: 'Okay', btnColor: 'bg-blue-500', title: 'Announcement' }; break;
    case 'offer':
      config = { icon: Tag, iconColor: 'bg-emerald-500', badgeCount: 1, btnText: 'Claim', btnColor: 'bg-emerald-500', title: 'Special Offer' }; break;
    case 'course_update':
      config = { icon: isLive ? Video : BookOpen, iconColor: 'bg-indigo-500', badgeCount: 1, btnText: 'View', btnColor: 'bg-indigo-500', title: 'Course Update' }; break;
    case 'live_class':
      config = { icon: Video, iconColor: 'bg-red-600', badgeCount: 1, btnText: 'Join', btnColor: 'bg-red-600', title: 'Live Class' }; break;
    case 'system':
      config = { icon: Info, iconColor: 'bg-orange-500', badgeCount: 1, btnText: 'Update', btnColor: 'bg-orange-500', title: 'App Update' }; break;
    case 'user':
      config = { icon: User, iconColor: 'bg-purple-500', badgeCount: 1, btnText: 'View', btnColor: 'bg-purple-500', title: 'Personal Update' }; break;
    case 'chat_reply':
      config = { icon: MessageCircle, iconColor: 'bg-pink-500', badgeCount: 1, btnText: 'Read', btnColor: 'bg-pink-500', title: 'Message from Support' }; break;
    case 'success':
      config = { icon: CheckCircle2, iconColor: 'bg-emerald-500', badgeCount: 1, btnText: 'Continue', btnColor: 'bg-emerald-500', title: 'Success' }; break;
  }
  return config;
};

export const NotificationModal = ({ visible, onClose, onPress, data }: NotificationModalProps) => {
  const { isDarkMode } = useTheme();

  if (!visible || !data) return null;

  const config = getConfig(data);
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex justify-center items-center p-5">
      <div className={`w-full max-w-[400px] rounded-3xl p-4 flex flex-row items-center shadow-xl ${isDarkMode ? 'bg-card' : 'bg-white'}`}>
        
        <div className="mr-4 flex justify-center items-center">
          <div className="w-[60px] h-[50px] relative flex justify-center items-center">
            <div className={`w-12 h-9 rounded-lg flex justify-center items-center -rotate-6 relative z-10 ${config.iconColor}`}>
              <IconComponent size={24} color="#fff" />
            </div>
            <div className="absolute -top-0.5 right-0.5 bg-red-500 w-4.5 h-4.5 rounded-full flex justify-center items-center border-[1.5px] border-white z-20">
              <span className="text-white text-[10px] font-bold">{config.badgeCount}</span>
            </div>
            <div className="absolute bottom-2 -right-1 w-5 h-0.5 bg-gray-200 rounded-[1px]"></div>
            <div className="absolute bottom-1 -right-2 w-3 h-0.5 bg-gray-200 rounded-[1px]"></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center mr-3">
          <h3 className="text-base font-extrabold mb-1 truncate text-text m-0">{data.title || config.title}</h3>
          <p className="text-[13px] leading-[18px] text-textLight line-clamp-3 m-0">{data.message}</p>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 min-w-[80px]">
          <button 
            className={`py-2 px-4 rounded-full min-w-[80px] shadow-sm flex justify-center items-center cursor-pointer border-none ${config.btnColor}`}
            onClick={onPress}
          >
            <span className="text-white text-[13px] font-bold">{config.btnText}</span>
          </button>
          <button onClick={onClose} className="py-1 cursor-pointer bg-transparent border-none">
            <span className="text-[12px] font-medium text-textLight m-0">Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
