import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface CustomToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onHide: () => void;
  duration?: number;
}

export const CustomToast: React.FC<CustomToastProps> = ({ 
  visible, 
  message, 
  type = 'error', 
  onHide, 
  duration = 4000 
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onHide, 300); // Wait for transition before fully unmounting
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  const getStyles = () => {
    switch (type) {
      case 'success': return 'bg-success text-white';
      case 'error': return 'bg-error text-white';
      case 'info': return 'bg-primary text-white';
      default: return 'bg-gray-800 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={24} className="text-white" />;
      case 'error': return <AlertCircle size={24} className="text-white" />;
      case 'info': return <Info size={24} className="text-white" />;
    }
  };

  return (
    <div 
      className={`fixed top-5 left-5 right-5 z-[9999] flex flex-row items-center p-4 rounded-xl shadow-lg transition-all duration-300 transform ${show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${getStyles()}`}
    >
      <div className="mr-3">
        {getIcon()}
      </div>
      <p className="flex-1 font-medium text-base m-0">{message}</p>
      <button onClick={() => setShow(false)} className="p-1 ml-2 hover:bg-black/10 rounded-full transition-colors cursor-pointer border-none bg-transparent">
        <X size={18} className="text-white" />
      </button>
    </div>
  );
};
