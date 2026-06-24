import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Camera, Info, FileText, ChevronRight,
  HelpCircle, MessageCircle, Lock, Shield
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, updateProfile, initialize } = useAuthStore();
  const { isDarkMode } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await initialize();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [initialize]);

  const showImagePickerOptions = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) uploadImage(file);
    };
    input.click();
  };

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const uri = reader.result as string;
        const publicUrl = await uploadToCloudinary(uri, 'lms_avatars', file.type);
        const { error } = await supabase
          .from('users')
          .update({ profile_image: publicUrl })
          .eq('id', user.id);
        if (error) throw error;
        updateProfile({ profileImage: publicUrl });
        alert('Profile picture updated!');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error(error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="Profile" subtitle="Manage your account" showStreak={false} />

      <div className="flex-1 overflow-y-auto px-8 pb-12 max-w-3xl mx-auto w-full">

        {/* Profile card */}
        <div className={`rounded-3xl p-8 mt-6 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border ${isDarkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100'}`}>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-indigo-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-300" />
            <div className="relative">
              <Avatar uri={user?.profileImage} name={user?.name} size={96} />
              <button
                className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex justify-center items-center cursor-pointer border-2 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-gray-850 border-gray-800 text-gray-50 hover:bg-gray-750' : 'bg-white border-white text-gray-900 shadow-md hover:bg-gray-50'}`}
                onClick={showImagePickerOptions}
                disabled={uploading}
              >
                {uploading
                  ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  : <Camera size={15} className="text-primary" />
                }
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left justify-center">
            <span className={`text-2xl font-extrabold mb-1 tracking-tight ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
              {user?.name || 'User Name'}
            </span>
            <span className={`text-sm mb-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user?.email || 'email@example.com'}
            </span>
            <button
              className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-xl font-semibold border-none cursor-pointer shadow-sm hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all"
              onClick={() => navigate('/editprofile')}
            >
              Edit Profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-8">
            <div>
              <span className={`text-[13px] font-bold uppercase tracking-wider mb-4 ml-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Account Settings</span>
              <div className={`rounded-2xl px-4 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100'}`}>
                <Row icon={<User size={18} color="#3b82f6" />} bg="#3b82f612" text="Personal Information" onClick={() => navigate('/editprofile')} isDarkMode={isDarkMode} />
                <Row icon={<Lock size={18} color="#f59e0b" />} bg="#f59e0b12" text="Change Password" onClick={() => navigate('/resetpassword')} isDarkMode={isDarkMode} />
                <Row icon={<HelpCircle size={18} color="#f43f5e" />} bg="#f43f5e12" text="Help & Support" onClick={() => navigate('/help')} isDarkMode={isDarkMode} />
                <Row icon={<MessageCircle size={18} color="#8b5cf6" />} bg="#8b5cf612" text="FAQ" onClick={() => navigate('/faq')} isDarkMode={isDarkMode} isLast={true} />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            <div>
              <span className={`text-[13px] font-bold uppercase tracking-wider mb-4 ml-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>App Info</span>
              <div className={`rounded-2xl px-4 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100'}`}>
                <Row icon={<Info size={18} color="#94a3b8" />} bg="#94a3b812" text="Version" subtext="7.5.0" hideChevron isDarkMode={isDarkMode} />
                <Row icon={<FileText size={18} color="#10b981" />} bg="#10b98112" text="Terms of Service" onClick={() => navigate('/termsofservice')} isDarkMode={isDarkMode} />
                <Row icon={<Shield size={18} color="#f59e0b" />} bg="#f59e0b12" text="Privacy Policy" onClick={() => navigate('/privacypolicy')} isDarkMode={isDarkMode} />
                <Row icon={<Info size={18} color="#3b82f6" />} bg="#3b82f612" text="About Us" onClick={() => navigate('/aboutus')} isDarkMode={isDarkMode} isLast={true} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, bg, text, subtext, onClick, hideChevron, isDarkMode, isLast }: any) {
  return (
    <div
      className={`flex flex-row items-center justify-between py-3.5 border-solid transition-colors duration-150 ${!isLast ? (isDarkMode ? 'border-b border-gray-700/60' : 'border-b border-gray-100') : 'border-b-0'} ${onClick ? 'cursor-pointer hover:bg-gray-500/5 -mx-4 px-4' : ''}`}
      onClick={onClick}
    >
      <div className="flex flex-row items-center gap-4">
        <div className="w-9 h-9 rounded-xl flex justify-center items-center flex-shrink-0" style={{ backgroundColor: bg }}>
          {icon}
        </div>
        <div className="flex flex-col">
          <span className={`text-base font-medium leading-5 ${isDarkMode ? 'text-gray-50' : 'text-gray-700'}`}>{text}</span>
          {subtext && <span className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}>{subtext}</span>}
        </div>
      </div>
      {!hideChevron && !subtext && <ChevronRight size={18} className={`transition-transform duration-150 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />}
      {hideChevron && subtext && <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}>{subtext}</span>}
    </div>
  );
}
