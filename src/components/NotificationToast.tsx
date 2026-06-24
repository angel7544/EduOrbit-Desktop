import React, { useEffect, useState } from 'react';
import { Bell, X, Tag, Video, Info, ArrowRight, MessageCircle, CheckCircle2, RefreshCcw } from 'lucide-react';

export type NotificationType = 'offer' | 'live_class' | 'general' | 'info' | 'chat_reply' | 'success' | 'course_update';

interface NotificationToastProps {
  title: string;
  message: string;
  type?: NotificationType;
  onClose: () => void;
  onPress?: () => void;
  visible: boolean;
}

const getToastConfig = (type: NotificationType = 'general') => {
  switch (type) {
    case 'offer':
      return { bg: 'bg-orange-50', border: 'border-orange-300', iconBg: 'bg-orange-600', icon: Tag, accent: 'text-orange-600' };
    case 'live_class':
      return { bg: 'bg-blue-50', border: 'border-blue-300', iconBg: 'bg-blue-600', icon: Video, accent: 'text-blue-600' };
    case 'chat_reply':
      return { bg: 'bg-purple-50', border: 'border-purple-400', iconBg: 'bg-purple-600', icon: MessageCircle, accent: 'text-purple-600' };
    case 'success':
      return { bg: 'bg-green-50', border: 'border-green-300', iconBg: 'bg-green-600', icon: CheckCircle2, accent: 'text-green-600' };
    case 'course_update':
      return { bg: 'bg-blue-50', border: 'border-blue-300', iconBg: 'bg-blue-600', icon: RefreshCcw, accent: 'text-blue-600' };
    case 'general':
    default:
      return { bg: 'bg-white', border: 'border-slate-200', iconBg: 'bg-blue-500', icon: Bell, accent: 'text-blue-500' };
  }
};

export const NotificationToast = ({ title, message, type = 'general', onClose, onPress, visible }: NotificationToastProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const config = getToastConfig(type);
  const IconComponent = config.icon;

  return (
    <div className={`fixed top-12 left-4 right-4 z-[9999] transition-all duration-300 transform ${show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <div className={`flex flex-row items-start p-4 rounded-2xl border shadow-xl ${config.bg} ${config.border}`}>
        <div 
          className="flex-1 flex flex-row items-start cursor-pointer"
          onClick={onPress}
        >
          <div className={`relative flex items-center justify-center w-12 h-12 rounded-full mr-4 shadow-md flex-shrink-0 ${config.iconBg}`}>
            <IconComponent size={20} color="#fff" strokeWidth={2.5} />
            <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-red-500 border-2 border-white flex justify-center items-center">
              <span className="text-white text-[10px] font-bold">1</span>
            </div>
          </div>

          <div className="flex-1 pr-2">
            <h3 className="text-slate-800 text-base font-extrabold mb-1 truncate m-0">{title}</h3>
            <p className="text-slate-500 text-[13px] leading-[18px] mb-2 line-clamp-2 m-0">{message}</p>
            <div className="flex flex-row items-center gap-1 mt-1">
              <span className={`text-[13px] font-bold ${config.accent}`}>View Details</span>
              <ArrowRight size={14} className={config.accent} />
            </div>
          </div>
        </div>

        <button onClick={() => setShow(false)} className="p-1 ml-1 cursor-pointer bg-transparent border-none">
          <X size={18} className="text-slate-400 hover:text-slate-600 transition-colors" />
        </button>
      </div>
    </div>
  );
};
